/**
 * TeamDetailDrawer — slide-in panel showing full team breakdown.
 *
 * Sections:
 *   - Team header (name, status, score, rank, margin)
 *   - Score breakdown bar chart (Recharts)
 *   - Reason codes as human-readable text
 *   - Member list with their flags
 *   - Filter results
 */
import { X, AlertTriangle, CheckCircle2, XCircle, Flag } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { reasonToText } from "@/lib/exportUtils";

const STATUS_COLOR = {
  shortlisted:     "#22c55e",
  waitlisted:      "#eab308",
  rejected:        "#ef4444",
  filter_rejected: "#f97316",
  excluded:        "#9ca3af",
};

const FILTER_ICONS = {
  pass: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  fail: <XCircle className="h-4 w-4 text-red-500" />,
  flag: <Flag className="h-4 w-4 text-yellow-500" />,
  warn: <AlertTriangle className="h-4 w-4 text-yellow-400" />,
};

export default function TeamDetailDrawer({ team, config, onClose }) {
  if (!team) return null;

  const blindMode = config.options?.blindMode;
  const chartData = (team.breakdown ?? []).map((b) => ({
    name: b.label ?? b.criterionId,
    contribution: b.contribution ?? 0,
    status: b.status,
  }));

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />

      {/* Drawer panel */}
      <div className="w-[520px] bg-background border-l overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">{team.teamId}</p>
            <h3 className="font-semibold text-lg leading-tight">
              {blindMode ? `Team ${team.teamId}` : (team.teamName || team.teamId)}
            </h3>
            <div className="flex items-center gap-3 mt-1">
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                style={{ background: STATUS_COLOR[team.status] + "20", color: STATUS_COLOR[team.status] }}
              >
                {team.status?.replace("_", " ")}
              </span>
              {team.rank && <span className="text-xs text-muted-foreground">Rank #{team.rank}</span>}
              <span className="text-xs font-mono">Score: {team.score?.toFixed(4)}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Score vs cutoff */}
          <div className="rounded-xl bg-muted p-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Score</p>
              <p className="text-xl font-bold">{team.score?.toFixed(4)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cutoff</p>
              <p className="text-xl font-bold">{team.cutoffScore?.toFixed(4)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Margin</p>
              <p className={`text-xl font-bold ${(team.margin ?? 0) >= 0 ? "text-green-600" : "text-red-500"}`}>
                {team.margin != null ? (team.margin >= 0 ? "+" : "") + team.margin.toFixed(4) : "—"}
              </p>
            </div>
          </div>

          {/* Score breakdown chart */}
          {chartData.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Score Breakdown</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30, top: 0, bottom: 0 }}>
                  <XAxis type="number" domain={[0, 1]} tickFormatter={(v) => v.toFixed(2)} fontSize={11} />
                  <YAxis type="category" dataKey="name" width={110} fontSize={11} />
                  <Tooltip formatter={(v) => v.toFixed(4)} />
                  <Bar dataKey="contribution" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.status === "ok" ? "#3b82f6" : "#d1d5db"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Breakdown table */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Criterion Details</h4>
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Criterion</th>
                    <th className="px-3 py-2 text-right">Raw</th>
                    <th className="px-3 py-2 text-right">Norm</th>
                    <th className="px-3 py-2 text-right">Weight</th>
                    <th className="px-3 py-2 text-right">Contrib</th>
                    <th className="px-3 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(team.breakdown ?? []).map((b) => (
                    <tr key={b.criterionId} className="border-t">
                      <td className="px-3 py-2 font-medium">{b.label ?? b.criterionId}</td>
                      <td className="px-3 py-2 text-right font-mono">{b.raw ?? "—"}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {b.normalized != null ? b.normalized.toFixed(3) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{b.effectiveWeight?.toFixed(3)}</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold">
                        {b.contribution?.toFixed(4)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${
                          b.status === "ok"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700"
                            : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700"
                        }`}>
                          {b.status}
                          {b.handling ? ` (${b.handling})` : ""}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reasons */}
          {team.reasons?.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Explanation</h4>
              <ul className="space-y-1.5">
                {team.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0">
                      {r.code}
                    </span>
                    <span className="text-muted-foreground">
                      {reasonToText(r, team, config)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Filter results */}
          {team.filterResults?.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Filter Results</h4>
              <div className="space-y-1.5">
                {team.filterResults.map((fr) => (
                  <div key={fr.id} className="flex items-center gap-2 text-sm">
                    {FILTER_ICONS[fr.result] ?? <span>?</span>}
                    <span>{fr.label}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{fr.result}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Members (non-blind mode) */}
          {!blindMode && team.members?.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Members</h4>
              <div className="space-y-2">
                {team.members.map((m) => (
                  <div key={m.memberId} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{m.name || m.memberId}</span>
                      {m.isLead && (
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">Lead</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                    {/* Source links */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Object.entries(m.sources ?? {}).map(([src, val]) =>
                        val?.url ? (
                          <a
                            key={src}
                            href={val.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline capitalize"
                          >
                            {src} ↗
                          </a>
                        ) : null
                      )}
                    </div>
                    {/* Member flags */}
                    {m.flags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {m.flags.map((f, fi) => (
                          <span key={fi} className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 px-1.5 py-0.5 rounded">
                            ⚠ {f.code}: {f.detail}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
