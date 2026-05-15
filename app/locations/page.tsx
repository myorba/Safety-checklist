import { requireAdmin } from "@/lib/auth";
import Nav from "@/components/nav";
import LocationsManager from "./manager";
import type { Location } from "@/lib/types";

export default async function LocationsPage() {
  const { supabase } = await requireAdmin();
  const { data: locations } = await supabase
    .from("locations")
    .select("*")
    .order("name");

  return (
    <>
      <Nav />
      <main className="max-w-2xl mx-auto px-6 py-8 w-full">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Locations</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Sites where inspections take place.
        </p>
        <LocationsManager initial={(locations as Location[]) ?? []} />
      </main>
    </>
  );
}
