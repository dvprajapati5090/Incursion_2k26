/**
 * ConfigPage — Step 2
 *
 * Command center for algorithmic selection configuration:
 *   - Quota capacity (Top X & Waitlist)
 *   - Tunable scoring criteria & weights
 *   - Eligibility rules & hard filters
 *   - Stealth blind evaluation mode
 *   - Real-time Web Worker live re-ranking
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Play,
  Save,
  Eye,
  EyeOff,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Zap,
  Sliders,
  ShieldCheck,
  Activity,
} from "lucide-react";
import useConfigStore from "@/stores/configStore";
import useImportStore from "@/stores/importStore";
import useResultsStore from "@/stores/resultsStore";
import usePresetsStore from "@/stores/presetsStore";
import CriteriaEditor from "@/components/config/CriteriaEditor";
import FilterEditor from "@/components/config/FilterEditor";
import SelectionPanel from "@/components/config/SelectionPanel";
import PresetManager from "@/components/config/PresetManager";

export default function ConfigPage() {
  const navigate = useNavigate();
  const { config, setBlindMode, resetConfig } = useConfigStore();
  const { enrichedTeams, rawTeams } = useImportStore();
  const { setRunning, setResults, setError } = useResultsStore();
  const { logAction, savePreset } = usePresetsStore();

  const [liveRanking, setLiveRanking] = useState(false);
  const workerRef = useRef(null);

  // Initialize Web Worker for live re-ranking
  useEffect(() => {
    const worker = new Worker(
      new URL("../engine/worker.js", import.meta.url),
      { type: "module" }
    );
    worker.onmessage = (e) => {
      if (e.data.type === "RESULT") {
        setResults(e.data.payload);
      } else if (e.data.type === "ERROR") {
        setError(e.data.message);
      }
    };
    workerRef.current = worker;
    return () => worker.terminate();
  }, [setResults, setError]);

  // Trigger re-rank when config changes (live mode)
  useEffect(() => {
    if (!liveRanking) return;
    const teams = enrichedTeams.length > 0 ? enrichedTeams : rawTeams;
    if (teams.length === 0) return;
    setRunning(true);
    workerRef.current?.postMessage({ type: "RUN", teams, config, registry: {} });
  }, [config, liveRanking, enrichedTeams, rawTeams, setRunning]);

  const handleRun = () => {
    const teams = enrichedTeams.length > 0 ? enrichedTeams : rawTeams;
    if (teams.length === 0) {
      alert("No team data loaded. Please upload a file first.");
      return;
    }
    setRunning(true);
    workerRef.current?.postMessage({ type: "RUN", teams, config, registry: {} });
    logAction("RUN_SHORTLIST", { topX: config.selection.topX, criteria: config.criteria.length });
    navigate("/results");
  };

  const handleSavePreset = () => {
    const id = savePreset(config);
    logAction("SAVE_PRESET", { id, name: config.name });
  };

  const hasData = (enrichedTeams.length > 0 || rawTeams.length > 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header with control switches */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold mb-2">
            <Sliders className="h-3.5 w-3.5 text-cyan-400" />
            Stage 2 • Algorithmic Tuning & Governance
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            Configure Selection Parameters
          </h2>
          <p className="text-slate-400 mt-1 text-xs max-w-2xl">
            Weights are relative and normalized automatically. Zero code changes required to rebalance evaluation philosophies.
          </p>
        </div>

        {/* Toolbar Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Blind Mode Toggle */}
          <button
            onClick={() => setBlindMode(!config.options?.blindMode)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition cursor-pointer ${
              config.options?.blindMode
                ? "bg-amber-500/15 border-amber-500/30 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.3)]"
                : "bg-slate-900/80 border-white/10 text-slate-400 hover:text-white"
            }`}
            title={config.options?.blindMode ? "Disable blind mode" : "Enable blind mode (anonymizes team and applicant names)"}
          >
            {config.options?.blindMode ? <EyeOff className="h-3.5 w-3.5 text-amber-400" /> : <Eye className="h-3.5 w-3.5" />}
            {config.options?.blindMode ? "Stealth Mode ON" : "Stealth Blind Mode"}
          </button>

          {/* Live Ranking Toggle */}
          <button
            onClick={() => setLiveRanking((v) => !v)}
            disabled={!hasData}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition cursor-pointer ${
              liveRanking
                ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                : "bg-slate-900/80 border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            <Activity className="h-3.5 w-3.5 text-cyan-400" />
            Live Worker Ranking
          </button>

          <button
            onClick={handleSavePreset}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-900/80 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <Save className="h-3.5 w-3.5 text-indigo-400" />
            Save Preset
          </button>

          <button
            onClick={resetConfig}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-900/80 border border-white/10 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* Main Grid: Criteria & Filters on Left, Presets on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols wide) */}
        <div className="lg:col-span-2 space-y-6">
          <SelectionPanel />
          <CriteriaEditor />
          <FilterEditor />
        </div>

        {/* Right Column (1 col wide) */}
        <div className="space-y-6">
          <PresetManager />
        </div>
      </div>

      {/* Floating Sticky Bottom Execution Banner */}
      <div className="sticky bottom-6 z-30">
        <div className="glass-panel rounded-2xl p-4 border border-indigo-500/30 bg-[#090e1a]/95 backdrop-blur-2xl shadow-2xl flex items-center justify-between gap-4 max-w-4xl mx-auto">
          <div className="hidden sm:block">
            <p className="text-xs font-bold text-white flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Engine Configuration Ready
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Evaluating Top {config.selection?.topX} teams with {config.criteria.filter((c) => c.enabled).length} scoring criteria
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRun}
            disabled={!hasData}
            className="glow-btn flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-6 py-3 text-xs font-extrabold text-white rounded-xl shadow-xl shadow-indigo-600/30 transition cursor-pointer disabled:opacity-50"
          >
            <Play className="h-4 w-4 fill-white" />
            Execute Shortlist Engine
            <ArrowRight className="h-4 w-4" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
