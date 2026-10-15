/**
 * normalize.js — per-criterion normalization across all teams.
 *
 * Supported types: none | minmax | percentile | cap
 *
 * All functions take an array of raw values and return normalized values in [0, 1].
 * null inputs remain null (handled by onMissing in scoreTeams).
 */

function safeNumbers(values) {
  return values.filter((v) => v != null && isFinite(v));
}

export function normalizeNone(values) {
  return values; // pass-through
}

export function normalizeMinMax(values) {
  const nums = safeNumbers(values);
  if (nums.length === 0) return values.map(() => null);
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  if (max === min) return values.map((v) => (v == null ? null : 0.5));
  return values.map((v) => (v == null ? null : (v - min) / (max - min)));
}

export function normalizePercentile(values) {
  const valid = values
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => v != null && isFinite(v))
    .sort((a, b) => a.v - b.v);

  const result = new Array(values.length).fill(null);
  const n = valid.length;
  if (n === 0) return result;

  valid.forEach(({ i }, rank) => {
    result[i] = n === 1 ? 0.5 : rank / (n - 1);
  });
  return result;
}

export function normalizeCap(values, cap) {
  if (!cap || cap <= 0) return values.map(() => null);
  return values.map((v) => (v == null ? null : Math.min(v / cap, 1)));
}

/**
 * Dispatch to the right normalization function.
 * @param {(number|null)[]} values
 * @param {object} normalization - { type, cap? }
 * @returns {(number|null)[]}
 */
export function normalize(values, normalization) {
  switch (normalization?.type) {
    case "minmax":
      return normalizeMinMax(values);
    case "percentile":
      return normalizePercentile(values);
    case "cap":
      return normalizeCap(values, normalization.cap);
    case "none":
    default:
      return normalizeNone(values);
  }
}
