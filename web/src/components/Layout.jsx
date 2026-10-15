import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Upload,
  Settings2,
  BarChart3,
  Download,
  ChevronRight,
  Sparkles,
  Cpu,
  Layers,
} from "lucide-react";
import useImportStore from "@/stores/importStore";
import useResultsStore from "@/stores/resultsStore";

const steps = [
  { path: "/upload",  label: "Upload",    stepNumber: "01", icon: Upload,    hint: "Load & normalize CSV/JSON" },
  { path: "/config",  label: "Configure", stepNumber: "02", icon: Settings2, hint: "Tune weights & filters" },
  { path: "/results", label: "Leaderboard", stepNumber: "03", icon: BarChart3, hint: "Review ranked shortlist" },
  { path: "/export",  label: "Export",    stepNumber: "04", icon: Download,  hint: "Download data & audit log" },
];

export default function Layout({ children }) {
  const location = useLocation();
  const currentIdx = steps.findIndex((s) => location.pathname.startsWith(s.path));
  const { phase, rawTeams, enrichedTeams } = useImportStore();
  const { rankedResults } = useResultsStore();

  const totalLoaded = enrichedTeams.length || rawTeams.length;

  return (
    <div className="min-h-screen flex flex-col text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Glass Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#070b14]/80 backdrop-blur-xl px-4 lg:px-8 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: 180, scale: 1.05 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/25 flex items-center justify-center cursor-pointer"
            >
              <div className="h-full w-full bg-[#090d19] rounded-[11px] flex items-center justify-center">
                <Cpu className="h-5 w-5 text-cyan-300" />
              </div>
            </motion.div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  INCURSION <span className="text-cyan-400 font-extrabold">2k26</span>
                </h1>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  Track 3
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                <span>Automated Team Recruiter & Explainable Shortlisting</span>
              </p>
            </div>
          </div>

          {/* Stepper Navigation */}
          <nav className="flex items-center bg-slate-900/60 p-1 rounded-xl border border-white/[0.08] shadow-inner">
            {steps.map((step, i) => {
              const Icon = step.icon;
              const isActive = location.pathname.startsWith(step.path);
              const isPast = i < currentIdx;

              return (
                <div key={step.path} className="flex items-center">
                  <NavLink
                    to={step.path}
                    className={cn(
                      "relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                      isActive
                        ? "text-white shadow-md shadow-indigo-950"
                        : isPast
                        ? "text-slate-300 hover:text-white hover:bg-white/[0.04]"
                        : "text-slate-500 hover:text-slate-400"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeStepperTab"
                        className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-lg -z-10 shadow-lg shadow-indigo-600/30"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Icon className={cn("h-3.5 w-3.5", isActive ? "text-cyan-200" : isPast ? "text-indigo-400" : "text-slate-500")} />
                    <span>{step.label}</span>
                    {step.stepNumber && (
                      <span className={cn("text-[10px] font-mono px-1 rounded opacity-75", isActive ? "bg-black/20" : "")}>
                        {step.stepNumber}
                      </span>
                    )}
                  </NavLink>

                  {i < steps.length - 1 && (
                    <ChevronRight className="h-3 w-3 text-slate-600 mx-0.5 opacity-60" />
                  )}
                </div>
              );
            })}
          </nav>

          {/* Real-time Status Badge */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-white/[0.06] text-xs font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-300">
                {totalLoaded > 0 ? `${totalLoaded} Teams Active` : "Engine Ready"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main View Container */}
      <motion.main
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8"
      >
        {children}
      </motion.main>

      {/* Futuristic subtle footer */}
      <footer className="border-t border-white/[0.05] bg-[#060911]/50 py-4 px-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto w-full gap-2">
        <div className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-indigo-400" />
          <span>Incursion 2k26 • Tunable Hackathon Shortlist Engine</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
          <span>Pure Web Worker Execution</span>
          <span>•</span>
          <span>Auditable & Blind Compliant</span>
        </div>
      </footer>
    </div>
  );
}
