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
    <div className="rounded-xl border p-5 bg-card space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <BookMarked className="h-4 w-4" />
        Saved Presets
      </h3>

      {presets.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No presets yet. Click "Save Preset" to save the current config.
        </p>
      ) : (
        <div className="space-y-2">
          {presets.map((p) => (
            <div key={p.id} className="border rounded-lg p-3 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  {p.description && (
                    <p className="text-xs text-muted-foreground truncate">{p.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.savedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleLoad(p)}
                    title="Load preset"
                    className="p-1 text-muted-foreground hover:text-primary transition"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => deletePreset(p.id)}
                    title="Delete preset"
                    className="p-1 text-muted-foreground hover:text-destructive transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Mini summary */}
              <div className="flex flex-wrap gap-1">
                <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">
                  top {p.config.selection?.topX}
                </span>
                <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">
                  {p.config.criteria?.filter((c) => c.enabled).length} criteria
                </span>
                <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">
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
