import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./sign-out-button";

export default async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";

  return (
    <header className="border-b border-border bg-card">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold tracking-tight">
            Safety Inspector
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Dashboard</Link>
            <Link href="/inspect/new" className="hover:text-foreground">New inspection</Link>
            <Link href="/calendar" className="hover:text-foreground">Calendar</Link>
            <Link href="/templates" className="hover:text-foreground">Templates</Link>
            {isAdmin && (
              <>
                <Link href="/locations" className="hover:text-foreground">Locations</Link>
                <Link href="/admin/users" className="hover:text-foreground">Users</Link>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground hidden sm:inline">
            {profile?.full_name || profile?.email}
            {isAdmin && (
              <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-muted text-foreground">
                admin
              </span>
            )}
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
