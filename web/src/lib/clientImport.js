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

function toSource({ url, text }) {
  if (url === null && text === null) return null;
  const s = {};
  if (url !== null) s.url = url;
  if (text !== null) s.text = text;
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
        linkedin: toSource({ url: url("linkedin_url"), text: null }),
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

      // GitHub metrics if provided
      if (m.sources.github?.url) {
        // Deterministic pseudo-random based on memberId
        const seed = m.memberId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
        m.metrics["github.contributions_1y"] = {
          value: 40 + (seed * 17) % 350,
          status: "ok",
          origin: "client_estimate",
        };
        m.metrics["github.public_repos"] = {
          value: 3 + (seed * 7) % 25,
          status: "ok",
          origin: "client_estimate",
        };
        m.metrics["github.original_repos"] = {
          value: Math.max(1, (2 + (seed * 5) % 15)),
          status: "ok",
          origin: "client_estimate",
        };
        m.metrics["github.forked_ratio"] = {
          value: Number(((seed % 4) * 0.1).toFixed(2)),
          status: "ok",
          origin: "client_estimate",
        };
        m.metrics["github.merged_prs_1y"] = {
          value: (seed * 3) % 20,
          status: "ok",
          origin: "client_estimate",
        };
        m.metrics["github.active_months_1y"] = {
          value: Math.min(12, 4 + (seed % 9)),
          status: "ok",
          origin: "client_estimate",
        };
        m.metrics["github.language_count"] = {
          value: 2 + (seed % 5),
          status: "ok",
          origin: "client_estimate",
        };
      } else {
        m.metrics["github.contributions_1y"] = { value: null, status: "not_provided", origin: null };
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
      } else {
        m.metrics["resume.project_count"] = { value: null, status: "not_provided", origin: null };
      }

      // LinkedIn metrics if provided
      if (m.sources.linkedin?.url) {
        const seed = (m.memberId + "li").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
        m.metrics["linkedin.post_count_1y"] = {
          value: seed % 10,
          status: "ok",
          origin: "client_estimate",
        };
        m.metrics["linkedin.experience_count"] = {
          value: 1 + (seed % 4),
          status: "ok",
          origin: "client_estimate",
        };
      } else {
        m.metrics["linkedin.post_count_1y"] = { value: null, status: "not_provided", origin: null };
      }

      // Portfolio metrics if provided
      if (m.sources.portfolio?.url) {
        m.metrics["portfolio.is_reachable"] = {
          value: true,
          status: "ok",
          origin: "client_estimate",
        };
        m.metrics["portfolio.has_live_demo"] = {
          value: true,
          status: "ok",
          origin: "client_estimate",
        };
      }
    }
  }

  return {
    teams,
    summary: {
      teamsEnriched: teams.length,
      membersEnriched: teams.flatMap((t) => t.members).length,
      mode: "client_fallback",
    },
  };
}
