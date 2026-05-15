import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import Nav from "@/components/nav";
import { Card, Button } from "@/components/ui";
import { ResultBadge } from "@/components/status-pill";
import { formatPTDateTime } from "@/lib/format";
import type { Instance, Template, Location, Profile } from "@/lib/types";

type InstanceJoined = Instance & {
  templates: Pick<Template, "id" | "name"> | null;
  locations: Pick<Location, "id" | "name"> | null;
  inspector: Pick<Profile, "id" | "full_name" | "email"> | null;
};

export default async function Dashboard() {
  const { supabase, profile } = await requireProfile();

  const [{ data: drafts }, { data: recentRaw }, { data: templates }] = await Promise.all([
    supabase
      .from("instances")
      .select("*, templates(id,name), locations(id,name)")
      .eq("status", "draft")
      .eq("inspector_id", profile.id)
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("instances")
      .select("*, templates(id,name), locations(id,name)")
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false })
      .limit(10),
    supabase.from("templates").select("id, name").order("name"),
  ]);

  type RecentRaw = Instance & {
    templates: Pick<Template, "id" | "name"> | null;
    locations: Pick<Location, "id" | "name"> | null;
  };
  const recentRows = (recentRaw as unknown as RecentRaw[]) ?? [];
  const inspectorIds = Array.from(new Set(recentRows.map((r) => r.inspector_id)));
  const { data: inspectorProfiles } =
    inspectorIds.length > 0
      ? await supabase.from("profiles").select("id, full_name, email").in("id", inspectorIds)
      : { data: [] as Pick<Profile, "id" | "full_name" | "email">[] };
  const profileById = new Map((inspectorProfiles ?? []).map((p) => [p.id, p]));
  const recent: InstanceJoined[] = recentRows.map((r) => ({
    ...r,
    inspector: profileById.get(r.inspector_id) ?? null,
  }));

  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto px-6 py-8 w-full space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome, {profile.full_name || profile.email.split("@")[0]}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Run an inspection or review recent submissions.
            </p>
          </div>
          <Link href="/inspect/new">
            <Button>+ New inspection</Button>
          </Link>
        </div>

        {drafts && drafts.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase mb-3">
              Your drafts
            </h2>
            <div className="grid gap-2">
              {(drafts as unknown as InstanceJoined[]).map((d) => (
                <Card key={d.id} className="p-4 flex items-center justify-between">
                  <div>
                    <Link href={`/inspect/${d.id}`} className="font-medium hover:underline">
                      {d.templates?.name ?? "Inspection"}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {d.locations?.name && `${d.locations.name} · `}
                      Started {formatPTDateTime(d.created_at)}
                    </p>
                  </div>
                  <Link href={`/inspect/${d.id}`}>
                    <Button variant="secondary">Continue</Button>
                  </Link>
                </Card>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase">
              Recently submitted
            </h2>
            <Link href="/calendar" className="text-sm text-accent hover:underline">
              View calendar →
            </Link>
          </div>
          <div className="grid gap-2">
            {recent.map((i) => (
              <Card key={i.id} className="p-4 flex items-center justify-between">
                <div>
                  <Link href={`/inspect/${i.id}/view`} className="font-medium hover:underline">
                    {i.templates?.name ?? "Inspection"}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {i.locations?.name && `${i.locations.name} · `}
                    {formatPTDateTime(i.submitted_at)}
                    {i.inspector && ` · ${i.inspector.full_name || i.inspector.email}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm">
                    {i.overall_score?.toFixed(1) ?? "—"}%
                  </span>
                  <ResultBadge result={i.overall_result} />
                </div>
              </Card>
            ))}
            {recent.length === 0 && (
              <Card className="p-6 text-sm text-muted-foreground text-center">
                No completed inspections yet.
              </Card>
            )}
          </div>
        </section>

        {templates && templates.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase mb-3">
              Quick start
            </h2>
            <div className="flex flex-wrap gap-2">
              {templates.map((t) => (
                <Link key={t.id} href={`/inspect/new?template=${t.id}`}>
                  <Button variant="secondary">{t.name}</Button>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
