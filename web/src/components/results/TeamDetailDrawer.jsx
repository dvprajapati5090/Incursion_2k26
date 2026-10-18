/**
 * TeamDetailDrawer — Slide-in inspector for detailed team auditing.
 * Features 100% opaque cyber-luxe glass panel, contribution bar charts,
 * criterion audit tables, natural language reasoning, and applicant rosters.
 */
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
} from "lucide-react";
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
  if (!team) return null;

  const blindMode = config?.options?.blindMode;
  const statusCfg = STATUS_CONFIG[team.status] || STATUS_CONFIG.shortlisted;

  const chartData = (team.breakdown ?? []).map((b) => ({
    name: b.label ?? b.metric ?? b.criterionId,
    contribution: Number((b.score ?? b.contribution ?? 0).toFixed(2)),
    status: b.status ?? (b.score != null ? "ok" : "missing"),
  }));

  const margin = team.margin ?? (team.score != null && team.cutoffScore != null ? team.score - team.cutoffScore : null);
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
        className="relative w-full max-w-xl bg-[#090e1a] border-l border-white/10 shadow-2xl flex flex-col h-full z-10 text-slate-100"
      >
        {/* Sticky Header */}
        <div className="sticky top-0 bg-[#090e1a]/95 backdrop-blur-xl border-b border-white/10 px-6 py-5 flex items-start justify-between gap-4 z-20">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/5">
                {team.teamId}
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${statusCfg.bg} ${statusCfg.glow}`}>
                {statusCfg.label}
              </span>
              {team.rank && (
                <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
                  Rank #{team.rank}
                </span>
              )}
            </div>

            <h3 className="text-xl font-bold text-white tracking-tight">
              {blindMode ? `Team ${team.teamId}` : (team.teamName || team.teamId)}
            </h3>

            <p className="text-xs text-slate-400 mt-0.5">
              {team.members?.length ?? 0} team member{team.members?.length !== 1 ? "s" : ""} registered
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          
          {/* Top Score Comparison Strip */}
          <div className="rounded-2xl bg-slate-900/80 border border-white/10 p-4 grid grid-cols-3 gap-3 text-center shadow-inner">
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Score</p>
              <p className="text-2xl font-extrabold font-mono text-white">
                {team.score?.toFixed(4) ?? "—"}
              </p>
            </div>
            <div className="space-y-1 border-x border-white/10">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Cutoff Line</p>
              <p className="text-2xl font-extrabold font-mono text-slate-300">
                {team.cutoffScore?.toFixed(4) ?? "—"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Cutoff Margin</p>
              <p className={`text-2xl font-extrabold font-mono flex items-center justify-center gap-0.5 ${
                isPositiveMargin ? "text-emerald-400" : "text-rose-400"
              }`}>
                {isPositiveMargin ? <TrendingUp className="h-4 w-4 inline" /> : <TrendingDown className="h-4 w-4 inline" />}
                {margin != null ? (isPositiveMargin ? "+" : "") + margin.toFixed(4) : "—"}
              </p>
            </div>
          </div>

          {/* Recharts Score Breakdown Chart */}
          {chartData.length > 0 && (
            <div className="space-y-3 rounded-2xl bg-slate-900/50 border border-white/10 p-5">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Award className="h-4 w-4 text-indigo-400" />
                  Criteria Contribution Breakdown
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">Weighted score share</span>
              </div>

              <div className="h-48 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ left: 10, right: 30, top: 5, bottom: 5 }}
                  >
                    <XAxis
                      type="number"
                      domain={[0, "auto"]}
                      stroke="#475569"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      tickFormatter={(v) => v.toFixed(2)}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#475569"
                      tick={{ fill: "#cbd5e1", fontSize: 11 }}
                      width={110}
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

          {/* Criterion Details Table */}
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
                    <tr key={b.criterionId} className="hover:bg-white/[0.02] transition-colors">
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

          {/* Engine Explanation Breakdown */}
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
                      <li key={idx} className="text-slate-300">{str}</li>
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
                      <li key={idx} className="text-slate-300">{ga}</li>
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
                      <li key={idx} className="text-slate-400">{note}</li>
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
              <h4 className="font-bold text-sm text-white">Eligibility Rules Verification</h4>
              <div className="space-y-2">
                {team.filterResults.map((fr) => (
                  <div
                    key={fr.id}
                    className="p-3 rounded-xl bg-slate-900/40 border border-white/[0.08] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      {FILTER_ICONS[fr.result] ?? <Info className="h-4 w-4 text-slate-400" />}
                      <span className="font-medium text-slate-200">{fr.label}</span>
                    </div>
                    <span className="capitalize font-mono font-bold text-[11px] text-slate-400">
                      {fr.result}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Member Roster (Visible in non-blind mode) */}
          {!blindMode && team.members?.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-white">Registered Team Members</h4>
              <div className="space-y-2.5">
                {team.members.map((m) => (
                  <div
                    key={m.memberId}
                    className="p-4 rounded-xl bg-slate-900/60 border border-white/10 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{m.name || m.memberId}</span>
                        {m.isLead && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                            Team Lead
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">{m.memberId}</span>
                    </div>

                    {m.email && <p className="text-xs text-slate-400 font-mono">{m.email}</p>}

                    {/* Source links pills */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {m.sources?.github?.url && (
                        <a
                          href={m.sources.github.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-medium text-indigo-300 hover:text-white border border-white/5 transition"
                        >
                          <Github className="h-3 w-3" /> GitHub <ArrowUpRight className="h-2.5 w-2.5 opacity-60" />
                        </a>
                      )}
                      {m.sources?.resume?.url && (
                        <a
                          href={m.sources.resume.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-medium text-cyan-300 hover:text-white border border-white/5 transition"
                        >
                          <FileText className="h-3 w-3" /> Resume <ArrowUpRight className="h-2.5 w-2.5 opacity-60" />
                        </a>
                      )}
                      {m.sources?.linkedin?.url && (
                        <a
                          href={m.sources.linkedin.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-medium text-sky-300 hover:text-white border border-white/5 transition"
                        >
                          <Linkedin className="h-3 w-3" /> LinkedIn <ArrowUpRight className="h-2.5 w-2.5 opacity-60" />
                        </a>
                      )}
                      {m.sources?.portfolio?.url && (
                        <a
                          href={m.sources.portfolio.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-medium text-emerald-300 hover:text-white border border-white/5 transition"
                        >
                          <Globe className="h-3 w-3" /> Portfolio <ArrowUpRight className="h-2.5 w-2.5 opacity-60" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
