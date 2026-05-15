"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, Textarea, Card } from "@/components/ui";
import { StatusPill } from "@/components/status-pill";
import { scoreInstance } from "@/lib/scoring";
import { formatPTDateTime } from "@/lib/format";
import type {
  Instance,
  Template,
  SectionWithItems,
  Response,
  Location,
} from "@/lib/types";

type ResponseMap = Record<string, { status_code: string | null; comments: string | null }>;

export default function InstanceForm({
  instance,
  template,
  sections,
  responses,
  location,
}: {
  instance: Instance;
  template: Template;
  sections: SectionWithItems[];
  responses: Response[];
  location: Location | null;
}) {
  const router = useRouter();
  const supabase = createClient();

  const initialMap: ResponseMap = useMemo(() => {
    const m: ResponseMap = {};
    for (const r of responses) {
      m[r.item_id] = { status_code: r.status_code, comments: r.comments };
    }
    return m;
  }, [responses]);

  const [map, setMap] = useState<ResponseMap>(initialMap);
  const [itemsNotCovered, setItemsNotCovered] = useState(instance.items_not_covered ?? "");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [submitting, setSubmitting] = useState(false);
  const pendingRef = useRef<Set<string>>(new Set());
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const totalItems = useMemo(
    () => sections.reduce((sum, s) => sum + s.items.length, 0),
    [sections],
  );

  const live = useMemo(() => {
    const flat = Object.values(map).map((r) => ({ status_code: r.status_code }));
    return scoreInstance(flat, totalItems, template.status_options, template.pass_threshold);
  }, [map, totalItems, template]);

  async function flushPending() {
    const ids = Array.from(pendingRef.current);
    pendingRef.current.clear();
    if (ids.length === 0) return;
    setSaveState("saving");
    const rows = ids.map((itemId) => ({
      instance_id: instance.id,
      item_id: itemId,
      status_code: map[itemId]?.status_code ?? null,
      comments: map[itemId]?.comments ?? null,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase
      .from("responses")
      .upsert(rows, { onConflict: "instance_id,item_id" });
    if (error) {
      setSaveState("error");
      console.error(error);
      return;
    }
    setSaveState("saved");
    setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 1500);
  }

  function queueSave(itemId: string) {
    pendingRef.current.add(itemId);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(flushPending, 500);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  async function saveItemsNotCovered(text: string) {
    setItemsNotCovered(text);
    setSaveState("saving");
    const { error } = await supabase
      .from("instances")
      .update({ items_not_covered: text || null, updated_at: new Date().toISOString() })
      .eq("id", instance.id);
    if (error) {
      setSaveState("error");
      return;
    }
    setSaveState("saved");
    setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 1500);
  }

  function setStatus(itemId: string, code: string) {
    setMap((m) => {
      const prev = m[itemId] ?? { status_code: null, comments: null };
      const next: ResponseMap = { ...m, [itemId]: { ...prev, status_code: prev.status_code === code ? null : code } };
      return next;
    });
    queueSave(itemId);
  }

  function setComment(itemId: string, comments: string) {
    setMap((m) => {
      const prev = m[itemId] ?? { status_code: null, comments: null };
      return { ...m, [itemId]: { ...prev, comments } };
    });
    queueSave(itemId);
  }

  async function submit() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    await flushPending();

    if (live.unanswered > 0) {
      const ok = confirm(
        `${live.unanswered} item(s) have no status set. Submit anyway?\n` +
          `They'll be excluded from the score.`,
      );
      if (!ok) return;
    }

    setSubmitting(true);
    const { error } = await supabase
      .from("instances")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        overall_score: live.score,
        overall_result: live.result,
        items_not_covered: itemsNotCovered || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", instance.id);
    setSubmitting(false);
    if (error) return alert(error.message);
    router.push(`/inspect/${instance.id}/view`);
  }

  async function discard() {
    if (!confirm("Discard this draft? All entered data will be deleted.")) return;
    const { error } = await supabase.from("instances").delete().eq("id", instance.id);
    if (error) return alert(error.message);
    router.push("/");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft size={14} /> Dashboard
        </Link>
        <span className="text-xs text-muted-foreground">
          {saveState === "saving" && "Saving…"}
          {saveState === "saved" && "Saved ✓"}
          {saveState === "error" && <span className="text-red-600">Save failed</span>}
        </span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{template.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {location ? `${location.name} · ` : ""}
          Draft started {formatPTDateTime(instance.created_at)}
        </p>
      </div>

      <Card className="p-4 flex items-center justify-between">
        <div className="text-sm">
          <div className="text-muted-foreground">Live score</div>
          <div className="font-mono text-lg">
            {live.score.toFixed(1)}%{" "}
            <span className="text-xs text-muted-foreground">
              ({live.passing} passing / {live.applicable} applicable
              {live.unanswered > 0 && ` · ${live.unanswered} unanswered`})
            </span>
          </div>
        </div>
        <div className="text-sm">
          <div className="text-muted-foreground text-right">Threshold</div>
          <div className="font-mono text-right">{template.pass_threshold}%</div>
        </div>
      </Card>

      <div className="space-y-6">
        {sections.map((section) => (
          <Card key={section.id} className="p-5">
            <h2 className="font-semibold mb-3">{section.name}</h2>
            <div className="space-y-3">
              {section.items.map((item) => {
                const r = map[item.id];
                return (
                  <div key={item.id} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-medium flex-1">{item.name}</div>
                      <div className="flex flex-wrap gap-1.5 shrink-0">
                        {template.status_options.map((opt) => {
                          const active = r?.status_code === opt.code;
                          return (
                            <button
                              key={opt.code}
                              type="button"
                              onClick={() => setStatus(item.id, opt.code)}
                              className={`rounded px-2 py-1 text-xs font-medium ring-1 transition-colors ${
                                active
                                  ? `${colorActive(opt.color)} ring-offset-1`
                                  : "bg-muted text-muted-foreground ring-border hover:bg-muted/70"
                              }`}
                              title={opt.label}
                            >
                              {opt.code}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {r?.status_code && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <StatusPill
                          option={template.status_options.find((o) => o.code === r.status_code)!}
                          size="xs"
                        />
                        <span>
                          {template.status_options.find((o) => o.code === r.status_code)?.label}
                        </span>
                      </div>
                    )}
                    <Textarea
                      placeholder="Comments (optional)"
                      rows={1}
                      value={r?.comments ?? ""}
                      onChange={(e) => setComment(item.id, e.target.value)}
                      className="mt-2 text-sm"
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-2">Items not covered / notes</h2>
        <Textarea
          placeholder="Anything you couldn't inspect, or general notes about this run."
          rows={3}
          value={itemsNotCovered}
          onChange={(e) => saveItemsNotCovered(e.target.value)}
        />
      </Card>

      <div className="flex justify-between pt-2">
        <Button variant="danger" onClick={discard}>
          Discard draft
        </Button>
        <Button onClick={submit} disabled={submitting}>
          {submitting ? "Submitting…" : "Submit inspection"}
        </Button>
      </div>
    </div>
  );
}

function colorActive(color: string) {
  switch (color) {
    case "green":  return "bg-green-600 text-white ring-green-700";
    case "amber":  return "bg-amber-500 text-white ring-amber-600";
    case "red":    return "bg-red-600 text-white ring-red-700";
    case "gray":   return "bg-zinc-500 text-white ring-zinc-600";
    case "blue":   return "bg-blue-600 text-white ring-blue-700";
    case "purple": return "bg-purple-600 text-white ring-purple-700";
    default:       return "bg-zinc-500 text-white ring-zinc-600";
  }
}
