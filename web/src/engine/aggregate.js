/**
 * aggregate.js — member-level → team-level aggregation.
 *
 * Supported strategies: max | mean | median | sum | top2_mean
 *
 * Null values are excluded before aggregation (they represent missing data).
 * If ALL values are null, the result is null.
 */

function safeNums(values) {
  return (values ?? []).filter((v) => v != null && isFinite(v));
}

export function aggregateMax(values) {
  const nums = safeNums(values);
  return nums.length === 0 ? null : Math.max(...nums);
}

export function aggregateMean(values) {
  const nums = safeNums(values);
  if (nums.length === 0) return null;
  return nums.reduce((s, v) => s + v, 0) / nums.length;
}

export function aggregateMedian(values) {
  const nums = safeNums(values).sort((a, b) => a - b);
  if (nums.length === 0) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

export function aggregateSum(values) {
  const nums = safeNums(values);
  return nums.length === 0 ? null : nums.reduce((s, v) => s + v, 0);
}

export function aggregateTop2Mean(values) {
  const nums = safeNums(values).sort((a, b) => b - a); // desc
  if (nums.length === 0) return null;
  const top2 = nums.slice(0, 2);
  return top2.reduce((s, v) => s + v, 0) / top2.length;
}

/**
 * Dispatch to the right aggregation function.
 * @param {(number|null)[]} values - per-member raw metric values
 * @param {string} aggregation
 * @returns {number|null}
 */
export function aggregate(values, aggregation) {
  switch (aggregation) {
    case "max":       return aggregateMax(values);
    case "mean":      return aggregateMean(values);
    case "median":    return aggregateMedian(values);
    case "sum":       return aggregateSum(values);
    case "top2_mean": return aggregateTop2Mean(values);
    default:          return aggregateMean(values);
  }
}
