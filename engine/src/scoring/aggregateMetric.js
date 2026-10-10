export function aggregateMetric(values, method) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  const validValues = values.filter(
    (value) => typeof value === "number" && Number.isFinite(value)
  );

  if (validValues.length === 0) {
    return null;
  }

  if (method === "mean") {
    return (
      validValues.reduce((sum, value) => sum + value, 0) /
      validValues.length
    );
  }

  if (method === "max") {
    return Math.max(...validValues);
  }

  if (method === "mean_max") {
    const mean =
      validValues.reduce((sum, value) => sum + value, 0) /
      validValues.length;

    const maximum = Math.max(...validValues);

    return (mean + maximum) / 2;
  }

  throw new Error(`Unsupported aggregation method: ${method}`);
}