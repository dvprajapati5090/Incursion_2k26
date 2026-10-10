
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

    case "eq":
      return value === filter.value ? "pass" : "fail";

    case "in":
      return Array.isArray(filter.value) && filter.value.includes(value)
        ? "pass"
        : "fail";

    default:
      throw new Error(`Unsupported filter operator: ${filter.operator}`);
  }
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
      const value = getFieldValue(team, filter.field);
      const result = evaluateFilter(value, filter);

      if (result === "fail") {
        failed = true;
        reasons.push(`Failed eligibility rule: ${filter.field}`);
      } else if (result === "review") {
        needsReview = true;
        reasons.push(`Missing data for eligibility rule: ${filter.field}`);
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
