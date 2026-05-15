import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import Nav from "@/components/nav";
import { Card } from "@/components/ui";
import { StatusPill, ResultBadge } from "@/components/status-pill";
import { formatPTDateTime } from "@/lib/format";
import type { Instance, Template, Section, Item, Response, Location, Profile } from "@/lib/types";

export default async function InstanceViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireProfile();

  const { data: instance } = await supabase
    .from("instances")
    .select("*")
    .eq("id", id)
    .single<Instance>();
  if (!instance) notFound();

  const [{ data: template }, { data: sections }, { data: responses }, { data: location }, { data: inspector }] =
    await Promise.all([
      supabase.from("templates").select("*").eq("id", instance.template_id).single<Template>(),
      supabase.from("sections").select("*").eq("template_id", instance.template_id).order("sort_order"),
      supabase.from("responses").select("*").eq("instance_id", id),
      instance.location_id
        ? supabase.from("locations").select("*").eq("id", instance.location_id).single<Location>()
        : Promise.resolve({ data: null }),
      supabase.from("profiles").select("*").eq("id", instance.inspector_id).single<Profile>(),
    ]);

  if (!template) notFound();

  const sectionIds = (sections ?? []).map((s) => s.id);
  const { data: items } =
    sectionIds.length > 0
      ? await supabase.from("items").select("*").in("section_id", sectionIds).order("sort_order")
      : { data: [] as Item[] };

  const responseByItem: Record<string, Response> = {};
  for (const r of (responses ?? []) as Response[]) responseByItem[r.item_id] = r;

  const optByCode = new Map(template.status_options.map((o) => [o.code, o]));

  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-6 py-8 w-full space-y-6">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft size={14} /> Dashboard
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{template.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {location?.name && `${location.name} · `}
              Submitted {formatPTDateTime(instance.submitted_at)}
              {inspector && ` · by ${inspector.full_name || inspector.email}`}
            </p>
          </div>
          <ResultBadge result={instance.overall_result} />
        </div>

        <Card className="p-5 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-muted-foreground uppercase">Score</div>
            <div className="text-2xl font-mono mt-1">
              {instance.overall_score?.toFixed(1) ?? "—"}%
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase">Threshold</div>
            <div className="text-2xl font-mono mt-1">{template.pass_threshold}%</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase">Result</div>
            <div className="mt-2">
              <ResultBadge result={instance.overall_result} />
            </div>
          </div>
        </Card>

        {(sections ?? []).map((section: Section) => {
          const sectionItems = (items ?? []).filter((i: Item) => i.section_id === section.id);
          return (
            <Card key={section.id} className="p-5">
              <h2 className="font-semibold mb-3">{section.name}</h2>
              <div className="space-y-3">
                {sectionItems.map((item: Item) => {
                  const r = responseByItem[item.id];
                  const opt = r?.status_code ? optByCode.get(r.status_code) : null;
                  return (
                    <div key={item.id} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm font-medium flex-1">{item.name}</div>
                        {opt ? (
                          <StatusPill option={opt} size="xs" />
                        ) : (
                          <span className="text-xs text-muted-foreground italic">no answer</span>
                        )}
                      </div>
                      {r?.comments && (
                        <p className="mt-1 text-xs text-muted-foreground italic">
                          &ldquo;{r.comments}&rdquo;
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}

        {instance.items_not_covered && (
          <Card className="p-5">
            <h2 className="font-semibold mb-2">Items not covered / notes</h2>
            <p className="text-sm whitespace-pre-wrap">{instance.items_not_covered}</p>
          </Card>
        )}
      </main>
    </>
  );
}
