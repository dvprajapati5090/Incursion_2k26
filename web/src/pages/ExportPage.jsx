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
import { motion } from "framer-motion";
import {
  FileJson,
  FileText,
  History,
  LayoutGrid,
  Download,
  Zap,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import useResultsStore from "@/stores/resultsStore";
import useConfigStore from "@/stores/configStore";
import usePresetsStore from "@/stores/presetsStore";
import { exportJson, exportCsv } from "@/lib/exportUtils";

// Palette constants for readability
const INK       = "#0D1B2A";
const PRUSSIAN  = "#1B263B";
const DUSK      = "#415A77";
const LAVENDER  = "#778DA9";
const ALABASTER = "#E0E1DD";

export default function ExportPage() {
  const { rankedResults, shortlist, runMeta } = useResultsStore();
  const { config } = useConfigStore();
  const { auditLog, clearLog, presets, deletePreset } = usePresetsStore();
  const [activeTab, setActiveTab] = useState("export");

  const handleExportJson = () => exportJson(rankedResults, config, runMeta);
  const handleExportCsv  = () => exportCsv(rankedResults, config, config.criteria);

  const tabs = [
    { key: "export",  label: "Export",    icon: Download    },
    { key: "presets", label: "Presets",   icon: LayoutGrid  },
    { key: "audit",   label: "Audit Log", icon: History     },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3"
            style={{
              background: `rgba(65, 90, 119, 0.15)`,
              border: `1px solid rgba(65, 90, 119, 0.35)`,
              color: LAVENDER,
            }}
          >
            <Zap className="h-3.5 w-3.5" style={{ color: LAVENDER }} />
            Stage 4 • Export &amp; Audit
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight" style={{ color: ALABASTER }}>
            Export &amp; Review
          </h2>
          <p className="mt-2 text-sm" style={{ color: `${LAVENDER}cc` }}>
            Download the shortlist with config, review presets, and browse the audit log.
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div
        className="flex gap-1 p-1 rounded-xl"
        style={{
          background: `rgba(27, 38, 59, 0.60)`,
          border: `1px solid rgba(65, 90, 119, 0.25)`,
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="relative flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer"
              style={{
                color: isActive ? ALABASTER : `${LAVENDER}99`,
                background: "transparent",
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="exportTab"
                  className="absolute inset-0 rounded-lg -z-10"
                  style={{
                    background: `linear-gradient(135deg, ${DUSK} 0%, #2d445e 100%)`,
                    border: `1px solid rgba(119,141,169,0.25)`,
                    boxShadow: `0 4px 12px -4px rgba(65,90,119,0.55)`,
                  }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Export Tab ───────────────────────────────────────── */}
      {activeTab === "export" && (
        <div className="space-y-6">
          {rankedResults.length === 0 && (
            <div
              className="p-4 text-sm rounded-xl"
              style={{
                background: `rgba(65, 90, 119, 0.10)`,
                border: `1px solid rgba(65, 90, 119, 0.25)`,
                color: `${LAVENDER}cc`,
              }}
            >
              No results to export yet — run the shortlisting engine first.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* JSON Card */}
            <div
              className="glass-panel rounded-2xl p-6 space-y-4"
              style={{ borderColor: `rgba(65, 90, 119, 0.40)` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: `rgba(65, 90, 119, 0.20)`,
                    border: `1px solid rgba(65, 90, 119, 0.40)`,
                  }}
                >
                  <FileJson className="h-5 w-5" style={{ color: LAVENDER }} />
                </div>
                <div>
                  <h3 className="font-bold text-sm" style={{ color: ALABASTER }}>Export as JSON</h3>
                  <p className="text-xs" style={{ color: `${LAVENDER}99` }}>Full structured bundle</p>
                </div>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: `${LAVENDER}cc` }}>
                All teams + scores + breakdown + reasons + config in one file.
                Best for re-importing or programmatic use.
              </p>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleExportJson}
                disabled={rankedResults.length === 0}
                className="w-full glow-btn flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 cursor-pointer transition"
                style={{ color: ALABASTER }}
              >
                <Download className="h-4 w-4" />
                Download shortlist.json
              </motion.button>
            </div>

            {/* CSV Card */}
            <div
              className="glass-panel rounded-2xl p-6 space-y-4"
              style={{ borderColor: `rgba(65, 90, 119, 0.40)` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: `rgba(65, 90, 119, 0.20)`,
                    border: `1px solid rgba(65, 90, 119, 0.40)`,
                  }}
                >
                  <FileText className="h-5 w-5" style={{ color: LAVENDER }} />
                </div>
                <div>
                  <h3 className="font-bold text-sm" style={{ color: ALABASTER }}>Export as CSV</h3>
                  <p className="text-xs" style={{ color: `${LAVENDER}99` }}>Spreadsheet-ready format</p>
                </div>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: `${LAVENDER}cc` }}>
                Flat shortlist CSV with per-criterion columns + a config JSON sidecar.
                Best for spreadsheets and sharing with non-technical stakeholders.
              </p>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleExportCsv}
                disabled={rankedResults.length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 cursor-pointer transition"
                style={{
                  background: `rgba(65, 90, 119, 0.15)`,
                  border: `1px solid rgba(65, 90, 119, 0.40)`,
                  color: LAVENDER,
                }}
              >
                <FileText className="h-4 w-4" />
                Download shortlist.csv + config.json
              </motion.button>
            </div>
          </div>

          {/* Run summary */}
          {runMeta && (
            <div
              className="rounded-2xl p-5 space-y-3"
              style={{
                background: `rgba(27, 38, 59, 0.60)`,
                border: `1px solid rgba(65, 90, 119, 0.25)`,
              }}
            >
              <p className="font-bold text-sm flex items-center gap-2" style={{ color: ALABASTER }}>
                <CheckCircle2 className="h-4 w-4" style={{ color: LAVENDER }} />
                Last Run Summary
              </p>
              <div
                className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs font-mono"
                style={{ color: `${LAVENDER}cc` }}
              >
                {[
                  ["Total Teams", runMeta.totalTeams],
                  ["Shortlisted", shortlist.length],
                  ["Seed", runMeta.seed],
                  ["Run At", new Date(runMeta.runAt).toLocaleString()],
                  ["Duration", `${runMeta.durationMs}ms`],
                  ["Criteria", runMeta.enabledCriteria],
                ].map(([label, val]) => (
                  <div
                    key={label}
                    className="rounded-lg px-3 py-2"
                    style={{
                      background: `rgba(65, 90, 119, 0.10)`,
                      border: `1px solid rgba(65, 90, 119, 0.18)`,
                    }}
                  >
                    <span style={{ color: `${LAVENDER}88` }}>{label}: </span>
                    <strong style={{ color: ALABASTER }}>{val}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Presets Tab ──────────────────────────────────────── */}
      {activeTab === "presets" && (
        <div className="space-y-4">
          {presets.length === 0 ? (
            <div
              className="p-6 rounded-xl text-sm text-center"
              style={{
                background: `rgba(27, 38, 59, 0.40)`,
                border: `1px solid rgba(65, 90, 119, 0.20)`,
                color: `${LAVENDER}99`,
              }}
            >
              No presets saved yet. Save one from the Configure page.
            </div>
          ) : (
            <div className="space-y-3">
              {presets.map((p) => (
                <div
                  key={p.id}
                  className="glass-panel rounded-xl p-4 flex items-start justify-between gap-4"
                >
                  <div>
                    <p className="font-bold text-sm" style={{ color: ALABASTER }}>{p.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: `${LAVENDER}cc` }}>{p.description}</p>
                    <p className="text-xs mt-1 font-mono" style={{ color: `${LAVENDER}77` }}>
                      Saved {new Date(p.savedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => alert("Load preset: " + p.name)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer"
                      style={{
                        background: `rgba(65, 90, 119, 0.15)`,
                        border: `1px solid rgba(65, 90, 119, 0.35)`,
                        color: LAVENDER,
                      }}
                    >
                      Load
                    </button>
                    <button
                      onClick={() => deletePreset(p.id)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer"
                      style={{
                        background: `rgba(192, 57, 43, 0.10)`,
                        border: `1px solid rgba(192, 57, 43, 0.25)`,
                        color: "#e07070",
                      }}
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

      {/* ── Audit Log Tab ─────────────────────────────────────── */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs font-semibold" style={{ color: `${LAVENDER}99` }}>
              {auditLog.length} event{auditLog.length !== 1 ? "s" : ""} recorded
            </p>
            <button
              onClick={clearLog}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer"
              style={{
                background: `rgba(192, 57, 43, 0.10)`,
                border: `1px solid rgba(192, 57, 43, 0.20)`,
                color: "#e07070",
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear log
            </button>
          </div>

          {auditLog.length === 0 ? (
            <div
              className="p-6 rounded-xl text-sm text-center"
              style={{
                background: `rgba(27, 38, 59, 0.40)`,
                border: `1px solid rgba(65, 90, 119, 0.20)`,
                color: `${LAVENDER}99`,
              }}
            >
              No actions logged yet.
            </div>
          ) : (
            <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
              {auditLog.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 p-3 rounded-xl text-xs"
                  style={{
                    background: `rgba(27, 38, 59, 0.55)`,
                    border: `1px solid rgba(65, 90, 119, 0.18)`,
                  }}
                >
                  <span className="font-mono whitespace-nowrap" style={{ color: `${LAVENDER}77` }}>
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    className="font-mono font-bold px-2 py-0.5 rounded shrink-0"
                    style={{
                      background: `rgba(65, 90, 119, 0.20)`,
                      color: LAVENDER,
                    }}
                  >
                    {entry.action}
                  </span>
                  <span className="font-mono" style={{ color: `${LAVENDER}cc` }}>
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
