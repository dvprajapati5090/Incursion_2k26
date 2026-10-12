
export function normalizeNumeric(value, min, max, direction = "higher") {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("Value must be a finite number");
  }

  if (
    typeof min !== "number" ||
    typeof max !== "number" ||
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    max <= min
  ) {
    throw new Error("Invalid normalization range");
  }

  if (direction !== "higher" && direction !== "lower") {
    throw new Error("Direction must be 'higher' or 'lower'");
  }

  const boundedValue = Math.max(min, Math.min(value, max));
  const normalizedScore = ((boundedValue - min) / (max - min)) * 100;

  return direction === "higher"
    ? normalizedScore
    : 100 - normalizedScore;
}
