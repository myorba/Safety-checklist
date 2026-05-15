// TEMPORARY DIAGNOSTIC — delete after verifying prod env vars.
// Returns masked previews so we can see what's actually injected at build time.
import { NextResponse } from "next/server";

function mask(v: string | undefined) {
  if (!v) return { value: null, length: 0 };
  return {
    head: v.slice(0, 8),
    tail: v.slice(-6),
    length: v.length,
    hasLeadingSpace: /^\s/.test(v),
    hasTrailingSpace: /\s$/.test(v),
    hasNewline: /\n|\r/.test(v),
    hasQuote: /["']/.test(v),
  };
}

// Compare against the known-good values from local .env.local
const EXPECTED_URL = "https://gcyxunglcmmalwvzdype.supabase.co";
const EXPECTED_KEY_HEAD = "eyJhbGci";
const EXPECTED_KEY_TAIL = "8LFqtI";
const EXPECTED_KEY_LENGTH = 219;

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const urlMask = mask(url);
  const keyMask = mask(key);

  return NextResponse.json(
    {
      NEXT_PUBLIC_SUPABASE_URL: {
        ...urlMask,
        matchesExpected: url === EXPECTED_URL,
      },
      NEXT_PUBLIC_SUPABASE_ANON_KEY: {
        ...keyMask,
        matchesExpectedHead: keyMask.head === EXPECTED_KEY_HEAD,
        matchesExpectedTail: keyMask.tail === EXPECTED_KEY_TAIL,
        matchesExpectedLength: keyMask.length === EXPECTED_KEY_LENGTH,
      },
      diagnosis: diagnose(urlMask, url, keyMask),
    },
    { status: 200 },
  );
}

function diagnose(
  urlMask: ReturnType<typeof mask>,
  url: string | undefined,
  keyMask: ReturnType<typeof mask>,
) {
  const issues: string[] = [];
  if (!url) issues.push("URL is undefined — env var not reaching build");
  else if (url !== EXPECTED_URL) issues.push(`URL mismatch: got "${url}"`);
  if (!keyMask.length) issues.push("KEY is undefined — env var not reaching build");
  if (keyMask.length && keyMask.length !== EXPECTED_KEY_LENGTH)
    issues.push(`KEY wrong length: got ${keyMask.length}, expected ${EXPECTED_KEY_LENGTH}`);
  if (keyMask.head !== EXPECTED_KEY_HEAD && keyMask.length)
    issues.push(`KEY wrong start: got "${keyMask.head}", expected "${EXPECTED_KEY_HEAD}"`);
  if (keyMask.tail !== EXPECTED_KEY_TAIL && keyMask.length)
    issues.push(`KEY wrong end: got "${keyMask.tail}", expected "${EXPECTED_KEY_TAIL}"`);
  if (keyMask.hasLeadingSpace || urlMask.hasLeadingSpace) issues.push("Leading whitespace");
  if (keyMask.hasTrailingSpace || urlMask.hasTrailingSpace) issues.push("Trailing whitespace");
  if (keyMask.hasNewline || urlMask.hasNewline) issues.push("Embedded newline");
  if (keyMask.hasQuote || urlMask.hasQuote) issues.push("Embedded quote character");
  return issues.length === 0 ? "Looks correct ✓" : issues;
}
