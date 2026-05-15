import { requireAdmin } from "@/lib/auth";
import Nav from "@/components/nav";
import UsersManager from "./manager";
import type { Profile } from "@/lib/types";

export default async function AdminUsersPage() {
  const { supabase } = await requireAdmin();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-6 py-8 w-full">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Users</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Promote members to admin or demote them. Admins can edit templates and manage locations &amp; users.
        </p>
        <UsersManager initial={(profiles as Profile[]) ?? []} />
      </main>
    </>
  );
}
