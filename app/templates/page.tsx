import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { Card, Button } from "@/components/ui";
import Nav from "@/components/nav";
import NewTemplateButton from "./new-template-button";

export default async function TemplatesPage() {
  const { supabase, profile } = await requireProfile();
  const isAdmin = profile.role === "admin";

  const { data: templates } = await supabase
    .from("templates")
    .select("id, name, description, updated_at, sections(items(id))")
    .order("created_at", { ascending: false });

  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto px-6 py-8 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
            <p className="text-sm text-muted-foreground">
              Reusable inspection blueprints. Run an instance from any template.
            </p>
          </div>
          {isAdmin && <NewTemplateButton />}
        </div>

        <div className="grid gap-3">
          {templates?.map((t) => {
            type SecRow = { items: { id: string }[] };
            const sectionCount = (t.sections as SecRow[] | null)?.length ?? 0;
            const itemCount =
              (t.sections as SecRow[] | null)?.reduce(
                (sum: number, s) => sum + (s.items?.length ?? 0),
                0,
              ) ?? 0;
            return (
              <Card key={t.id} className="p-5 flex items-center justify-between">
                <div>
                  <Link href={`/templates/${t.id}`} className="font-medium hover:underline">
                    {t.name}
                  </Link>
                  {t.description && (
                    <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                      {t.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {sectionCount} sections · {itemCount} items
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/inspect/new?template=${t.id}`}>
                    <Button>Run inspection</Button>
                  </Link>
                  {isAdmin && (
                    <Link href={`/templates/${t.id}`}>
                      <Button variant="secondary">Edit</Button>
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}
          {(!templates || templates.length === 0) && (
            <Card className="p-8 text-center text-muted-foreground">
              No templates yet.
              {isAdmin && " Create one to get started."}
            </Card>
          )}
        </div>
      </main>
    </>
  );
}
