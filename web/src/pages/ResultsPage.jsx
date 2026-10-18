/**
 * ResultsPage — Step 3
 *
 * Leaderboard & Audit Dashboard:
 *   - Executive KPI telemetry (Shortlisted, Waitlisted, Disqualified, Cutoff Score)
 *   - Filterable tabs with accurate counts per category
 *   - Interactive TanStack Leaderboard with score bars & action overrides
 *   - Slide-in TeamDetailDrawer inspector
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Award,
  Clock,
  Ban,
  Sliders,
  Download,
  Search,
  Sparkles,
  Activity,
  Calendar,
} from "lucide-react";
import useResultsStore from "@/stores/resultsStore";
import useConfigStore from "@/stores/configStore";
import useImportStore from "@/stores/importStore";
import ResultsTable from "@/components/results/ResultsTable";
import TeamDetailDrawer from "@/components/results/TeamDetailDrawer";
import DemoDataBanner from "@/components/common/DemoDataBanner";
import DataQualityDashboard from "@/components/upload/DataQualityDashboard";

const TABS = [
  { key: "shortlisted", label: "Shortlisted", badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  { key: "waitlisted",  label: "Waitlisted",  badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  { key: "rejected",    label: "Rejected",    badgeColor: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
  { key: "all",         label: "All Teams",   badgeColor: "text-[#778DA9] bg-[#1B263B] border-[#415A77]/30" },
];

export default function ResultsPage() {
  const navigate = useNavigate();
  const {
    running,
    shortlist = [],
    waitlist = [],
    rejected = [],
    rankedResults = [],
    cutoffScore,
    runMeta,
    error,
  } = useResultsStore();
  const { config } = useConfigStore();
  const { asOf, enrichedAt, enrichSummary, isMockGithub } = useImportStore();
  const [activeTab, setActiveTab] = useState("shortlisted");
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showQualityDashboard, setShowQualityDashboard] = useState(false);

  const tableData = {
    shortlisted: shortlist,
    waitlisted:  waitlist,
    rejected:    rejected,
    all:         rankedResults,
  }[activeTab] ?? [];

  const tabCounts = {
    shortlisted: shortlist.length,
    waitlisted:  waitlist.length,
    rejected:    rejected.length,
    all:         rankedResults.length,
  };

  if (running) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-4 text-[#778DA9]/80">
        <RefreshCw className="h-8 w-8 animate-spin text-[#778DA9]" />
        <p className="font-semibold text-white">Running selection engine…</p>
        <p className="text-xs text-[#415A77] font-mono">Applying normalization, weights, filters & ties</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-6 bg-rose-950/30 text-rose-300 border border-rose-500/30 rounded-2xl max-w-2xl mx-auto">
        <AlertTriangle className="h-6 w-6 text-rose-400 shrink-0" />
        <div>
          <h4 className="font-bold text-white">Engine Execution Error</h4>
          <p className="text-xs text-rose-300/80 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (rankedResults.length === 0) {
    return (
      <div className="glass-panel text-center py-20 px-6 rounded-2xl max-w-xl mx-auto space-y-5 border border-[#415A77]/30">
        <div className="h-14 w-14 rounded-2xl bg-[#415A77]/15 border border-[#415A77]/35 text-[#415A77] flex items-center justify-center mx-auto">
          <Award className="h-7 w-7" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">No Selection Results Yet</h3>
          <p className="text-xs text-[#778DA9]/80 mt-1.5 max-w-sm mx-auto">
            Upload team registrations and tune your criteria weights in the Configure step to generate rankings.
          </p>
        </div>
        <button
          onClick={() => navigate("/config")}
          className="glow-btn inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white rounded-xl cursor-pointer"
        >
          Go to Configure
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Demo Data Banner (Must-do UI Rule #8) */}
      <DemoDataBanner />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold mb-2">
            <Sparkles className="h-3 w-3 text-emerald-400" />
            Stage 3 • Selection Shortlist & Leaderboard
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            Shortlist Results
          </h2>
          <p className="text-[#778DA9]/80 mt-1 text-xs">
            Top <strong className="text-white font-mono">{config.selection?.topX}</strong> of{" "}
            <strong className="text-white font-mono">{runMeta?.totalTeams ?? rankedResults.length}</strong> teams evaluated
            {runMeta?.durationMs != null && (
              <span className="ml-2 font-mono text-[#778DA9] bg-[#0D1B2A]/40 px-2 py-0.5 rounded border border-[#415A77]/20">
                {runMeta.durationMs}ms
              </span>
            )}
            {asOf && (
              <span className="ml-2 font-mono text-[#778DA9]/80 bg-[#1B263B]/60 px-2 py-0.5 rounded border border-white/5 text-[11px]">
                Reference: {new Date(asOf).toLocaleDateString()}
              </span>
            )}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5">
          {enrichSummary?.byMetric && (
            <button
              onClick={() => setShowQualityDashboard(!showQualityDashboard)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                showQualityDashboard
                  ? "bg-[#415A77]/20 border-[#415A77]/55 text-[#778DA9]"
                  : "border-[#415A77]/30 hover:bg-white/[0.05] text-[#778DA9]"
              }`}
            >
              <Activity className="h-3.5 w-3.5 text-[#778DA9]" />
              {showQualityDashboard ? "Hide Data Quality" : "Inspect Data Quality"}
            </button>
          )}

          <button
            onClick={() => navigate("/config")}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#415A77]/30 hover:bg-white/[0.05] text-[#778DA9] transition cursor-pointer"
          >
            <Sliders className="h-3.5 w-3.5" />
            Re-tune Weights
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/export")}
            className="glow-btn flex items-center gap-2 px-4 py-2 text-xs font-bold text-white rounded-xl cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            Export Shortlist
            <ArrowRight className="h-3.5 w-3.5" />
          </motion.button>
        </div>
      </div>

      {/* Collapsible Data Quality Dashboard */}
      {showQualityDashboard && enrichSummary?.byMetric && (
        <DataQualityDashboard
          summary={enrichSummary}
          asOf={asOf}
          enrichedAt={enrichedAt}
        />
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Shortlisted */}
        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/10 to-emerald-500/5 p-4 backdrop-blur-md shadow-[0_0_20px_-5px_rgba(16,185,129,0.2)]">
          <div className="flex items-center justify-between text-xs font-medium text-[#778DA9]/80 mb-2">
            <span>Shortlisted</span>
            <Award className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold font-mono text-emerald-400">{shortlist.length}</p>
          <p className="text-[11px] text-[#778DA9]/80 mt-1">Qualified within Top X</p>
        </div>

        {/* Waitlisted */}
        <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/10 to-amber-500/5 p-4 backdrop-blur-md shadow-[0_0_20px_-5px_rgba(245,158,11,0.2)]">
          <div className="flex items-center justify-between text-xs font-medium text-[#778DA9]/80 mb-2">
            <span>Waitlisted</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-3xl font-extrabold font-mono text-amber-400">{waitlist.length}</p>
          <p className="text-[11px] text-[#778DA9]/80 mt-1">On standby cushion</p>
        </div>

        {/* Rejected */}
        <div className="rounded-2xl border border-rose-500/20 bg-gradient-to-b from-rose-500/10 to-rose-500/5 p-4 backdrop-blur-md shadow-[0_0_20px_-5px_rgba(244,63,94,0.2)]">
          <div className="flex items-center justify-between text-xs font-medium text-[#778DA9]/80 mb-2">
            <span>Disqualified / Excluded</span>
            <Ban className="h-4 w-4 text-rose-400" />
          </div>
          <p className="text-3xl font-extrabold font-mono text-rose-400">{rejected.length}</p>
          <p className="text-[11px] text-[#778DA9]/80 mt-1">Below cutoff or filtered</p>
        </div>

        {/* Cutoff Score */}
        <div className="rounded-2xl border border-[#415A77]/20 bg-gradient-to-b from-[#415A77]/15 to-[#1B263B]/40 p-4 backdrop-blur-md shadow-[0_0_20px_-5px_rgba(6,182,212,0.2)]">
          <div className="flex items-center justify-between text-xs font-medium text-[#778DA9]/80 mb-2">
            <span>Cutoff Threshold</span>
            <span className="h-2 w-2 rounded-full bg-[#778DA9] animate-pulse" />
          </div>
          <p className="text-3xl font-extrabold font-mono text-[#778DA9]">
            {cutoffScore != null ? cutoffScore.toFixed(4) : "—"}
          </p>
          <p className="text-[11px] text-[#778DA9]/80 mt-1">Minimum score to qualify</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#415A77]/30 pb-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = tabCounts[tab.key] ?? 0;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? "bg-[#1B263B] text-white shadow-md border border-[#415A77]/30"
                  : "text-[#778DA9]/80 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${tab.badgeColor}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Leaderboard TanStack Table */}
      <ResultsTable
        data={tableData}
        config={config}
        onRowClick={(team) => setSelectedTeam(team)}
      />

      {/* Slide-out Drawer */}
      <AnimatePresence>
        {selectedTeam && (
          <TeamDetailDrawer
            team={rankedResults.find((t) => t.teamId === selectedTeam.teamId) || selectedTeam}
            config={config}
            onClose={() => setSelectedTeam(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
