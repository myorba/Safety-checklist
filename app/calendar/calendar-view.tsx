"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, Button } from "@/components/ui";
import { formatPTTime, formatPTDateTime } from "@/lib/format";
import type { CalendarInstance } from "./page";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function initials(p: CalendarInstance["inspector"]) {
  if (!p) return "—";
  const source = p.full_name?.trim() || p.email;
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    // single name or email — take first 2 letters of local-part
    const base = parts[0].split("@")[0];
    return base.slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function CalendarView({
  year,
  month,
  instances,
}: {
  year: number;
  month: number; // 1-indexed
  instances: CalendarInstance[];
}) {
  const router = useRouter();

  const firstOfMonth = new Date(year, month - 1, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells: Array<{ day: number; iso: string } | null> = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, iso });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const byDay: Record<string, CalendarInstance[]> = {};
  for (const i of instances) {
    if (!i.submitted_at) continue;
    const d = new Date(i.submitted_at);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    (byDay[iso] ||= []).push(i);
  }

  function go(deltaMonths: number) {
    const next = new Date(year, month - 1 + deltaMonths, 1);
    const m = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
    router.push(`/calendar?month=${m}`);
  }

  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">All submitted inspections.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => go(-1)}>
            <ChevronLeft size={16} />
          </Button>
          <div className="font-medium min-w-[10rem] text-center">
            {MONTH_NAMES[month - 1]} {year}
          </div>
          <Button variant="secondary" onClick={() => go(1)}>
            <ChevronRight size={16} />
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              const t = new Date();
              router.push(`/calendar?month=${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`);
            }}
          >
            Today
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-7 bg-muted text-xs font-semibold text-muted-foreground uppercase">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 py-2 text-center border-r border-border last:border-r-0">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell, idx) => {
            const isToday = cell?.iso === todayIso;
            return (
              <div
                key={idx}
                className={`min-h-[120px] border-r border-b border-border last-of-type:border-r-0 p-2 ${
                  cell ? "bg-card" : "bg-background/50"
                } ${isToday ? "ring-2 ring-accent ring-inset" : ""}`}
              >
                {cell && (
                  <>
                    <div className={`text-xs font-semibold mb-1 ${isToday ? "text-accent" : "text-muted-foreground"}`}>
                      {cell.day}
                    </div>
                    <div className="space-y-1">
                      {(byDay[cell.iso] ?? []).map((inst) => (
                        <Link
                          key={inst.id}
                          href={`/inspect/${inst.id}/view`}
                          className={`block text-[11px] leading-tight px-1.5 py-1 rounded ring-1 hover:opacity-80 ${
                            inst.overall_result === "PASS"
                              ? "bg-green-50 ring-green-200 text-green-900"
                              : "bg-red-50 ring-red-200 text-red-900"
                          }`}
                          title={[
                            inst.templates?.name ?? "Inspection",
                            inst.locations?.name,
                            inst.inspector?.full_name || inst.inspector?.email,
                            formatPTDateTime(inst.submitted_at),
                            `${inst.overall_score?.toFixed(1) ?? "—"}% (${inst.overall_result ?? "—"})`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        >
                          <div className="flex items-center gap-1.5 font-mono text-[10px] opacity-75">
                            <span>{formatPTTime(inst.submitted_at)}</span>
                            <span className="px-1 rounded bg-white/60 ring-1 ring-current/20 font-semibold">
                              {initials(inst.inspector)}
                            </span>
                            <span className="ml-auto">{inst.overall_score?.toFixed(0) ?? "—"}%</span>
                          </div>
                          <div className="font-medium truncate mt-0.5">
                            {inst.templates?.name ?? "Inspection"}
                          </div>
                          {inst.locations?.name && (
                            <div className="truncate text-[10px] opacity-75">
                              {inst.locations.name}
                            </div>
                          )}
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
