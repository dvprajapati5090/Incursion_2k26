/**
 * CriteriaEditor — Add, edit, remove, and tune scoring criteria.
 * Features glassmorphic cards, custom weight sliders, and animated configuration drawers.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Sliders,
  Settings,
  Sparkles,
} from "lucide-react";
import useConfigStore from "@/stores/configStore";
import { METRIC_OPTIONS } from "./metricOptions";
import { cn } from "@/lib/utils";

const NORMALIZATIONS = [
  { value: "minmax",     label: "Min-Max (0–1 across teams)" },
  { value: "percentile", label: "Percentile Rank (Relative order)" },
  { value: "cap",        label: "Cap Scale (Value ÷ Upper limit)" },
  { value: "none",       label: "Raw / Unnormalized" },
];

const AGGREGATIONS = [
  { value: "max",       label: "Max (Best team member)" },
  { value: "mean",      label: "Mean (Team average)" },
  { value: "median",    label: "Median (Balanced midpoint)" },
  { value: "sum",       label: "Sum (Total accumulated)" },
  { value: "top2_mean", label: "Top 2 Mean (Star duo)" },
];

const ON_MISSING = [
  { value: "reweight", label: "Reweight (Redistribute to other criteria)" },
  { value: "zero",     label: "Penalize as zero" },
  { value: "neutral",  label: "Assign neutral baseline value" },
];

const SIZE_NORM = [
  { value: "none",       label: "None (Raw team scale)" },
  { value: "per_member", label: "Per-Member Normalized" },
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
      label: "New Scoring Criterion",
      enabled: true,
      metric: "resume.project_count",
      weight: 2,
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="glass-panel rounded-2xl p-6 border border-white/10 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-indigo-400" />
            <h3 className="font-bold text-base text-white">Scoring Criteria & Weight Distribution</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Weights are automatically normalized into relative percentage contributions. Total enabled weight:{" "}
            <span className="font-mono text-cyan-300 font-bold">{totalWeight.toFixed(1)}</span>
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleAdd}
          className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Criterion
        </motion.button>
      </div>

      <div className="space-y-3">
        {config.criteria.map((criterion, idx) => {
          const isExpanded = expanded.has(criterion.id);
          const pct =
            totalWeight > 0 && criterion.enabled
              ? Math.round((criterion.weight / totalWeight) * 100)
              : 0;

          return (
            <motion.div
              key={criterion.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className={cn(
                "rounded-xl border transition-all overflow-hidden",
                criterion.enabled
                  ? "bg-slate-900/60 border-white/10 hover:border-white/20"
                  : "bg-slate-950/40 border-white/[0.05] opacity-60"
              )}
            >
              {/* Main Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Enable Checkbox */}
                  <input
                    type="checkbox"
                    checked={criterion.enabled}
                    onChange={(e) => updateCriterion(criterion.id, { enabled: e.target.checked })}
                    className="h-4 w-4 rounded accent-indigo-500 cursor-pointer"
                  />

                  {/* Label input */}
                  <input
                    type="text"
                    value={criterion.label}
                    onChange={(e) => updateCriterion(criterion.id, { label: e.target.value })}
                    className="font-semibold text-sm text-white bg-transparent border-b border-transparent hover:border-white/20 focus:border-indigo-400 outline-none px-1 py-0.5 flex-1 min-w-0 transition-colors"
                  />

                  {/* Metric tag pill */}
                  <span className="hidden md:inline-flex text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-white/5 truncate max-w-[140px]">
                    {criterion.metric}
                  </span>
                </div>

                {/* Weight slider controls */}
                <div className="flex items-center gap-3 w-full sm:w-64">
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={0.5}
                    value={criterion.weight}
                    onChange={(e) => updateCriterion(criterion.id, { weight: Number(e.target.value) })}
                    disabled={!criterion.enabled}
                    className="flex-1 accent-indigo-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                  />

                  <div className="flex items-center gap-1.5 w-16 justify-end">
                    <span className="font-mono text-xs font-bold text-slate-200">
                      {criterion.weight}
                    </span>
                    <span className="text-[10px] font-mono text-cyan-400 font-semibold bg-cyan-950/40 px-1 rounded border border-cyan-500/20">
                      {pct}%
                    </span>
                  </div>

                  <div className="flex items-center gap-1 pl-1 border-l border-white/10">
                    <button
                      onClick={() => toggle(criterion.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
                      title="Advanced algorithmic settings"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => removeCriterion(criterion.id)}
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Remove criterion"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Advanced Settings Drawer */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-white/[0.06] bg-slate-950/50 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs"
                  >
                    {/* Metric Select */}
                    <div className="space-y-1.5">
                      <label className="text-slate-400 font-medium">Underlying Metric</label>
                      <select
                        value={criterion.metric}
                        onChange={(e) => updateCriterion(criterion.id, { metric: e.target.value })}
                        className="w-full rounded-lg bg-slate-900 border border-white/10 px-3 py-2 text-slate-200 outline-none focus:border-indigo-400"
                      >
                        {METRIC_OPTIONS.map((opt) => (
                          <optgroup key={opt.group} label={opt.group} className="bg-slate-900 text-slate-200">
                            {opt.options.map((o) => (
                              <option
                                key={o.value}
                                value={o.value}
                                disabled={o.disabled}
                                className={o.disabled ? "text-slate-500 bg-slate-900" : "bg-slate-900 text-slate-200"}
                              >
                                {o.label} {o.disabled ? `— [Disabled: ${o.disabledReason || "reserved"}]` : ""}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    {/* Normalization Type */}
                    <div className="space-y-1.5">
                      <label className="text-slate-400 font-medium">Normalization Policy</label>
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
                          className="flex-1 rounded-lg bg-slate-900 border border-white/10 px-3 py-2 text-slate-200 outline-none focus:border-indigo-400"
                        >
                          {NORMALIZATIONS.map((n) => (
                            <option key={n.value} value={n.value} className="bg-slate-900 text-slate-200">
                              {n.label}
                            </option>
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
                            className="w-20 rounded-lg bg-slate-900 border border-white/10 px-3 py-2 text-slate-200 outline-none"
                            placeholder="Cap"
                          />
                        )}
                      </div>
                    </div>

                    {/* Aggregation Mode */}
                    <div className="space-y-1.5">
                      <label className="text-slate-400 font-medium">Team Member Aggregation</label>
                      <select
                        value={criterion.aggregation}
                        onChange={(e) => updateCriterion(criterion.id, { aggregation: e.target.value })}
                        className="w-full rounded-lg bg-slate-900 border border-white/10 px-3 py-2 text-slate-200 outline-none focus:border-indigo-400"
                      >
                        {AGGREGATIONS.map((a) => (
                          <option key={a.value} value={a.value} className="bg-slate-900 text-slate-200">
                            {a.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Missing Data Strategy */}
                    <div className="space-y-1.5">
                      <label className="text-slate-400 font-medium">Missing Signal Handling</label>
                      <select
                        value={criterion.onMissing}
                        onChange={(e) => updateCriterion(criterion.id, { onMissing: e.target.value })}
                        className="w-full rounded-lg bg-slate-900 border border-white/10 px-3 py-2 text-slate-200 outline-none focus:border-indigo-400"
                      >
                        {ON_MISSING.map((m) => (
                          <option key={m.value} value={m.value} className="bg-slate-900 text-slate-200">
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
