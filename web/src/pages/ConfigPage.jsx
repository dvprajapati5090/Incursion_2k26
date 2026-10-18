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
import DemoDataBanner from "@/components/common/DemoDataBanner";

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
      {/* Demo Data Banner (Must-do UI Rule #8) */}
      <DemoDataBanner />

      {/* Header with control switches */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1B263B] border border-[#415A77]/60 text-[#E0E1DD] text-xs font-semibold mb-2 shadow-sm">
            <Sliders className="h-3.5 w-3.5 text-[#778DA9]" />
            <span>Stage 2 • Algorithmic Tuning &amp; Governance</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight text-white">
            Configure Selection Parameters
          </h2>
          <p className="text-[#778DA9] mt-1 text-sm max-w-2xl leading-relaxed">
            Weights are relative and normalized automatically. Zero code changes required to rebalance evaluation philosophies.
          </p>
        </div>

        {/* Toolbar Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Blind Mode Toggle */}
          <button
            onClick={() => setBlindMode(!config.options?.blindMode)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border transition cursor-pointer shadow-sm ${
              config.options?.blindMode
                ? "bg-amber-500/20 border-amber-500/50 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.35)]"
                : "bg-[#1B263B] border-[#415A77]/60 text-[#E0E1DD] hover:bg-[#415A77]/30 hover:border-[#778DA9]"
            }`}
            title={config.options?.blindMode ? "Disable blind mode" : "Enable blind mode (anonymizes team and applicant names)"}
          >
            {config.options?.blindMode ? <EyeOff className="h-3.5 w-3.5 text-amber-300" /> : <Eye className="h-3.5 w-3.5 text-[#778DA9]" />}
            <span>{config.options?.blindMode ? "Stealth Mode ON" : "Stealth Blind Mode"}</span>
          </button>

          {/* Live Ranking Toggle */}
          <button
            onClick={() => setLiveRanking((v) => !v)}
            disabled={!hasData}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border transition cursor-pointer shadow-sm ${
              liveRanking
                ? "bg-[#415A77]/40 border-[#778DA9] text-white shadow-[0_0_14px_rgba(119,141,169,0.45)]"
                : "bg-[#1B263B] border-[#415A77]/60 text-[#E0E1DD] hover:bg-[#415A77]/30 hover:border-[#778DA9]"
            }`}
          >
            <Activity className="h-3.5 w-3.5 text-[#778DA9]" />
            <span>Live Worker Ranking</span>
          </button>

          <button
            onClick={handleSavePreset}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#1B263B] border border-[#415A77]/60 text-[#E0E1DD] hover:bg-[#415A77]/30 hover:border-[#778DA9] transition cursor-pointer shadow-sm"
          >
            <Save className="h-3.5 w-3.5 text-[#778DA9]" />
            <span>Save Preset</span>
          </button>

          <button
            onClick={resetConfig}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#1B263B] border border-[#415A77]/60 text-[#778DA9] hover:text-rose-300 hover:border-rose-500/40 hover:bg-rose-950/20 transition cursor-pointer shadow-sm"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
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
        <div className="glass-panel rounded-2xl p-4 border border-[#415A77]/70 bg-[#1B263B]/95 backdrop-blur-2xl shadow-2xl flex items-center justify-between gap-4 max-w-4xl mx-auto">
          <div className="hidden sm:block">
            <p className="text-xs font-bold text-white flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Engine Configuration Ready</span>
            </p>
            <p className="text-[11px] text-[#778DA9] mt-0.5">
              Evaluating Top <strong className="text-white font-mono">{config.selection?.topX}</strong> teams with <strong className="text-white font-mono">{config.criteria.filter((c) => c.enabled).length}</strong> scoring criteria
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRun}
            disabled={!hasData}
            className="btn-primary flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-7 py-3 text-xs font-black rounded-xl shadow-xl transition cursor-pointer disabled:opacity-50"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>Execute Shortlist Engine</span>
            <ArrowRight className="h-4 w-4" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
