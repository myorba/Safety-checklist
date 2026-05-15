import Link from "next/link";
import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import Nav from "@/components/nav";
import { Card } from "@/components/ui";
import StartInspectionForm from "./start-form";

export default async function NewInspectionPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string; location?: string }>;
}) {
  const { supabase } = await requireProfile();
  const sp = await searchParams;

  const [{ data: templates }, { data: locations }] = await Promise.all([
    supabase.from("templates").select("id, name").order("name"),
    supabase.from("locations").select("id, name").order("name"),
  ]);

  return (
    <>
      <Nav />
      <main className="max-w-2xl mx-auto px-6 py-8 w-full">
        <h1 className="text-2xl font-semibold mb-2">New inspection</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Pick a template and location. We&apos;ll create a draft you can fill out.
        </p>

        {(!templates || templates.length === 0) ? (
          <Card className="p-6 text-sm text-muted-foreground">
            No templates exist yet.{" "}
            <Link href="/templates" className="text-accent hover:underline">
              Create one first.
            </Link>
          </Card>
        ) : (
          <Card className="p-6">
            <Suspense>
              <StartInspectionForm
                templates={templates}
                locations={locations ?? []}
                presetTemplate={sp.template}
                presetLocation={sp.location}
              />
            </Suspense>
          </Card>
        )}
      </main>
    </>
  );
}
