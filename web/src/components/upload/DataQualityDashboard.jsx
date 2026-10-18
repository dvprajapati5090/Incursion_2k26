/**
 * DataQualityDashboard — Visual telemetry for pre-ranking applicant signal completeness.
 *
 * Implements Must-do UI Rule #2 & Section 3/5:
 * "Show data quality up front using summary.byMetric and the import report, so organizers
 * see how complete the data is before trusting a ranking."
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Sparkles,
  Bot,
  Flag,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function DataQualityDashboard({ summary, asOf, enrichedAt }) {
  const [filterSource, setFilterSource] = useState("all");
  const [isExpanded, setIsExpanded] = useState(true);

  if (!summary || !summary.byMetric) return null;

  const { byMetric = {}, llm = {}, flags = {}, members = 0, teams = 0 } = summary;
  const metricEntries = Object.entries(byMetric);

  if (metricEntries.length === 0) return null;

  // Aggregate totals
  let totalOk = 0;
  let totalNotProvided = 0;
  let totalFetchFailed = 0;
  let totalLowConfidence = 0;

  for (const [, counts] of metricEntries) {
    totalOk += counts.ok || 0;
    totalNotProvided += counts.not_provided || 0;
    totalFetchFailed += counts.fetch_failed || 0;
    totalLowConfidence += counts.low_confidence || 0;
  }

  const grandTotal = totalOk + totalNotProvided + totalFetchFailed + totalLowConfidence;
  const overallCompleteness = grandTotal > 0 ? Math.round((totalOk / grandTotal) * 100) : 0;

  const totalFlagsCount = Object.values(flags).reduce((acc, count) => acc + (count || 0), 0);

  // Filter metrics by source prefix
  const filteredMetrics = metricEntries.filter(([id]) => {
    if (filterSource === "all") return true;
    return id.startsWith(filterSource);
  });

  const getSourceBadge = (id) => {
    if (id.startsWith("github")) return { label: "GitHub", color: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" };
    if (id.startsWith("resume")) return { label: "Resume", color: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" };
    if (id.startsWith("linkedin")) return { label: "LinkedIn", color: "bg-sky-500/15 text-sky-300 border-sky-500/30" };
    if (id.startsWith("portfolio")) return { label: "Portfolio", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" };
    return { label: "Computed", color: "bg-purple-500/15 text-purple-300 border-purple-500/30" };
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-6">
      {/* Header with expand toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-cyan-500/30 text-cyan-300">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-white">Cohort Data Quality & Signal Coverage</h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                Pre-Ranking Audit
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified metric completeness across {members} applicant profile{members !== 1 ? "s" : ""} in {teams} team{teams !== 1 ? "s" : ""}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 text-xs font-semibold transition cursor-pointer"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" /> Collapse
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" /> Expand Dashboard
              </>
            )}
          </button>
        </div>
      </div>

      {/* KPI Overview Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Overall Completeness</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-300">
            {overallCompleteness}%
          </div>
          <p className="text-[11px] text-slate-500">
            {totalOk} of {grandTotal} signal data points verified
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>AI Refinements (LLM)</span>
            <Bot className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-300">
            {llm.metricsUpdated ?? 0}
          </div>
          <p className="text-[11px] text-slate-500">
            {llm.attempted ?? 0} analyzed • {llm.failed ?? 0} failed
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Profile Flags Raised</span>
            <Flag className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-300">
            {totalFlagsCount}
          </div>
          <p className="text-[11px] text-slate-500">
            Across {Object.keys(flags).length} distinct audit categories
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Signal Timestamp</span>
            <Calendar className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-xs font-mono text-cyan-300 truncate font-semibold mt-1">
            {asOf ? new Date(asOf).toLocaleDateString() : "Present"}
          </div>
          <p className="text-[10px] text-slate-500 truncate" title={asOf || ""}>
            asOf reference baseline
          </p>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4 pt-2">
          {/* Source Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex flex-wrap gap-1.5 text-xs">
              {[
                { id: "all", label: "All Metrics" },
                { id: "github", label: "GitHub" },
                { id: "resume", label: "Resume" },
                { id: "linkedin", label: "LinkedIn" },
                { id: "portfolio", label: "Portfolio" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterSource(tab.id)}
                  className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                    filterSource === tab.id
                      ? "bg-indigo-600 text-white font-bold"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> Available (ok)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-400" /> Uncertain
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-400" /> Fetch Failed
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-slate-600" /> Not Provided
              </span>
            </div>
          </div>

          {/* Metric Completeness Table */}
          <div className="rounded-xl border border-white/10 overflow-hidden bg-slate-950/60 max-h-80 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-white/10">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold">Signal Metric</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Distribution Breakdown</th>
                  <th className="px-3 py-2.5 text-right font-mono font-semibold">Available</th>
                  <th className="px-3 py-2.5 text-right font-mono font-semibold">Uncertain</th>
                  <th className="px-3 py-2.5 text-right font-mono font-semibold">Failed</th>
                  <th className="px-4 py-2.5 text-right font-mono font-semibold">Missing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filteredMetrics.map(([metricId, counts]) => {
                  const mOk = counts.ok || 0;
                  const mLow = counts.low_confidence || 0;
                  const mFail = counts.fetch_failed || 0;
                  const mMissing = counts.not_provided || 0;
                  const total = mOk + mLow + mFail + mMissing;

                  const pctOk = total > 0 ? (mOk / total) * 100 : 0;
                  const pctLow = total > 0 ? (mLow / total) * 100 : 0;
                  const pctFail = total > 0 ? (mFail / total) * 100 : 0;
                  const pctMissing = total > 0 ? (mMissing / total) * 100 : 0;

                  const src = getSourceBadge(metricId);

                  return (
                    <tr key={metricId} className="hover:bg-white/[0.02] transition">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${src.color}`}>
                            {src.label}
                          </span>
                          <span className="font-mono text-slate-200">{metricId}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 w-48">
                        <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden flex">
                          {pctOk > 0 && (
                            <div style={{ width: `${pctOk}%` }} className="h-full bg-emerald-500" title={`Available: ${mOk}`} />
                          )}
                          {pctLow > 0 && (
                            <div style={{ width: `${pctLow}%` }} className="h-full bg-amber-500" title={`Uncertain: ${mLow}`} />
                          )}
                          {pctFail > 0 && (
                            <div style={{ width: `${pctFail}%` }} className="h-full bg-rose-500" title={`Failed: ${mFail}`} />
                          )}
                          {pctMissing > 0 && (
                            <div style={{ width: `${pctMissing}%` }} className="h-full bg-slate-700" title={`Not provided: ${mMissing}`} />
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-emerald-300 font-semibold">{mOk}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-amber-300">{mLow}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-rose-300">{mFail}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-500">{mMissing}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footnote on asOf baseline */}
          {asOf && (
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
              <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>
                Baseline Signal Reference: <strong>{new Date(asOf).toUTCString()}</strong>.
                Resume "Present" dates and GitHub account ages are calculated relative to this timestamp.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
