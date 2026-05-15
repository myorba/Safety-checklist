import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import Nav from "@/components/nav";
import TemplateEditor from "./editor";
import type { Template, Section, Item } from "@/lib/types";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();

  if (profile.role !== "admin") redirect("/templates");

  const { data: template } = await supabase
    .from("templates")
    .select("*")
    .eq("id", id)
    .single<Template>();

  if (!template) notFound();

  const { data: sections } = await supabase
    .from("sections")
    .select("*")
    .eq("template_id", id)
    .order("sort_order");

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
      <main className="max-w-5xl mx-auto px-6 py-8 w-full">
        <TemplateEditor template={template} sections={sectionsWithItems} />
      </main>
    </>
  );
}
