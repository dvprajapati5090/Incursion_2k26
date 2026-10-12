/**
 * applyFilters — evaluate each hard filter / eligibility rule against a team.
 *
 * Returns teams with an attached `filterResults` array, each entry:
 *   { id, label, result: "pass"|"fail"|"warn"|"flag", reason }
 *
 * A team is `filterRejected` when ANY enabled filter with mode="reject" returns "fail".
 */

/**
 * Get a metric value for a member. Returns { value, status } or { value: null, status: "not_provided" }.
 */
function getMemberMetric(member, metricId) {
  const m = member.metrics?.[metricId];
  if (!m) return { value: null, status: "not_provided" };
  return m;
}

/**
 * Evaluate a comparison op against a value.
 */
function evalOp(memberVal, op, threshold) {
  if (op === "exists") return memberVal != null;
  if (memberVal == null) return false;
  switch (op) {
    case ">=": return memberVal >= threshold;
    case ">":  return memberVal > threshold;
    case "<=": return memberVal <= threshold;
    case "<":  return memberVal < threshold;
    case "==": return memberVal == threshold; // eslint-disable-line eqeqeq
    case "!=": return memberVal != threshold; // eslint-disable-line eqeqeq
    case "contains":
      return Array.isArray(memberVal)
        ? memberVal.includes(threshold)
        : String(memberVal).includes(String(threshold));
    default:   return false;
  }
}

/**
 * Evaluate one filter against all members of a team.
 * @returns {"pass"|"fail"|"missing"} — "missing" means data needed is absent.
 */
function evalFilter(filter, members) {
  const { metric, op, value, scope } = filter;

  const evaluations = members.map((m) => {
    const { value: mVal, status } = getMemberMetric(m, metric);
    const dataPresent = status === "ok" || status === "low_confidence";
    return { dataPresent, passes: dataPresent ? evalOp(mVal, op, value) : false };
  });

  const hasData    = evaluations.some((e) => e.dataPresent);
  const allHaveData = evaluations.every((e) => e.dataPresent);

  if (!hasData) return "missing";

  switch (scope?.type ?? "any_member") {
    case "any_member":
      return evaluations.some((e) => e.passes) ? "pass" : "fail";
    case "all_members":
      return !allHaveData
        ? "missing"
        : evaluations.every((e) => e.passes)
        ? "pass"
        : "fail";
    case "at_least_n_members": {
      const n = scope.n ?? 1;
      const passing = evaluations.filter((e) => e.passes).length;
      return passing >= n ? "pass" : "fail";
    }
    case "team":
      // team-level filters use member[0] as proxy (or custom field logic)
      return evaluations[0]?.passes ? "pass" : "fail";
    default:
      return evaluations.some((e) => e.passes) ? "pass" : "fail";
  }
}

/**
 * @param {object[]} teams
 * @param {object[]} filters - config.filters
 * @returns {object[]} teams with .filterResults and .filterRejected
 */
export function applyFilters(teams, filters) {
  return teams.map((team) => {
    const filterResults = [];
    let filterRejected = false;

    for (const filter of filters) {
      if (!filter.enabled) {
        filterResults.push({ id: filter.id, label: filter.label, result: "skipped" });
        continue;
      }

      const evalResult = evalFilter(filter, team.members ?? []);

      let result;
      if (evalResult === "missing") {
        // onMissing: "fail" = treat as failed, "pass" = treat as passed, "flag" = keep but mark
        result = filter.onMissing === "fail" ? "fail"
               : filter.onMissing === "pass" ? "pass"
               : "flag"; // default "flag" — keeps team but marks it
      } else {
        result = evalResult; // "pass" | "fail"
        if (result === "fail" && filter.mode === "warn") result = "warn";
      }

      if (result === "fail" && filter.mode === "reject") {
        filterRejected = true;
      }

      filterResults.push({ id: filter.id, label: filter.label, result });
    }

    return { ...team, filterResults, filterRejected };
  });
}
