import Papa from "papaparse";

export function parseCsv(text) {
  const clean = text.replace(/^\uFEFF/, ""); // strip BOM (common in Excel/Forms exports)
  const result = Papa.parse(clean, { header: true, skipEmptyLines: "greedy" });

  const issues = result.errors.map((e) => ({
    severity: "warning",
    code: "CSV_PARSE",
    row: typeof e.row === "number" ? e.row + 2 : null, // +2: header is row 1
    message: e.message,
  }));

  return { headers: result.meta.fields ?? [], rows: result.data, issues };
}
