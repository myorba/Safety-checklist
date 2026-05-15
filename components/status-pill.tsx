import type { StatusOption } from "@/lib/types";

const COLOR_CLASSES: Record<StatusOption["color"], string> = {
  green: "bg-green-100 text-green-800 ring-green-200",
  amber: "bg-amber-100 text-amber-800 ring-amber-200",
  red: "bg-red-100 text-red-800 ring-red-200",
  gray: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  blue: "bg-blue-100 text-blue-800 ring-blue-200",
  purple: "bg-purple-100 text-purple-800 ring-purple-200",
};

export function StatusPill({
  option,
  size = "sm",
}: {
  option: StatusOption;
  size?: "sm" | "xs";
}) {
  return (
    <span
      className={`inline-flex items-center rounded ring-1 font-medium ${
        COLOR_CLASSES[option.color] ?? COLOR_CLASSES.gray
      } ${size === "xs" ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-0.5"}`}
    >
      {option.code}
    </span>
  );
}

export function ResultBadge({ result }: { result: "PASS" | "FAIL" | null }) {
  if (!result) return null;
  const cls =
    result === "PASS"
      ? "bg-green-100 text-green-800 ring-green-200"
      : "bg-red-100 text-red-800 ring-red-200";
  return (
    <span className={`inline-flex items-center rounded ring-1 px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {result}
    </span>
  );
}
