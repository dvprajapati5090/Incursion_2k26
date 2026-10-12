/**
 * CriteriaEditor — add, edit, remove, and reorder scoring criteria.
 *
 * Each criterion shows:
 *   - Enable toggle
 *   - Label (editable)
 *   - Metric (dropdown from registry)
 *   - Weight slider (0 to 10, relative — engine normalizes)
 *   - Normalization selector
 *   - Aggregation selector
 *   - onMissing selector
 */
import { useState } from "react";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import useConfigStore from "@/stores/configStore";
import { METRIC_OPTIONS } from "./metricOptions";

const NORMALIZATIONS = [
  { value: "minmax",     label: "Min-Max (0–1 across teams)" },
  { value: "percentile", label: "Percentile rank"            },
  { value: "cap",        label: "Cap (value ÷ cap)"          },
  { value: "none",       label: "None (raw value)"           },
];

const AGGREGATIONS = [
  { value: "max",       label: "Max (best member)"       },
  { value: "mean",      label: "Mean (team average)"     },
  { value: "median",    label: "Median"                  },
  { value: "sum",       label: "Sum (team total)"        },
  { value: "top2_mean", label: "Top 2 mean"              },
];

const ON_MISSING = [
  { value: "reweight", label: "Reweight (redistribute to others)" },
  { value: "zero",     label: "Score zero (shows as missing)"      },
  { value: "neutral",  label: "Use neutral value"                  },
];

const SIZE_NORM = [
  { value: "none",       label: "None"       },
  { value: "per_member", label: "Per member" },
];

export default function CriteriaEditor() {
  const { config, updateCriterion, removeCriterion, addCriterion } = useConfigStore();
  const [expanded, setExpanded] = useState(new Set());

  const toggle = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleAdd = () => {
    const id = `criterion_${Date.now()}`;
    addCriterion({
      id,
      label: "New Criterion",
      enabled: true,
      metric: "resume.project_count",
      weight: 1,
      normalization: { type: "minmax" },
      aggregation: "mean",
      sizeNormalization: "none",
      onMissing: "reweight",
      params: {},
    });
    setExpanded((prev) => new Set([...prev, id]));
  };

  const totalWeight = config.criteria
    .filter((c) => c.enabled)
    .reduce((s, c) => s + (c.weight || 0), 0);

  return (
    <div className="rounded-xl border p-5 bg-card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Scoring Criteria</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Weights are relative — the engine normalizes them. Total enabled weight: {totalWeight.toFixed(1)}
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 border rounded-lg hover:bg-accent transition"
        >
          <Plus className="h-4 w-4" />
          Add Criterion
        </button>
      </div>

      <div className="space-y-2">
        {config.criteria.map((criterion) => {
          const isExpanded = expanded.has(criterion.id);
          const pct =
            totalWeight > 0 && criterion.enabled
              ? Math.round((criterion.weight / totalWeight) * 100)
              : 0;

          return (
            <div key={criterion.id} className="border rounded-lg overflow-hidden">
              {/* Header row */}
              <div className="flex items-center gap-3 px-4 py-3 bg-muted/50">
                <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />

                {/* Enable toggle */}
                <input
                  type="checkbox"
                  checked={criterion.enabled}
                  onChange={(e) => updateCriterion(criterion.id, { enabled: e.target.checked })}
                  className="h-4 w-4 rounded"
                />

                {/* Label */}
                <input
                  type="text"
                  value={criterion.label}
                  onChange={(e) => updateCriterion(criterion.id, { label: e.target.value })}
                  className="font-medium text-sm bg-transparent border-none outline-none flex-1 min-w-0"
                />

                {/* Weight slider */}
                <div className="flex items-center gap-2 w-48">
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={0.5}
                    value={criterion.weight}
                    onChange={(e) => updateCriterion(criterion.id, { weight: Number(e.target.value) })}
                    className="flex-1 accent-primary"
                    disabled={!criterion.enabled}
                  />
                  <span className="text-sm font-mono w-8 text-right">{criterion.weight}</span>
                  <span className="text-xs text-muted-foreground w-8">({pct}%)</span>
                </div>

                {/* Expand / delete */}
                <button onClick={() => toggle(criterion.id)} className="text-muted-foreground hover:text-foreground">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => removeCriterion(criterion.id)}
                  className="text-muted-foreground hover:text-destructive transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Expanded settings */}
              {isExpanded && (
                <div className="px-4 py-3 grid grid-cols-2 gap-3 text-sm">
                  {/* Metric */}
                  <label className="space-y-1">
                    <span className="text-xs text-muted-foreground font-medium">Metric</span>
                    <select
                      value={criterion.metric}
                      onChange={(e) => updateCriterion(criterion.id, { metric: e.target.value })}
                      className="w-full border rounded-lg px-2 py-1.5 bg-background text-sm"
                    >
                      {METRIC_OPTIONS.map((opt) => (
                        <optgroup key={opt.group} label={opt.group}>
                          {opt.options.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </label>

                  {/* Normalization */}
                  <label className="space-y-1">
                    <span className="text-xs text-muted-foreground font-medium">Normalization</span>
                    <div className="flex gap-2">
                      <select
                        value={criterion.normalization?.type ?? "minmax"}
                        onChange={(e) => {
                          const type = e.target.value;
                          updateCriterion(criterion.id, {
                            normalization: type === "cap"
                              ? { type, cap: criterion.normalization?.cap ?? 10 }
                              : { type },
                          });
                        }}
                        className="flex-1 border rounded-lg px-2 py-1.5 bg-background text-sm"
                      >
                        {NORMALIZATIONS.map((n) => (
                          <option key={n.value} value={n.value}>{n.label}</option>
                        ))}
                      </select>
                      {criterion.normalization?.type === "cap" && (
                        <input
                          type="number"
                          min={1}
                          value={criterion.normalization.cap ?? 10}
                          onChange={(e) =>
                            updateCriterion(criterion.id, {
                              normalization: { type: "cap", cap: Number(e.target.value) },
                            })
                          }
                          className="w-20 border rounded-lg px-2 py-1.5 bg-background text-sm"
                          placeholder="Cap"
                        />
                      )}
                    </div>
                  </label>

                  {/* Aggregation */}
                  <label className="space-y-1">
                    <span className="text-xs text-muted-foreground font-medium">Aggregation (member → team)</span>
                    <select
                      value={criterion.aggregation}
                      onChange={(e) => updateCriterion(criterion.id, { aggregation: e.target.value })}
                      className="w-full border rounded-lg px-2 py-1.5 bg-background text-sm"
                    >
                      {AGGREGATIONS.map((a) => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                  </label>

                  {/* onMissing */}
                  <label className="space-y-1">
                    <span className="text-xs text-muted-foreground font-medium">If data is missing</span>
                    <select
                      value={criterion.onMissing}
                      onChange={(e) => updateCriterion(criterion.id, { onMissing: e.target.value })}
                      className="w-full border rounded-lg px-2 py-1.5 bg-background text-sm"
                    >
                      {ON_MISSING.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </label>

                  {/* Size normalization */}
                  <label className="space-y-1">
                    <span className="text-xs text-muted-foreground font-medium">Size normalization</span>
                    <select
                      value={criterion.sizeNormalization ?? "none"}
                      onChange={(e) => updateCriterion(criterion.id, { sizeNormalization: e.target.value })}
                      className="w-full border rounded-lg px-2 py-1.5 bg-background text-sm"
                    >
                      {SIZE_NORM.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </label>

                  {/* Neutral value (shown only when onMissing = neutral) */}
                  {criterion.onMissing === "neutral" && (
                    <label className="space-y-1">
                      <span className="text-xs text-muted-foreground font-medium">Neutral value (0–1)</span>
                      <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.05}
                        value={criterion.neutralValue ?? 0.5}
                        onChange={(e) => updateCriterion(criterion.id, { neutralValue: Number(e.target.value) })}
                        className="w-full border rounded-lg px-2 py-1.5 bg-background text-sm"
                      />
                    </label>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
