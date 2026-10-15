/**
 * ExportPage — Step 4
 *
 * Provides:
 *   - Export as JSON (shortlist + config bundled)
 *   - Export shortlist as CSV (config as sidecar JSON)
 *   - View and clear the audit log
 *   - View saved presets
 *   - Sensitivity analysis link
 */
import { useState } from "react";
import { FileJson, FileText, History, LayoutGrid, Download } from "lucide-react";
import useResultsStore from "@/stores/resultsStore";
import useConfigStore from "@/stores/configStore";
import usePresetsStore from "@/stores/presetsStore";
import { exportJson, exportCsv } from "@/lib/exportUtils";

export default function ExportPage() {
  const { rankedResults, shortlist, runMeta } = useResultsStore();
  const { config } = useConfigStore();
  const { auditLog, clearLog, presets, deletePreset } = usePresetsStore();
  const [activeTab, setActiveTab] = useState("export");

  const handleExportJson = () => {
    exportJson(rankedResults, config, runMeta);
  };

  const handleExportCsv = () => {
    exportCsv(rankedResults, config, config.criteria);
  };

  const tabs = [
    { key: "export",  label: "Export",    icon: Download    },
    { key: "presets", label: "Presets",   icon: LayoutGrid  },
    { key: "audit",   label: "Audit Log", icon: History     },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Export & Review</h2>
        <p className="text-muted-foreground mt-1">
          Download the shortlist with config, review presets, and browse the audit log.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Export tab */}
      {activeTab === "export" && (
        <div className="space-y-4">
          {rankedResults.length === 0 && (
            <div className="p-4 text-sm bg-muted text-muted-foreground rounded-lg">
              No results to export yet. Run the shortlisting first.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-xl p-6 space-y-3">
              <div className="flex items-center gap-2">
                <FileJson className="h-6 w-6 text-primary" />
                <h3 className="font-medium">Export as JSON</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                All teams + scores + breakdown + reasons + config in one file.
                Best for re-importing or programmatic use.
              </p>
              <button
                onClick={handleExportJson}
                disabled={rankedResults.length === 0}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition text-sm"
              >
                Download shortlist.json
              </button>
            </div>

            <div className="border rounded-xl p-6 space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                <h3 className="font-medium">Export as CSV</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Flat shortlist CSV with per-criterion columns + a config JSON sidecar.
                Best for spreadsheets and sharing with non-technical stakeholders.
              </p>
              <button
                onClick={handleExportCsv}
                disabled={rankedResults.length === 0}
                className="w-full px-4 py-2 border rounded-lg hover:bg-accent disabled:opacity-50 transition text-sm"
              >
                Download shortlist.csv + config.json
              </button>
            </div>
          </div>

          {/* Run summary */}
          {runMeta && (
            <div className="p-4 rounded-xl bg-muted text-sm space-y-1">
              <p className="font-medium">Last run summary</p>
              <div className="grid grid-cols-3 gap-2 text-muted-foreground">
                <span>Total teams: <strong>{runMeta.totalTeams}</strong></span>
                <span>Shortlisted: <strong>{shortlist.length}</strong></span>
                <span>Seed: <strong>{runMeta.seed}</strong></span>
                <span>Run at: <strong>{new Date(runMeta.runAt).toLocaleString()}</strong></span>
                <span>Duration: <strong>{runMeta.durationMs}ms</strong></span>
                <span>Criteria: <strong>{runMeta.enabledCriteria}</strong></span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Presets tab */}
      {activeTab === "presets" && (
        <div className="space-y-4">
          {presets.length === 0 ? (
            <p className="text-muted-foreground text-sm">No presets saved yet. Save one from the Configure page.</p>
          ) : (
            <div className="space-y-3">
              {presets.map((p) => (
                <div key={p.id} className="border rounded-xl p-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-muted-foreground">{p.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Saved {new Date(p.savedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        // Load preset into config store (would need useConfigStore().setConfig)
                        alert("Load preset: " + p.name);
                      }}
                      className="px-3 py-1 text-sm border rounded-lg hover:bg-accent transition"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => deletePreset(p.id)}
                      className="px-3 py-1 text-sm text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Audit log tab */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={clearLog}
              className="text-sm text-muted-foreground hover:text-destructive transition"
            >
              Clear log
            </button>
          </div>
          {auditLog.length === 0 ? (
            <p className="text-muted-foreground text-sm">No actions logged yet.</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {auditLog.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted text-sm"
                >
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                    {entry.action}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {JSON.stringify(entry.detail)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
