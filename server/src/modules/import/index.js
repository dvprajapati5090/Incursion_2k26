import { parseCsv } from "./parseCsv.js";
import { buildHeaderMap, normalizeHeader } from "./columns.js";
import { normalizeRows, flagDuplicateEmails } from "./normalize.js";
import { normalizeJsonTeams } from "./normalizeJson.js";
import { httpError } from "../../utils/httpError.js";

const SOURCES = ["resume", "github", "linkedin", "portfolio"];

function buildReport({ rowsRead, rowsSkipped, teams, issues, columns }) {
  const members = teams.flatMap((t) => t.members);

  const teamSizes = {};
  for (const t of teams)
    teamSizes[t.members.length] = (teamSizes[t.members.length] || 0) + 1;

  const withSource = {};
  for (const s of SOURCES)
    withSource[s] = members.filter((m) => m.sources[s] !== null).length;

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

export function importCsv(text, columnMap = {}) {
  const parsed = parseCsv(text);
  const headerMap = buildHeaderMap(parsed.headers, columnMap);

  if (!Object.values(headerMap).includes("team_id")) {
    throw httpError(
      422,
      "MISSING_TEAM_ID_COLUMN",
      'No column could be mapped to team_id. Send a columnMap, e.g. {"team_id": "Team Number"}',
      { headers: parsed.headers },
    );
  }

  const { teams, issues, skipped } = normalizeRows(parsed.rows, headerMap);
  flagDuplicateEmails(teams, issues);

  const columns = { mapped: [], extra: [] };
  for (const h of parsed.headers) {
    const canonical = headerMap[normalizeHeader(h)];
    if (canonical) columns.mapped.push({ header: h, canonical });
    else columns.extra.push(h);
  }

  return {
    type: "csv",
    teams,
    report: buildReport({
      rowsRead: parsed.rows.length,
      rowsSkipped: skipped,
      teams,
      issues: [...parsed.issues, ...issues],
      columns,
    }),
  };
}

export function importJson(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw httpError(422, "INVALID_JSON", "File is not valid JSON");
  }
  const { teams, issues, skipped } = normalizeJsonTeams(data);
  flagDuplicateEmails(teams, issues);

  return {
    type: "json",
    teams,
    report: buildReport({
      rowsRead: teams.length + skipped,
      rowsSkipped: skipped,
      teams,
      issues,
    }),
  };
}
