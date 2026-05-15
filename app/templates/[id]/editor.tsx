"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, Plus, Save, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Textarea, Card, Label } from "@/components/ui";
import type { Template, SectionWithItems, StatusOption } from "@/lib/types";

export default function TemplateEditor({
  template,
  sections: initialSections,
}: {
  template: Template;
  sections: SectionWithItems[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [, startTransition] = useTransition();

  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description ?? "");
  const [passThreshold, setPassThreshold] = useState(template.pass_threshold);
  const [statusOptionsText, setStatusOptionsText] = useState(
    JSON.stringify(template.status_options, null, 2),
  );
  const [statusError, setStatusError] = useState<string | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);
  const [sections, setSections] = useState<SectionWithItems[]>(initialSections);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function saveMeta() {
    setSavingMeta(true);
    setStatusError(null);
    let parsed: StatusOption[];
    try {
      parsed = JSON.parse(statusOptionsText);
      if (!Array.isArray(parsed)) throw new Error("status_options must be a JSON array");
      for (const o of parsed) {
        if (!o.code || !o.label || !o.color || !("passing" in o)) {
          throw new Error("each option needs: code, label, color, passing");
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Invalid JSON";
      setStatusError(msg);
      setSavingMeta(false);
      return;
    }
    const { error } = await supabase
      .from("templates")
      .update({
        name,
        description: description || null,
        pass_threshold: passThreshold,
        status_options: parsed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", template.id);
    setSavingMeta(false);
    if (error) {
      alert(error.message);
      return;
    }
    refresh();
  }

  async function addSection() {
    const sortOrder = sections.length + 1;
    const { data, error } = await supabase
      .from("sections")
      .insert({ template_id: template.id, name: "New section", sort_order: sortOrder })
      .select("*")
      .single();
    if (error || !data) return alert(error?.message);
    setSections([...sections, { ...data, items: [] }]);
  }

  async function renameSection(sectionId: string, newName: string) {
    setSections((s) => s.map((x) => (x.id === sectionId ? { ...x, name: newName } : x)));
    await supabase.from("sections").update({ name: newName }).eq("id", sectionId);
  }

  async function deleteSection(sectionId: string) {
    if (!confirm("Delete this section and all its items?")) return;
    const { error } = await supabase.from("sections").delete().eq("id", sectionId);
    if (error) return alert(error.message);
    setSections((s) => s.filter((x) => x.id !== sectionId));
  }

  async function addItem(sectionId: string) {
    const sec = sections.find((s) => s.id === sectionId);
    const sortOrder = (sec?.items.length ?? 0) + 1;
    const { data, error } = await supabase
      .from("items")
      .insert({ section_id: sectionId, name: "New item", sort_order: sortOrder })
      .select("*")
      .single();
    if (error || !data) return alert(error?.message);
    setSections((s) =>
      s.map((x) => (x.id === sectionId ? { ...x, items: [...x.items, data] } : x)),
    );
  }

  async function renameItem(sectionId: string, itemId: string, newName: string) {
    setSections((s) =>
      s.map((x) =>
        x.id === sectionId
          ? { ...x, items: x.items.map((i) => (i.id === itemId ? { ...i, name: newName } : i)) }
          : x,
      ),
    );
    await supabase.from("items").update({ name: newName }).eq("id", itemId);
  }

  async function deleteItem(sectionId: string, itemId: string) {
    const { error } = await supabase.from("items").delete().eq("id", itemId);
    if (error) return alert(error.message);
    setSections((s) =>
      s.map((x) => (x.id === sectionId ? { ...x, items: x.items.filter((i) => i.id !== itemId) } : x)),
    );
  }

  async function deleteTemplate() {
    if (!confirm(`Delete template "${template.name}"? This removes all its sections and items.`))
      return;
    const { error } = await supabase.from("templates").delete().eq("id", template.id);
    if (error) return alert(error.message);
    router.push("/templates");
  }

  return (
    <div className="space-y-6">
      <Link href="/templates" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft size={14} /> All templates
      </Link>

      <Card className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-semibold">Template settings</h1>
          <Button variant="danger" onClick={deleteTemplate}>
            <Trash2 size={14} /> Delete template
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="t-name">Name</Label>
            <Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="t-thresh">Pass threshold (%)</Label>
            <Input
              id="t-thresh"
              type="number"
              min={0}
              max={100}
              value={passThreshold}
              onChange={(e) => setPassThreshold(parseFloat(e.target.value || "0"))}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="t-desc">Description</Label>
          <Textarea
            id="t-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="t-opts">
            Status options (JSON array — each with code, label, color, passing)
          </Label>
          <Textarea
            id="t-opts"
            rows={8}
            className="font-mono text-xs"
            value={statusOptionsText}
            onChange={(e) => setStatusOptionsText(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            <code>passing: true</code> = counts toward score, <code>false</code> = counts against,{" "}
            <code>null</code> = excluded (e.g. NA). Colors: green, amber, red, gray, blue, purple.
          </p>
          {statusError && <p className="text-xs text-red-600 mt-1">{statusError}</p>}
        </div>

        <div className="flex justify-end">
          <Button onClick={saveMeta} disabled={savingMeta}>
            <Save size={14} /> {savingMeta ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </Card>

      <Card className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Sections & items</h2>
          <Button variant="secondary" onClick={addSection}>
            <Plus size={14} /> Add section
          </Button>
        </div>

        {sections.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No sections yet. Add a section to start building this checklist.
          </p>
        )}

        <div className="space-y-4">
          {sections.map((s, idx) => (
            <div key={s.id} className="border border-border rounded-md p-4 bg-background/50">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-muted-foreground w-6">{idx + 1}.</span>
                <Input
                  value={s.name}
                  onChange={(e) => renameSection(s.id, e.target.value)}
                  className="font-medium"
                />
                <Button variant="ghost" onClick={() => deleteSection(s.id)} title="Delete section">
                  <Trash2 size={14} />
                </Button>
              </div>

              <div className="ml-8 space-y-2">
                {s.items.map((it) => (
                  <div key={it.id} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">•</span>
                    <Input
                      value={it.name}
                      onChange={(e) => renameItem(s.id, it.id, e.target.value)}
                    />
                    <Button variant="ghost" onClick={() => deleteItem(s.id, it.id)} title="Delete item">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
                <Button variant="ghost" onClick={() => addItem(s.id)} className="text-muted-foreground">
                  <Plus size={14} /> Add item
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
