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
import { useState, useEffect } from "react";
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
  ArrowLeftRight,
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
  formatNotProvidedReason,
  STATUS_BADGE_CONFIG,
  FLAG_DEFINITIONS,
  getSafeFlagDetail,
} from "@/lib/handoffFormatters";
import { getRegistry } from "@/lib/api";
import useImportStore from "@/stores/importStore";
import DemoDataBanner from "@/components/common/DemoDataBanner";

const STATUS_CONFIG = {
  shortlisted: {
    bg: "bg-emerald-500/15 border-[#415A77]/40 text-emerald-300",
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
    bg: "bg-slate-700/30 border-slate-600/40 text-[#778DA9]",
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

export const SIGNAL_DOMAINS = [
  {
    id: "github",
    name: "GitHub Intelligence",
    icon: Github,
    color: "text-[#415A77]",
    badge: "bg-[#415A77]/15 text-[#778DA9] border-[#415A77]/45",
    metrics: [
      { id: "github.contributions_1y", label: "Contributions (1y)" },
      { id: "github.public_repos", label: "Public Repos", aliases: ["github.repo_count"] },
      { id: "github.original_repos", label: "Original Repos", aliases: ["github.original_repo_count"] },
      { id: "github.stars_received", label: "Stars Received", aliases: ["github.star_count"] },
      { id: "github.merged_prs_1y", label: "Merged PRs (1y)" },
      { id: "github.active_months_1y", label: "Active Months" },
      { id: "github.forked_ratio", label: "Forked Ratio", aliases: ["github.fork_ratio"] },
      { id: "github.empty_repo_ratio", label: "Empty Repo Ratio" },
      { id: "github.languages", label: "Languages", aliases: ["github.top_languages"] },
      { id: "github.language_count", label: "Language Count" },
      { id: "github.account_age_days", label: "Account Age (Days)" },
      { id: "github.last_activity_days", label: "Last Activity (Days)" },
      { id: "github.tech_stack", label: "Tech Stack" },
    ],
  },
  {
    id: "resume",
    name: "Resume & Education Signals",
    icon: FileText,
    color: "text-[#778DA9]",
    badge: "bg-[#415A77]/15 text-[#778DA9] border-[#415A77]/45",
    metrics: [
      { id: "resume.project_count", label: "Projects Listed" },
      { id: "resume.experience_months", label: "Professional Experience" },
      { id: "resume.education_level", label: "Education Level" },
      { id: "resume.skills", label: "Skills Extracted" },
      { id: "resume.achievement_count", label: "Achievements & Awards" },
      { id: "resume.certification_count", label: "Certifications" },
      { id: "resume.internship_count", label: "Internships & Positions" },
      { id: "resume.publication_count", label: "Publications / Papers" },
      { id: "resume.keyword_match", label: "Keyword Match" },
      { id: "resume.text", label: "Resume Text Profile" },
    ],
  },
  {
    id: "portfolio",
    name: "Portfolio & Deployment Demos",
    icon: Globe,
    color: "text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-300 border-[#415A77]/40",
    metrics: [
      { id: "portfolio.is_reachable", label: "Site Reachable" },
      { id: "portfolio.has_live_demo", label: "Live Deployment Demo" },
      { id: "portfolio.project_count", label: "Projects Displayed" },
      { id: "portfolio.tech_stack", label: "Portfolio Tech Stack" },
      { id: "portfolio.text", label: "Portfolio Text Profile" },
    ],
  },
  {
    id: "linkedin",
    name: "LinkedIn Signals",
    icon: Linkedin,
    color: "text-sky-400",
    badge: "bg-sky-500/10 text-sky-300 border-sky-500/30",
    metrics: [
      { id: "linkedin.text", label: "Headline & Experience Text" },
      { id: "linkedin.experience_count", label: "Positions Listed", aliases: ["linkedin.experience_months"] },
      { id: "linkedin.certification_count", label: "Certifications" },
      { id: "linkedin.endorsement_count", label: "Skill Endorsements" },
      { id: "linkedin.skills", label: "Skills Endorsed / Listed" },
    ],
  },
];

function getMemberMetricEntry(member, metricDef) {
  const metrics = member?.metrics || {};
  if (metrics[metricDef.id] !== undefined) {
    return metrics[metricDef.id];
  }
  if (metricDef.aliases) {
    for (const alias of metricDef.aliases) {
      if (metrics[alias] !== undefined) {
        return metrics[alias];
      }
    }
  }
  return {
    value: null,
    status: "not_provided",
    reason: "not_provided_by_applicant",
  };
}

export default function TeamDetailDrawer({ team, config, onClose, onCompareWithTeam }) {
  const { asOf, enrichedAt, isMockGithub } = useImportStore();
  const { pinTeam, excludeTeam, waitlistTeam, clearOverride } = useConfigStore();
  const { logAction } = usePresetsStore();
  const [highlightedMemberId, setHighlightedMemberId] = useState(null);
  const [activeSignalTab, setActiveSignalTab] = useState("all");
  const [activeSignalDomains, setActiveSignalDomains] = useState(SIGNAL_DOMAINS);

  useEffect(() => {
    let mounted = true;
    getRegistry()
      .then((res) => {
        if (!mounted || !res?.metrics) return;
        // Build delivered LinkedIn metrics from registry: filter source === "linkedin" and !reserved
        const liMetricsFromRegistry = res.metrics
          .filter((m) => m.source === "linkedin" && !m.reserved)
          .map((m) => {
            const staticDef = SIGNAL_DOMAINS.find((d) => d.id === "linkedin")
              ?.metrics.find((x) => x.id === m.id);
            return {
              id: m.id,
              label: staticDef?.label || m.description || m.id,
              aliases: staticDef?.aliases,
            };
          });

        if (liMetricsFromRegistry.length > 0) {
          setActiveSignalDomains((prev) =>
            prev.map((dom) =>
              dom.id === "linkedin"
                ? { ...dom, metrics: liMetricsFromRegistry }
                : dom
            )
          );
        }
      })
      .catch(() => {
        // Fallback to static 5 delivered metrics in SIGNAL_DOMAINS
      });

    return () => {
      mounted = false;
    };
  }, []);

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
        className="relative w-full max-w-2xl bg-[#0D1B2A] border-l border-[#415A77]/30 shadow-2xl flex flex-col h-full z-10 text-[#E0E1DD]"
      >
        {/* Sticky Header */}
        <div className="sticky top-0 bg-[#0D1B2A]/95 backdrop-blur-xl border-b border-[#415A77]/30 px-6 py-5 z-20">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1B263B] text-[#778DA9] border border-white/5">
                  {team.teamId}
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${statusCfg.bg} ${statusCfg.glow}`}
                >
                  {statusCfg.label}
                </span>
                {team.rank && (
                  <span className="text-xs font-mono font-bold text-[#778DA9] bg-[#0D1B2A]/40 px-2 py-0.5 rounded border border-[#415A77]/20">
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

              <p className="text-xs text-[#778DA9]/80 mt-0.5">
                {team.members?.length ?? 0} applicant
                {team.members?.length !== 1 ? "s" : ""} registered
                {team.fields?.track_interest && (
                  <span className="ml-2 font-mono text-[#778DA9] bg-[#0D1B2A]/40 px-2 py-0.5 rounded border border-[#415A77]/35">
                    Track: {team.fields.track_interest}
                  </span>
                )}
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#778DA9]/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Close inspector"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Override Governance Toolbar */}
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[#415A77]/30">
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#415A77]/25 border border-[#415A77]/55 text-[#778DA9] font-bold text-xs transition cursor-pointer shadow-[0_0_12px_rgba(99,102,241,0.25)]"
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#415A77]/15 hover:bg-[#415A77]/20 border border-[#415A77]/45 text-[#778DA9] font-semibold text-xs transition cursor-pointer"
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
                  : "bg-[#1B263B]/80 border-[#415A77]/30 text-[#778DA9] hover:text-amber-300 hover:border-amber-500/30"
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
                  : "bg-[#1B263B]/80 border-[#415A77]/30 text-[#778DA9] hover:text-rose-400 hover:border-rose-500/30"
              }`}
            >
              <Ban className="h-3.5 w-3.5" />
              {isExclude ? "Excluded (Restore)" : "Exclude Team"}
            </button>

            <button
              onClick={() => onCompareWithTeam?.(team)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#415A77]/25 hover:bg-[#415A77]/40 border border-[#778DA9]/40 text-[#E0E1DD] text-xs font-semibold transition cursor-pointer shadow-sm"
              title="Compare this team against another team head-to-head"
            >
              <ArrowLeftRight className="h-3.5 w-3.5 text-[#778DA9]" />
              Compare Team
            </button>

            {(isPin || isWaitlist || isExclude) && (
              <button
                onClick={() => {
                  clearOverride(team.teamId);
                  logAction("RESET_OVERRIDE", { teamId: team.teamId });
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#415A77]/30 text-xs text-[#778DA9]/80 hover:text-white transition cursor-pointer ml-auto"
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
          <div className="rounded-2xl bg-[#1B263B]/80 border border-[#415A77]/30 p-4 grid grid-cols-3 gap-3 text-center shadow-inner">
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-[#778DA9]/80 uppercase tracking-wider">
                Total Score
              </p>
              <p className="text-2xl font-extrabold font-mono text-white">
                {team.score?.toFixed(4) ?? "—"}
              </p>
            </div>
            <div className="space-y-1 border-x border-[#415A77]/30">
              <p className="text-[11px] font-medium text-[#778DA9]/80 uppercase tracking-wider">
                Cutoff Line
              </p>
              <p className="text-2xl font-extrabold font-mono text-[#778DA9]">
                {team.cutoffScore?.toFixed(4) ?? "—"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-[#778DA9]/80 uppercase tracking-wider">
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
                  <Award className="h-4 w-4 text-[#415A77]" />
                  Scoring Contribution Breakdown
                </h4>
                <span className="text-[11px] text-[#778DA9]/80 font-mono">
                  Points per criterion
                </span>
              </div>
              <div className="h-44 w-full rounded-2xl bg-[#1B263B]/60 border border-[#415A77]/30 p-3 pt-4">
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
              <Layers className="h-4 w-4 text-[#778DA9]" />
              Criterion Scoring Matrix
            </h4>
            <div className="rounded-xl border border-[#415A77]/30 overflow-hidden bg-[#1B263B]/60">
              <table className="w-full text-xs">
                <thead className="bg-[#0D1B2A]/70 border-b border-[#415A77]/30 text-[#778DA9]/80 font-semibold">
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
                      <td className="px-3.5 py-2.5 font-medium text-[#E0E1DD]">
                        {b.label ?? b.criterionId}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[#778DA9]">
                        {b.raw != null ? String(b.raw) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[#778DA9]">
                        {b.normalized != null ? b.normalized.toFixed(3) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[#778DA9]/80">
                        {b.effectiveWeight?.toFixed(3) ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-[#778DA9]">
                        {b.contribution?.toFixed(4) ?? "0.0000"}
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            b.status === "ok"
                              ? "bg-emerald-500/15 border-[#415A77]/40 text-emerald-300"
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
            <div className="space-y-3 p-4 rounded-xl bg-[#0D1B2A]/20 border border-[#415A77]/35">
              <h4 className="font-bold text-sm text-[#778DA9] flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#415A77]" />
                Executive Decision Summary
              </h4>
              {team.explanation.summary && (
                <p className="text-xs text-[#778DA9] leading-relaxed font-medium">
                  {team.explanation.summary}
                </p>
              )}
              {team.explanation.strengths?.length > 0 && (
                <div className="space-y-1 pt-1">
                  <p className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3" /> Key Strengths
                  </p>
                  <ul className="list-disc list-inside text-xs text-[#778DA9] space-y-0.5">
                    {team.explanation.strengths.map((str, idx) => (
                      <li key={idx} className="text-[#778DA9]">
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
                  <ul className="list-disc list-inside text-xs text-[#778DA9] space-y-0.5">
                    {team.explanation.growthAreas.map((ga, idx) => (
                      <li key={idx} className="text-[#778DA9]">
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
                  <ul className="list-disc list-inside text-xs text-[#778DA9]/80 space-y-0.5">
                    {team.explanation.missingDataNotes.map((note, idx) => (
                      <li key={idx} className="text-[#778DA9]/80">
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
                    className="p-3 rounded-xl bg-[#1B263B]/60 border border-[#415A77]/30 flex items-start gap-3"
                  >
                    <span className="font-mono text-[10px] font-bold tracking-wider px-2 py-1 rounded bg-[#415A77]/20 text-[#778DA9] border border-[#415A77]/45 shrink-0">
                      {r.code}
                    </span>
                    <p className="text-xs text-[#778DA9] leading-relaxed">
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
                    className="p-3 rounded-xl bg-[#1B263B]/40 border border-[#415A77]/25 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      {FILTER_ICONS[fr.result] ?? (
                        <Info className="h-4 w-4 text-[#778DA9]/80" />
                      )}
                      <span className="font-medium text-[#E0E1DD]">
                        {fr.label}
                      </span>
                    </div>
                    <span className="capitalize font-mono font-bold text-[11px] text-[#778DA9]/80">
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Award className="h-4 w-4 text-[#778DA9]" />
                  Applicant Profiles & Signal Matrix ({team.members.length})
                </h4>
                {blindMode && (
                  <span className="text-[11px] text-amber-300/80 font-mono">
                    PII & direct links masked for bias mitigation
                  </span>
                )}
              </div>

              {/* Signal Domain Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#1B263B] border border-[#415A77]/50 shadow-inner">
                <button
                  type="button"
                  onClick={() => setActiveSignalTab("all")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeSignalTab === "all"
                      ? "bg-[#415A77] text-white shadow-md border border-[#778DA9]/50"
                      : "text-[#778DA9] hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>All Categories</span>
                </button>
                {activeSignalDomains.map((domain) => {
                  const DomainIcon = domain.icon;
                  const isActive = activeSignalTab === domain.id;
                  return (
                    <button
                      key={domain.id}
                      type="button"
                      onClick={() => setActiveSignalTab(domain.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        isActive
                          ? "bg-[#415A77] text-white shadow-md border border-[#778DA9]/50"
                          : "text-[#778DA9] hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <DomainIcon className="h-3.5 w-3.5 text-[#E0E1DD]" />
                      <span>{domain.name.split(" ")[0]} ({domain.metrics.length})</span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-4">
                {team.members.map((m, mIdx) => {
                  const displayName = blindMode
                    ? `Applicant #${mIdx + 1}${m.isLead ? " (Lead)" : ""}`
                    : m.name || `Member ${mIdx + 1}`;

                  const isHighlighted = highlightedMemberId === m.memberId;
                  const domainsToRender =
                    activeSignalTab === "all"
                      ? activeSignalDomains
                      : activeSignalDomains.filter((d) => d.id === activeSignalTab);

                  // Collect any custom metrics not in standard domains
                  const allKnownMetricIds = new Set(
                    activeSignalDomains.flatMap((d) => [
                      d.metrics.map((x) => x.id),
                      d.metrics.flatMap((x) => x.aliases || []),
                    ]).flat()
                  );
                  const extraMetrics = Object.entries(m.metrics || {}).filter(
                    ([k]) => !allKnownMetricIds.has(k)
                  );

                  return (
                    <div
                      key={m.memberId || mIdx}
                      className={`p-4 rounded-xl border transition-all space-y-3 shadow-md ${
                        isHighlighted
                          ? "bg-[#1B263B] border-[#778DA9] shadow-[0_0_20px_rgba(119,141,169,0.35)]"
                          : "bg-[#1B263B] border-[#415A77]/50 hover:border-[#778DA9]/60"
                      }`}
                    >
                      {/* Member Identity & Lead Badge */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">
                            {displayName}
                          </span>
                          {m.isLead && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#415A77]/35 text-[#E0E1DD] border border-[#778DA9]/40 shadow-sm">
                              Lead
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-[#778DA9]">
                          {blindMode ? `ID-${mIdx + 1}` : m.memberId}
                        </span>
                      </div>

                      {/* Member Email (Visible in non-blind mode only) */}
                      {!blindMode && m.email && (
                        <p className="text-xs text-[#778DA9]/80 font-mono">
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
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1B263B] text-xs font-medium text-[#778DA9] hover:text-white border border-white/5 transition"
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
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1B263B] text-xs font-medium text-[#778DA9] hover:text-white border border-white/5 transition"
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
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1B263B] text-xs font-medium text-sky-300 hover:text-white border border-white/5 transition"
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
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1B263B] text-xs font-medium text-emerald-300 hover:text-white border border-white/5 transition"
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
                                    <span className="text-[10px] text-[#778DA9]/80 font-mono">
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
                                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1B263B] text-[#778DA9] hover:bg-slate-700 border border-[#415A77]/45 transition cursor-pointer"
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

                      {/* Categorized Enriched Signals Matrix */}
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-semibold text-[#778DA9] flex items-center gap-1.5">
                            <Bot className="h-3.5 w-3.5 text-[#778DA9]" />
                            Categorized Applicant Signals
                          </p>
                          <span className="text-[10px] font-mono text-[#415A77]">
                            {activeSignalTab === "all" ? "All Domains" : domainsToRender[0]?.name}
                          </span>
                        </div>

                        {domainsToRender.map((domain) => {
                          const DomainIcon = domain.icon;
                          return (
                            <div
                              key={domain.id}
                              className="space-y-2 rounded-xl bg-[#0D1B2A]/50 p-3 border border-white/[0.07]"
                            >
                              {/* Domain Section Header */}
                              <div className="flex items-center justify-between pb-1.5 border-b border-[#415A77]/20">
                                <div className="flex items-center gap-2">
                                  <DomainIcon className={`h-3.5 w-3.5 ${domain.color}`} />
                                  <span className="font-semibold text-xs text-white">
                                    {domain.name}
                                  </span>
                                </div>
                                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${domain.badge}`}>
                                  {domain.metrics.length} metrics
                                </span>
                              </div>

                              {/* Domain Metrics Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                {domain.metrics.map((metricDef) => {
                                  let entry = getMemberMetricEntry(m, metricDef);

                                  // Crucial reachability guard: if portfolio is unreachable, live demo MUST be false
                                  if (metricDef.id === "portfolio.has_live_demo") {
                                    const reach = m.metrics?.["portfolio.is_reachable"];
                                    if (reach && reach.value === false) {
                                      entry = {
                                        ...entry,
                                        value: false,
                                        status: "ok",
                                        origin: "http_check",
                                        error: reach.error || "site_unreachable",
                                      };
                                    }
                                  }

                                  const formatted = formatMetricValue(
                                    metricDef.id,
                                    entry,
                                    m.metrics
                                  );
                                  const statusCfgBadge =
                                    STATUS_BADGE_CONFIG[formatted.status] ||
                                    STATUS_BADGE_CONFIG.ok;
                                  const isLlm = entry?.origin === "llm";

                                  return (
                                    <div
                                      key={metricDef.id}
                                      className="p-2.5 rounded-lg bg-[#1B263B]/90 border border-[#415A77]/20 space-y-1.5 hover:border-[#778DA9]/40 transition-colors"
                                      title={formatted.tooltip || ""}
                                    >
                                      <div className="flex items-center justify-between text-[11px] gap-2">
                                        <div className="flex flex-col min-w-0">
                                          <span className="font-medium text-[#E0E1DD] text-xs truncate">
                                            {metricDef.label}
                                          </span>
                                          <span className="font-mono text-[10px] text-[#415A77] truncate">
                                            {metricDef.id}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                          {/* AI Refined Badge (Must-do UI Rule #5) */}
                                          {isLlm && (
                                            <span
                                              className="px-1 py-0.2 rounded bg-[#415A77]/20 text-[#778DA9] border border-[#415A77]/55 text-[9px] font-mono font-bold flex items-center gap-0.5"
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
                                              <Sparkles className="h-2.5 w-2.5 text-[#778DA9]" />
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

                                      {metricDef.id.startsWith("linkedin.") && formatted.status === "not_provided" ? (
                                        <div
                                          className="text-[11px] text-[#778DA9] italic leading-tight py-0.5"
                                          title={entry?.reason || formatted.tooltip || ""}
                                        >
                                          {formatted.reasonText || formatted.tooltip || formatNotProvidedReason(entry?.reason) || "Not provided by applicant"}
                                        </div>
                                      ) : (
                                        <div className="font-mono font-bold text-white text-xs truncate">
                                          {formatted.display}
                                        </div>
                                      )}

                                      {/* AI previous audit comparison note */}
                                      {isLlm && entry.previous && (
                                        <p className="text-[10px] text-[#415A77] font-mono">
                                          Rules estimated: {entry.previous.value}
                                        </p>
                                      )}

                                      {/* Tooltip reason if failed or unreachable */}
                                      {(entry.error || (metricDef.id === "portfolio.has_live_demo" && formatted.tooltip?.includes("unreachable"))) && (
                                        <p className="text-[10px] text-rose-400 font-mono truncate">
                                          {entry.error
                                            ? formatFailureReason(entry.error)
                                            : "Site unreachable"}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}

                        {/* Extra / Custom Metrics (if any uploaded beyond standard registry) */}
                        {activeSignalTab === "all" && extraMetrics.length > 0 && (
                          <div className="space-y-2 rounded-xl bg-[#0D1B2A]/50 p-3 border border-white/[0.07]">
                            <div className="flex items-center justify-between pb-1.5 border-b border-[#415A77]/20">
                              <span className="font-semibold text-xs text-white">
                                Additional / Custom Signals
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border bg-[#1B263B] text-[#778DA9]/80 border-[#415A77]/30">
                                {extraMetrics.length} metrics
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              {extraMetrics.map(([metricId, entry]) => {
                                const formatted = formatMetricValue(metricId, entry, m.metrics);
                                const statusCfgBadge =
                                  STATUS_BADGE_CONFIG[formatted.status] ||
                                  STATUS_BADGE_CONFIG.ok;

                                return (
                                  <div
                                    key={metricId}
                                    className="p-2.5 rounded-lg bg-[#1B263B]/90 border border-[#415A77]/20 space-y-1.5"
                                    title={formatted.tooltip || ""}
                                  >
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="font-mono text-[#778DA9]/80 truncate max-w-[150px]">
                                        {metricId}
                                      </span>
                                      <span
                                        className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold border ${statusCfgBadge.badgeClass}`}
                                      >
                                        {statusCfgBadge.label}
                                      </span>
                                    </div>
                                    <div className="font-mono font-bold text-white text-xs truncate">
                                      {formatted.display}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reference Time Baseline Footer (Must-do UI Rule #8) */}
          {asOf && (
            <div className="p-3 rounded-xl bg-[#1B263B]/60 border border-[#415A77]/30 flex items-center justify-between text-xs text-[#778DA9]/80 font-mono">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#778DA9] shrink-0" />
                <span>
                  Signal Reference Date (asOf):{" "}
                  <strong className="text-[#E0E1DD]">
                    {new Date(asOf).toUTCString()}
                  </strong>
                </span>
              </div>
              {enrichedAt && (
                <span className="text-[11px] text-[#415A77] hidden sm:inline">
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
