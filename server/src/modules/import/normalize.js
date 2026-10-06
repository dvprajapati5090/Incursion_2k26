import { normalizeHeader } from "./columns.js";

const DOMAIN_HINTS = { github_url: "github.com", linkedin_url: "linkedin.com" };

export function cleanValue(v) {
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
    const url = new URL(withScheme);
    const hint = DOMAIN_HINTS[column];
    if (hint && !url.hostname.endsWith(hint)) {
      issues.push({
        severity: "warning",
        code: "UNEXPECTED_DOMAIN",
        row,
        column,
        message: `${column} does not look like a ${hint} link: ${value}`,
      });
    }
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
  if (url === null && text === null) return null; // missing = null, never {}
  const s = {};
  if (url !== null) s.url = url;
  if (text !== null) s.text = text;
  return s;
}

function buildMember(rec, memberId, row, issues) {
  const url = (col) => cleanUrl(rec[col] ?? null, col, row, issues);
  return {
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
  };
}

export function normalizeRows(rows, headerMap) {
  const issues = [];
  const teams = new Map();
  let skipped = 0;

  rows.forEach((row, i) => {
    const rowNum = i + 2;
    const rec = {}; // canonical columns
    const extra = {}; // everything else -> team.fields

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

    let team = teams.get(teamId);
    if (!team) {
      team = { teamId, teamName: null, fields: {}, members: [] };
      teams.set(teamId, team);
    }
    if (team.teamName === null && rec.team_name) team.teamName = rec.team_name;
    for (const [k, v] of Object.entries(extra)) {
      if (!(k in team.fields)) team.fields[k] = v; // first non-empty value wins
    }

    team.members.push(
      buildMember(rec, `${teamId}-${team.members.length + 1}`, rowNum, issues),
    );
  });

  return { teams: [...teams.values()], issues, skipped };
}

export function flagDuplicateEmails(teams, issues) {
  const seen = new Map(); // email -> [{ teamId, member }]
  for (const team of teams) {
    for (const member of team.members) {
      if (!member.email) continue;
      if (!seen.has(member.email)) seen.set(member.email, []);
      seen.get(member.email).push({ teamId: team.teamId, member });
    }
  }
  for (const [email, list] of seen) {
    if (list.length < 2) continue;
    const teamIds = [...new Set(list.map((x) => x.teamId))];
    const detail = `Email ${email} appears ${list.length} times (teams: ${teamIds.join(", ")})`;
    list.forEach((x) =>
      x.member.flags.push({ code: "DUPLICATE_EMAIL", detail }),
    );
    issues.push({
      severity: "warning",
      code: "DUPLICATE_EMAIL",
      message: detail,
    });
  }
}
