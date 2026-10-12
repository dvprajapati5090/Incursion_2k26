
const AGGREGATIONS = new Set(["mean", "max", "mean_max"]);

export function validateConfig(config, registry) {
  const errors = [];

  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("Configuration must be an object");
  }

  if (!Number.isInteger(config.topX) || config.topX <= 0) {
    errors.push("topX must be a positive integer");
  }

  if (!Array.isArray(config.criteria) || config.criteria.length === 0) {
    errors.push("At least one scoring criterion is required");
  } else {
    const validMetrics = new Set(
      (registry?.metrics ?? []).map((metric) => metric.id)
    );

    const usedMetrics = new Set();
    let totalWeight = 0;

    for (const criterion of config.criteria) {
      if (!criterion || typeof criterion !== "object") {
        errors.push("Each criterion must be an object");
        continue;
      }

      if (!validMetrics.has(criterion.metric)) {
        errors.push(`Unknown metric: ${criterion.metric}`);
      }

      if (usedMetrics.has(criterion.metric)) {
        errors.push(`Duplicate criterion: ${criterion.metric}`);
      }
      usedMetrics.add(criterion.metric);

      if (
        typeof criterion.weight !== "number" ||
        !Number.isFinite(criterion.weight) ||
        criterion.weight < 0
      ) {
        errors.push(`Invalid weight for ${criterion.metric}`);
      } else {
        totalWeight += criterion.weight;
      }

      if (!AGGREGATIONS.has(criterion.aggregation)) {
        errors.push(`Unsupported aggregation for ${criterion.metric}`);
      }

      const normalization = criterion.normalization;

      if (
        !normalization ||
        normalization.method !== "linear" ||
        typeof normalization.min !== "number" ||
        typeof normalization.max !== "number" ||
        !Number.isFinite(normalization.min) ||
        !Number.isFinite(normalization.max) ||
        normalization.max <= normalization.min
      ) {
        errors.push(`Invalid normalization for ${criterion.metric}`);
      }
    }

    if (totalWeight <= 0) {
      errors.push("At least one criterion must have a positive weight");
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid configuration:\n${errors.join("\n")}`);
  }

  return true;
}
