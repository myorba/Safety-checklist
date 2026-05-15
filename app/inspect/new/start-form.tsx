"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Select, Label } from "@/components/ui";

export default function StartInspectionForm({
  templates,
  locations,
  presetTemplate,
  presetLocation,
}: {
  templates: { id: string; name: string }[];
  locations: { id: string; name: string }[];
  presetTemplate?: string;
  presetLocation?: string;
}) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState(presetTemplate || templates[0]?.id || "");
  const [locationId, setLocationId] = useState(presetLocation || locations[0]?.id || "");
  const [loading, setLoading] = useState(false);

  async function start() {
    if (!templateId) return;
    setLoading(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data, error } = await supabase
      .from("instances")
      .insert({
        template_id: templateId,
        location_id: locationId || null,
        inspector_id: userData.user.id,
        status: "draft",
      })
      .select("id")
      .single();
    setLoading(false);
    if (error || !data) return alert(error?.message);
    router.push(`/inspect/${data.id}`);
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="tpl">Template</Label>
        <Select id="tpl" value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="w-full">
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="loc">Location</Label>
        <Select id="loc" value={locationId} onChange={(e) => setLocationId(e.target.value)} className="w-full">
          <option value="">— None —</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex justify-end pt-2">
        <Button onClick={start} disabled={loading}>
          {loading ? "Starting…" : "Start inspection"}
        </Button>
      </div>
    </div>
  );
}
