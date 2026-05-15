const PT = "America/Los_Angeles";

/** "3:42 PM PT" — short time + zone abbreviation (PST/PDT). */
export function formatPTTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: PT,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

/** "May 14, 2026, 3:42 PM PT" — date + short time + zone abbreviation. */
export function formatPTDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", {
    timeZone: PT,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}
