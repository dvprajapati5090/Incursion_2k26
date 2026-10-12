/**
 * Performs pairwise / head-to-head comparison between two teams
 * across all configured scoring criteria.
 */
export function compareTeams(teamA, teamB) {
  if (!teamA || !teamB || typeof teamA !== "object" || typeof teamB !== "object") {
    throw new Error("Both teamA and teamB must be valid objects");
  }

  const breakdownA = new Map(
    (teamA.breakdown ?? []).map((b) => [b.metric, b])
  );
  const breakdownB = new Map(
    (teamB.breakdown ?? []).map((b) => [b.metric, b])
  );

  const allMetrics = Array.from(
    new Set([...breakdownA.keys(), ...breakdownB.keys()])
  );

  let teamAWins = 0;
  let teamBWins = 0;
  let ties = 0;

  const comparison = allMetrics.map((metric) => {
    const itemA = breakdownA.get(metric);
    const itemB = breakdownB.get(metric);

    const scoreA = itemA?.score ?? null;
    const scoreB = itemB?.score ?? null;
    const weight = itemA?.weight ?? itemB?.weight ?? 1;

    let winner = "tie";
    let diff = null;

    if (scoreA !== null && scoreB !== null) {
      diff = scoreA - scoreB;
      if (diff > 0.001) {
        winner = "teamA";
        teamAWins++;
      } else if (diff < -0.001) {
        winner = "teamB";
        teamBWins++;
      } else {
        winner = "tie";
        ties++;
      }
    } else if (scoreA !== null && scoreB === null) {
      winner = "teamA";
      diff = scoreA;
      teamAWins++;
    } else if (scoreA === null && scoreB !== null) {
      winner = "teamB";
      diff = -scoreB;
      teamBWins++;
    } else {
      ties++;
    }

    return {
      metric,
      weight,
      teamAScore: scoreA,
      teamBScore: scoreB,
      winner,
      scoreDiff: diff !== null ? Number(diff.toFixed(2)) : null
    };
  });

  const scoreA = teamA.score ?? 0;
  const scoreB = teamB.score ?? 0;
  const overallDiff = Number((scoreA - scoreB).toFixed(2));

  let overallWinner = "tie";
  if (overallDiff > 0.001) {
    overallWinner = "teamA";
  } else if (overallDiff < -0.001) {
    overallWinner = "teamB";
  }

  const nameA = teamA.teamName ?? teamA.teamId ?? "Team A";
  const nameB = teamB.teamName ?? teamB.teamId ?? "Team B";

  let summary = "";
  if (overallWinner === "teamA") {
    summary = `${nameA} leads ${nameB} by +${overallDiff} composite points (won ${teamAWins} of ${comparison.length} criteria).`;
  } else if (overallWinner === "teamB") {
    summary = `${nameB} leads ${nameA} by +${Math.abs(overallDiff)} composite points (won ${teamBWins} of ${comparison.length} criteria).`;
  } else {
    summary = `${nameA} and ${nameB} are tied with identical composite scores.`;
  }

  return {
    teamAId: teamA.teamId,
    teamBId: teamB.teamId,
    overallWinner,
    overallScoreDiff: overallDiff,
    criteriaComparison: comparison,
    teamAWins,
    teamBWins,
    ties,
    summary
  };
}
