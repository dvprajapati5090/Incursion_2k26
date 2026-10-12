
function getFieldValue(team, field) {
  if (field === "team.size") {
    return (team.members ?? []).length;
  }

  if (field.startsWith("field.")) {
    return team.fields?.[field.slice("field.".length)];
  }

  return undefined;
}

function evaluateFilter(value, filter) {
  if (value === undefined || value === null) {
    return "review";
  }

  switch (filter.operator) {
    case "gte":
      return typeof value === "number" && value >= filter.value
        ? "pass"
        : "fail";

    case "lte":
      return typeof value === "number" && value <= filter.value
        ? "pass"
        : "fail";

    case "gt":
      return typeof value === "number" && value > filter.value
        ? "pass"
        : "fail";

    case "lt":
      return typeof value === "number" && value < filter.value
        ? "pass"
        : "fail";

    case "eq":
      return value === filter.value ? "pass" : "fail";

    case "neq":
      return value !== filter.value ? "pass" : "fail";

    case "in":
      return Array.isArray(filter.value) && filter.value.includes(value)
        ? "pass"
        : "fail";

    case "exists":
      return value !== null && value !== undefined && value !== ""
        ? "pass"
        : "fail";

    default:
      throw new Error(`Unsupported filter operator: ${filter.operator}`);
  }
}

function evaluateMemberFilter(team, filter) {
  const members = team.members ?? [];
  if (members.length === 0) {
    return { status: "fail", reason: `Team has no members for rule: ${filter.field}` };
  }

  const scope = filter.scope ?? "any_member";
  let anyPassed = false;
  let allPassed = true;
  let anyMissing = false;

  for (const member of members) {
    let val;
    let isMissing = false;

    if (filter.field.startsWith("source.")) {
      const srcName = filter.field.slice("source.".length);
      val = member.sources?.[srcName]?.url ?? member.sources?.[srcName];
      if (!val) isMissing = true;
    } else {
      const metric = member.metrics?.[filter.field];
      if (
        !metric ||
        metric.status !== "ok" ||
        metric.value === null ||
        metric.value === undefined
      ) {
        isMissing = true;
      } else {
        val = metric.value;
      }
    }

    if (isMissing) {
      anyMissing = true;
      allPassed = false;
    } else {
      const res = evaluateFilter(val, filter);
      if (res === "pass") {
        anyPassed = true;
      } else {
        allPassed = false;
      }
    }
  }

  if (scope === "any_member") {
    if (anyPassed) {
      return { status: "pass" };
    }
    if (anyMissing) {
      return {
        status: "review",
        reason: `Missing data for rule: at least one member with ${filter.field} ${filter.operator} ${filter.value}`
      };
    }
    return {
      status: "fail",
      reason: `Failed rule: no member met ${filter.field} ${filter.operator} ${filter.value}`
    };
  }

  if (scope === "all_members") {
    if (allPassed) {
      return { status: "pass" };
    }
    if (anyMissing) {
      return {
        status: "review",
        reason: `Missing data for rule: all members must meet ${filter.field}`
      };
    }
    return {
      status: "fail",
      reason: `Failed rule: not all members met ${filter.field} ${filter.operator} ${filter.value}`
    };
  }

  throw new Error(`Unsupported filter scope: ${scope}`);
}

function isMemberRule(filter) {
  if (filter.scope === "any_member" || filter.scope === "all_members") {
    return true;
  }
  if (filter.scope === "team") {
    return false;
  }
  if (filter.field === "team.size" || filter.field.startsWith("field.")) {
    return false;
  }
  return true;
}

export function applyEligibilityFilters(teams, filters = []) {
  if (!Array.isArray(teams)) {
    throw new Error("teams must be an array");
  }

  if (!Array.isArray(filters)) {
    throw new Error("filters must be an array");
  }

  const eligibleTeams = [];
  const rejectedTeams = [];
  const reviewTeams = [];

  for (const team of teams) {
    const reasons = [];
    let failed = false;
    let needsReview = false;

    for (const filter of filters) {
      if (isMemberRule(filter)) {
        const evalRes = evaluateMemberFilter(team, filter);
        if (evalRes.status === "fail") {
          failed = true;
          reasons.push(evalRes.reason);
        } else if (evalRes.status === "review") {
          needsReview = true;
          reasons.push(evalRes.reason);
        }
      } else {
        const value = getFieldValue(team, filter.field);
        const result = evaluateFilter(value, filter);

        if (result === "fail") {
          failed = true;
          reasons.push(`Failed eligibility rule: ${filter.field} ${filter.operator} ${filter.value}`);
        } else if (result === "review") {
          needsReview = true;
          reasons.push(`Missing data for eligibility rule: ${filter.field}`);
        }
      }
    }

    if (failed) {
      rejectedTeams.push({ ...team, eligibilityReasons: reasons });
    } else if (needsReview) {
      reviewTeams.push({ ...team, eligibilityReasons: reasons });
    } else {
      eligibleTeams.push(team);
    }
  }

  return { eligibleTeams, rejectedTeams, reviewTeams };
}
