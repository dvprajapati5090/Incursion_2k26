/**
 * explain.js — attach structured reason codes to each team result.
 *
 * Reasons are generated from numbers, NOT by an LLM.
 * The UI converts reason codes to sentences using reasonToText() in exportUtils.js.
 *
 * Reason codes:
 *   STRENGTH         — top contributing criterion
 *   WEAKNESS         — criterion furthest below cutoff-team average
 *   MISSING_DATA     — criterion with missing/reweighted data
 *   BELOW_CUTOFF     — score below cutoff
 *   ABOVE_CUTOFF     — score above cutoff (shortlisted)
 *   BORDERLINE       — margin < 2%
 *   FILTER_FAIL      — rejected by a hard filter
 *   FILTER_FLAG      — flagged (not rejected) by a filter
 *   PINNED           — organizer pinned
 *   EXCLUDED         — organizer excluded
 *   COUNTERFACTUAL   — what would change the outcome (rejected teams only)
 */

const BORDERLINE_THRESHOLD = 0.02;

/**
 * Mutates team objects in-place, attaching .reasons[]
 * @param {object[]} teams       - all ranked results
 * @param {object}   config
 * @param {number}   cutoffScore
 */
export function attachExplanations(teams, config, cutoffScore) {
  // Compute cutoff-team average per criterion (for weakness detection)
  const shortlisted = teams.filter((t) => t.status === "shortlisted");
  const criterionAvg = {};
  if (shortlisted.length > 0) {
    const criteriaIds = (config.criteria ?? [])
      .filter((c) => c.enabled)
      .map((c) => c.id);
    for (const cId of criteriaIds) {
      const values = shortlisted
        .flatMap((t) => t.breakdown ?? [])
        .filter((b) => b.criterionId === cId && b.status === "ok")
        .map((b) => b.contribution);
      criterionAvg[cId] =
        values.length > 0
          ? values.reduce((s, v) => s + v, 0) / values.length
          : 0;
    }
  }

  for (const team of teams) {
    const reasons = [];

    // Filter results
    for (const fr of team.filterResults ?? []) {
      if (fr.result === "fail")
        reasons.push({ code: "FILTER_FAIL", filterId: fr.id });
      else if (fr.result === "flag")
        reasons.push({ code: "FILTER_FLAG", filterId: fr.id });
    }

    // Override reasons
    if (team.status === "shortlisted" && (config.overrides?.pin ?? []).includes(team.teamId))
      reasons.push({ code: "PINNED" });
    if (team.status === "excluded" && (config.overrides?.exclude ?? []).includes(team.teamId))
      reasons.push({ code: "EXCLUDED" });

    // Score vs cutoff
    const margin = team.margin ?? 0;
    if (team.status === "shortlisted" || team.status === "waitlisted") {
      reasons.push({ code: "ABOVE_CUTOFF", margin });
    } else if (team.status === "rejected" || team.status === "filter_rejected") {
      reasons.push({ code: "BELOW_CUTOFF", margin });
    }
    if (Math.abs(margin) < BORDERLINE_THRESHOLD) {
      reasons.push({ code: "BORDERLINE", margin });
    }

    // Top contributing criteria (strengths)
    const okBreakdown = (team.breakdown ?? [])
      .filter((b) => b.status === "ok")
      .sort((a, b) => b.contribution - a.contribution);

    for (const b of okBreakdown.slice(0, 2)) {
      reasons.push({ code: "STRENGTH", criterionId: b.criterionId });
    }

    // Weaknesses (criteria with biggest gap to shortlist average)
    const gapsByContrib = (team.breakdown ?? [])
      .filter((b) => b.status === "ok" && criterionAvg[b.criterionId] != null)
      .map((b) => ({
        criterionId: b.criterionId,
        gap: (criterionAvg[b.criterionId] ?? 0) - b.contribution,
      }))
      .filter((g) => g.gap > 0)
      .sort((a, b) => b.gap - a.gap);

    for (const g of gapsByContrib.slice(0, 2)) {
      reasons.push({ code: "WEAKNESS", criterionId: g.criterionId, gap: g.gap });
    }

    // Missing data
    for (const b of (team.breakdown ?? []).filter((b) => b.status === "missing")) {
      reasons.push({
        code: "MISSING_DATA",
        criterionId: b.criterionId,
        handling: b.handling,
      });
    }

    // Counterfactual for rejected teams
    if (
      team.status === "rejected" &&
      cutoffScore > 0 &&
      team.score != null
    ) {
      const gap = cutoffScore - team.score;
      // Find which criterion improvement would flip the result
      const candidateFlip = (team.breakdown ?? [])
        .filter(
          (b) =>
            b.status === "ok" &&
            b.normalized != null &&
            b.effectiveWeight > 0
        )
        .map((b) => ({
          criterionId: b.criterionId,
          // How much normalized improvement needed?
          normalizedNeeded: gap / b.effectiveWeight,
          currentNorm: b.normalized,
        }))
        .filter((c) => c.normalizedNeeded <= 1 - c.currentNorm)
        .sort((a, b) => a.normalizedNeeded - b.normalizedNeeded)[0];

      if (candidateFlip) {
        reasons.push({
          code: "COUNTERFACTUAL",
          criterionId: candidateFlip.criterionId,
          normalizedNeeded: Math.round(candidateFlip.normalizedNeeded * 100) / 100,
          gap: Math.round(gap * 10000) / 10000,
        });
      }
    }

    team.reasons = reasons;
  }
}
