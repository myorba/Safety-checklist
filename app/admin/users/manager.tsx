"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, Select } from "@/components/ui";
import type { Profile } from "@/lib/types";

export default function UsersManager({ initial }: { initial: Profile[] }) {
  const supabase = createClient();
  const [list, setList] = useState<Profile[]>(initial);

  async function setRole(id: string, role: "admin" | "member") {
    setList((l) => l.map((p) => (p.id === id ? { ...p, role } : p)));
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (error) alert(error.message);
  }

  return (
    <div className="space-y-2">
      {list.map((p) => (
        <Card key={p.id} className="p-4 flex items-center justify-between gap-3">
          <div>
            <div className="font-medium text-sm">{p.full_name || p.email}</div>
            <div className="text-xs text-muted-foreground">{p.email}</div>
          </div>
          <Select
            value={p.role}
            onChange={(e) => setRole(p.id, e.target.value as "admin" | "member")}
          >
            <option value="member">member</option>
            <option value="admin">admin</option>
          </Select>
        </Card>
      ))}
      {list.length === 0 && (
        <Card className="p-6 text-sm text-muted-foreground text-center">
          No users yet.
        </Card>
      )}
    </div>
  );
}
