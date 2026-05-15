import { requireProfile } from "@/lib/auth";
import Nav from "@/components/nav";
import CalendarView from "./calendar-view";
import type { Instance, Template, Location, Profile } from "@/lib/types";

type RawInstance = Pick<Instance, "id" | "submitted_at" | "overall_score" | "overall_result" | "inspector_id"> & {
  templates: Pick<Template, "id" | "name"> | null;
  locations: Pick<Location, "id" | "name"> | null;
};

export type CalendarInstance = Pick<Instance, "id" | "submitted_at" | "overall_score" | "overall_result"> & {
  templates: Pick<Template, "id" | "name"> | null;
  locations: Pick<Location, "id" | "name"> | null;
  inspector: Pick<Profile, "id" | "full_name" | "email"> | null;
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { supabase } = await requireProfile();
  const sp = await searchParams;

  const today = new Date();
  const monthParam = sp.month;
  const [year, month] = monthParam
    ? monthParam.split("-").map(Number)
    : [today.getFullYear(), today.getMonth() + 1];

  const start = new Date(year, (month ?? 1) - 1, 1);
  const end = new Date(year, month ?? 1, 1);

  const { data: instances } = await supabase
    .from("instances")
    .select(
      "id, submitted_at, overall_score, overall_result, inspector_id, templates(id,name), locations(id,name)",
    )
    .eq("status", "submitted")
    .gte("submitted_at", start.toISOString())
    .lt("submitted_at", end.toISOString())
    .order("submitted_at");

  const rows = (instances as unknown as RawInstance[]) ?? [];
  const inspectorIds = Array.from(new Set(rows.map((r) => r.inspector_id))).filter(Boolean);
  const { data: profiles } =
    inspectorIds.length > 0
      ? await supabase.from("profiles").select("id, full_name, email").in("id", inspectorIds)
      : { data: [] as Pick<Profile, "id" | "full_name" | "email">[] };

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const enriched: CalendarInstance[] = rows.map((r) => ({
    id: r.id,
    submitted_at: r.submitted_at,
    overall_score: r.overall_score,
    overall_result: r.overall_result,
    templates: r.templates,
    locations: r.locations,
    inspector: profileById.get(r.inspector_id) ?? null,
  }));

  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto px-6 py-8 w-full">
        <CalendarView
          year={year ?? today.getFullYear()}
          month={month ?? today.getMonth() + 1}
          instances={enriched}
        />
      </main>
    </>
  );
}
