"use client";

import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Card, Label } from "@/components/ui";
import type { Location } from "@/lib/types";

export default function LocationsManager({ initial }: { initial: Location[] }) {
  const supabase = createClient();
  const [list, setList] = useState<Location[]>(initial);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [adding, setAdding] = useState(false);

  async function addLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    const { data, error } = await supabase
      .from("locations")
      .insert({ name: name.trim(), address: address.trim() || null })
      .select("*")
      .single();
    setAdding(false);
    if (error || !data) return alert(error?.message);
    setList((l) => [...l, data].sort((a, b) => a.name.localeCompare(b.name)));
    setName("");
    setAddress("");
  }

  async function rename(id: string, newName: string) {
    setList((l) => l.map((x) => (x.id === id ? { ...x, name: newName } : x)));
    await supabase.from("locations").update({ name: newName }).eq("id", id);
  }

  async function updateAddress(id: string, newAddress: string) {
    setList((l) => l.map((x) => (x.id === id ? { ...x, address: newAddress } : x)));
    await supabase.from("locations").update({ address: newAddress || null }).eq("id", id);
  }

  async function remove(id: string) {
    if (!confirm("Delete this location? Inspections referencing it will keep the link.")) return;
    const { error } = await supabase.from("locations").delete().eq("id", id);
    if (error) return alert(error.message);
    setList((l) => l.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="font-semibold mb-3">Add location</h2>
        <form onSubmit={addLocation} className="grid sm:grid-cols-[1fr_2fr_auto] gap-2 items-end">
          <div>
            <Label htmlFor="loc-name">Name</Label>
            <Input id="loc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Brea Office" />
          </div>
          <div>
            <Label htmlFor="loc-addr">Address (optional)</Label>
            <Input id="loc-addr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, City" />
          </div>
          <Button type="submit" disabled={adding}>
            <Plus size={14} /> Add
          </Button>
        </form>
      </Card>

      <div className="space-y-2">
        {list.map((loc) => (
          <Card key={loc.id} className="p-4 flex items-center gap-2">
            <Input value={loc.name} onChange={(e) => rename(loc.id, e.target.value)} className="flex-[1]" />
            <Input
              value={loc.address ?? ""}
              onChange={(e) => updateAddress(loc.id, e.target.value)}
              placeholder="Address"
              className="flex-[2]"
            />
            <Button variant="ghost" onClick={() => remove(loc.id)} title="Delete">
              <Trash2 size={14} />
            </Button>
          </Card>
        ))}
        {list.length === 0 && (
          <Card className="p-6 text-sm text-muted-foreground text-center">
            No locations yet.
          </Card>
        )}
      </div>
    </div>
  );
}
