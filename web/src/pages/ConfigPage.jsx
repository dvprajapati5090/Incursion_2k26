/**
 * ConfigPage — Step 2
 *
 * Organizer sets:
 *   - topX (how many teams to shortlist) and waitlist size
 *   - Scoring criteria: metric, weight (slider), normalization, aggregation, onMissing
 *   - Hard filters / eligibility rules
 *   - Options: blind mode, seed
 *   - Preset save/load
 *
 * Every change triggers a live re-rank via the Web Worker.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Save, Eye, EyeOff, ArrowRight, RotateCcw } from "lucide-react";
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
  const { enrichedTeams, rawTeams, phase } = useImportStore();
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Configure Selection</h2>
          <p className="text-muted-foreground mt-1">
            Set criteria weights, filters, and rules. No code changes needed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Blind mode toggle */}
          <button
            onClick={() => setBlindMode(!config.options?.blindMode)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg hover:bg-accent transition"
            title={config.options?.blindMode ? "Disable blind mode" : "Enable blind mode (hides names/emails)"}
          >
            {config.options?.blindMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {config.options?.blindMode ? "Blind Mode ON" : "Blind Mode"}
          </button>

          {/* Live ranking toggle */}
          <button
            onClick={() => setLiveRanking((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg transition ${
              liveRanking ? "bg-primary text-primary-foreground" : "hover:bg-accent"
            }`}
            disabled={!hasData}
          >
            Live Re-rank
          </button>

          <button
            onClick={handleSavePreset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg hover:bg-accent transition"
          >
            <Save className="h-4 w-4" />
            Save Preset
          </button>

          <button
            onClick={resetConfig}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg hover:bg-accent transition"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Criteria + Filters */}
        <div className="col-span-2 space-y-6">
          <SelectionPanel />
          <CriteriaEditor />
          <FilterEditor />
        </div>

        {/* Right: Presets + Options */}
        <div className="space-y-6">
          <PresetManager />
        </div>
      </div>

      {/* Run button */}
      <div className="sticky bottom-4 flex justify-end">
        <button
          onClick={handleRun}
          disabled={!hasData}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl shadow-lg hover:bg-primary/90 disabled:opacity-50 transition text-sm font-medium"
        >
          <Play className="h-4 w-4" />
          Run Shortlisting
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
