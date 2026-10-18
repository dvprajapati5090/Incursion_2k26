/**
 * ColumnMapper — Lets organizer remap CSV column names to canonical names.
 * Supports automated alias detection, custom mapping, and 422 MISSING_TEAM_ID_COLUMN recovery.
 */
import { AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";

export const CANONICAL_COLUMNS = [
  { id: "team_id", label: "Team ID (Required)", required: true },
  { id: "team_name", label: "Team Name" },
  { id: "member_name", label: "Member Name" },
  { id: "member_email", label: "Member Email" },
  { id: "is_lead", label: "Is Team Lead (true/yes/1)" },
  { id: "resume_url", label: "Resume URL (Public PDF link)" },
  { id: "resume_text", label: "Resume Text (Pasted text)" },
  { id: "github_url", label: "GitHub Profile URL" },
  { id: "linkedin_url", label: "LinkedIn Profile URL" },
  { id: "linkedin_text", label: "LinkedIn Profile Text (Pasted text)" },
  { id: "linkedin_pdf_url", label: "LinkedIn Save-to-PDF Link" },
  { id: "portfolio_url", label: "Portfolio / Website URL" },
];

export default function ColumnMapper({
  columns,
  availableHeaders = [],
  columnMap = {},
  onChange,
  onReupload,
  missingTeamIdError = false,
}) {
  const { mapped = [], extra = [] } = columns ?? {};
  const headersToMap = availableHeaders.length > 0 ? availableHeaders : extra;

  if (!missingTeamIdError && headersToMap.length === 0) return null;

  const hasTeamIdMapped =
    Object.values(columnMap).includes("team_id") ||
    mapped.some((m) => m.canonical === "team_id");

  return (
    <div className="glass-panel rounded-2xl p-6 border border-[#415A77]/45 space-y-5 bg-[#0D1B2A]/80">
      <div>
        <div className="flex items-center gap-2">
          {missingTeamIdError ? (
            <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">
              <AlertCircle className="h-4 w-4" />
            </span>
          ) : (
            <span className="p-1.5 rounded-lg bg-[#415A77]/20 text-[#778DA9] border border-[#415A77]/45">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          )}
          <h3 className="font-bold text-white text-base">
            {missingTeamIdError ? "Required Column Mapping" : "Header Mapping & Field Aliases"}
          </h3>
        </div>
        <p className="text-xs text-[#778DA9]/80 mt-1 leading-relaxed">
          {missingTeamIdError
            ? "No column could be matched to team_id. Please specify which header from your spreadsheet identifies the team."
            : "Some columns were not recognized automatically. Map them to canonical profile signals or keep them as extra custom team fields."}
        </p>
      </div>

      {/* Auto-mapped headers */}
      {mapped.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-[#778DA9]/80 font-semibold">Automatically Recognized Headers</p>
          <div className="flex flex-wrap gap-2">
            {mapped.map(({ header, canonical }) => (
              <span
                key={header}
                className="text-xs bg-emerald-500/10 border border-[#415A77]/40 text-emerald-300 px-2.5 py-1 rounded-lg font-mono flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                "{header}" → <strong>{canonical}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Unmapped Headers to map */}
      <div className="space-y-3">
        <p className="text-xs text-[#778DA9] font-semibold">
          Select Canonical Mapping for File Headers:
        </p>
        <div className="grid gap-2.5 max-h-64 overflow-y-auto pr-1">
          {headersToMap.map((header) => (
            <div
              key={header}
              className="flex flex-col sm:flex-row sm:items-center gap-2.5 p-3 rounded-xl bg-[#1B263B]/80 border border-[#415A77]/30"
            >
              <span className="text-xs font-mono text-[#778DA9] bg-[#0D1B2A]/40 px-2 py-1 rounded border border-[#415A77]/20 shrink-0 w-full sm:w-48 truncate">
                "{header}"
              </span>
              <span className="text-[#415A77] hidden sm:inline text-xs">→</span>
              <select
                value={columnMap[header] ?? ""}
                onChange={(e) =>
                  onChange({
                    ...columnMap,
                    [header]: e.target.value || undefined,
                  })
                }
                className="flex-1 text-xs rounded-lg bg-[#0D1B2A] border border-white/15 px-3 py-1.5 text-[#E0E1DD] outline-none focus:border-indigo-400"
              >
                <option value="">
                  Keep as custom field (field.{header.toLowerCase().replace(/[^a-z0-9]+/g, "_")})
                </option>
                {CANONICAL_COLUMNS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Re-upload button if triggered from missing team_id */}
      {onReupload && (
        <div className="flex items-center justify-between pt-2 border-t border-[#415A77]/30">
          <p className="text-xs text-[#778DA9]/80">
            {hasTeamIdMapped ? (
              <span className="text-emerald-400 font-medium">✓ team_id is now mapped</span>
            ) : (
              <span className="text-amber-400 font-medium">⚠️ team_id mapping is required</span>
            )}
          </p>
          <button
            onClick={onReupload}
            disabled={!hasTeamIdMapped}
            className="glow-btn flex items-center gap-2 px-4 py-2 text-xs font-bold text-white rounded-xl disabled:opacity-50 cursor-pointer"
          >
            <span>Apply Mapping & Parse</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
