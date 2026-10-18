import { scoreCriterion } from "./scoreCriterion.js";

export function calculateTeamScore(team, criteria) {
  let weightedScore = 0;
  let evaluatedWeight = 0;
  let totalWeight = 0;

  const breakdown = [];

  for (const criterion of criteria) {
    totalWeight += criterion.weight;

    const result = scoreCriterion(team, criterion);

    breakdown.push({
      ...result,
      weight: criterion.weight
    });

    if (result.score === null || criterion.weight === 0) {
      continue;
    }

    weightedScore += result.score * criterion.weight;
    evaluatedWeight += criterion.weight;
  }

  return {
    ...team,
    teamId: team.teamId,
    teamName: team.teamName,
    score:
      evaluatedWeight === 0
        ? null
        : weightedScore / evaluatedWeight,
    dataCoverage:
      totalWeight === 0
        ? 0
        : evaluatedWeight / totalWeight,
    breakdown
  };
}
