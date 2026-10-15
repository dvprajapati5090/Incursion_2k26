/**
 * ColumnMapper — lets organizer remap CSV column names to canonical names.
 * Shows when the uploaded CSV has extra/unrecognized column names.
 */
const CANONICAL_COLUMNS = [
  "team_id", "team_name", "member_name", "member_email",
  "is_lead", "resume_url", "github_url", "linkedin_url", "portfolio_url",
];

export default function ColumnMapper({ columns, columnMap, onChange }) {
  const { mapped = [], extra = [] } = columns ?? {};

  if (extra.length === 0) return null;

  return (
    <div className="rounded-xl border p-5 space-y-4 bg-card">
      <div>
        <h3 className="font-semibold">Column Mapping</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Some columns weren't automatically recognized. Map them to canonical names below.
        </p>
      </div>

      {/* Already mapped */}
      {mapped.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Auto-mapped</p>
          <div className="flex flex-wrap gap-2">
            {mapped.map(({ header, canonical }) => (
              <span key={header} className="text-xs bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                "{header}" → {canonical}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Unmapped extras */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium">Unrecognized columns (map or leave as extra fields)</p>
        <div className="grid gap-2">
          {extra.map((header) => (
            <div key={header} className="flex items-center gap-3">
              <span className="text-sm font-mono bg-muted px-2 py-1 rounded w-48 truncate">
                "{header}"
              </span>
              <span className="text-muted-foreground text-sm">→</span>
              <select
                value={columnMap[header] ?? ""}
                onChange={(e) => onChange({ ...columnMap, [header]: e.target.value || undefined })}
                className="flex-1 text-sm border rounded-lg px-2 py-1 bg-background"
              >
                <option value="">Keep as extra field (field.{header.toLowerCase().replace(/\s+/g, "_")})</option>
                {CANONICAL_COLUMNS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
