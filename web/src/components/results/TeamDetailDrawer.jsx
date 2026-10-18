/**
 * TeamDetailDrawer — Slide-in inspector for detailed team auditing.
 * Features 100% opaque cyber-luxe glass panel, contribution bar charts,
 * criterion audit tables, executive reasoning summaries, and applicant rosters.
 *
 * Implements Must-do UI Rules #1, #3, #4, #5, #6, #8 from Enrichment Handoff:
 * - Never show missing values as 0 (use status badges: ok, not_provided, fetch_failed, low_confidence)
 * - Show low_confidence & fetch_failed visibly with failure reason tooltips
 * - Support all 9 flags with severity and related member links
 * - AI marker for origin: "llm" with model, confidence, and previous value comparison
 * - Blind review mode masks names, emails, sources, and redacts usernames from duplicate flags
 * - asOf & enrichedAt display in run telemetry and demo data banner
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Flag,
  Award,
  Layers,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Github,
  FileText,
  Linkedin,
  Globe,
  Info,
  Sparkles,
  Bot,
  Calendar,
  ShieldAlert,
  Pin,
  Ban,
  Clock,
  RotateCcw,
} from "lucide-react";
import useConfigStore from "@/stores/configStore";
import usePresetsStore from "@/stores/presetsStore";
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
import {
  formatMetricValue,
  formatFailureReason,
  STATUS_BADGE_CONFIG,
  FLAG_DEFINITIONS,
  getSafeFlagDetail,
} from "@/lib/handoffFormatters";
import useImportStore from "@/stores/importStore";
import DemoDataBanner from "@/components/common/DemoDataBanner";

const STATUS_CONFIG = {
  shortlisted: {
    bg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
    glow: "shadow-[0_0_12px_rgba(52,211,153,0.3)]",
    label: "Shortlisted",
  },
  waitlisted: {
    bg: "bg-amber-500/15 border-amber-500/30 text-amber-300",
    glow: "shadow-[0_0_12px_rgba(251,191,36,0.3)]",
    label: "Waitlisted",
  },
  rejected: {
    bg: "bg-rose-500/15 border-rose-500/30 text-rose-300",
    glow: "shadow-[0_0_12px_rgba(244,63,94,0.3)]",
    label: "Rejected",
  },
  filter_rejected: {
    bg: "bg-orange-500/15 border-orange-500/30 text-orange-300",
    glow: "shadow-[0_0_12px_rgba(249,115,22,0.3)]",
    label: "Filter Disqualified",
  },
  excluded: {
    bg: "bg-slate-700/30 border-slate-600/40 text-slate-300",
    glow: "",
    label: "Manually Excluded",
  },
};

const FILTER_ICONS = {
  pass: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  fail: <XCircle className="h-4 w-4 text-rose-400" />,
  flag: <Flag className="h-4 w-4 text-amber-400" />,
  warn: <AlertTriangle className="h-4 w-4 text-amber-400" />,
};

export default function TeamDetailDrawer({ team, config, onClose }) {
  const { asOf, enrichedAt, isMockGithub } = useImportStore();
  const { pinTeam, excludeTeam, waitlistTeam, clearOverride } = useConfigStore();
  const { logAction } = usePresetsStore();
  const [highlightedMemberId, setHighlightedMemberId] = useState(null);

  if (!team) return null;

  const blindMode = config?.options?.blindMode;
  const statusCfg = STATUS_CONFIG[team.status] || STATUS_CONFIG.shortlisted;
  const isPin = config?.overrides?.pin?.includes(team.teamId);
  const isWaitlist = config?.overrides?.waitlist?.includes(team.teamId);
  const isExclude = config?.overrides?.exclude?.includes(team.teamId);

  const chartData = (team.breakdown ?? []).map((b) => ({
    name: b.label ?? b.metric ?? b.criterionId,
    contribution: Number((b.score ?? b.contribution ?? 0).toFixed(2)),
    status: b.status ?? (b.score != null ? "ok" : "missing"),
  }));

  const margin =
    team.margin ??
    (team.score != null && team.cutoffScore != null
      ? team.score - team.cutoffScore
      : null);
  const isPositiveMargin = margin != null && margin >= 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Dimmed backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
      />

      {/* Slide-out drawer panel with solid opaque cyber background */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="relative w-full max-w-2xl bg-[#090e1a] border-l border-white/10 shadow-2xl flex flex-col h-full z-10 text-slate-100"
      >
        {/* Sticky Header */}
        <div className="sticky top-0 bg-[#090e1a]/95 backdrop-blur-xl border-b border-white/10 px-6 py-5 z-20">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/5">
                  {team.teamId}
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${statusCfg.bg} ${statusCfg.glow}`}
                >
                  {statusCfg.label}
                </span>
                {team.rank && (
                  <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
                    Rank #{team.rank}
                  </span>
                )}
                {blindMode && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Blind Mode Active
                  </span>
                )}
              </div>

              <h3 className="text-xl font-bold text-white tracking-tight">
                {blindMode ? `Team ${team.teamId}` : team.teamName || team.teamId}
              </h3>

              <p className="text-xs text-slate-400 mt-0.5">
                {team.members?.length ?? 0} applicant
                {team.members?.length !== 1 ? "s" : ""} registered
                {team.fields?.track_interest && (
                  <span className="ml-2 font-mono text-indigo-300 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-500/20">
                    Track: {team.fields.track_interest}
                  </span>
                )}
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Close inspector"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Override Governance Toolbar */}
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/10">
            {team.status !== "shortlisted" ? (
              <button
                onClick={() => {
                  pinTeam(team.teamId);
                  logAction("PIN", { teamId: team.teamId });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.25)]"
              >
                <Award className="h-3.5 w-3.5 text-emerald-400" />
                Move to Shortlist
              </button>
            ) : isPin ? (
              <button
                onClick={() => {
                  clearOverride(team.teamId);
                  logAction("UNPIN", { teamId: team.teamId });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/25 border border-indigo-500/40 text-indigo-300 font-bold text-xs transition cursor-pointer shadow-[0_0_12px_rgba(99,102,241,0.25)]"
              >
                <Pin className="h-3.5 w-3.5 fill-current" />
                Pinned in Shortlist (Unpin)
              </button>
            ) : (
              <button
                onClick={() => {
                  pinTeam(team.teamId);
                  logAction("PIN", { teamId: team.teamId });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-semibold text-xs transition cursor-pointer"
              >
                <Pin className="h-3.5 w-3.5" />
                Pin to Top
              </button>
            )}

            <button
              onClick={() => {
                isWaitlist ? clearOverride(team.teamId) : waitlistTeam(team.teamId);
                logAction(isWaitlist ? "CLEAR_WAITLIST" : "WAITLIST", { teamId: team.teamId });
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                isWaitlist
                  ? "bg-amber-500/25 border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                  : "bg-slate-900/80 border-white/10 text-slate-300 hover:text-amber-300 hover:border-amber-500/30"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              {isWaitlist ? "In Waitlist (Click to Reset)" : "Move to Waitlist"}
            </button>

            <button
              onClick={() => {
                isExclude ? clearOverride(team.teamId) : excludeTeam(team.teamId);
                logAction(isExclude ? "UNEXCLUDE" : "EXCLUDE", { teamId: team.teamId });
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                isExclude
                  ? "bg-rose-500/25 border-rose-500/40 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.25)]"
                  : "bg-slate-900/80 border-white/10 text-slate-300 hover:text-rose-400 hover:border-rose-500/30"
              }`}
            >
              <Ban className="h-3.5 w-3.5" />
              {isExclude ? "Excluded (Restore)" : "Exclude Team"}
            </button>

            {(isPin || isWaitlist || isExclude) && (
              <button
                onClick={() => {
                  clearOverride(team.teamId);
                  logAction("RESET_OVERRIDE", { teamId: team.teamId });
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-white/10 text-xs text-slate-400 hover:text-white transition cursor-pointer ml-auto"
                title="Reset manual override to algorithm rank"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Override
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Demo Data Banner if mock_github */}
          {isMockGithub && <DemoDataBanner />}

          {/* Top Score Comparison Strip */}
          <div className="rounded-2xl bg-slate-900/80 border border-white/10 p-4 grid grid-cols-3 gap-3 text-center shadow-inner">
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Total Score
              </p>
              <p className="text-2xl font-extrabold font-mono text-white">
                {team.score?.toFixed(4) ?? "—"}
              </p>
            </div>
            <div className="space-y-1 border-x border-white/10">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Cutoff Line
              </p>
              <p className="text-2xl font-extrabold font-mono text-slate-300">
                {team.cutoffScore?.toFixed(4) ?? "—"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Cutoff Margin
              </p>
              <p
                className={`text-2xl font-extrabold font-mono flex items-center justify-center gap-0.5 ${
                  isPositiveMargin ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {isPositiveMargin ? (
                  <TrendingUp className="h-5 w-5" />
                ) : (
                  <TrendingDown className="h-5 w-5" />
                )}
                {margin != null
                  ? `${isPositiveMargin ? "+" : ""}${margin.toFixed(4)}`
                  : "—"}
              </p>
            </div>
          </div>

          {/* Contribution Bar Chart */}
          {chartData.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Award className="h-4 w-4 text-indigo-400" />
                  Scoring Contribution Breakdown
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">
                  Points per criterion
                </span>
              </div>
              <div className="h-44 w-full rounded-2xl bg-slate-900/60 border border-white/10 p-3 pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 0, right: 24, left: 24, bottom: 0 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={120}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "rgba(255,255,255,0.15)",
                        borderRadius: "10px",
                        color: "#f8fafc",
                        fontSize: "12px",
                      }}
                      formatter={(v) => [Number(v).toFixed(4), "Score Points"]}
                    />
                    <Bar dataKey="contribution" radius={[0, 6, 6, 0]}>
                      {chartData.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={entry.status === "ok" ? "#6366f1" : "#475569"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Criterion Scoring Matrix Table */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-cyan-400" />
              Criterion Scoring Matrix
            </h4>
            <div className="rounded-xl border border-white/10 overflow-hidden bg-slate-900/60">
              <table className="w-full text-xs">
                <thead className="bg-slate-950/70 border-b border-white/10 text-slate-400 font-semibold">
                  <tr>
                    <th className="px-3.5 py-2.5 text-left">Criterion</th>
                    <th className="px-3 py-2.5 text-right font-mono">Raw</th>
                    <th className="px-3 py-2.5 text-right font-mono">Norm</th>
                    <th className="px-3 py-2.5 text-right font-mono">Weight</th>
                    <th className="px-3 py-2.5 text-right font-mono">Contrib</th>
                    <th className="px-3.5 py-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {(team.breakdown ?? []).map((b) => (
                    <tr
                      key={b.criterionId}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-3.5 py-2.5 font-medium text-slate-200">
                        {b.label ?? b.criterionId}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-300">
                        {b.raw != null ? String(b.raw) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-300">
                        {b.normalized != null ? b.normalized.toFixed(3) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-400">
                        {b.effectiveWeight?.toFixed(3) ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-cyan-300">
                        {b.contribution?.toFixed(4) ?? "0.0000"}
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            b.status === "ok"
                              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                              : "bg-amber-500/15 border-amber-500/30 text-amber-300"
                          }`}
                        >
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

          {/* Executive Decision Summary (AI / Engine Explanation) */}
          {team.explanation && (
            <div className="space-y-3 p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20">
              <h4 className="font-bold text-sm text-indigo-300 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                Executive Decision Summary
              </h4>
              {team.explanation.summary && (
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  {team.explanation.summary}
                </p>
              )}
              {team.explanation.strengths?.length > 0 && (
                <div className="space-y-1 pt-1">
                  <p className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3" /> Key Strengths
                  </p>
                  <ul className="list-disc list-inside text-xs text-slate-300 space-y-0.5">
                    {team.explanation.strengths.map((str, idx) => (
                      <li key={idx} className="text-slate-300">
                        {str}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {team.explanation.growthAreas?.length > 0 && (
                <div className="space-y-1 pt-1">
                  <p className="text-[11px] font-semibold text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3" /> Growth Opportunities
                  </p>
                  <ul className="list-disc list-inside text-xs text-slate-300 space-y-0.5">
                    {team.explanation.growthAreas.map((ga, idx) => (
                      <li key={idx} className="text-slate-300">
                        {ga}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {team.explanation.missingDataNotes?.length > 0 && (
                <div className="space-y-1 pt-1">
                  <p className="text-[11px] font-semibold text-rose-400 flex items-center gap-1.5">
                    <Flag className="h-3 w-3" /> Missing Data Advisories
                  </p>
                  <ul className="list-disc list-inside text-xs text-slate-400 space-y-0.5">
                    {team.explanation.missingDataNotes.map((note, idx) => (
                      <li key={idx} className="text-slate-400">
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Explainability Audit Trail */}
          {team.reasons?.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <Info className="h-4 w-4 text-emerald-400" />
                Explainability & Decision Audit
              </h4>
              <div className="space-y-2">
                {team.reasons.map((r, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-slate-900/60 border border-white/10 flex items-start gap-3"
                  >
                    <span className="font-mono text-[10px] font-bold tracking-wider px-2 py-1 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shrink-0">
                      {r.code}
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {reasonToText(r, team, config)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter Rule Checks */}
          {team.filterResults?.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-white">
                Eligibility Rules Verification
              </h4>
              <div className="space-y-2">
                {team.filterResults.map((fr) => (
                  <div
                    key={fr.id}
                    className="p-3 rounded-xl bg-slate-900/40 border border-white/[0.08] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      {FILTER_ICONS[fr.result] ?? (
                        <Info className="h-4 w-4 text-slate-400" />
                      )}
                      <span className="font-medium text-slate-200">
                        {fr.label}
                      </span>
                    </div>
                    <span className="capitalize font-mono font-bold text-[11px] text-slate-400">
                      {fr.result}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Applicant Profiles Roster (Must-do UI Rules #1, #3, #4, #5, #6) */}
          {team.members?.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Award className="h-4 w-4 text-cyan-400" />
                  Applicant Profiles & Signal Matrix ({team.members.length})
                </h4>
                {blindMode && (
                  <span className="text-[11px] text-amber-300/80 font-mono">
                    PII & direct links masked for bias mitigation
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {team.members.map((m, mIdx) => {
                  const displayName = blindMode
                    ? `Applicant #${mIdx + 1}${m.isLead ? " (Lead)" : ""}`
                    : m.name || `Member ${mIdx + 1}`;

                  const isHighlighted = highlightedMemberId === m.memberId;

                  return (
                    <div
                      key={m.memberId || mIdx}
                      className={`p-4 rounded-xl border transition-all space-y-3 ${
                        isHighlighted
                          ? "bg-indigo-950/40 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                          : "bg-slate-900/70 border-white/10 hover:border-white/20"
                      }`}
                    >
                      {/* Member Identity & Lead Badge */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">
                            {displayName}
                          </span>
                          {m.isLead && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                              Lead
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-slate-500">
                          {blindMode ? `ID-${mIdx + 1}` : m.memberId}
                        </span>
                      </div>

                      {/* Member Email (Visible in non-blind mode only) */}
                      {!blindMode && m.email && (
                        <p className="text-xs text-slate-400 font-mono">
                          {m.email}
                        </p>
                      )}

                      {/* Source links pills (Visible in non-blind mode only) */}
                      {!blindMode && (
                        <div className="flex flex-wrap gap-2 pt-0.5">
                          {m.sources?.github?.url && (
                            <a
                              href={m.sources.github.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-medium text-indigo-300 hover:text-white border border-white/5 transition"
                            >
                              <Github className="h-3 w-3" /> GitHub{" "}
                              <ArrowUpRight className="h-2.5 w-2.5 opacity-60" />
                            </a>
                          )}
                          {m.sources?.resume?.url && (
                            <a
                              href={m.sources.resume.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-medium text-cyan-300 hover:text-white border border-white/5 transition"
                            >
                              <FileText className="h-3 w-3" /> Resume{" "}
                              <ArrowUpRight className="h-2.5 w-2.5 opacity-60" />
                            </a>
                          )}
                          {m.sources?.linkedin?.url && (
                            <a
                              href={m.sources.linkedin.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-medium text-sky-300 hover:text-white border border-white/5 transition"
                            >
                              <Linkedin className="h-3 w-3" /> LinkedIn{" "}
                              <ArrowUpRight className="h-2.5 w-2.5 opacity-60" />
                            </a>
                          )}
                          {m.sources?.portfolio?.url && (
                            <a
                              href={m.sources.portfolio.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-medium text-emerald-300 hover:text-white border border-white/5 transition"
                            >
                              <Globe className="h-3 w-3" /> Portfolio{" "}
                              <ArrowUpRight className="h-2.5 w-2.5 opacity-60" />
                            </a>
                          )}
                        </div>
                      )}

                      {/* Flags attached to this applicant (All 9 Flag Codes supported) */}
                      {m.flags?.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          {m.flags.map((flag, fIdx) => {
                            const def =
                              FLAG_DEFINITIONS[flag.code] || {
                                defaultSeverity: "warn",
                                title: flag.code,
                              };
                            const isWarn =
                              (flag.severity || def.defaultSeverity) === "warn";
                            const safeDetail = getSafeFlagDetail(flag, blindMode);

                            return (
                              <div
                                key={fIdx}
                                className={`p-2.5 rounded-lg border flex items-start justify-between gap-2 text-xs ${
                                  isWarn
                                    ? "bg-amber-500/10 border-amber-500/25 text-amber-200"
                                    : "bg-blue-500/10 border-blue-500/25 text-blue-200"
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded border ${
                                        isWarn
                                          ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                                          : "bg-blue-500/20 border-blue-500/40 text-blue-300"
                                      }`}
                                    >
                                      {flag.severity || def.defaultSeverity}
                                    </span>
                                    <strong className="text-white text-[11px]">
                                      {def.title || flag.code}
                                    </strong>
                                  </div>
                                  <p className="text-[11px] opacity-90 leading-snug">
                                    {safeDetail}
                                  </p>
                                </div>

                                {/* Clickable related member jump (Rule #4) */}
                                {!blindMode && flag.related?.length > 0 && (
                                  <div className="flex flex-col items-end shrink-0 gap-1">
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      Related:
                                    </span>
                                    <div className="flex gap-1">
                                      {flag.related.map((relId) => (
                                        <button
                                          key={relId}
                                          onClick={() =>
                                            setHighlightedMemberId(
                                              highlightedMemberId === relId
                                                ? null
                                                : relId
                                            )
                                          }
                                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 hover:bg-slate-700 border border-cyan-500/30 transition cursor-pointer"
                                          title={`Highlight related applicant ${relId}`}
                                        >
                                          {relId}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Enriched Metrics Grid for this Applicant */}
                      {m.metrics && Object.keys(m.metrics).length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <p className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                            <Bot className="h-3 w-3 text-cyan-400" />
                            Signals & Enriched Metrics
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {Object.entries(m.metrics).map(
                              ([metricId, entry]) => {
                                const formatted = formatMetricValue(
                                  metricId,
                                  entry
                                );
                                const statusCfgBadge =
                                  STATUS_BADGE_CONFIG[formatted.status] ||
                                  STATUS_BADGE_CONFIG.ok;

                                const isLlm = entry?.origin === "llm";

                                return (
                                  <div
                                    key={metricId}
                                    className="p-2 rounded-lg bg-slate-950/60 border border-white/[0.06] space-y-1"
                                    title={formatted.tooltip || ""}
                                  >
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="font-mono text-slate-400 truncate max-w-[150px]">
                                        {metricId}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        {/* AI Refined Badge (Must-do UI Rule #5) */}
                                        {isLlm && (
                                          <span
                                            className="px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[9px] font-mono font-bold flex items-center gap-0.5"
                                            title={`AI Refined via ${
                                              entry.model || "LLM"
                                            }${
                                              entry.confidence != null
                                                ? ` (${Math.round(
                                                    entry.confidence * 100
                                                  )}% conf)`
                                                : ""
                                            }${
                                              entry.previous
                                                ? ` • Replaced rule value: ${entry.previous.value}`
                                                : ""
                                            }`}
                                          >
                                            <Sparkles className="h-2.5 w-2.5 text-cyan-300" />
                                            AI
                                          </span>
                                        )}
                                        {/* Status badge (Must-do UI Rule #1 & #3) */}
                                        <span
                                          className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold border ${statusCfgBadge.badgeClass}`}
                                        >
                                          {statusCfgBadge.label}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="font-mono font-bold text-white text-xs truncate">
                                      {formatted.display}
                                    </div>

                                    {/* AI previous audit comparison note */}
                                    {isLlm && entry.previous && (
                                      <p className="text-[10px] text-slate-500 font-mono">
                                        Rules estimated: {entry.previous.value}
                                      </p>
                                    )}

                                    {/* Tooltip reason if failed */}
                                    {entry.error && (
                                      <p className="text-[10px] text-rose-400 font-mono truncate">
                                        {formatFailureReason(entry.error)}
                                      </p>
                                    )}
                                  </div>
                                );
                              }
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reference Time Baseline Footer (Must-do UI Rule #8) */}
          {asOf && (
            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/10 flex items-center justify-between text-xs text-slate-400 font-mono">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>
                  Signal Reference Date (asOf):{" "}
                  <strong className="text-slate-200">
                    {new Date(asOf).toUTCString()}
                  </strong>
                </span>
              </div>
              {enrichedAt && (
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  Enriched at: {new Date(enrichedAt).toLocaleTimeString()}
                </span>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
