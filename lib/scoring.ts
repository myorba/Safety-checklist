import type { Response, StatusOption } from "./types";

export type ScoreResult = {
  score: number;
  result: "PASS" | "FAIL";
  passing: number;
  failing: number;
  notApplicable: number;
  unanswered: number;
  applicable: number;
};

/**
 * Auto-score from responses against the template's status_options.
 * Items with passing === null (e.g. NA) are excluded from the denominator.
 * Items with no status are counted as unanswered (also excluded).
 */
export function scoreInstance(
  responses: Pick<Response, "status_code">[],
  totalItems: number,
  statusOptions: StatusOption[],
  passThreshold: number,
): ScoreResult {
  const byCode = new Map(statusOptions.map((o) => [o.code, o]));

  let passing = 0;
  let failing = 0;
  let notApplicable = 0;
  let answered = 0;

  for (const r of responses) {
    if (!r.status_code) continue;
    const opt = byCode.get(r.status_code);
    if (!opt) continue;
    answered++;
    if (opt.passing === true) passing++;
    else if (opt.passing === false) failing++;
    else notApplicable++;
  }

  const unanswered = Math.max(0, totalItems - answered);
  const applicable = passing + failing;
  const score = applicable === 0 ? 0 : (passing / applicable) * 100;
  const result: "PASS" | "FAIL" = score >= passThreshold ? "PASS" : "FAIL";

  return {
    score: Math.round(score * 10) / 10,
    result,
    passing,
    failing,
    notApplicable,
    unanswered,
    applicable,
  };
}
