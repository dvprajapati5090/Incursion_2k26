/**
 * SelectionPanel — Configures shortlisting capacity (Top-X) and waitlist reserve.
 * Features visual quota sliders and interactive distribution preview.
 */
import { motion } from "framer-motion";
import { Users, Award, ShieldAlert, Sliders } from "lucide-react";
import useConfigStore from "@/stores/configStore";
import useImportStore from "@/stores/importStore";

export default function SelectionPanel() {
  const { config, setTopX, setWaitlistSize } = useConfigStore();
  const { rawTeams, enrichedTeams } = useImportStore();
  const { topX = 50, waitlistSize = 10 } = config.selection ?? {};

  const totalTeams = enrichedTeams.length || rawTeams.length || 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-2xl p-6 border border-white/10 space-y-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">Selection Quota & Capacity</h3>
            <p className="text-xs text-slate-400">Specify the shortlist threshold (Top X) and waitlist buffer</p>
          </div>
        </div>

        <span className="text-xs font-mono px-3 py-1 rounded-full bg-slate-800/80 border border-white/10 text-slate-300">
          Pool: <strong className="text-cyan-300 font-bold">{totalTeams}</strong> teams
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Top X Card */}
        <div className="p-4 rounded-xl bg-slate-900/50 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              Primary Shortlist (Top X)
            </span>
            <span className="text-lg font-extrabold font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
              {topX}
            </span>
          </div>

          <input
            type="range"
            min={1}
            max={Math.max(20, totalTeams)}
            value={topX}
            onChange={(e) => setTopX(Number(e.target.value))}
            className="w-full accent-emerald-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
          />

          <p className="text-[11px] text-slate-400">
            Teams ranked <strong>#1</strong> to <strong>#{topX}</strong> receive automatic qualification.
          </p>
        </div>

        {/* Waitlist Buffer Card */}
        <div className="p-4 rounded-xl bg-slate-900/50 border border-amber-500/20 hover:border-amber-500/40 transition-colors space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              Waitlist Buffer Reserve
            </span>
            <span className="text-lg font-extrabold font-mono text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
              {waitlistSize}
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={Math.max(10, Math.floor(totalTeams / 2))}
            value={waitlistSize}
            onChange={(e) => setWaitlistSize(Number(e.target.value))}
            className="w-full accent-amber-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
          />

          <p className="text-[11px] text-slate-400">
            Teams ranked <strong>#{topX + 1}</strong> to <strong>#{topX + waitlistSize}</strong> are retained on standby.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
