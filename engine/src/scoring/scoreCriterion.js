import { normalizeNumeric } from "./normalize.js";
import { aggregateMetric } from "./aggregateMetric.js";

export function scoreCriterion(team, criterion) {
  const values = [];
  let availableMembers = 0;

  for (const member of team.members ?? []) {
    const metric = member.metrics?.[criterion.metric];

    if (
      !metric ||
      metric.status !== "ok" ||
      typeof metric.value !== "number" ||
      !Number.isFinite(metric.value)
    ) {
      continue;
    }

    const { min, max } = criterion.normalization;

    
const normalizedValue = normalizeNumeric(
  metric.value,
  min,
  max,
  criterion.direction ?? "higher"
);


    values.push(normalizedValue);
    availableMembers++;
  }

  const score = aggregateMetric(values, criterion.aggregation);

  return {
    metric: criterion.metric,
    score,
    availableMembers,
    totalMembers: (team.members ?? []).length,
    coverage:
      (team.members ?? []).length === 0
        ? 0
        : availableMembers / team.members.length
  };
}