import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import Nav from "@/components/nav";
import InstanceForm from "./form";
import type { Instance, Template, Section, Item, Response, Location } from "@/lib/types";

export default async function InstanceFillPage({
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
  if (instance.status === "submitted") redirect(`/inspect/${id}/view`);

  const [{ data: template }, { data: sections }, { data: responses }, { data: location }] =
    await Promise.all([
      supabase.from("templates").select("*").eq("id", instance.template_id).single<Template>(),
      supabase.from("sections").select("*").eq("template_id", instance.template_id).order("sort_order"),
      supabase.from("responses").select("*").eq("instance_id", id),
      instance.location_id
        ? supabase.from("locations").select("*").eq("id", instance.location_id).single<Location>()
        : Promise.resolve({ data: null }),
    ]);

  if (!template) notFound();

  const sectionIds = (sections ?? []).map((s) => s.id);
  const { data: items } =
    sectionIds.length > 0
      ? await supabase
          .from("items")
          .select("*")
          .in("section_id", sectionIds)
          .order("sort_order")
      : { data: [] as Item[] };

  const sectionsWithItems = (sections ?? []).map((s: Section) => ({
    ...s,
    items: (items ?? []).filter((i: Item) => i.section_id === s.id),
  }));

  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-6 py-8 w-full">
        <InstanceForm
          instance={instance}
          template={template}
          sections={sectionsWithItems}
          responses={(responses as Response[]) ?? []}
          location={location ?? null}
        />
      </main>
    </>
  );
}
