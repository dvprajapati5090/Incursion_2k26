/**
 * Exports shortlist results along with the exact configuration used
 * into standardized JSON or CSV format for hackathon organizers.
 */
function escapeCsv(val) {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportShortlist(result, config, format = "json") {
  if (!result || typeof result !== "object") {
    throw new Error("result must be an object");
  }

  if (format === "json") {
    const payload = {
      exportedAt: new Date().toISOString(),
      configuration: config,
      summary: result.summary,
      shortlist: (result.shortlist ?? []).map((t) => ({
        rank: t.rank,
        teamId: t.teamId,
        teamName: t.teamName ?? t.teamId,
        score: t.score !== null ? Number(t.score.toFixed(2)) : null,
        dataCoverage: t.dataCoverage !== null ? Number((t.dataCoverage * 100).toFixed(1)) : 0,
        isPinned: t.isPinned ?? false,
        summary: t.explanation?.summary ?? "",
        strengths: t.explanation?.strengths ?? [],
        growthAreas: t.explanation?.growthAreas ?? [],
        breakdown: t.breakdown ?? []
      })),
      waitlist: result.waitlistTeams ?? [],
      reviewQueue: result.reviewTeams ?? [],
      rejected: result.rejectedTeams ?? []
    };

    return JSON.stringify(payload, null, 2);
  }

  if (format === "csv") {
    const headers = [
      "Rank",
      "Team ID",
      "Team Name",
      "Score",
      "Data Coverage (%)",
      "Pinned",
      "Summary Explanation",
      "Key Strengths",
      "Growth Areas"
    ];

    const rows = [headers.join(",")];

    for (const t of result.shortlist ?? []) {
      const row = [
        escapeCsv(t.rank),
        escapeCsv(t.teamId),
        escapeCsv(t.teamName ?? t.teamId),
        escapeCsv(t.score !== null ? t.score.toFixed(2) : ""),
        escapeCsv(t.dataCoverage !== null ? (t.dataCoverage * 100).toFixed(0) : "0"),
        escapeCsv(t.isPinned ? "YES" : "NO"),
        escapeCsv(t.explanation?.summary ?? ""),
        escapeCsv((t.explanation?.strengths ?? []).join(" | ")),
        escapeCsv((t.explanation?.growthAreas ?? []).join(" | "))
      ];
      rows.push(row.join(","));
    }

    return rows.join("\n");
  }

  throw new Error(`Unsupported export format: ${format}. Use 'json' or 'csv'.`);
}
