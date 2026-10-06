import { getMetric, isComputed } from "./registry.js";

export const STATUS = {
  OK: "ok",
  NOT_PROVIDED: "not_provided",
  FETCH_FAILED: "fetch_failed",
  LOW_CONFIDENCE: "low_confidence",
};

// LLM/parsed values below this confidence are tagged low_confidence
export const LOW_CONFIDENCE_THRESHOLD = 0.6;

function typeMatches(type, value) {
  switch (type) {
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "boolean":
      return typeof value === "boolean";
    case "string":
      return typeof value === "string";
    case "string_list":
      return Array.isArray(value) && value.every((v) => typeof v === "string");
    default:
      return false;
  }
}

function assertWritable(metricId) {
  const def = getMetric(metricId);
  if (!def) throw new Error(`Unknown metric id: ${metricId}`);
  if (isComputed(metricId))
    throw new Error(
      `Metric ${metricId} is computed by the engine; do not provide it`,
    );
  return def;
}

export function ok(metricId, value, { origin = null, confidence } = {}) {
  const def = assertWritable(metricId);
  if (!typeMatches(def.type, value)) {
    throw new Error(
      `Metric ${metricId} expects ${def.type}, got ${JSON.stringify(value)}`,
    );
  }
  const entry = { value, status: STATUS.OK, origin };
  if (confidence !== undefined) {
    entry.confidence = confidence;
    if (confidence < LOW_CONFIDENCE_THRESHOLD)
      entry.status = STATUS.LOW_CONFIDENCE;
  }
  return entry;
}

export const notProvided = () => ({
  value: null,
  status: STATUS.NOT_PROVIDED,
  origin: null,
});

export const fetchFailed = (origin, error) => ({
  value: null,
  status: STATUS.FETCH_FAILED,
  origin,
  error: String(error),
});

export function setMetric(member, metricId, entry) {
  assertWritable(metricId);
  member.metrics[metricId] = entry;
}
