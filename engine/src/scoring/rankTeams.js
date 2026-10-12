export function rankTeams(scoredTeams, topX, options = {}) {
  if (!Array.isArray(scoredTeams)) {
    throw new Error("scoredTeams must be an array");
  }

  if (!Number.isInteger(topX) || topX <= 0) {
    throw new Error("topX must be a positive integer");
  }

  const tieBreakers = options.tieBreakers ?? ["teamId"];

  const rankedTeams = scoredTeams
    .filter(
      (team) =>
        typeof team.score === "number" &&
        Number.isFinite(team.score)
    )
    .sort((a, b) => {
      if (Math.abs(b.score - a.score) > 0.00001) {
        return b.score - a.score;
      }

      // Break ties according to configured tieBreakers
      for (const rule of tieBreakers) {
        if (rule === "dataCoverage") {
          const covA = a.dataCoverage ?? 0;
          const covB = b.dataCoverage ?? 0;
          if (Math.abs(covB - covA) > 0.0001) {
            return covB - covA;
          }
        } else if (rule === "teamId") {
          return String(a.teamId).localeCompare(String(b.teamId));
        } else {
          // Check metric score in breakdown if tie breaker specifies a metric id
          const metricA = a.breakdown?.find((item) => item.metric === rule)?.score ?? 0;
          const metricB = b.breakdown?.find((item) => item.metric === rule)?.score ?? 0;
          if (Math.abs(metricB - metricA) > 0.0001) {
            return metricB - metricA;
          }
        }
      }

      return String(a.teamId).localeCompare(String(b.teamId));
    })
    .map((team, index) => ({
      ...team,
      rank: index + 1
    }));

  return {
    rankedTeams,
    shortlist: rankedTeams.slice(0, topX)
  };
}