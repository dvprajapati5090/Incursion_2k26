/**
 * PresetManager — shows saved presets and lets organizer load them.
 */
import { BookMarked, Trash2, Download } from "lucide-react";
import usePresetsStore from "@/stores/presetsStore";
import useConfigStore from "@/stores/configStore";

export default function PresetManager() {
  const { presets, deletePreset } = usePresetsStore();
  const { setConfig } = useConfigStore();

  const handleLoad = (preset) => {
    if (window.confirm(`Load preset "${preset.name}"? This will replace the current config.`)) {
      setConfig(preset.config);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-[#415A77]/30 space-y-4">
      <h3 className="font-bold text-sm text-[#E0E1DD] flex items-center gap-2">
        <BookMarked className="h-4 w-4 text-[#778DA9]" />
        Saved Presets
      </h3>

      {presets.length === 0 ? (
        <p className="text-xs text-[#778DA9]/80">
          No presets yet. Click "Save Preset" in the toolbar to save the current configuration.
        </p>
      ) : (
        <div className="space-y-2.5">
          {presets.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-[#415A77]/25 bg-[#0D1B2A]/40 p-3.5 space-y-2 hover:border-[#415A77]/45 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#E0E1DD] truncate">{p.name}</p>
                  {p.description && (
                    <p className="text-xs text-[#778DA9]/80 truncate mt-0.5">{p.description}</p>
                  )}
                  <p className="text-[11px] font-mono text-[#778DA9]/60 mt-1">
                    {new Date(p.savedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleLoad(p)}
                    title="Load preset"
                    className="p-1.5 rounded-lg text-[#778DA9] hover:text-[#E0E1DD] hover:bg-[#415A77]/20 border border-transparent hover:border-[#415A77]/30 transition cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => deletePreset(p.id)}
                    title="Delete preset"
                    className="p-1.5 rounded-lg text-[#415A77] hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Mini summary */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] font-mono font-semibold bg-[#1B263B] text-[#778DA9] px-2 py-0.5 rounded-md border border-[#415A77]/20">
                  Top {p.config.selection?.topX}
                </span>
                <span className="text-[10px] font-mono font-semibold bg-[#1B263B] text-[#778DA9] px-2 py-0.5 rounded-md border border-[#415A77]/20">
                  {p.config.criteria?.filter((c) => c.enabled).length} criteria
                </span>
                <span className="text-[10px] font-mono font-semibold bg-[#1B263B] text-[#778DA9] px-2 py-0.5 rounded-md border border-[#415A77]/20">
                  {p.config.filters?.filter((f) => f.enabled).length} filters
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
