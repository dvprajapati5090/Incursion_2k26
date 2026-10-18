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
      color: "from-[#415A77]/25 to-[#1B263B]/60",
      border: "border-[#415A77]/60",
      textColor: "text-[#E0E1DD]",
      glow: "shadow-lg shadow-[#0D1B2A]/50",
    },
    {
      label: "Total Applicants",
      value: membersFound ?? 0,
      icon: Users,
      color: "from-[#415A77]/25 to-[#1B263B]/60",
      border: "border-[#415A77]/60",
      textColor: "text-[#E0E1DD]",
      glow: "shadow-lg shadow-[#0D1B2A]/50",
    },
    {
      label: "Integrity Errors",
      value: issueCounts?.error ?? 0,
      icon: AlertTriangle,
      color: (issueCounts?.error > 0) ? "from-rose-500/25 to-rose-950/30" : "from-[#1B263B]/50 to-[#1B263B]/20",
      border: (issueCounts?.error > 0) ? "border-rose-500/50" : "border-[#415A77]/40",
      textColor: (issueCounts?.error > 0) ? "text-rose-400" : "text-[#778DA9]",
      glow: (issueCounts?.error > 0) ? "shadow-lg shadow-rose-950/40" : "",
    },
    {
      label: "Format Warnings",
      value: issueCounts?.warning ?? 0,
      icon: ShieldCheck,
      color: (issueCounts?.warning > 0) ? "from-amber-500/25 to-amber-950/30" : "from-emerald-500/20 to-emerald-950/30",
      border: (issueCounts?.warning > 0) ? "border-amber-500/50" : "border-emerald-500/40",
      textColor: (issueCounts?.warning > 0) ? "text-amber-400" : "text-emerald-400",
      glow: (issueCounts?.warning > 0) ? "shadow-lg shadow-amber-950/40" : "shadow-lg shadow-emerald-950/40",
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
      className="glass-panel rounded-2xl p-6 border border-[#415A77]/30 space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#415A77]/15 border border-[#415A77]/35 text-[#415A77]">
            <FileCheck2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white tracking-wide">Data Telemetry & Audit Report</h3>
            <p className="text-xs text-[#778DA9]/80">Verified tabular data normalized into canonical team structures</p>
          </div>
        </div>
        <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-[#415A77]/40 flex items-center gap-1.5">
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
              <div className="flex items-center justify-between text-[#778DA9]/80 mb-2">
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
        <div className="space-y-3 bg-[#1B263B]/40 rounded-xl p-4 border border-[#415A77]/18">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#778DA9] flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#778DA9]" />
              Multi-Source Profile Signal Coverage
            </span>
            <span className="text-[#778DA9]/80 font-mono">
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
                <div key={source} className="bg-[#0D1B2A]/50 rounded-lg p-3 border border-[#415A77]/20 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="capitalize font-medium text-[#778DA9] flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-[#415A77]" />
                      {source}
                    </span>
                    <span className="font-mono font-bold text-[#778DA9]">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#1B263B] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-[#415A77] to-[#778DA9] rounded-full"
                    />
                  </div>
                  <p className="text-[10px] text-[#415A77] font-mono">
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
          <span className="text-[#778DA9]/80 font-medium flex items-center gap-1.5 mr-2">
            <Users className="h-3.5 w-3.5 text-[#415A77]" /> Team Size Distribution:
          </span>
          {Object.entries(teamSizes)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([size, count]) => (
              <span
                key={size}
                className="px-3 py-1 rounded-lg bg-[#1B263B]/80 border border-[#415A77]/25 text-[#E0E1DD] text-xs font-medium flex items-center gap-1.5"
              >
                <span className="text-[#778DA9]/80 font-mono">{size}p:</span>
                <strong className="text-[#778DA9] font-mono">{count}</strong> teams
              </span>
            ))}
        </div>
      )}

      {/* Issues list (if any) — Must-do rule: Show every issue to the organizer; nothing dropped silently */}
      {issues?.length > 0 && (
        <div className="border border-[#415A77]/30 bg-[#1B263B]/60 rounded-xl p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Import Data Hygiene & Integrity Log ({issues.length} item{issues.length !== 1 ? "s" : ""})
            </span>
            <span className="text-[11px] font-mono text-[#778DA9]/80">
              {issueCounts?.error || 0} errors • {issueCounts?.warning || 0} warnings
            </span>
          </div>

          <div className="max-h-52 overflow-y-auto space-y-2 pr-1 divide-y divide-white/[0.04]">
            {issues.map((iss, i) => (
              <div key={i} className="pt-2 first:pt-0 flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <span
                    className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border shrink-0 mt-0.5 ${
                      iss.severity === "error"
                        ? "bg-rose-500/15 border-rose-500/30 text-rose-300"
                        : "bg-amber-500/15 border-amber-500/30 text-amber-300"
                    }`}
                  >
                    {iss.severity}
                  </span>
                  <div>
                    <p className="text-[#E0E1DD]">{iss.message}</p>
                    {iss.code && (
                      <span className="text-[10px] font-mono text-[#415A77] mr-2">
                        code: {iss.code}
                      </span>
                    )}
                  </div>
                </div>

                {(iss.row != null || iss.column) && (
                  <div className="text-[10px] font-mono text-[#778DA9]/80 shrink-0 text-right">
                    {iss.row != null && <span>row {iss.row}</span>}
                    {iss.row != null && iss.column && <span> • </span>}
                    {iss.column && <span>col "{iss.column}"</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
