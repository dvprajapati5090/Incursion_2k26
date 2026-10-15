/**
 * ImportReport — Shows high-impact visual telemetry after CSV/JSON upload.
 * Features animated KPI cards, source coverage gauges, and team size distribution.
 */
import { motion } from "framer-motion";
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  Github,
  FileText,
  Linkedin,
  Globe,
  Layers,
  Sparkles,
} from "lucide-react";

export default function ImportReport({ report }) {
  if (!report) return null;

  const { teamsFound, membersFound, teamSizes, sourceCoverage, issueCounts, issues } = report;

  const stats = [
    {
      label: "Teams Identified",
      value: teamsFound ?? 0,
      icon: Layers,
      color: "from-indigo-500/20 to-indigo-500/5",
      border: "border-indigo-500/30",
      textColor: "text-indigo-400",
      glow: "glow-subtle",
    },
    {
      label: "Total Applicants",
      value: membersFound ?? 0,
      icon: Users,
      color: "from-cyan-500/20 to-cyan-500/5",
      border: "border-cyan-500/30",
      textColor: "text-cyan-400",
      glow: "glow-cyan",
    },
    {
      label: "Integrity Errors",
      value: issueCounts?.error ?? 0,
      icon: AlertTriangle,
      color: (issueCounts?.error > 0) ? "from-rose-500/20 to-rose-500/5" : "from-slate-800/40 to-slate-800/10",
      border: (issueCounts?.error > 0) ? "border-rose-500/40" : "border-white/10",
      textColor: (issueCounts?.error > 0) ? "text-rose-400" : "text-slate-400",
      glow: (issueCounts?.error > 0) ? "glow-rose" : "",
    },
    {
      label: "Format Warnings",
      value: issueCounts?.warning ?? 0,
      icon: ShieldCheck,
      color: (issueCounts?.warning > 0) ? "from-amber-500/20 to-amber-500/5" : "from-emerald-500/20 to-emerald-500/5",
      border: (issueCounts?.warning > 0) ? "border-amber-500/30" : "border-emerald-500/30",
      textColor: (issueCounts?.warning > 0) ? "text-amber-400" : "text-emerald-400",
      glow: (issueCounts?.warning > 0) ? "glow-amber" : "glow-emerald",
    },
  ];

  const sourceIcons = {
    github: Github,
    resume: FileText,
    linkedin: Linkedin,
    portfolio: Globe,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="glass-panel rounded-2xl p-6 border border-white/10 space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <FileCheck2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white tracking-wide">Data Telemetry & Audit Report</h3>
            <p className="text-xs text-slate-400">Verified tabular data normalized into canonical team structures</p>
          </div>
        </div>
        <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Parsed Successfully
        </span>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className={`relative overflow-hidden rounded-xl border ${item.border} bg-gradient-to-b ${item.color} p-4 backdrop-blur-md ${item.glow}`}
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">{item.label}</span>
                <Icon className={`h-4 w-4 ${item.textColor}`} />
              </div>
              <div className={`text-2xl font-bold font-mono tracking-tight ${item.textColor}`}>
                {item.value}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Source Coverage Section */}
      {sourceCoverage && (
        <div className="space-y-3 bg-slate-900/40 rounded-xl p-4 border border-white/[0.05]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              Multi-Source Profile Signal Coverage
            </span>
            <span className="text-slate-400 font-mono">
              Evaluated across {sourceCoverage.members} applicants
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
            {Object.entries(sourceCoverage.withSource ?? {}).map(([source, count]) => {
              const Icon = sourceIcons[source] || Globe;
              const pct = sourceCoverage.members > 0
                ? Math.round((count / sourceCoverage.members) * 100)
                : 0;

              return (
                <div key={source} className="bg-slate-950/50 rounded-lg p-3 border border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="capitalize font-medium text-slate-300 flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-indigo-400" />
                      {source}
                    </span>
                    <span className="font-mono font-bold text-cyan-300">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {count} of {sourceCoverage.members} provided
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Team Size Distribution */}
      {teamSizes && Object.keys(teamSizes).length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1.5 mr-2">
            <Users className="h-3.5 w-3.5 text-indigo-400" /> Team Size Distribution:
          </span>
          {Object.entries(teamSizes)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([size, count]) => (
              <span
                key={size}
                className="px-3 py-1 rounded-lg bg-slate-800/80 border border-white/[0.08] text-slate-200 text-xs font-medium flex items-center gap-1.5"
              >
                <span className="text-slate-400 font-mono">{size}p:</span>
                <strong className="text-cyan-300 font-mono">{count}</strong> teams
              </span>
            ))}
        </div>
      )}

      {/* Issues list (if any) */}
      {issues?.length > 0 && (
        <div className="border border-amber-500/20 bg-amber-500/5 rounded-xl p-3.5 space-y-2 text-xs">
          <span className="font-semibold text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Data Hygiene Notices ({issues.length})
          </span>
          <div className="max-h-28 overflow-y-auto space-y-1 text-slate-300 pr-1">
            {issues.slice(0, 5).map((iss, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-amber-400 font-mono">•</span>
                <span>{iss.message}</span>
              </div>
            ))}
            {issues.length > 5 && (
              <p className="text-[11px] text-slate-500 pl-3">
                ...and {issues.length - 5} more handled gracefully
              </p>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
