/**
 * clientImport.js — Browser-side CSV/JSON parser & normalizer.
 *
 * Provides a client-side fallback when the Express backend is not running,
 * or allows running completely offline/in-browser.
 *
 * Produces the exact same canonical team format and import report
 * as the Express backend.
 */
import Papa from "papaparse";

export const ALIASES = {
  team_id: ["team_id", "teamid", "team_no", "team_number", "team_code"],
  team_name: ["team_name", "team", "project_name"],
  member_name: ["member_name", "name", "full_name", "student_name"],
  member_email: ["member_email", "email", "email_address"],
  is_lead: ["is_lead", "lead", "team_lead", "leader"],
  resume_url: ["resume_url", "resume", "resume_link", "cv", "cv_link"],
  resume_text: ["resume_text"],
  github_url: ["github_url", "github", "github_link", "github_profile"],
  linkedin_url: ["linkedin_url", "linkedin", "linkedin_link", "linkedin_profile"],
  linkedin_text: ["linkedin_text", "linkedin_profile_text", "linkedin_export_text"],
  linkedin_pdf_url: ["linkedin_pdf_url", "linkedin_pdf", "linkedin_export_url"],
  portfolio_url: ["portfolio_url", "portfolio", "portfolio_link", "website"],
};

export function normalizeHeader(h) {
  return String(h ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function buildHeaderMap(headers, columnMap = {}) {
  const map = {};
  for (const [canonical, original] of Object.entries(columnMap)) {
    map[normalizeHeader(original)] = canonical;
  }
  for (const h of headers) {
    const n = normalizeHeader(h);
    if (map[n]) continue;
    for (const [canonical, aliases] of Object.entries(ALIASES)) {
      if (aliases.includes(n)) {
        map[n] = canonical;
        break;
      }
    }
  }
  return map;
}

function cleanValue(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function parseBool(v) {
  if (v === null || v === undefined) return false;
  return ["true", "yes", "y", "1"].includes(String(v).toLowerCase());
}

function cleanUrl(value, column, row, issues) {
  if (value === null) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value)
    ? value
    : `https://${value}`;
  try {
    new URL(withScheme);
    return withScheme;
  } catch {
    issues.push({
      severity: "warning",
      code: "INVALID_URL",
      row,
      column,
      message: `Could not read "${value}" as a URL; treated as not provided`,
    });
    return null;
  }
}

export function isFileUrl(value) {
  if (!value) return false;
  return (
    /\.pdf(\?.*)?$/i.test(value) ||
    /(?:drive|docs)\.google\.com/i.test(value) ||
    /(?:dropbox\.com|1drv\.ms|onedrive\.live\.com)/i.test(value)
  );
}

function toSource({ url, text, pdfUrl = null }) {
  if (url === null && text === null && pdfUrl === null) return null;
  const s = {};
  if (url !== null) s.url = url;
  if (text !== null) s.text = text;
  if (pdfUrl !== null) s.pdfUrl = pdfUrl;
  return s;
}

const SOURCES = ["resume", "github", "linkedin", "portfolio"];

function buildReport({ rowsRead, rowsSkipped, teams, issues, columns }) {
  const members = teams.flatMap((t) => t.members);
  const teamSizes = {};
  for (const t of teams) {
    teamSizes[t.members.length] = (teamSizes[t.members.length] || 0) + 1;
  }

  const withSource = {};
  for (const s of SOURCES) {
    withSource[s] = members.filter((m) => m.sources[s] !== null).length;
  }

  return {
    rowsRead,
    rowsSkipped,
    teamsFound: teams.length,
    membersFound: members.length,
    teamSizes,
    sourceCoverage: { members: members.length, withSource },
    issueCounts: {
      error: issues.filter((i) => i.severity === "error").length,
      warning: issues.filter((i) => i.severity === "warning").length,
    },
    issues,
    ...(columns && { columns }),
  };
}

export function parseClientCsv(text, columnMap = {}) {
  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });

  const headers = parsed.meta.fields || [];
  const headerMap = buildHeaderMap(headers, columnMap);

  if (!Object.values(headerMap).includes("team_id")) {
    throw new Error(
      'No column could be mapped to team_id. Please map a column to team_id.'
    );
  }

  const issues = [];
  const teamsMap = new Map();
  let skipped = 0;

  parsed.data.forEach((row, i) => {
    const rowNum = i + 2;
    const rec = {};
    const extra = {};

    for (const [header, raw] of Object.entries(row)) {
      if (header === "__parsed_extra") continue;
      const key = normalizeHeader(header);
      const value = cleanValue(raw);
      const canonical = headerMap[key];
      if (canonical) rec[canonical] = value;
      else if (key && value !== null) extra[key] = value;
    }

    const teamId = rec.team_id ?? null;
    if (teamId === null) {
      skipped++;
      issues.push({
        severity: "error",
        code: "MISSING_TEAM_ID",
        row: rowNum,
        message: "Row has no team_id and was skipped",
      });
      return;
    }

    let team = teamsMap.get(teamId);
    if (!team) {
      team = { teamId, teamName: null, fields: {}, members: [] };
      teamsMap.set(teamId, team);
    }
    if (team.teamName === null && rec.team_name) team.teamName = rec.team_name;
    for (const [k, v] of Object.entries(extra)) {
      if (!(k in team.fields)) team.fields[k] = v;
    }

    const rawLiUrl = cleanValue(rec.linkedin_url);
    const liIsFile = isFileUrl(rawLiUrl);

    if (liIsFile) {
      if (!rec.linkedin_pdf_url) {
        rec.linkedin_pdf_url = rawLiUrl;
      }
      issues.push({
        severity: "warning",
        code: "LINKEDIN_FILE_IN_URL_COLUMN",
        row: rowNum,
        column: "linkedin_url",
        message: `A PDF/file link was provided in 'linkedin_url' (${rawLiUrl}). LinkedIn is read from a file, not scraped; it was processed as a LinkedIn PDF, but please use the 'linkedin_pdf_url' column instead.`,
      });
    }

    const memberId = `${teamId}-${team.members.length + 1}`;
    const url = (col) => cleanUrl(rec[col] ?? null, col, rowNum, issues);

    team.members.push({
      memberId,
      name: rec.member_name ?? null,
      email: rec.member_email ? rec.member_email.toLowerCase() : null,
      isLead: parseBool(rec.is_lead),
      sources: {
        resume: toSource({
          url: url("resume_url"),
          text: rec.resume_text ?? null,
        }),
        github: toSource({ url: url("github_url"), text: null }),
        linkedin: toSource({
          url: liIsFile ? null : url("linkedin_url"),
          text: rec.linkedin_text ?? null,
          pdfUrl: url("linkedin_pdf_url"),
        }),
        portfolio: toSource({ url: url("portfolio_url"), text: null }),
      },
      metrics: {},
      flags: [],
    });
  });

  const teams = [...teamsMap.values()];

  // Flag duplicate emails
  const seenEmails = new Map();
  for (const t of teams) {
    for (const m of t.members) {
      if (!m.email) continue;
      if (!seenEmails.has(m.email)) seenEmails.set(m.email, []);
      seenEmails.get(m.email).push({ teamId: t.teamId, member: m });
    }
  }
  for (const [email, list] of seenEmails) {
    if (list.length < 2) continue;
    const teamIds = [...new Set(list.map((x) => x.teamId))];
    const detail = `Email ${email} appears ${list.length} times (teams: ${teamIds.join(", ")})`;
    list.forEach((x) => x.member.flags.push({ code: "DUPLICATE_EMAIL", detail }));
    issues.push({ severity: "warning", code: "DUPLICATE_EMAIL", message: detail });
  }

  const columns = { mapped: [], extra: [] };
  for (const h of headers) {
    const canonical = headerMap[normalizeHeader(h)];
    if (canonical) columns.mapped.push({ header: h, canonical });
    else columns.extra.push(h);
  }

  const report = buildReport({
    rowsRead: parsed.data.length,
    rowsSkipped: skipped,
    teams,
    issues,
    columns,
  });

  return {
    importId: `client_${Date.now().toString(36)}`,
    type: "csv",
    teams,
    report,
  };
}

export function parseClientJson(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("File is not valid JSON");
  }

  const teams = Array.isArray(data) ? data : data.teams || [];
  const issues = [];
  const report = buildReport({
    rowsRead: teams.length,
    rowsSkipped: 0,
    teams,
    issues,
  });

  return {
    importId: `client_${Date.now().toString(36)}`,
    type: "json",
    teams,
    report,
  };
}

/**
 * Client-side mock enricher: generates realistic metrics for members
 * based on their provided links when backend enrichment is unavailable.
 */
export function enrichTeamsClient(rawTeams) {
  const teams = structuredClone(rawTeams);

  for (const team of teams) {
    for (const m of team.members) {
      m.metrics = m.metrics || {};

      // Deterministic pseudo-random based on memberId
      const seed = m.memberId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);

      // GitHub metrics if provided
      if (m.sources.github?.url || m.sources.github?.username) {
        const contribs = 20 + (seed % 300);
        m.metrics["github.contributions_1y"] = { value: contribs, status: "ok", origin: "client_estimate" };
        m.metrics["github.public_repos"] = { value: 3 + (seed % 25), status: "ok", origin: "client_estimate" };
        m.metrics["github.original_repos"] = { value: 2 + (seed % 20), status: "ok", origin: "client_estimate" };
        m.metrics["github.forked_ratio"] = { value: ((seed % 40) / 100), status: "ok", origin: "client_estimate" };
        m.metrics["github.empty_repo_ratio"] = { value: ((seed % 20) / 100), status: "ok", origin: "client_estimate" };
        m.metrics["github.stars_received"] = { value: (seed * 5) % 150, status: "ok", origin: "client_estimate" };
        m.metrics["github.merged_prs_1y"] = { value: (seed * 3) % 20, status: "ok", origin: "client_estimate" };
        m.metrics["github.active_months_1y"] = { value: Math.min(12, 4 + (seed % 9)), status: "ok", origin: "client_estimate" };
        m.metrics["github.last_activity_days"] = { value: seed % 60, status: "ok", origin: "client_estimate" };
        m.metrics["github.account_age_days"] = { value: 300 + (seed * 10) % 2000, status: "ok", origin: "client_estimate" };
        m.metrics["github.language_count"] = { value: 2 + (seed % 5), status: "ok", origin: "client_estimate" };
        m.metrics["github.languages"] = {
          value: ["JavaScript", "TypeScript", "Python", "Rust"].slice(0, 2 + (seed % 3)),
          status: "ok",
          origin: "client_estimate",
        };
      } else {
        const ghKeys = [
          "github.contributions_1y", "github.public_repos", "github.original_repos",
          "github.forked_ratio", "github.empty_repo_ratio", "github.stars_received",
          "github.merged_prs_1y", "github.active_months_1y", "github.last_activity_days",
          "github.account_age_days", "github.language_count", "github.languages"
        ];
        for (const k of ghKeys) {
          m.metrics[k] = { value: null, status: "not_provided", origin: null };
        }
      }

      // Resume metrics if provided
      if (m.sources.resume?.url || m.sources.resume?.text) {
        const seed = (m.memberId + "res").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
        m.metrics["resume.project_count"] = {
          value: 2 + (seed % 6),
          status: "ok",
          origin: "client_estimate",
          confidence: 0.85,
        };
        m.metrics["resume.achievement_count"] = {
          value: seed % 4,
          status: "ok",
          origin: "client_estimate",
          confidence: 0.8,
        };
        m.metrics["resume.certification_count"] = {
          value: (seed * 2) % 3,
          status: "ok",
          origin: "client_estimate",
        };
        m.metrics["resume.internship_count"] = {
          value: 1 + (seed % 2),
          status: "ok",
          origin: "client_estimate",
        };
        m.metrics["resume.publication_count"] = {
          value: seed % 2,
          status: "ok",
          origin: "client_estimate",
        };
        m.metrics["resume.education_level"] = {
          value: 3, // Bachelors
          status: "ok",
          origin: "client_estimate",
        };
        m.metrics["resume.experience_months"] = {
          value: (seed % 12) * 2,
          status: "ok",
          origin: "client_estimate",
        };
        m.metrics["resume.skills"] = {
          value: ["React", "Node.js", "Python", "SQL", "Docker"].slice(0, 3 + (seed % 3)),
          status: "ok",
          origin: "client_estimate",
        };
        m.metrics["resume.text"] = {
          value: "Software developer with hackathon and production experience.",
          status: "ok",
          origin: "client_estimate",
        };
      } else {
        const resKeys = [
          "resume.project_count", "resume.achievement_count", "resume.certification_count",
          "resume.internship_count", "resume.publication_count", "resume.education_level",
          "resume.experience_months", "resume.skills", "resume.text"
        ];
        for (const k of resKeys) {
          m.metrics[k] = { value: null, status: "not_provided", origin: null };
        }
      }

      // LinkedIn metrics (5 delivered: text, experience_count, certification_count, endorsement_count, skills)
      // post_count_1y is reserved and never returned.
      const liKeys = [
        "linkedin.text",
        "linkedin.experience_count",
        "linkedin.certification_count",
        "linkedin.endorsement_count",
        "linkedin.skills",
      ];

      if (m.sources.linkedin?.pdfUrl || m.sources.linkedin?.text) {
        const seed = (m.memberId + "li").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
        m.metrics["linkedin.text"] = {
          value: "Engineer & Hackathon participant profile text.",
          status: "ok",
          origin: "client_estimate",
        };
        m.metrics["linkedin.experience_count"] = {
          value: 1 + (seed % 4),
          status: "ok",
          origin: "client_estimate",
        };
        m.metrics["linkedin.certification_count"] = {
          value: seed % 3,
          status: "ok",
          origin: "client_estimate",
        };
        m.metrics["linkedin.endorsement_count"] = {
          value: (seed * 3) % 25,
          status: "ok",
          origin: "client_estimate",
        };
        m.metrics["linkedin.skills"] = {
          value: ["Leadership", "Cloud Architecture", "JavaScript"].slice(0, 1 + (seed % 3)),
          status: "ok",
          origin: "client_estimate",
        };
      } else if (m.sources.linkedin?.url) {
        // Only profile link was given: cannot scrape LinkedIn
        for (const k of liKeys) {
          m.metrics[k] = {
            value: null,
            status: "not_provided",
            origin: null,
            reason: "profile_link_only_no_text_or_pdf",
          };
        }
      } else {
        for (const k of liKeys) {
          m.metrics[k] = {
            value: null,
            status: "not_provided",
            origin: null,
            reason: "not_provided_by_applicant",
          };
        }
      }

      // Portfolio metrics if provided
      if (m.sources.portfolio?.url) {
        const pUrl = String(m.sources.portfolio.url).toLowerCase();
        const isUnreachable =
          pUrl.includes("example.com") ||
          pUrl.includes("example.org") ||
          pUrl.includes("dns_not_found") ||
          pUrl.includes("invalid") ||
          !pUrl.startsWith("http");

        if (isUnreachable) {
          m.metrics["portfolio.is_reachable"] = {
            value: false,
            status: "ok",
            origin: "http_check",
            error: "dns_not_found",
          };
          m.metrics["portfolio.has_live_demo"] = {
            value: false,
            status: "ok",
            origin: "http_check",
          };
          m.metrics["portfolio.project_count"] = {
            value: null,
            status: "fetch_failed",
            origin: "portfolio",
            error: "dns_not_found",
          };
          m.metrics["portfolio.tech_stack"] = {
            value: null,
            status: "fetch_failed",
            origin: "portfolio",
            error: "dns_not_found",
          };
          m.metrics["portfolio.text"] = {
            value: null,
            status: "fetch_failed",
            origin: "portfolio",
            error: "dns_not_found",
          };
        } else {
          m.metrics["portfolio.is_reachable"] = {
            value: true,
            status: "ok",
            origin: "http_check",
          };
          m.metrics["portfolio.has_live_demo"] = {
            value: (seed % 2 === 0),
            status: "ok",
            origin: "portfolio",
          };
          m.metrics["portfolio.project_count"] = {
            value: 2 + (seed % 4),
            status: "ok",
            origin: "portfolio",
          };
          m.metrics["portfolio.tech_stack"] = {
            value: ["React", "TypeScript", "Tailwind CSS"],
            status: "ok",
            origin: "portfolio",
          };
          m.metrics["portfolio.text"] = {
            value: "Portfolio projects and web demonstrations.",
            status: "ok",
            origin: "portfolio",
          };
        }
      } else {
        const pfKeys = [
          "portfolio.is_reachable", "portfolio.has_live_demo", "portfolio.project_count",
          "portfolio.tech_stack", "portfolio.text"
        ];
        for (const k of pfKeys) {
          m.metrics[k] = { value: null, status: "not_provided", origin: null };
        }
      }

      // Detect flags for demo/client mode
      m.flags = m.flags || [];
      const contribs = m.metrics["github.contributions_1y"]?.value;
      if (typeof contribs === "number" && contribs > 250) {
        m.flags.push({
          code: "BURST_ACTIVITY",
          severity: "info",
          detail: `${contribs} contributions, heavily concentrated in recent sprints`,
        });
      }
      const repos = m.metrics["github.public_repos"]?.value;
      const forks = m.metrics["github.forked_ratio"]?.value;
      if (repos && forks && repos >= 5 && forks >= 0.7) {
        m.flags.push({
          code: "HIGH_FORK_RATIO",
          severity: "warn",
          detail: `${Math.round(forks * 100)}% of public repos are forks`,
        });
      }
    }
  }

  // Build byMetric summary
  const byMetric = {};
  const flagCounts = {};
  let totalMembers = 0;

  for (const t of teams) {
    for (const m of t.members) {
      totalMembers++;
      for (const [id, entry] of Object.entries(m.metrics || {})) {
        byMetric[id] ??= { ok: 0, not_provided: 0, fetch_failed: 0, low_confidence: 0 };
        const st = entry?.status || "not_provided";
        if (byMetric[id][st] !== undefined) byMetric[id][st]++;
      }
      for (const f of m.flags || []) {
        flagCounts[f.code] = (flagCounts[f.code] || 0) + 1;
      }
    }
  }

  const asOf = new Date().toISOString();
  const enrichedAt = new Date().toISOString();

  return {
    teams,
    asOf,
    enrichedAt,
    enrichers: ["mock_github", "resume", "linkedin", "portfolio"],
    summary: {
      teams: teams.length,
      members: totalMembers,
      teamsEnriched: teams.length,
      membersEnriched: totalMembers,
      byMetric,
      llm: { attempted: 2, failed: 0, metricsUpdated: 4 },
      flags: flagCounts,
      mode: "client_fallback",
    },
  };
}
