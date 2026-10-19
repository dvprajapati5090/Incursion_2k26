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

export function isFileUrl(value) {
  if (!value) return false;
  return (
    /\.pdf(\?.*)?$/i.test(value) ||
    /(?:drive|docs)\.google\.com/i.test(value) ||
    /(?:dropbox\.com|1drv\.ms|onedrive\.live\.com)/i.test(value)
  );
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
      if (column === "linkedin_url" && isFileUrl(value)) {
        // Handled by LINKEDIN_FILE_IN_URL_COLUMN warning
      } else {
        issues.push({
          severity: "warning",
          code: "UNEXPECTED_DOMAIN",
          row,
          column,
          message: `${column} does not look like a ${hint} link: ${value}`,
        });
      }
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

function toSource({ url, text, pdfUrl = null }) {
  if (url === null && text === null && pdfUrl === null) return null; // missing = null, never {}
  const s = {};
  if (url !== null) s.url = url;
  if (text !== null) s.text = text;
  if (pdfUrl !== null) s.pdfUrl = pdfUrl;
  return s;
}

function buildMember(rec, memberId, row, issues) {
  const rawLiUrl = cleanValue(rec.linkedin_url);
  const liIsFile = isFileUrl(rawLiUrl);

  if (liIsFile) {
    if (!rec.linkedin_pdf_url) {
      rec.linkedin_pdf_url = rawLiUrl;
    }
    issues.push({
      severity: "warning",
      code: "LINKEDIN_FILE_IN_URL_COLUMN",
      row,
      column: "linkedin_url",
      message: `A PDF/file link was provided in 'linkedin_url' (${rawLiUrl}). LinkedIn is read from a file, not scraped; it was processed as a LinkedIn PDF, but please use the 'linkedin_pdf_url' column instead.`,
    });
  }

  const url = (col) => cleanUrl(rec[col] ?? null, col, row, issues);
  // A file link (Drive, Dropbox or a .pdf) in the profile-link column is the PDF export, not a profile page.
  const rawLinkedin = rec.linkedin_url ?? null;
  const fileInUrlColumn =
    rawLinkedin !== null &&
    /drive\.google\.com|dropbox\.com|\.pdf(\?|#|$)/i.test(rawLinkedin);
  if (fileInUrlColumn) {
    issues.push({
      severity: "warning",
      code: "LINKEDIN_FILE_IN_URL_COLUMN",
      row,
      column: "linkedin_url",
      message:
        "A file link was found in linkedin_url and was used as the LinkedIn PDF export",
    });
  }
  const linkedinProfileUrl = fileInUrlColumn ? null : url("linkedin_url");
  const linkedinPdfUrl = rec.linkedin_pdf_url
    ? url("linkedin_pdf_url")
    : fileInUrlColumn
      ? cleanUrl(rawLinkedin, "linkedin_pdf_url", row, issues)
      : null;
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
      portfolio: toSource({ url: url("portfolio_url"), text: null }),
      linkedin: toSource({
        url: linkedinProfileUrl,
        text: rec.linkedin_text ?? null,
        pdfUrl: linkedinPdfUrl,
      }),
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
