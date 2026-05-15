"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";

export default function NewTemplateButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function create() {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("templates")
      .insert({ name: "Untitled template" })
      .select("id")
      .single();
    setLoading(false);
    if (error || !data) {
      alert(error?.message ?? "Failed to create template");
      return;
    }
    router.push(`/templates/${data.id}`);
  }

  return (
    <Button onClick={create} disabled={loading}>
      {loading ? "Creating…" : "+ New template"}
    </Button>
  );
}
