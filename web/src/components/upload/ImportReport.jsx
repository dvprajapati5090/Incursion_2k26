/**
 * ImportReport — shows the server-returned import report after file upload.
 * Displays team counts, source coverage, and any issues (errors/warnings).
 */
import { AlertCircle, AlertTriangle, CheckCircle2, Users, Database } from "lucide-react";

export default function ImportReport({ report }) {
  if (!report) return null;

  const { teamsFound, membersFound, teamSizes, sourceCoverage, issueCounts, issues } = report;

  return (
    <div className="rounded-xl border p-5 space-y-4 bg-card">
      <h3 className="font-semibold flex items-center gap-2">
        <Database className="h-4 w-4" />
        Import Report
      </h3>

      {/* Summary numbers */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Teams Found" value={teamsFound} />
        <Stat label="Members Found" value={membersFound} />
        <Stat label="Errors" value={issueCounts?.error ?? 0} valueClass={issueCounts?.error > 0 ? "text-destructive" : ""} />
        <Stat label="Warnings" value={issueCounts?.warning ?? 0} valueClass={issueCounts?.warning > 0 ? "text-yellow-600" : ""} />
      </div>

      {/* Team size distribution */}
      {teamSizes && Object.keys(teamSizes).length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1 font-medium flex items-center gap-1">
            <Users className="h-3 w-3" /> Team size distribution
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(teamSizes).sort(([a], [b]) => Number(a) - Number(b)).map(([size, count]) => (
              <span key={size} className="text-xs bg-secondary px-2 py-0.5 rounded-full">
                {size} member{size !== "1" ? "s" : ""}: <strong>{count}</strong> team{count !== 1 ? "s" : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Source coverage */}
      {sourceCoverage && (
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-medium">Source coverage</p>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(sourceCoverage.withSource ?? {}).map(([source, count]) => {
              const pct = sourceCoverage.members > 0
                ? Math.round((count / sourceCoverage.members) * 100)
                : 0;
              return (
                <div key={source} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="capitalize">{source}</span>
                    <span className="text-muted-foreground">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Issues */}
      {issues && issues.length > 0 && (
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          <p className="text-xs text-muted-foreground font-medium">Issues</p>
          {issues.slice(0, 20).map((issue, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 text-xs p-2 rounded-lg ${
                issue.severity === "error"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400"
              }`}
            >
              {issue.severity === "error" ? (
                <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
              )}
              <span>{issue.message ?? JSON.stringify(issue)}</span>
            </div>
          ))}
          {issues.length > 20 && (
            <p className="text-xs text-muted-foreground">… and {issues.length - 20} more</p>
          )}
        </div>
      )}

      {issueCounts?.error === 0 && issueCounts?.warning === 0 && (
        <div className="flex items-center gap-2 text-green-600 text-sm">
          <CheckCircle2 className="h-4 w-4" />
          No issues found
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, valueClass = "" }) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold ${valueClass}`}>{value ?? "—"}</p>
    </div>
  );
}
