/**
 * TeamComparisonModal — Deep, pairwise side-by-side team comparison.
 *
 * Supports comparing ANY two teams across every category:
 * - 2 shortlisted teams
 * - 2 waitlisted teams
 * - 1 shortlisted and 1 waitlisted
 * - 2 rejected/disqualified teams
 * - 1 shortlisted and 1 rejected
 * - Any custom pair across the entire cohort.
 *
 * Displays human-readable hierarchical evaluation:
 * - Executive outcome, score differential, and criteria win ratio
 * - Rejection & disqualification rationale (failed eligibility filters, cutoff deficits, manual overrides)
 * - Criteria-by-criteria breakdown with visual score meters
 * - Per-member signal contributions, flags, and direct links to GitHub, Resume PDF, LinkedIn, and Portfolio
 * - Custom team fields & team-level integrity flags
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ArrowLeftRight,
  Award,
  Clock,
  Ban,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Github,
  FileText,
  Linkedin,
  Globe,
  Users,
  Layers,
  Sparkles,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { compareTeams } from "@/engine/runShortlist";
import {
  formatMetricValue,
  formatFailureReason,
  formatNotProvidedReason,
  STATUS_BADGE_CONFIG,
  FLAG_DEFINITIONS,
  getSafeFlagDetail,
} from "@/lib/handoffFormatters";

const STATUS_PILLS = {
  shortlisted: {
    bg: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300",
    label: "Shortlisted",
    icon: Award,
  },
  waitlisted: {
    bg: "bg-amber-500/15 border-amber-500/40 text-amber-300",
    label: "Waitlisted",
    icon: Clock,
  },
  rejected: {
    bg: "bg-rose-500/15 border-rose-500/40 text-rose-300",
    label: "Disqualified",
    icon: Ban,
  },
  filter_rejected: {
    bg: "bg-orange-500/15 border-orange-500/40 text-orange-300",
    label: "Filter Disqualified",
    icon: AlertTriangle,
  },
  excluded: {
    bg: "bg-slate-700/30 border-slate-600/40 text-[#778DA9]",
    label: "Manually Excluded",
    icon: Ban,
  },
};

export default function TeamComparisonModal({
  allTeams = [],
  initialTeamAId = null,
  initialTeamBId = null,
  config = {},
  onClose,
}) {
  const blindMode = config?.options?.blindMode;

  // Resolve valid initial team IDs
  const defaultTeamA =
    allTeams.find((t) => t.teamId === initialTeamAId) ||
    allTeams[0] ||
    null;
  const defaultTeamB =
    allTeams.find((t) => t.teamId === initialTeamBId) ||
    allTeams.find((t) => t.teamId !== defaultTeamA?.teamId) ||
    allTeams[1] ||
    null;

  const [teamAId, setTeamAId] = useState(defaultTeamA?.teamId || "");
  const [teamBId, setTeamBId] = useState(defaultTeamB?.teamId || "");
  const [activeTab, setActiveTab] = useState("scores"); // 'scores', 'members', 'fields', 'narrative'

  const teamA = useMemo(
    () => allTeams.find((t) => t.teamId === teamAId) || null,
    [allTeams, teamAId]
  );
  const teamB = useMemo(
    () => allTeams.find((t) => t.teamId === teamBId) || null,
    [allTeams, teamBId]
  );

  // Compute rich pairwise comparison
  const comparison = useMemo(() => {
    if (!teamA || !teamB) return null;
    try {
      return compareTeams(teamA, teamB, config);
    } catch (e) {
      console.error("Comparison computation failed:", e);
      return null;
    }
  }, [teamA, teamB, config]);

  const handleSwap = () => {
    const temp = teamAId;
    setTeamAId(teamBId);
    setTeamBId(temp);
  };

  const getTeamLabel = (t) => {
    if (!t) return "Select team";
    const name = blindMode ? `Team ${t.teamId}` : t.teamName || t.teamId;
    const rankStr = t.rank ? `#${t.rank}` : "Unranked";
    const scoreStr = t.score != null ? `${t.score.toFixed(2)} pts` : "No score";
    const statusLabel =
      STATUS_PILLS[t.status]?.label || t.status || "Unknown";
    return `${rankStr} • ${name} (${scoreStr}) — [${statusLabel}]`;
  };

  const statusCfgA = STATUS_PILLS[teamA?.status] || STATUS_PILLS.shortlisted;
  const statusCfgB = STATUS_PILLS[teamB?.status] || STATUS_PILLS.shortlisted;

  const nameA = blindMode
    ? `Team ${teamA?.teamId}`
    : teamA?.teamName || teamA?.teamId || "Team A";
  const nameB = blindMode
    ? `Team ${teamB?.teamId}`
    : teamB?.teamName || teamB?.teamId || "Team B";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-[#0D1B2A] border border-[#415A77]/50 rounded-2xl shadow-2xl overflow-hidden text-[#E0E1DD]"
      >
        {/* Sticky Header with Selectors */}
        <div className="sticky top-0 z-20 bg-[#0D1B2A]/95 backdrop-blur-xl border-b border-[#415A77]/40 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#415A77]/25 border border-[#415A77]/50 text-[#E0E1DD]">
                <ArrowLeftRight className="h-5 w-5 text-[#778DA9]" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white tracking-tight flex items-center gap-2">
                  Head-to-Head Team Comparison
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#1B263B] text-[#E0E1DD] border border-[#415A77]/60">
                    Pairwise Audit
                  </span>
                </h3>
                <p className="text-xs text-[#778DA9]">
                  Compare any two teams across scoring criteria, applicant contributions, source files, and disqualification reasons.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 text-[#778DA9] hover:text-white transition cursor-pointer border border-transparent hover:border-[#415A77]/40"
              title="Close comparison"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Interactive Team Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-3">
            {/* Team A Picker */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#778DA9] uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                Team A
              </label>
              <select
                value={teamAId}
                onChange={(e) => setTeamAId(e.target.value)}
                className="w-full bg-[#1B263B] border border-[#415A77]/60 rounded-xl px-3 py-2 text-xs font-semibold text-[#E0E1DD] outline-none focus:border-cyan-400 cursor-pointer transition shadow-inner"
              >
                {allTeams.map((t) => (
                  <option key={t.teamId} value={t.teamId} className="bg-[#1B263B] text-[#E0E1DD]">
                    {getTeamLabel(t)}
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center pt-4 md:pt-4">
              <button
                type="button"
                onClick={handleSwap}
                className="p-2.5 rounded-xl bg-[#1B263B] hover:bg-[#415A77]/30 border border-[#415A77]/50 text-[#778DA9] hover:text-white transition cursor-pointer shadow-md"
                title="Swap Team A and Team B"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </button>
            </div>

            {/* Team B Picker */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#778DA9] uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-indigo-400" />
                Team B
              </label>
              <select
                value={teamBId}
                onChange={(e) => setTeamBId(e.target.value)}
                className="w-full bg-[#1B263B] border border-[#415A77]/60 rounded-xl px-3 py-2 text-xs font-semibold text-[#E0E1DD] outline-none focus:border-indigo-400 cursor-pointer transition shadow-inner"
              >
                {allTeams.map((t) => (
                  <option key={t.teamId} value={t.teamId} className="bg-[#1B263B] text-[#E0E1DD]">
                    {getTeamLabel(t)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {!teamA || !teamB ? (
            <div className="text-center py-12 text-[#778DA9]">
              Please select two teams to generate a pairwise evaluation.
            </div>
          ) : (
            <>
              {/* Executive Side-by-Side Matchup Header Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Team A Card */}
                <div
                  className={`p-5 rounded-2xl border transition-all space-y-3 bg-[#1B263B] ${
                    comparison?.overallWinner === "teamA"
                      ? "border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                      : "border-[#415A77]/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#0D1B2A] text-[#778DA9] border border-white/5 font-bold">
                          {teamA.teamId}
                        </span>
                        {teamA.rank && (
                          <span className="text-xs font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded">
                            Rank #{teamA.rank}
                          </span>
                        )}
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${statusCfgA.bg}`}
                        >
                          {statusCfgA.label}
                        </span>
                      </div>
                      <h4 className="text-xl font-extrabold text-white">{nameA}</h4>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-[#778DA9] tracking-wider block">
                        Composite Score
                      </span>
                      <span className="text-3xl font-black font-mono text-cyan-300">
                        {teamA.score != null ? teamA.score.toFixed(2) : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Criteria Won Indicator */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[#415A77]/25">
                    <span className="text-[#778DA9]">
                      Criteria Won: <strong className="text-white font-mono">{comparison?.teamAWins ?? 0}</strong> of{" "}
                      {comparison?.criteriaComparison?.length ?? 0}
                    </span>
                    {teamA.margin != null && (
                      <span
                        className={`font-mono text-[11px] font-semibold ${
                          teamA.margin >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {teamA.margin >= 0 ? `+${teamA.margin.toFixed(2)}` : teamA.margin.toFixed(2)} margin
                      </span>
                    )}
                  </div>
                </div>

                {/* Team B Card */}
                <div
                  className={`p-5 rounded-2xl border transition-all space-y-3 bg-[#1B263B] ${
                    comparison?.overallWinner === "teamB"
                      ? "border-indigo-400 shadow-[0_0_20px_rgba(129,140,248,0.2)]"
                      : "border-[#415A77]/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#0D1B2A] text-[#778DA9] border border-white/5 font-bold">
                          {teamB.teamId}
                        </span>
                        {teamB.rank && (
                          <span className="text-xs font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded">
                            Rank #{teamB.rank}
                          </span>
                        )}
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${statusCfgB.bg}`}
                        >
                          {statusCfgB.label}
                        </span>
                      </div>
                      <h4 className="text-xl font-extrabold text-white">{nameB}</h4>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-[#778DA9] tracking-wider block">
                        Composite Score
                      </span>
                      <span className="text-3xl font-black font-mono text-indigo-300">
                        {teamB.score != null ? teamB.score.toFixed(2) : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Criteria Won Indicator */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[#415A77]/25">
                    <span className="text-[#778DA9]">
                      Criteria Won: <strong className="text-white font-mono">{comparison?.teamBWins ?? 0}</strong> of{" "}
                      {comparison?.criteriaComparison?.length ?? 0}
                    </span>
                    {teamB.margin != null && (
                      <span
                        className={`font-mono text-[11px] font-semibold ${
                          teamB.margin >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {teamB.margin >= 0 ? `+${teamB.margin.toFixed(2)}` : teamB.margin.toFixed(2)} margin
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Narrative Summary Box */}
              {comparison?.summary && (
                <div className="p-4 rounded-xl bg-[#1B263B]/60 border border-[#415A77]/40 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[#415A77]/20 border border-[#415A77]/40 shrink-0 text-[#E0E1DD]">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="text-xs leading-relaxed space-y-1">
                    <p className="font-bold text-white text-sm">Comparison Summary</p>
                    <p className="text-[#E0E1DD]">{comparison.summary}</p>
                    {comparison.narrative && comparison.narrative !== comparison.summary && (
                      <p className="text-[#778DA9] pt-1">{comparison.narrative}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Rejection & Disqualification Alerts (if applicable) */}
              {(comparison?.teamA?.rejectionReasons?.length > 0 ||
                comparison?.teamB?.rejectionReasons?.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Team A Disqualification Reason */}
                  <div
                    className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                      comparison.teamA.rejectionReasons.length > 0
                        ? "bg-rose-950/25 border-rose-500/40 text-rose-200"
                        : "bg-[#1B263B]/40 border-emerald-500/30 text-emerald-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-sm">
                      {comparison.teamA.rejectionReasons.length > 0 ? (
                        <>
                          <AlertTriangle className="h-4 w-4 text-rose-400" />
                          <span>{nameA} Disqualification Rationale</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          <span>{nameA} Passed All Hard Filters</span>
                        </>
                      )}
                    </div>
                    {comparison.teamA.rejectionReasons.length > 0 ? (
                      <ul className="list-disc list-inside space-y-1 text-xs text-rose-300/90 pl-1">
                        {comparison.teamA.rejectionReasons.map((r, i) => (
                          <li key={i}>{typeof r === "object" ? (r.message || r.code || JSON.stringify(r)) : String(r)}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-[#778DA9]">
                        Eligible for selection ranking without hard barrier exclusions.
                      </p>
                    )}
                  </div>

                  {/* Team B Disqualification Reason */}
                  <div
                    className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                      comparison.teamB.rejectionReasons.length > 0
                        ? "bg-rose-950/25 border-rose-500/40 text-rose-200"
                        : "bg-[#1B263B]/40 border-emerald-500/30 text-emerald-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-sm">
                      {comparison.teamB.rejectionReasons.length > 0 ? (
                        <>
                          <AlertTriangle className="h-4 w-4 text-rose-400" />
                          <span>{nameB} Disqualification Rationale</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          <span>{nameB} Passed All Hard Filters</span>
                        </>
                      )}
                    </div>
                    {comparison.teamB.rejectionReasons.length > 0 ? (
                      <ul className="list-disc list-inside space-y-1 text-xs text-rose-300/90 pl-1">
                        {comparison.teamB.rejectionReasons.map((r, i) => (
                          <li key={i}>{typeof r === "object" ? (r.message || r.code || JSON.stringify(r)) : String(r)}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-[#778DA9]">
                        Eligible for selection ranking without hard barrier exclusions.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Navigation Tabs for Deep Breakdown */}
              <div className="flex items-center gap-2 border-b border-[#415A77]/30 pb-2">
                {[
                  { key: "scores", label: "Scoring Criteria Breakdown", icon: Layers },
                  { key: "members", label: "Applicant Roster & Link Audit", icon: Users },
                  { key: "fields", label: "Custom Fields & Flags", icon: ShieldAlert },
                ].map((t) => {
                  const Icon = t.icon;
                  const isActive = activeTab === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setActiveTab(t.key)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#415A77] text-white shadow-md border border-[#778DA9]/50"
                          : "text-[#778DA9] hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* TAB 1: Criteria-by-Criteria Scoring Breakdown */}
              {activeTab === "scores" && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-[#415A77]/30 bg-[#1B263B]/60 overflow-hidden">
                    <div className="grid grid-cols-[2fr_1fr_1fr_1fr] p-3 text-[11px] font-bold uppercase tracking-wider text-[#778DA9] border-b border-[#415A77]/30 bg-[#0D1B2A]/50">
                      <span>Configured Criterion</span>
                      <span className="text-center text-cyan-300">{nameA}</span>
                      <span className="text-center text-indigo-300">{nameB}</span>
                      <span className="text-right">Outcome Margin</span>
                    </div>

                    <div className="divide-y divide-white/[0.05] text-xs">
                      {(comparison?.criteriaComparison || []).map((item, idx) => {
                        const winA = item.winner === "teamA";
                        const winB = item.winner === "teamB";

                        return (
                          <div
                            key={item.metric || idx}
                            className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center p-3.5 hover:bg-white/[0.02] transition"
                          >
                            <div>
                              <p className="font-bold text-white text-xs">{item.metric}</p>
                              <p className="text-[10px] font-mono text-[#778DA9]">
                                Weight: {item.weight}
                              </p>
                            </div>

                            {/* Team A Score */}
                            <div className="text-center">
                              <span
                                className={`font-mono font-bold text-sm ${
                                  winA ? "text-cyan-300" : "text-[#778DA9]"
                                }`}
                              >
                                {item.teamAScore != null ? item.teamAScore.toFixed(2) : "—"}
                              </span>
                              {winA && (
                                <span className="ml-1 text-[10px] text-cyan-400 font-bold font-mono">
                                  ★
                                </span>
                              )}
                            </div>

                            {/* Team B Score */}
                            <div className="text-center">
                              <span
                                className={`font-mono font-bold text-sm ${
                                  winB ? "text-indigo-300" : "text-[#778DA9]"
                                }`}
                              >
                                {item.teamBScore != null ? item.teamBScore.toFixed(2) : "—"}
                              </span>
                              {winB && (
                                <span className="ml-1 text-[10px] text-indigo-400 font-bold font-mono">
                                  ★
                                </span>
                              )}
                            </div>

                            {/* Score Diff & Winner */}
                            <div className="text-right font-mono">
                              {item.scoreDiff != null ? (
                                <span
                                  className={`text-xs font-bold px-2 py-0.5 rounded ${
                                    winA
                                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                      : winB
                                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                                      : "bg-[#1B263B] text-[#778DA9] border border-[#415A77]/30"
                                  }`}
                                >
                                  {item.scoreDiff > 0 ? `+${item.scoreDiff}` : item.scoreDiff}
                                </span>
                              ) : (
                                <span className="text-[#778DA9]">Tie</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Member-by-Member Contribution & Source Links */}
              {activeTab === "members" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Team A Roster */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-1 border-b border-[#415A77]/30">
                        <span className="font-bold text-xs text-cyan-300 uppercase tracking-wider">
                          {nameA} Roster ({teamA.members?.length ?? 0} members)
                        </span>
                      </div>

                      {(teamA.members || []).map((m, idx) => (
                        <div
                          key={m.memberId || idx}
                          className="p-3.5 rounded-xl border border-[#415A77]/40 bg-[#1B263B] space-y-2.5 text-xs shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold text-white text-sm flex items-center gap-1.5">
                                {blindMode ? `Applicant #${idx + 1}` : m.name || `Member ${idx + 1}`}
                                {m.isLead && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                                    Lead
                                  </span>
                                )}
                              </p>
                              {!blindMode && m.email && (
                                <p className="text-[11px] text-[#778DA9] font-mono">{m.email}</p>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-[#778DA9] bg-[#0D1B2A] px-2 py-0.5 rounded border border-white/5">
                              {m.memberId}
                            </span>
                          </div>

                          {/* Clickable Profile & Document Links */}
                          <div className="flex flex-wrap gap-2 pt-1 border-t border-[#415A77]/25 text-[11px]">
                            {m.sources?.github?.url && (
                              <a
                                href={m.sources.github.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0D1B2A] border border-[#415A77]/40 text-[#E0E1DD] hover:border-cyan-400 hover:text-cyan-300 transition"
                              >
                                <Github className="h-3 w-3 text-[#778DA9]" />
                                <span>GitHub</span>
                                <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                              </a>
                            )}

                            {m.sources?.resume?.url && (
                              <a
                                href={m.sources.resume.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0D1B2A] border border-[#415A77]/40 text-[#E0E1DD] hover:border-emerald-400 hover:text-emerald-300 transition"
                              >
                                <FileText className="h-3 w-3 text-[#778DA9]" />
                                <span>Resume PDF</span>
                                <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                              </a>
                            )}

                            {(m.sources?.linkedin?.url || m.sources?.linkedin?.pdfUrl) && (
                              <a
                                href={m.sources.linkedin.pdfUrl || m.sources.linkedin.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0D1B2A] border border-[#415A77]/40 text-[#E0E1DD] hover:border-sky-400 hover:text-sky-300 transition"
                              >
                                <Linkedin className="h-3 w-3 text-[#778DA9]" />
                                <span>{m.sources.linkedin.pdfUrl ? "LinkedIn PDF" : "LinkedIn"}</span>
                                <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                              </a>
                            )}

                            {m.sources?.portfolio?.url && (
                              <a
                                href={m.sources.portfolio.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0D1B2A] border border-[#415A77]/40 text-[#E0E1DD] hover:border-purple-400 hover:text-purple-300 transition"
                              >
                                <Globe className="h-3 w-3 text-[#778DA9]" />
                                <span>Portfolio</span>
                                <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                              </a>
                            )}
                          </div>

                          {/* Key Signals Quick Grid */}
                          <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] font-mono">
                            <div className="bg-[#0D1B2A]/60 px-2 py-1 rounded border border-white/5 flex justify-between">
                              <span className="text-[#778DA9]">Contribs (1y):</span>
                              <strong className="text-white">
                                {m.metrics?.["github.contributions_1y"]?.value ?? "—"}
                              </strong>
                            </div>
                            <div className="bg-[#0D1B2A]/60 px-2 py-1 rounded border border-white/5 flex justify-between">
                              <span className="text-[#778DA9]">Projects:</span>
                              <strong className="text-white">
                                {m.metrics?.["resume.project_count"]?.value ?? "—"}
                              </strong>
                            </div>
                            <div className="bg-[#0D1B2A]/60 px-2 py-1 rounded border border-white/5 flex justify-between">
                              <span className="text-[#778DA9]">Experience:</span>
                              <strong className="text-white">
                                {m.metrics?.["resume.experience_months"]?.value != null
                                  ? `${m.metrics["resume.experience_months"].value}m`
                                  : "—"}
                              </strong>
                            </div>
                            <div className="bg-[#0D1B2A]/60 px-2 py-1 rounded border border-white/5 flex justify-between">
                              <span className="text-[#778DA9]">Live Demo:</span>
                              <strong
                                className={
                                  m.metrics?.["portfolio.has_live_demo"]?.value
                                    ? "text-emerald-400"
                                    : "text-[#778DA9]"
                                }
                              >
                                {m.metrics?.["portfolio.has_live_demo"]?.value ? "Yes" : "No"}
                              </strong>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Team B Roster */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-1 border-b border-[#415A77]/30">
                        <span className="font-bold text-xs text-indigo-300 uppercase tracking-wider">
                          {nameB} Roster ({teamB.members?.length ?? 0} members)
                        </span>
                      </div>

                      {(teamB.members || []).map((m, idx) => (
                        <div
                          key={m.memberId || idx}
                          className="p-3.5 rounded-xl border border-[#415A77]/40 bg-[#1B263B] space-y-2.5 text-xs shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold text-white text-sm flex items-center gap-1.5">
                                {blindMode ? `Applicant #${idx + 1}` : m.name || `Member ${idx + 1}`}
                                {m.isLead && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                                    Lead
                                  </span>
                                )}
                              </p>
                              {!blindMode && m.email && (
                                <p className="text-[11px] text-[#778DA9] font-mono">{m.email}</p>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-[#778DA9] bg-[#0D1B2A] px-2 py-0.5 rounded border border-white/5">
                              {m.memberId}
                            </span>
                          </div>

                          {/* Clickable Profile & Document Links */}
                          <div className="flex flex-wrap gap-2 pt-1 border-t border-[#415A77]/25 text-[11px]">
                            {m.sources?.github?.url && (
                              <a
                                href={m.sources.github.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0D1B2A] border border-[#415A77]/40 text-[#E0E1DD] hover:border-indigo-400 hover:text-indigo-300 transition"
                              >
                                <Github className="h-3 w-3 text-[#778DA9]" />
                                <span>GitHub</span>
                                <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                              </a>
                            )}

                            {m.sources?.resume?.url && (
                              <a
                                href={m.sources.resume.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0D1B2A] border border-[#415A77]/40 text-[#E0E1DD] hover:border-emerald-400 hover:text-emerald-300 transition"
                              >
                                <FileText className="h-3 w-3 text-[#778DA9]" />
                                <span>Resume PDF</span>
                                <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                              </a>
                            )}

                            {(m.sources?.linkedin?.url || m.sources?.linkedin?.pdfUrl) && (
                              <a
                                href={m.sources.linkedin.pdfUrl || m.sources.linkedin.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0D1B2A] border border-[#415A77]/40 text-[#E0E1DD] hover:border-sky-400 hover:text-sky-300 transition"
                              >
                                <Linkedin className="h-3 w-3 text-[#778DA9]" />
                                <span>{m.sources.linkedin.pdfUrl ? "LinkedIn PDF" : "LinkedIn"}</span>
                                <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                              </a>
                            )}

                            {m.sources?.portfolio?.url && (
                              <a
                                href={m.sources.portfolio.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0D1B2A] border border-[#415A77]/40 text-[#E0E1DD] hover:border-purple-400 hover:text-purple-300 transition"
                              >
                                <Globe className="h-3 w-3 text-[#778DA9]" />
                                <span>Portfolio</span>
                                <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                              </a>
                            )}
                          </div>

                          {/* Key Signals Quick Grid */}
                          <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] font-mono">
                            <div className="bg-[#0D1B2A]/60 px-2 py-1 rounded border border-white/5 flex justify-between">
                              <span className="text-[#778DA9]">Contribs (1y):</span>
                              <strong className="text-white">
                                {m.metrics?.["github.contributions_1y"]?.value ?? "—"}
                              </strong>
                            </div>
                            <div className="bg-[#0D1B2A]/60 px-2 py-1 rounded border border-white/5 flex justify-between">
                              <span className="text-[#778DA9]">Projects:</span>
                              <strong className="text-white">
                                {m.metrics?.["resume.project_count"]?.value ?? "—"}
                              </strong>
                            </div>
                            <div className="bg-[#0D1B2A]/60 px-2 py-1 rounded border border-white/5 flex justify-between">
                              <span className="text-[#778DA9]">Experience:</span>
                              <strong className="text-white">
                                {m.metrics?.["resume.experience_months"]?.value != null
                                  ? `${m.metrics["resume.experience_months"].value}m`
                                  : "—"}
                              </strong>
                            </div>
                            <div className="bg-[#0D1B2A]/60 px-2 py-1 rounded border border-white/5 flex justify-between">
                              <span className="text-[#778DA9]">Live Demo:</span>
                              <strong
                                className={
                                  m.metrics?.["portfolio.has_live_demo"]?.value
                                    ? "text-emerald-400"
                                    : "text-[#778DA9]"
                                }
                              >
                                {m.metrics?.["portfolio.has_live_demo"]?.value ? "Yes" : "No"}
                              </strong>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Custom Fields & Integrity Flags */}
              {activeTab === "fields" && (
                <div className="space-y-4">
                  {/* Flags Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Team A Flags */}
                    <div className="p-4 rounded-xl border border-[#415A77]/40 bg-[#1B263B] space-y-2">
                      <div className="flex items-center justify-between pb-1 border-b border-[#415A77]/25">
                        <span className="font-bold text-xs text-white flex items-center gap-1.5">
                          <ShieldAlert className="h-4 w-4 text-cyan-400" />
                          {nameA} Integrity Flags ({comparison.teamA.flags.length})
                        </span>
                      </div>
                      {comparison.teamA.flags.length === 0 ? (
                        <p className="text-xs text-[#778DA9]">No data hygiene or duplicate flags detected.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {comparison.teamA.flags.map((fl, idx) => (
                            <div
                              key={idx}
                              className="p-2 rounded-lg bg-[#0D1B2A] border border-amber-500/30 text-xs space-y-0.5"
                            >
                              <div className="flex items-center justify-between font-mono text-[10px]">
                                <span className="text-amber-400 font-bold">{fl.code}</span>
                                {fl.memberId && <span className="text-[#778DA9]">{fl.memberId}</span>}
                              </div>
                              <p className="text-[#E0E1DD] text-[11px]">
                                {getSafeFlagDetail(fl, blindMode)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Team B Flags */}
                    <div className="p-4 rounded-xl border border-[#415A77]/40 bg-[#1B263B] space-y-2">
                      <div className="flex items-center justify-between pb-1 border-b border-[#415A77]/25">
                        <span className="font-bold text-xs text-white flex items-center gap-1.5">
                          <ShieldAlert className="h-4 w-4 text-indigo-400" />
                          {nameB} Integrity Flags ({comparison.teamB.flags.length})
                        </span>
                      </div>
                      {comparison.teamB.flags.length === 0 ? (
                        <p className="text-xs text-[#778DA9]">No data hygiene or duplicate flags detected.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {comparison.teamB.flags.map((fl, idx) => (
                            <div
                              key={idx}
                              className="p-2 rounded-lg bg-[#0D1B2A] border border-amber-500/30 text-xs space-y-0.5"
                            >
                              <div className="flex items-center justify-between font-mono text-[10px]">
                                <span className="text-amber-400 font-bold">{fl.code}</span>
                                {fl.memberId && <span className="text-[#778DA9]">{fl.memberId}</span>}
                              </div>
                              <p className="text-[#E0E1DD] text-[11px]">
                                {getSafeFlagDetail(fl, blindMode)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Team Custom Fields Side-by-Side */}
                  <div className="rounded-xl border border-[#415A77]/30 bg-[#1B263B]/60 p-4 space-y-3">
                    <h5 className="font-bold text-xs text-white flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-[#778DA9]" />
                      Custom Registration Fields Comparison
                    </h5>

                    {Object.keys({ ...(teamA.fields || {}), ...(teamB.fields || {}) }).length === 0 ? (
                      <p className="text-xs text-[#778DA9]">No custom registration fields provided in spreadsheet.</p>
                    ) : (
                      <div className="divide-y divide-white/[0.05] text-xs">
                        {Array.from(
                          new Set([
                            ...Object.keys(teamA.fields || {}),
                            ...Object.keys(teamB.fields || {}),
                          ])
                        ).map((fieldKey) => (
                          <div
                            key={fieldKey}
                            className="grid grid-cols-[1.5fr_1fr_1fr] py-2 gap-2 items-center"
                          >
                            <span className="font-mono text-[#778DA9] text-[11px] truncate">
                              {fieldKey}
                            </span>
                            <span className="text-[#E0E1DD] font-medium truncate">
                              {teamA.fields?.[fieldKey] != null
                                ? String(teamA.fields[fieldKey])
                                : "—"}
                            </span>
                            <span className="text-[#E0E1DD] font-medium truncate">
                              {teamB.fields?.[fieldKey] != null
                                ? String(teamB.fields[fieldKey])
                                : "—"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#0D1B2A]/95 backdrop-blur-xl border-t border-[#415A77]/40 px-6 py-3.5 flex items-center justify-between text-xs">
          <span className="text-[#778DA9] font-mono">
            Comparing: <strong className="text-cyan-300">{nameA}</strong> vs{" "}
            <strong className="text-indigo-300">{nameB}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#1B263B] hover:bg-[#415A77]/30 border border-[#415A77]/50 text-white font-bold transition cursor-pointer"
          >
            Close Comparison
          </button>
        </div>
      </motion.div>
    </div>
  );
}
