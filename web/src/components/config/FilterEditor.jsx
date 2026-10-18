/**
 * FilterEditor — High-tech, robust Eligibility Rule Builder.
 *
 * Implements:
 * - 100% contract alignment with engine's applyEligibilityFilters
 * - Auto-scoping (Member vs Team level) to prevent scope mismatches
 * - Live cohort impact simulation (instantly previews how many teams pass/fail)
 * - Quick rule template presets (GitHub activity, minimum team size, resume presence)
 * - Intelligent input types (numeric, boolean toggles, or exists operators)
 * - Cyber-luxe aesthetic matching the rest of the application
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sliders,
  Sparkles,
  Zap,
  Users,
  Award,
  Layers,
  ArrowRight,
} from "lucide-react";
import useConfigStore from "@/stores/configStore";
import useImportStore from "@/stores/importStore";
import { METRIC_OPTIONS } from "./metricOptions";

// Supported comparison operators
const OPERATOR_CONFIG = [
  { value: ">=", label: "≥ At least (minimum)", engineOp: "gte" },
  { value: ">",  label: "> Greater than",      engineOp: "gt"  },
  { value: "<=", label: "≤ At most (maximum)", engineOp: "lte" },
  { value: "<",  label: "< Less than",         engineOp: "lt"  },
  { value: "==", label: "= Exactly equals",    engineOp: "eq"  },
  { value: "!=", label: "≠ Does not equal",    engineOp: "neq" },
  { value: "exists", label: "✓ Verified Present & Not Empty", engineOp: "exists" },
];

// Scope choices
const MEMBER_SCOPES = [
  { value: "any_member",  label: "At least 1 member (Any)", tag: "Team Qualifies If ≥1 Meets" },
  { value: "all_members", label: "Every single member (All)", tag: "Strict: All Members Must Meet" },
];

const ON_MISSING_POLICIES = [
  { value: "flag", label: "Flag for Review (Soft Hold)", color: "text-amber-400" },
  { value: "fail", label: "Fail Rule (Hard Reject)", color: "text-rose-400" },
  { value: "pass", label: "Pass Rule (Forgive Missing)", color: "text-emerald-400" },
];

// Quick rule presets
const QUICK_PRESETS = [
  {
    title: "GitHub 50+ Contribs",
    icon: "💻",
    filter: {
      label: "At least 1 member with ≥ 50 GitHub contributions",
      metric: "github.contributions_1y",
      op: ">=",
      value: 50,
      scope: { type: "any_member" },
      mode: "reject",
      onMissing: "flag",
    },
  },
  {
    title: "Min Team Size ≥ 2",
    icon: "👥",
    filter: {
      label: "Team size must be at least 2 members",
      metric: "team.size",
      op: ">=",
      value: 2,
      scope: { type: "team" },
      mode: "reject",
      onMissing: "fail",
    },
  },
  {
    title: "Resume Provided",
    icon: "📄",
    filter: {
      label: "At least 1 member provided a resume or projects",
      metric: "resume.project_count",
      op: ">=",
      value: 1,
      scope: { type: "any_member" },
      mode: "reject",
      onMissing: "flag",
    },
  },
  {
    title: "Live Portfolio Demo",
    icon: "🌐",
    filter: {
      label: "At least 1 member has verified live deployment demo",
      metric: "portfolio.has_live_demo",
      op: "==",
      value: true,
      scope: { type: "any_member" },
      mode: "warn",
      onMissing: "pass",
    },
  },
];

export default function FilterEditor() {
  const { config, updateFilter, removeFilter, addFilter } = useConfigStore();
  const { rawTeams, enrichedTeams } = useImportStore();
  const activeCohort = enrichedTeams.length > 0 ? enrichedTeams : rawTeams;

  // Evaluates a single filter against a team for live simulation
  const simulateFilter = (team, filter) => {
    if (!filter || filter.enabled === false) return "pass";
    const metric = filter.metric || "team.size";
    const op = filter.op || ">=";
    const isTeamLevel = metric === "team.size" || metric.startsWith("field.");

    if (isTeamLevel) {
      const val = metric === "team.size" ? team.members?.length ?? 0 : team.fields?.[metric.replace("field.", "")];
      if (val == null) return filter.onMissing === "pass" ? "pass" : filter.onMissing === "flag" ? "review" : "fail";
      if (op === ">=") return val >= filter.value ? "pass" : "fail";
      if (op === ">") return val > filter.value ? "pass" : "fail";
      if (op === "<=") return val <= filter.value ? "pass" : "fail";
      if (op === "<") return val < filter.value ? "pass" : "fail";
      if (op === "==") return val === filter.value ? "pass" : "fail";
      if (op === "exists") return val != null && val !== "" ? "pass" : "fail";
      return "pass";
    }

    // Member metric evaluation
    const members = team.members || [];
    if (members.length === 0) return "fail";

    const scope = filter.scope?.type || filter.scope || "any_member";
    let anyPassed = false;
    let allPassed = true;
    let anyMissing = false;

    for (const m of members) {
      const mEntry = m.metrics?.[metric];
      let val = null;
      let isMissing = false;

      if (!mEntry || mEntry.status !== "ok" || mEntry.value == null) {
        isMissing = true;
      } else {
        val = mEntry.value;
      }

      if (isMissing) {
        anyMissing = true;
        allPassed = false;
      } else {
        let pass = false;
        if (op === ">=") pass = typeof val === "number" && val >= filter.value;
        else if (op === ">") pass = typeof val === "number" && val > filter.value;
        else if (op === "<=") pass = typeof val === "number" && val <= filter.value;
        else if (op === "<") pass = typeof val === "number" && val < filter.value;
        else if (op === "==") pass = val === filter.value;
        else if (op === "!=") pass = val !== filter.value;
        else if (op === "exists") pass = val != null && val !== "";

        if (pass) anyPassed = true;
        else allPassed = false;
      }
    }

    if (scope === "any_member") {
      if (anyPassed) return "pass";
      if (anyMissing) return filter.onMissing === "pass" ? "pass" : filter.onMissing === "flag" ? "review" : "fail";
      return "fail";
    }

    if (scope === "all_members") {
      if (allPassed) return "pass";
      if (anyMissing) return filter.onMissing === "pass" ? "pass" : filter.onMissing === "flag" ? "review" : "fail";
      return "fail";
    }

    return "pass";
  };

  const handleAddDefault = () => {
    const id = `filter_${Date.now()}`;
    addFilter({
      id,
      label: "At least 1 member with ≥ 50 GitHub contributions",
      enabled: true,
      metric: "github.contributions_1y",
      op: ">=",
      value: 50,
      scope: { type: "any_member" },
      mode: "reject",
      onMissing: "flag",
    });
  };

  const handleApplyPreset = (preset) => {
    const id = `filter_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    addFilter({
      id,
      enabled: true,
      ...structuredClone(preset.filter),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-2xl p-6 border border-[#415A77]/30 space-y-6"
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#415A77]/20 to-purple-500/20 border border-[#415A77]/45 text-[#778DA9]">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-white">Eligibility Rules & Hard Filters</h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#415A77]/20 text-[#778DA9] border border-[#415A77]/45">
                {(config.filters || []).filter((f) => f.enabled !== false).length} Active Rule{config.filters?.length !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-xs text-[#778DA9]/80 mt-0.5">
              Evaluated before scoring. Teams failing hard rules are categorized for audit review or disqualified.
            </p>
          </div>
        </div>

        <button
          onClick={handleAddDefault}
          aria-label="Add Filter"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#415A77]/20 hover:bg-[#415A77]/25 border border-[#415A77]/45 text-[#778DA9] text-xs font-bold transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Filter
        </button>
      </div>

      {/* Quick Presets Strip */}
      <div className="space-y-2 pt-1 border-t border-[#415A77]/20">
        <div className="flex items-center gap-2 text-xs text-[#778DA9]/80">
          <Zap className="h-3.5 w-3.5 text-[#778DA9]" />
          <span className="font-semibold text-[#778DA9]">1-Click Common Presets:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_PRESETS.map((preset) => (
            <button
              key={preset.title}
              onClick={() => handleApplyPreset(preset)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1B263B]/80 hover:bg-white/10 border border-[#415A77]/30 hover:border-[#415A77]/55 text-xs text-[#778DA9] hover:text-white transition cursor-pointer shadow-sm"
            >
              <span>{preset.icon}</span>
              <span className="font-medium">{preset.title}</span>
              <Plus className="h-3 w-3 text-[#778DA9] opacity-60 ml-0.5" />
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {(!config.filters || config.filters.length === 0) && (
        <div className="text-center py-10 px-4 rounded-xl border border-dashed border-[#415A77]/30 bg-[#1B263B]/30 space-y-2">
          <ShieldAlert className="h-8 w-8 text-[#415A77] mx-auto" />
          <p className="text-sm font-semibold text-[#778DA9]">No Eligibility Rules Configured</p>
          <p className="text-xs text-[#415A77] max-w-sm mx-auto">
            All registered teams in the pool will proceed directly to competitive scoring without hard barriers.
          </p>
        </div>
      )}

      {/* Filter Cards List */}
      <div className="space-y-4">
        {(config.filters || []).map((filter, idx) => {
          const isTeamLevel = filter.metric === "team.size" || filter.metric?.startsWith("field.");
          const isBooleanMetric = filter.metric === "portfolio.is_reachable" || filter.metric === "portfolio.has_live_demo";

          // Simulate live impact on current cohort
          let passCount = 0;
          let failCount = 0;
          let reviewCount = 0;

          if (activeCohort.length > 0 && filter.enabled !== false) {
            for (const t of activeCohort) {
              const res = simulateFilter(t, filter);
              if (res === "pass") passCount++;
              else if (res === "review") reviewCount++;
              else failCount++;
            }
          }

          return (
            <div
              key={filter.id}
              className={`rounded-2xl border transition-all p-5 space-y-4 ${
                filter.enabled !== false
                  ? "bg-[#1B263B]/70 border-[#415A77]/30 hover:border-[#778DA9]/40 shadow-sm"
                  : "bg-[#0D1B2A]/40 border-white/5 opacity-60"
              }`}
            >
              {/* Row 1: Checkbox, Title Input, Mode & Delete */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={filter.enabled !== false}
                    onChange={(e) => updateFilter(filter.id, { enabled: e.target.checked })}
                    className="h-4 w-4 rounded accent-indigo-500 cursor-pointer shrink-0"
                    title={filter.enabled ? "Disable this rule" : "Enable this rule"}
                  />
                  <input
                    type="text"
                    value={filter.label}
                    onChange={(e) => updateFilter(filter.id, { label: e.target.value })}
                    placeholder="Describe eligibility rule..."
                    className="font-bold text-sm text-white bg-transparent border-b border-transparent hover:border-[#778DA9]/40 focus:border-indigo-400 outline-none px-1 py-0.5 flex-1 min-w-0 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <select
                    value={filter.mode || "reject"}
                    onChange={(e) => updateFilter(filter.id, { mode: e.target.value })}
                    className="text-xs font-semibold rounded-lg bg-[#0D1B2A] border border-[#415A77]/30 px-2.5 py-1.5 text-[#E0E1DD] outline-none focus:border-indigo-400 cursor-pointer"
                  >
                    <option value="reject">Reject (Hard Disqualification)</option>
                    <option value="warn">Warn (Keep & Mark for Review)</option>
                  </select>

                  <button
                    onClick={() => removeFilter(filter.id)}
                    className="p-1.5 rounded-lg text-[#415A77] hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                    title="Delete rule"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Row 2: Condition Controls (Metric, Scope, Operator, Value) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* Metric Select */}
                <div className="space-y-1.5">
                  <label className="text-[#778DA9]/80 font-medium flex items-center justify-between">
                    <span>Target Signal</span>
                    <span className="font-mono text-[10px] text-[#778DA9]">
                      {isTeamLevel ? "Team-level" : "Per-member"}
                    </span>
                  </label>
                  <select
                    value={filter.metric}
                    onChange={(e) => {
                      const newMetric = e.target.value;
                      const isNowTeam = newMetric === "team.size" || newMetric.startsWith("field.");
                      const isNowBool = newMetric === "portfolio.is_reachable" || newMetric === "portfolio.has_live_demo";
                      updateFilter(filter.id, {
                        metric: newMetric,
                        scope: isNowTeam ? { type: "team" } : { type: "any_member" },
                        op: isNowBool ? "==" : filter.op === "exists" ? "exists" : ">=",
                        value: isNowBool ? true : typeof filter.value === "number" ? filter.value : 1,
                      });
                    }}
                    className="w-full rounded-xl bg-[#0D1B2A] border border-white/15 px-3 py-2 text-[#E0E1DD] outline-none focus:border-indigo-400 font-mono text-xs cursor-pointer"
                  >
                    {METRIC_OPTIONS.map((g) => (
                      <optgroup key={g.group} label={g.group} className="bg-[#0D1B2A] text-[#E0E1DD]">
                        {g.options.map((o) => (
                          <option
                            key={o.value}
                            value={o.value}
                            disabled={o.disabled}
                            className={o.disabled ? "text-[#415A77] bg-[#0D1B2A]" : "bg-[#0D1B2A] text-[#E0E1DD]"}
                          >
                            {o.label} {o.disabled ? `(Disabled)` : ""}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Scope Select (Automatically locked to 'Team' if team-level metric) */}
                <div className="space-y-1.5">
                  <label className="text-[#778DA9]/80 font-medium">Evaluation Scope</label>
                  {isTeamLevel ? (
                    <div className="w-full rounded-xl bg-[#0D1B2A]/80 border border-[#415A77]/30 px-3 py-2 text-[#778DA9] font-semibold font-mono text-xs flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-[#415A77]" />
                      Entire Team Scope
                    </div>
                  ) : (
                    <select
                      value={filter.scope?.type || filter.scope || "any_member"}
                      onChange={(e) => updateFilter(filter.id, { scope: { type: e.target.value } })}
                      className="w-full rounded-xl bg-[#0D1B2A] border border-white/15 px-3 py-2 text-[#E0E1DD] outline-none focus:border-indigo-400 text-xs cursor-pointer"
                    >
                      {MEMBER_SCOPES.map((s) => (
                        <option key={s.value} value={s.value} className="bg-[#0D1B2A] text-[#E0E1DD]">
                          {s.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Comparison Operator */}
                <div className="space-y-1.5">
                  <label className="text-[#778DA9]/80 font-medium">Comparison Operator</label>
                  <select
                    value={filter.op || ">="}
                    onChange={(e) => updateFilter(filter.id, { op: e.target.value })}
                    className="w-full rounded-xl bg-[#0D1B2A] border border-white/15 px-3 py-2 text-[#E0E1DD] outline-none focus:border-indigo-400 font-mono text-xs cursor-pointer"
                  >
                    {OPERATOR_CONFIG.map((op) => (
                      <option key={op.value} value={op.value} className="bg-[#0D1B2A] text-[#E0E1DD]">
                        {op.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Expected Value Input */}
                <div className="space-y-1.5">
                  <label className="text-[#778DA9]/80 font-medium">Required Threshold</label>
                  {filter.op === "exists" ? (
                    <div className="w-full rounded-xl bg-[#0D1B2A]/80 border border-emerald-500/20 px-3 py-2 text-emerald-300 font-semibold text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      Verified Present
                    </div>
                  ) : isBooleanMetric ? (
                    <select
                      value={filter.value === true || filter.value === "true" ? "true" : "false"}
                      onChange={(e) => updateFilter(filter.id, { value: e.target.value === "true" })}
                      className="w-full rounded-xl bg-[#0D1B2A] border border-white/15 px-3 py-2 text-[#E0E1DD] outline-none focus:border-indigo-400 text-xs cursor-pointer"
                    >
                      <option value="true">Must be Verified (True)</option>
                      <option value="false">Must be False</option>
                    </select>
                  ) : (
                    <input
                      type="number"
                      value={filter.value ?? 0}
                      onChange={(e) => updateFilter(filter.id, { value: Number(e.target.value) })}
                      className="w-full rounded-xl bg-[#0D1B2A] border border-white/15 px-3 py-2 text-[#E0E1DD] font-mono font-bold outline-none focus:border-indigo-400 text-xs"
                      placeholder="e.g. 50"
                    />
                  )}
                </div>
              </div>

              {/* Row 3: Missing Data Policy & Live Cohort Simulation */}
              <div className="pt-2 border-t border-[#415A77]/18 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-[#778DA9]/80">
                  <span>If signal missing:</span>
                  <select
                    value={filter.onMissing || "flag"}
                    onChange={(e) => updateFilter(filter.id, { onMissing: e.target.value })}
                    className="rounded-lg bg-[#0D1B2A] border border-[#415A77]/30 px-2 py-1 text-[#778DA9] text-xs outline-none focus:border-indigo-400 cursor-pointer"
                  >
                    {ON_MISSING_POLICIES.map((p) => (
                      <option key={p.value} value={p.value} className="bg-[#0D1B2A] text-[#E0E1DD]">
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Live Cohort Simulation Indicator */}
                {activeCohort.length > 0 && filter.enabled !== false && (
                  <div className="flex items-center gap-2 font-mono text-[11px] self-start sm:self-auto bg-[#0D1B2A]/60 px-3 py-1 rounded-xl border border-white/5">
                    <span className="text-[#415A77]">Live Simulation:</span>
                    <span className="text-emerald-400 font-semibold">{passCount} Pass</span>
                    {reviewCount > 0 && (
                      <span className="text-amber-400 font-semibold">• {reviewCount} Review</span>
                    )}
                    {failCount > 0 && (
                      <span className="text-rose-400 font-semibold">• {failCount} Fail</span>
                    )}
                    <span className="text-[#415A77]">
                      ({activeCohort.length} team{activeCohort.length !== 1 ? "s" : ""})
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
