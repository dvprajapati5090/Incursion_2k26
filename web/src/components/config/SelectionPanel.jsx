/**
 * SelectionPanel — Dynamically configures shortlisting capacity (Top-X) and waitlist reserve
 * strictly calibrated against the uploaded CSV team count.
 *
 * Features:
 * - Real-time auto-clamping so Top X never exceeds total available pool
 * - Waitlist buffer automatically bounded by remaining unallocated teams
 * - Dynamic human-readable text reflecting actual team ranks (#1 to #N)
 * - Quick proportion presets (25%, 50%, 75%, All)
 * - Visual multi-segment capacity allocation meter
 * - Direct number input alongside fluid range sliders
 */
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Award, Users, Percent, ShieldCheck } from "lucide-react";
import useConfigStore from "@/stores/configStore";
import useImportStore from "@/stores/importStore";

export default function SelectionPanel() {
  const { config, setTopX, setWaitlistSize } = useConfigStore();
  const { rawTeams, enrichedTeams } = useImportStore();
  const { topX = 50, waitlistSize = 10 } = config.selection ?? {};

  // Actual pool count from imported or enriched dataset
  const poolCount = enrichedTeams.length || rawTeams.length || 0;
  const isLoaded = poolCount > 0;
  const totalTeams = isLoaded ? poolCount : 100;

  // Dynamically clamp topX to pool count
  const effectiveTopX = isLoaded ? Math.max(1, Math.min(topX, totalTeams)) : topX;
  const maxWaitlist = isLoaded ? Math.max(0, totalTeams - effectiveTopX) : 50;
  const effectiveWaitlist = isLoaded
    ? Math.max(0, Math.min(waitlistSize, maxWaitlist))
    : waitlistSize;
  const rejectedCount = isLoaded
    ? Math.max(0, totalTeams - effectiveTopX - effectiveWaitlist)
    : 0;

  // Auto-calibrate store values whenever the dataset or pool size updates
  useEffect(() => {
    if (isLoaded) {
      if (topX > totalTeams) {
        // If default or previous topX was larger than the new CSV pool, calibrate to pool size or 50%
        const calibratedTopX = Math.max(1, Math.min(topX, totalTeams));
        setTopX(calibratedTopX);
      }
      if (waitlistSize > maxWaitlist) {
        setWaitlistSize(maxWaitlist);
      }
    }
  }, [isLoaded, totalTeams, topX, waitlistSize, maxWaitlist, setTopX, setWaitlistSize]);

  const handleTopXChange = (val) => {
    const clamped = Math.max(1, Math.min(val, totalTeams));
    setTopX(clamped);
    if (isLoaded && clamped + waitlistSize > totalTeams) {
      setWaitlistSize(Math.max(0, totalTeams - clamped));
    }
  };

  const handleWaitlistChange = (val) => {
    const clamped = Math.max(0, Math.min(val, maxWaitlist));
    setWaitlistSize(clamped);
  };

  const handlePreset = (fraction) => {
    if (!isLoaded) return;
    const targetTopX = Math.max(1, Math.round(totalTeams * fraction));
    setTopX(targetTopX);
    const remaining = totalTeams - targetTopX;
    setWaitlistSize(Math.max(0, Math.min(10, remaining)));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-2xl p-6 border border-white/10 space-y-6"
    >
      {/* Header with Live Pool Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">Selection Quota & Capacity</h3>
            <p className="text-xs text-slate-400">
              Calibrated dynamically to the active pool of {totalTeams} registered team{totalTeams !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Proportion Presets */}
          {isLoaded && totalTeams > 1 && (
            <div className="hidden lg:flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-white/10 text-[11px] font-mono">
              <span className="text-slate-500 px-1.5 flex items-center gap-1">
                <Percent className="h-3 w-3" /> Presets:
              </span>
              <button
                type="button"
                onClick={() => handlePreset(0.25)}
                className="px-2 py-0.5 rounded-lg hover:bg-white/10 text-slate-300 transition cursor-pointer"
                title="Top 25% of pool"
              >
                25%
              </button>
              <button
                type="button"
                onClick={() => handlePreset(0.5)}
                className="px-2 py-0.5 rounded-lg hover:bg-white/10 text-slate-300 transition cursor-pointer"
                title="Top 50% of pool"
              >
                50%
              </button>
              <button
                type="button"
                onClick={() => handlePreset(0.75)}
                className="px-2 py-0.5 rounded-lg hover:bg-white/10 text-slate-300 transition cursor-pointer"
                title="Top 75% of pool"
              >
                75%
              </button>
              <button
                type="button"
                onClick={() => handlePreset(1.0)}
                className="px-2 py-0.5 rounded-lg hover:bg-white/10 text-cyan-300 font-bold transition cursor-pointer"
                title="Select all teams in pool"
              >
                All
              </button>
            </div>
          )}

          <span className="text-xs font-mono px-3 py-1 rounded-full bg-slate-800/90 border border-white/10 text-slate-300 flex items-center gap-1.5 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            Pool: <strong className="text-cyan-300 font-bold">{totalTeams}</strong> team{totalTeams !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Main Quota Slider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Top X Card */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              Primary Shortlist (Top X)
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                max={totalTeams}
                value={effectiveTopX}
                onChange={(e) => handleTopXChange(Number(e.target.value))}
                className="w-16 text-center text-sm font-extrabold font-mono text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-500/30 focus:outline-none focus:border-emerald-400"
              />
              <span className="text-[11px] font-mono text-slate-500">/ {totalTeams}</span>
            </div>
          </div>

          <input
            type="range"
            min={1}
            max={totalTeams}
            value={effectiveTopX}
            onChange={(e) => handleTopXChange(Number(e.target.value))}
            className="w-full accent-emerald-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
          />

          <div className="text-[11px] leading-relaxed">
            {isLoaded ? (
              effectiveTopX >= totalTeams ? (
                <p className="text-emerald-300 font-medium">
                  All <strong>{totalTeams}</strong> teams in the pool receive automatic qualification (100% of registrations).
                </p>
              ) : (
                <p className="text-slate-400">
                  Teams ranked <strong>#1</strong> to <strong>#{effectiveTopX}</strong> receive automatic qualification{" "}
                  <span className="text-emerald-300 font-mono font-semibold">
                    ({Math.round((effectiveTopX / totalTeams) * 100)}% of pool)
                  </span>.
                </p>
              )
            ) : (
              <p className="text-slate-400">
                Teams ranked <strong>#1</strong> to <strong>#{effectiveTopX}</strong> receive automatic qualification.
              </p>
            )}
          </div>
        </div>

        {/* Waitlist Buffer Card */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-amber-500/20 hover:border-amber-500/40 transition-colors space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              Waitlist Buffer Reserve
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                max={maxWaitlist}
                disabled={isLoaded && maxWaitlist === 0}
                value={effectiveWaitlist}
                onChange={(e) => handleWaitlistChange(Number(e.target.value))}
                className="w-16 text-center text-sm font-extrabold font-mono text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-500/30 focus:outline-none focus:border-amber-400 disabled:opacity-40"
              />
              <span className="text-[11px] font-mono text-slate-500">/ {maxWaitlist} max</span>
            </div>
          </div>

          <input
            type="range"
            min={0}
            max={Math.max(1, maxWaitlist)}
            disabled={isLoaded && maxWaitlist === 0}
            value={effectiveWaitlist}
            onChange={(e) => handleWaitlistChange(Number(e.target.value))}
            className="w-full accent-amber-400 h-2 bg-slate-800 rounded-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          />

          <div className="text-[11px] leading-relaxed">
            {isLoaded ? (
              maxWaitlist === 0 ? (
                <p className="text-amber-300/80 font-medium">
                  Entire pool of <strong>{totalTeams}</strong> teams is allocated to the Primary Shortlist. No teams remain for waitlist standby.
                </p>
              ) : effectiveWaitlist === 0 ? (
                <p className="text-slate-400">
                  No standby buffer allocated. Remaining <strong>{maxWaitlist}</strong> team{maxWaitlist !== 1 ? "s" : ""} will be disqualified.
                </p>
              ) : (
                <p className="text-slate-400">
                  Teams ranked <strong>#{effectiveTopX + 1}</strong> to <strong>#{effectiveTopX + effectiveWaitlist}</strong> are retained on standby{" "}
                  <span className="text-amber-300 font-mono font-semibold">
                    ({effectiveWaitlist} team{effectiveWaitlist !== 1 ? "s" : ""}, {Math.round((effectiveWaitlist / totalTeams) * 100)}% of pool)
                  </span>.
                </p>
              )
            ) : (
              <p className="text-slate-400">
                Teams ranked <strong>#{effectiveTopX + 1}</strong> to <strong>#{effectiveTopX + effectiveWaitlist}</strong> are retained on standby.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Visual Capacity Allocation Bar */}
      {isLoaded && (
        <div className="space-y-2 pt-2 border-t border-white/[0.08]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-cyan-400" />
              Cohort Capacity Allocation Breakdown
            </span>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="text-emerald-300 font-bold">
                {effectiveTopX} Shortlisted ({Math.round((effectiveTopX / totalTeams) * 100)}%)
              </span>
              <span className="text-amber-300 font-bold">
                {effectiveWaitlist} Standby ({Math.round((effectiveWaitlist / totalTeams) * 100)}%)
              </span>
              {rejectedCount > 0 && (
                <span className="text-rose-400 font-bold">
                  {rejectedCount} Below Cutoff ({Math.round((rejectedCount / totalTeams) * 100)}%)
                </span>
              )}
            </div>
          </div>

          <div className="h-2.5 w-full rounded-full bg-slate-800/80 overflow-hidden flex border border-white/5">
            <div
              style={{ width: `${(effectiveTopX / totalTeams) * 100}%` }}
              className="bg-emerald-500 h-full transition-all duration-300 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
              title={`Primary Shortlist: ${effectiveTopX} teams`}
            />
            {effectiveWaitlist > 0 && (
              <div
                style={{ width: `${(effectiveWaitlist / totalTeams) * 100}%` }}
                className="bg-amber-500 h-full transition-all duration-300 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                title={`Waitlist Reserve: ${effectiveWaitlist} teams`}
              />
            )}
            {rejectedCount > 0 && (
              <div
                style={{ width: `${(rejectedCount / totalTeams) * 100}%` }}
                className="bg-slate-700 h-full transition-all duration-300"
                title={`Below Cutoff: ${rejectedCount} teams`}
              />
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
