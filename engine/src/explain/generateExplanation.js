/**
 * Generates transparent, human-readable explanations for why a team
 * was shortlisted, ranked at a particular position, flagged for review, or rejected.
 */
export function generateExplanation(team, config = {}) {
  if (!team || typeof team !== "object") {
    throw new Error("team must be an object");
  }

  // 1. Ineligible / Rejected team
  if (Array.isArray(team.eligibilityReasons) && team.score === undefined) {
    const isReview = team.eligibilityReasons.some((r) =>
      r.toLowerCase().includes("missing data")
    );
    const status = isReview ? "review" : "rejected";
    const label = isReview ? "Flagged for organizer review" : "Rejected from shortlist";

    return {
      teamId: team.teamId,
      teamName: team.teamName ?? team.teamId,
      status,
      score: null,
      summary: `${label}: ${team.eligibilityReasons.join("; ")}.`,
      reasons: team.eligibilityReasons,
      strengths: [],
      growthAreas: [],
      missingDataNotes: []
    };
  }

  // 2. Scored team
  const breakdown = team.breakdown ?? [];
  const validBreakdowns = breakdown.filter(
    (b) => typeof b.score === "number" && Number.isFinite(b.score)
  );
  const missingBreakdowns = breakdown.filter((b) => b.score === null);

  // Sort by highest score for strengths, lowest score for growth areas
  const sortedByScore = [...validBreakdowns].sort((a, b) => b.score - a.score);

  const strengths = sortedByScore
    .slice(0, 2)
    .filter((b) => b.score >= 50)
    .map(
      (b) =>
        `Strong ${b.metric} performance (${b.score.toFixed(1)}/100, weight: ${b.weight ?? "N/A"})`
    );

  const growthAreas = sortedByScore
    .slice(-2)
    .reverse()
    .filter((b) => b.score < 50)
    .map(
      (b) =>
        `Lower ${b.metric} score (${b.score.toFixed(1)}/100, weight: ${b.weight ?? "N/A"})`
    );

  const missingDataNotes = missingBreakdowns.map((b) => {
    return `No data available for ${b.metric}; weight (${b.weight ?? 0}) was dynamically redistributed without penalty.`;
  });

  const coveragePct =
    typeof team.dataCoverage === "number"
      ? `${Math.round(team.dataCoverage * 100)}%`
      : "N/A";

  const rankStr = team.rank ? `Ranked #${team.rank}` : "Evaluated";
  const scoreStr =
    typeof team.score === "number" ? `${team.score.toFixed(1)}/100` : "unscored";

  let summary = `${rankStr} with a composite score of ${scoreStr} (Data Coverage: ${coveragePct}).`;
  if (strengths.length > 0) {
    summary += ` Highlight: ${strengths[0]}.`;
  }
  if (missingDataNotes.length > 0) {
    summary += ` Note: ${missingDataNotes.length} unscored criteria were safely redistributed.`;
  }

  return {
    teamId: team.teamId,
    teamName: team.teamName ?? team.teamId,
    rank: team.rank ?? null,
    score: team.score ?? null,
    status: team.score !== null ? "scored" : "unscored",
    dataCoverage: team.dataCoverage ?? 0,
    summary,
    strengths,
    growthAreas,
    missingDataNotes
  };
}
