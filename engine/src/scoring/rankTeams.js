export function rankTeams(scoredTeams, topX) {
  if (!Array.isArray(scoredTeams)) {
    throw new Error("scoredTeams must be an array");
  }

  if (!Number.isInteger(topX) || topX <= 0) {
    throw new Error("topX must be a positive integer");
  }

  const rankedTeams = scoredTeams
    .filter(
      (team) =>
        typeof team.score === "number" &&
        Number.isFinite(team.score)
    )
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
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