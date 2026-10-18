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
    if (id.startsWith("github")) return { label: "GitHub", color: "bg-[#415A77]/35 text-[#E0E1DD] border border-[#778DA9]/40" };
    if (id.startsWith("resume")) return { label: "Resume", color: "bg-[#778DA9]/25 text-[#E0E1DD] border border-[#778DA9]/40" };
    if (id.startsWith("linkedin")) return { label: "LinkedIn", color: "bg-sky-500/20 text-sky-200 border border-sky-400/40" };
    if (id.startsWith("portfolio")) return { label: "Portfolio", color: "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40" };
    return { label: "Computed", color: "bg-[#415A77]/25 text-[#E0E1DD] border border-[#415A77]/50" };
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-[#415A77]/45 space-y-6 shadow-xl">
      {/* Header with expand toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#415A77]/30 border border-[#778DA9]/40 text-[#E0E1DD] shadow-sm">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-white">Cohort Data Quality &amp; Signal Coverage</h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#1B263B] text-[#E0E1DD] border border-[#415A77]/60">
                Pre-Ranking Audit
              </span>
            </div>
            <p className="text-xs text-[#778DA9] mt-0.5">
              Verified metric completeness across {members} applicant profile{members !== 1 ? "s" : ""} in {teams} team{teams !== 1 ? "s" : ""}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#415A77]/30 hover:bg-white/5 text-[#778DA9] text-xs font-semibold transition cursor-pointer"
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
        <div className="p-4 rounded-xl bg-[#1B263B]/80 border border-[#415A77]/30 space-y-1">
          <div className="flex items-center justify-between text-[#778DA9]/80 text-xs">
            <span>Overall Completeness</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-300">
            {overallCompleteness}%
          </div>
          <p className="text-[11px] text-[#415A77]">
            {totalOk} of {grandTotal} signal data points verified
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#1B263B]/80 border border-[#415A77]/30 space-y-1">
          <div className="flex items-center justify-between text-[#778DA9]/80 text-xs">
            <span>AI Refinements (LLM)</span>
            <Bot className="h-4 w-4 text-[#415A77]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#778DA9]">
            {llm.metricsUpdated ?? 0}
          </div>
          <p className="text-[11px] text-[#415A77]">
            {llm.attempted ?? 0} analyzed • {llm.failed ?? 0} failed
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#1B263B]/80 border border-[#415A77]/30 space-y-1">
          <div className="flex items-center justify-between text-[#778DA9]/80 text-xs">
            <span>Profile Flags Raised</span>
            <Flag className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-300">
            {totalFlagsCount}
          </div>
          <p className="text-[11px] text-[#415A77]">
            Across {Object.keys(flags).length} distinct audit categories
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#1B263B]/80 border border-[#415A77]/30 space-y-1">
          <div className="flex items-center justify-between text-[#778DA9]/80 text-xs">
            <span>Signal Timestamp</span>
            <Calendar className="h-4 w-4 text-[#778DA9]" />
          </div>
          <div className="text-xs font-mono text-[#778DA9] truncate font-semibold mt-1">
            {asOf ? new Date(asOf).toLocaleDateString() : "Present"}
          </div>
          <p className="text-[10px] text-[#415A77] truncate" title={asOf || ""}>
            asOf reference baseline
          </p>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4 pt-2">
          {/* Source Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#415A77]/30 pb-3">
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
                      ? "bg-[#415A77] text-white font-bold"
                      : "text-[#778DA9]/80 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-[11px] text-[#778DA9]/80 font-mono">
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
          <div className="rounded-xl border border-[#415A77]/30 overflow-hidden bg-[#0D1B2A]/60 max-h-80 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#0D1B2A] text-[#778DA9]/80 sticky top-0 border-b border-[#415A77]/30">
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
                          <span className="font-mono text-[#E0E1DD]">{metricId}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 w-48">
                        <div className="h-2 w-full rounded-full bg-[#1B263B] overflow-hidden flex">
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
                      <td className="px-4 py-2.5 text-right font-mono text-[#415A77]">{mMissing}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footnote on asOf baseline */}
          {asOf && (
            <div className="flex items-center gap-2 text-[11px] text-[#415A77] font-mono">
              <Calendar className="h-3.5 w-3.5 text-[#778DA9]/80 shrink-0" />
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
