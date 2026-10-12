/**
 * Export utilities — produce CSV or JSON downloads with the config embedded.
 *
 * The brief requires: "Export the final shortlist along with the configuration used."
 * JSON export bundles everything in one file.
 * CSV export writes two files (or a zip) — shortlist + config sidecar.
 */

import Papa from "papaparse";

/**
 * Trigger a file download in the browser.
 */
function download(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export results as JSON (shortlist + config + run metadata in one file).
 *
 * @param {object[]} results - array of per-team result objects
 * @param {object}   config  - the Config object used for this run
 * @param {object}   [meta]  - optional metadata (runId, timestamp, etc.)
 */
export function exportJson(results, config, meta = {}) {
  const payload = {
    exportedAt: new Date().toISOString(),
    ...meta,
    config,
    results,
  };
  download(
    `shortlist-${Date.now()}.json`,
    JSON.stringify(payload, null, 2),
    "application/json"
  );
}

/**
 * Export the shortlist as CSV.
 * Flat columns: rank, teamId, teamName, status, score, dataCoverage,
 * plus one column per criterion contribution.
 *
 * Config is exported as a separate JSON sidecar.
 *
 * @param {object[]} results
 * @param {object}   config
 * @param {object[]} criteria  - config.criteria (for column headers)
 */
export function exportCsv(results, config, criteria) {
  // Build flat rows
  const rows = results.map((r) => {
    const row = {
      rank: r.rank ?? "",
      teamId: r.teamId,
      teamName: r.teamName ?? "",
      status: r.status,
      score: r.score != null ? r.score.toFixed(4) : "",
      cutoffScore: r.cutoffScore != null ? r.cutoffScore.toFixed(4) : "",
      margin: r.margin != null ? r.margin.toFixed(4) : "",
      dataCoverage: r.dataCoverage != null ? r.dataCoverage.toFixed(2) : "",
      flags: (r.flags ?? []).join("|"),
    };
    // One column per criterion
    for (const b of r.breakdown ?? []) {
      row[`c_${b.criterionId}_raw`] = b.raw ?? "";
      row[`c_${b.criterionId}_contrib`] =
        b.contribution != null ? b.contribution.toFixed(4) : "";
      row[`c_${b.criterionId}_status`] = b.status ?? "";
    }
    // Reason codes as a string
    row.reasons = (r.reasons ?? [])
      .map((rc) => rc.code + (rc.criterionId ? `:${rc.criterionId}` : ""))
      .join("|");
    return row;
  });

  const csv = Papa.unparse(rows);
  download(`shortlist-${Date.now()}.csv`, csv, "text/csv");

  // Config sidecar
  download(
    `shortlist-config-${Date.now()}.json`,
    JSON.stringify(config, null, 2),
    "application/json"
  );
}

/**
 * Build a human-readable sentence from a reason code object.
 *
 * @param {object} reason   - { code, criterionId?, margin?, ... }
 * @param {object} result   - full team result (for score, contribution)
 * @param {object} config   - current config (for criterion labels)
 * @returns {string}
 */
export function reasonToText(reason, result, config) {
  const label = (cId) => {
    const c = (config?.criteria ?? []).find((x) => x.id === cId);
    return c?.label ?? cId;
  };
  const contrib = (cId) => {
    const b = (result?.breakdown ?? []).find((x) => x.criterionId === cId);
    return b?.contribution != null ? b.contribution.toFixed(2) : "?";
  };

  switch (reason.code) {
    case "STRENGTH":
      return `Strong in ${label(reason.criterionId)} (contributed ${contrib(reason.criterionId)} of ${result.score?.toFixed(2)})`;
    case "WEAKNESS":
      return `Weak in ${label(reason.criterionId)} — gap to cutoff average`;
    case "MISSING_DATA":
      return `No ${label(reason.criterionId)} data (weight redistributed)`;
    case "BELOW_CUTOFF":
      return `Scored ${Math.abs(reason.margin).toFixed(2)} below the shortlist cutoff`;
    case "ABOVE_CUTOFF":
      return `Scored ${Math.abs(reason.margin).toFixed(2)} above the shortlist cutoff`;
    case "BORDERLINE":
      return `Borderline — within ${Math.abs(reason.margin).toFixed(2)} of cutoff`;
    case "FILTER_FAIL":
      return `Rejected by filter: ${reason.filterId ?? ""}`;
    case "FILTER_FLAG":
      return `Flagged by filter: ${reason.filterId ?? ""} (needs review)`;
    case "PINNED":
      return "Manually pinned by organizer";
    case "EXCLUDED":
      return "Manually excluded by organizer";
    default:
      return reason.code;
  }
}
