/**
 * ResultsPage — Step 3
 *
 * Shows the ranked shortlist with:
 *   - Tab bar: Shortlisted / Waitlisted / Rejected
 *   - TanStack Table with columns: rank, team name, score, data coverage, flags
 *   - Clicking a row opens TeamDetailDrawer (breakdown chart + reasons)
 *   - Manual overrides: pin / exclude / waitlist from the row action menu
 *   - Run metadata (seed, topX, total teams, runtime)
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, RefreshCw, AlertTriangle } from "lucide-react";
import useResultsStore from "@/stores/resultsStore";
import useConfigStore from "@/stores/configStore";
import ResultsTable from "@/components/results/ResultsTable";
import TeamDetailDrawer from "@/components/results/TeamDetailDrawer";

const TABS = [
  { key: "shortlisted", label: "Shortlisted" },
  { key: "waitlisted",  label: "Waitlisted"  },
  { key: "rejected",    label: "Rejected"    },
  { key: "all",         label: "All Teams"   },
];

export default function ResultsPage() {
  const navigate = useNavigate();
  const { running, shortlist, waitlist, rejected, rankedResults, cutoffScore, runMeta, error } =
    useResultsStore();
  const { config } = useConfigStore();
  const [activeTab, setActiveTab] = useState("shortlisted");
  const [selectedTeam, setSelectedTeam] = useState(null);

  const tableData = {
    shortlisted: shortlist,
    waitlisted:  waitlist,
    rejected:    rejected,
    all:         rankedResults,
  }[activeTab] ?? [];

  if (running) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
        <RefreshCw className="h-5 w-5 animate-spin" />
        <span>Running shortlisting engine…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-6 bg-destructive/10 text-destructive rounded-xl">
        <AlertTriangle className="h-5 w-5" />
        <span>{error}</span>
      </div>
    );
  }

  if (rankedResults.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-muted-foreground">No results yet. Run the shortlisting from the Configure step.</p>
        <button
          onClick={() => navigate("/config")}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
        >
          Go to Configure
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Results</h2>
          <p className="text-muted-foreground mt-1">
            Top {config.selection?.topX} of {runMeta?.totalTeams} teams · Cutoff score:{" "}
            <strong>{cutoffScore?.toFixed(4)}</strong>
            {runMeta?.durationMs && (
              <span className="ml-2 text-xs">({runMeta.durationMs}ms)</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/config")}
            className="px-3 py-1.5 text-sm border rounded-lg hover:bg-accent transition"
          >
            Re-configure
          </button>
          <button
            onClick={() => navigate("/export")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
          >
            Export
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Shortlisted", value: shortlist.length, color: "text-green-600" },
          { label: "Waitlisted",  value: waitlist.length,  color: "text-yellow-600" },
          { label: "Rejected",    value: rejected.length,  color: "text-red-500" },
          { label: "Cutoff Score", value: cutoffScore?.toFixed(4) ?? "—", color: "text-primary" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border p-4 bg-card">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs text-muted-foreground">
              ({tableData.length})
            </span>
          </button>
        ))}
      </div>

      {/* Results table */}
      <ResultsTable
        data={tableData}
        config={config}
        onRowClick={(team) => setSelectedTeam(team)}
      />

      {/* Team detail drawer */}
      {selectedTeam && (
        <TeamDetailDrawer
          team={selectedTeam}
          config={config}
          onClose={() => setSelectedTeam(null)}
        />
      )}
    </div>
  );
}
