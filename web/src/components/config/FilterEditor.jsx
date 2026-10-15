/**
 * FilterEditor — add, edit, and remove hard eligibility filters.
 */
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import useConfigStore from "@/stores/configStore";
import { METRIC_OPTIONS } from "./metricOptions";

const OPS = [">=", ">", "<=", "<", "==", "!=", "exists", "contains"];
const SCOPES = [
  { value: "any_member",         label: "Any member"    },
  { value: "all_members",        label: "All members"   },
  { value: "at_least_n_members", label: "At least N members" },
  { value: "team",               label: "Team-level"    },
];
const ON_MISSING_FILTER = [
  { value: "flag", label: "Flag (keep, mark for review)" },
  { value: "fail", label: "Fail (treat as not meeting filter)" },
  { value: "pass", label: "Pass (treat as meeting filter)"     },
];
const MODES = [
  { value: "reject", label: "Reject (hard rule)"  },
  { value: "warn",   label: "Warn (soft rule only)" },
];

// Flatten all metrics for the filter dropdown
const ALL_METRICS = METRIC_OPTIONS.flatMap((g) => g.options);

export default function FilterEditor() {
  const { config, updateFilter, removeFilter, addFilter } = useConfigStore();

  const handleAdd = () => {
    addFilter({
      id: `filter_${Date.now()}`,
      label: "New Filter",
      enabled: true,
      metric: "github.contributions_1y",
      op: ">=",
      value: 0,
      scope: { type: "any_member" },
      onMissing: "flag",
      mode: "reject",
    });
  };

  return (
    <div className="rounded-xl border p-5 bg-card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Eligibility Filters</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Hard filters run before scoring. Rejected teams are shown with the reason.
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 border rounded-lg hover:bg-accent transition"
        >
          <Plus className="h-4 w-4" />
          Add Filter
        </button>
      </div>

      {config.filters.length === 0 && (
        <p className="text-sm text-muted-foreground">No filters configured. All teams will be scored.</p>
      )}

      <div className="space-y-3">
        {config.filters.map((filter) => (
          <div key={filter.id} className="border rounded-lg p-4 space-y-3">
            {/* Row 1: enable + label + mode badge */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={filter.enabled}
                onChange={(e) => updateFilter(filter.id, { enabled: e.target.checked })}
                className="h-4 w-4 rounded"
              />
              <input
                type="text"
                value={filter.label}
                onChange={(e) => updateFilter(filter.id, { label: e.target.value })}
                className="flex-1 font-medium text-sm bg-transparent border-none outline-none"
              />
              <select
                value={filter.mode}
                onChange={(e) => updateFilter(filter.id, { mode: e.target.value })}
                className="text-xs border rounded px-2 py-1 bg-background"
              >
                {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <button
                onClick={() => removeFilter(filter.id)}
                className="text-muted-foreground hover:text-destructive transition"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Row 2: metric op value scope */}
            <div className="grid grid-cols-4 gap-2 text-sm">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Metric</span>
                <select
                  value={filter.metric}
                  onChange={(e) => updateFilter(filter.id, { metric: e.target.value })}
                  className="w-full border rounded px-2 py-1 bg-background text-xs"
                >
                  {METRIC_OPTIONS.map((g) => (
                    <optgroup key={g.group} label={g.group}>
                      {g.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Operator</span>
                <select
                  value={filter.op}
                  onChange={(e) => updateFilter(filter.id, { op: e.target.value })}
                  className="w-full border rounded px-2 py-1 bg-background text-xs"
                >
                  {OPS.map((op) => <option key={op} value={op}>{op}</option>)}
                </select>
              </div>
              {filter.op !== "exists" && (
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Value</span>
                  <input
                    type={typeof filter.value === "number" ? "number" : "text"}
                    value={filter.value ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      updateFilter(filter.id, { value: isNaN(Number(v)) ? v : Number(v) });
                    }}
                    className="w-full border rounded px-2 py-1 bg-background text-xs"
                  />
                </div>
              )}
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Scope</span>
                <select
                  value={filter.scope?.type ?? "any_member"}
                  onChange={(e) => {
                    const type = e.target.value;
                    updateFilter(filter.id, {
                      scope: type === "at_least_n_members"
                        ? { type, n: filter.scope?.n ?? 1 }
                        : { type },
                    });
                  }}
                  className="w-full border rounded px-2 py-1 bg-background text-xs"
                >
                  {SCOPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            {/* N input for at_least_n_members */}
            {filter.scope?.type === "at_least_n_members" && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-xs text-muted-foreground">Minimum N members:</span>
                <input
                  type="number"
                  min={1}
                  value={filter.scope.n ?? 1}
                  onChange={(e) =>
                    updateFilter(filter.id, { scope: { type: "at_least_n_members", n: Number(e.target.value) } })
                  }
                  className="w-16 border rounded px-2 py-1 bg-background text-xs"
                />
              </div>
            )}

            {/* Missing data policy */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>If data missing:</span>
              <select
                value={filter.onMissing}
                onChange={(e) => updateFilter(filter.id, { onMissing: e.target.value })}
                className="border rounded px-2 py-0.5 bg-background text-xs"
              >
                {ON_MISSING_FILTER.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
