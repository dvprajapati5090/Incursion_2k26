/**
 * handoffFormatters.js — Helpers and dictionaries based on the Enrichment Backend: Frontend Handoff.
 *
 * Implements:
 * - Metric status badges: ok, not_provided, fetch_failed, low_confidence
 * - Failure reason error descriptions (Section 9)
 * - All 9 profile flag definitions and severity mappings (Section 7)
 * - Safe detail redact for Blind Review mode (Must-do UI Rule #6)
 * - Footnote & special case handlers (365+ days, SPA text notes, LinkedIn PDF reasons)
 */

export const METRIC_STATUSES = {
  OK: "ok",
  NOT_PROVIDED: "not_provided",
  FETCH_FAILED: "fetch_failed",
  LOW_CONFIDENCE: "low_confidence",
};

/**
 * Status badge presentation styles
 */
export const STATUS_BADGE_CONFIG = {
  ok: {
    label: "Available",
    badgeClass: "bg-emerald-500/15 border-[#415A77]/40 text-emerald-300",
    dotClass: "bg-emerald-400",
  },
  not_provided: {
    label: "Not Provided",
    badgeClass: "bg-slate-700/30 border-slate-600/30 text-[#778DA9]/80",
    dotClass: "bg-slate-500",
  },
  fetch_failed: {
    label: "Could Not Fetch",
    badgeClass: "bg-rose-500/15 border-rose-500/30 text-rose-300",
    dotClass: "bg-rose-400",
  },
  low_confidence: {
    label: "Uncertain",
    badgeClass: "bg-amber-500/15 border-amber-500/30 text-amber-300",
    dotClass: "bg-amber-400",
  },
};

/**
 * Human-friendly error translations per Section 9 of the handoff spec
 */
export function formatFailureReason(errorStr) {
  if (!errorStr) return "Signal fetch failed";

  const err = String(errorStr).toLowerCase();

  if (err.includes("invalid_github_url")) {
    return "The GitHub link is not a profile link";
  }
  if (err.includes("github_user_not_found")) {
    return "That GitHub user does not exist";
  }
  if (
    err.includes("github_rate_limited") ||
    err.includes("github_bad_token") ||
    err.includes("github_forbidden")
  ) {
    return "Server-side GitHub access problem; rerun later or notify admin";
  }
  if (err.includes("resume_http_404") || err.includes("resume_http_403")) {
    return "Resume link is dead or private";
  }
  if (err.includes("resume_not_a_pdf_or_link_not_public")) {
    return "Link is not a public PDF";
  }
  if (err.includes("resume_no_text_scanned_pdf")) {
    return "PDF is an image (no selectable text)";
  }
  if (err.includes("resume_too_large")) {
    return "PDF exceeds 10 MB limit";
  }
  if (
    err.includes("resume_fetch_timeout") ||
    err.includes("resume_fetch_network_error")
  ) {
    return "Download timed out or failed";
  }
  if (
    err.includes("unsupported_drive_link") ||
    err.includes("google_doc_link_export_as_pdf_instead")
  ) {
    return "Link type not supported (a Google Doc must be shared as a PDF)";
  }
  if (
    err.includes("url_host_not_allowed") ||
    err.includes("url_resolves_to_private_address")
  ) {
    return "Link points to a private or local address and was not fetched";
  }
  if (
    err.includes("dns_not_found") ||
    err.includes("timeout") ||
    err.includes("network_error") ||
    err.includes("not_html")
  ) {
    return "Portfolio website did not open";
  }
  if (err.startsWith("llm_") || err.includes("llm")) {
    return "AI refinement step failed; rule-based values kept";
  }

  return errorStr;
}

/**
 * Reason translation for not_provided status
 */
export function formatNotProvidedReason(reason) {
  if (reason === "profile_link_only_no_text_or_pdf") {
    return "Profile link only provided (cannot scrape LinkedIn; paste text or export PDF)";
  }
  return "Not provided by applicant";
}

/**
 * All 9 Flag Codes metadata dictionary (Section 7)
 */
export const FLAG_DEFINITIONS = {
  DUPLICATE_EMAIL: {
    code: "DUPLICATE_EMAIL",
    defaultSeverity: "warn",
    title: "Duplicate Email",
    description: "The same email appears across multiple applicant records.",
  },
  DUPLICATE_SOURCE_URL: {
    code: "DUPLICATE_SOURCE_URL",
    defaultSeverity: "warn",
    title: "Shared Profile Link",
    description: "The same GitHub, LinkedIn, portfolio, or resume link is shared by multiple applicants.",
  },
  SIMILAR_RESUME_TEXT: {
    code: "SIMILAR_RESUME_TEXT",
    defaultSeverity: "warn",
    title: "High Resume Similarity",
    description: "Resume text is at least 60% identical to another applicant's resume.",
  },
  HIGH_FORK_RATIO: {
    code: "HIGH_FORK_RATIO",
    defaultSeverity: "warn",
    title: "High Fork Ratio",
    description: "At least 70% of 5 or more public repos are forks, with 10 or fewer original repos.",
  },
  MANY_EMPTY_REPOS: {
    code: "MANY_EMPTY_REPOS",
    defaultSeverity: "warn",
    title: "Many Empty Repos",
    description: "At least 50% of sampled original repos are empty or tiny (< 2 commits).",
  },
  LLM_REFINE_FAILED: {
    code: "LLM_REFINE_FAILED",
    defaultSeverity: "warn",
    title: "AI Refinement Failed",
    description: "AI extraction encountered an error; deterministic rule-based values were preserved.",
  },
  NEW_ACCOUNT: {
    code: "NEW_ACCOUNT",
    defaultSeverity: "info",
    title: "New GitHub Account",
    description: "GitHub account was created less than 60 days ago.",
  },
  BURST_ACTIVITY: {
    code: "BURST_ACTIVITY",
    defaultSeverity: "info",
    title: "Burst GitHub Activity",
    description: "100 or more contributions concentrated into a single month.",
  },
  SKILLS_LIST_VERY_LONG: {
    code: "SKILLS_LIST_VERY_LONG",
    defaultSeverity: "info",
    title: "Very Long Skills List",
    description: "More than 40 distinct skills enumerated on the resume.",
  },
};

/**
 * Sanitizes flag detail for Blind Review mode (Must-do UI Rule #6)
 * In blind mode, hides usernames and member IDs from DUPLICATE_SOURCE_URL and SIMILAR_RESUME_TEXT.
 */
export function getSafeFlagDetail(flag, blindMode = false) {
  if (!blindMode) return flag.detail || "";

  if (flag.code === "DUPLICATE_SOURCE_URL") {
    return "Same profile link is also used by another applicant in the cohort.";
  }
  if (flag.code === "SIMILAR_RESUME_TEXT") {
    return "Resume text matches another submission by >= 60%.";
  }
  return flag.detail || "";
}

/**
 * Formats a metric value for display, handling all edge cases from Sections 5, 7, and 8.
 */
export function formatMetricValue(metricId, entry, allMemberMetrics = {}) {
  if (!entry) return { display: "—", status: "not_provided" };

  const { value, status, note } = entry;

  // Rule 1: Never show missing value as 0
  if (status === "not_provided") {
    return {
      display: "Not provided",
      status: "not_provided",
      tooltip: formatNotProvidedReason(entry.reason),
    };
  }

  if (status === "fetch_failed") {
    return {
      display: "Could not fetch",
      status: "fetch_failed",
      tooltip: formatFailureReason(entry.error),
    };
  }

  // Safety guard: if portfolio is unreachable, live demo cannot be true or available
  if (metricId === "portfolio.has_live_demo") {
    const reachable = allMemberMetrics?.["portfolio.is_reachable"];
    if (reachable && reachable.value === false) {
      return {
        display: "No",
        status: "ok",
        tooltip: reachable.error
          ? `Site unreachable (${formatFailureReason(reachable.error)}): live demo not available`
          : "Portfolio website is unreachable; no live demo available",
      };
    }
  }

  // Portfolio reachability explicit display
  if (metricId === "portfolio.is_reachable" && value === false) {
    return {
      display: "Unreachable",
      status: status || "ok",
      tooltip: entry.error ? formatFailureReason(entry.error) : "Website could not be reached",
    };
  }

  // Resume / LinkedIn Education Level ordinal formatting
  if (metricId === "resume.education_level" || metricId === "linkedin.education_level") {
    if (typeof value === "number") {
      const EDU_MAP = {
        0: "None / Unspecified",
        1: "High School",
        2: "Associate / Diploma",
        3: "Bachelor's Degree",
        4: "Master's Degree",
        5: "Doctorate / Ph.D.",
      };
      return {
        display: EDU_MAP[value] || `Level ${value}`,
        status: status || "ok",
        tooltip: `Education level ordinal: ${value}`,
      };
    }
  }

  // Resume / LinkedIn Experience Months formatting
  if (
    (metricId === "resume.experience_months" || metricId === "linkedin.experience_months") &&
    typeof value === "number"
  ) {
    const years = (value / 12).toFixed(1);
    const display = value >= 12 ? `${value} mos (${years} yrs)` : `${value} mos`;
    return {
      display,
      status: status || "ok",
      tooltip: `${value} months professional experience`,
    };
  }

  // Rule: Never show low-confidence 0 as real zero
  if (status === "low_confidence" && (value === 0 || value === "0")) {
    return {
      display: "Uncertain (0)",
      status: "low_confidence",
      tooltip: note || "Low confidence extraction (< 0.6); section may be absent or unparseable",
    };
  }

  // Special case: github.last_activity_days == 366 means 365+ days (no activity in 1y)
  if (metricId === "github.last_activity_days" && Number(value) >= 366) {
    return {
      display: "365+ days",
      status: status || "ok",
      tooltip: "No public contributions detected in past 12 months",
    };
  }

  // Raw text metrics (e.g. resume.text, linkedin.text, portfolio.text)
  if (metricId.endsWith(".text") && typeof value === "string") {
    const charCount = value.length;
    return {
      display: charCount > 0 ? `${charCount.toLocaleString()} chars text` : "Empty",
      status: status || "ok",
      tooltip: value.slice(0, 160) + (charCount > 160 ? "..." : ""),
    };
  }

  // Boolean metrics
  if (typeof value === "boolean") {
    return {
      display: value ? "Yes" : "No",
      status: status || "ok",
      tooltip: value ? "Verified" : (entry.error ? formatFailureReason(entry.error) : "Not met"),
    };
  }

  // Ratio metrics (0 to 1)
  if (
    metricId.includes("ratio") ||
    metricId === "resume.keyword_match" ||
    metricId === "team.data_coverage"
  ) {
    if (typeof value === "number") {
      return {
        display: `${Math.round(value * 100)}%`,
        status: status || "ok",
      };
    }
  }

  // String lists (e.g. skills, tech_stack, languages)
  if (Array.isArray(value)) {
    return {
      display: value.length > 0 ? value.join(", ") : "None listed",
      count: value.length,
      status: status || "ok",
      isArray: true,
      items: value,
    };
  }

  // Standard numbers
  if (typeof value === "number") {
    return {
      display: Number.isInteger(value) ? String(value) : value.toFixed(2),
      status: status || "ok",
    };
  }

  return {
    display: value != null ? String(value) : "—",
    status: status || "ok",
  };
}
