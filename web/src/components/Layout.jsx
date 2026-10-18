import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Upload,
  Settings2,
  BarChart3,
  Download,
  ChevronRight,
  Cpu,
  Layers,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import useImportStore from "@/stores/importStore";
import useResultsStore from "@/stores/resultsStore";

const steps = [
  { path: "/upload",  label: "Upload",      stepNumber: "01", icon: Upload,    hint: "Load & normalize CSV/JSON" },
  { path: "/config",  label: "Configure",   stepNumber: "02", icon: Settings2, hint: "Tune weights & filters" },
  { path: "/results", label: "Leaderboard", stepNumber: "03", icon: BarChart3, hint: "Review ranked shortlist" },
  { path: "/export",  label: "Export",      stepNumber: "04", icon: Download,  hint: "Download data & audit log" },
];

export default function Layout({ children }) {
  const location = useLocation();
  const currentIdx = steps.findIndex((s) => location.pathname.startsWith(s.path));
  const { rawTeams, enrichedTeams } = useImportStore();
  const { rankedResults } = useResultsStore();

  const totalLoaded = enrichedTeams.length || rawTeams.length;

  return (
    <div className="min-h-screen flex flex-col bg-[#0D1B2A] text-[#E0E1DD]">
      {/* ── Top Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 px-4 lg:px-8 py-3 bg-[#0D1B2A]/90 border-b border-[#415A77]/35 backdrop-blur-2xl shadow-xl shadow-[#0D1B2A]/50 transition-all">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">

          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: 180, scale: 1.05 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="h-10 w-10 rounded-xl p-[1px] bg-gradient-to-tr from-[#415A77] via-[#778DA9] to-[#E0E1DD] shadow-lg shadow-[#415A77]/40 flex items-center justify-center cursor-pointer"
            >
              <div className="h-full w-full bg-[#1B263B] rounded-[11px] flex items-center justify-center">
                <Cpu className="h-5 w-5 text-[#E0E1DD]" />
              </div>
            </motion.div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-wider text-white">
                  INCURSION{" "}
                  <span className="font-extrabold text-[#778DA9]">2k26</span>
                </h1>
                <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-[#415A77]/25 text-[#E0E1DD] border border-[#778DA9]/40">
                  Track 3
                </span>
              </div>
              <p className="text-xs text-[#778DA9] font-medium tracking-tight">
                Automated Team Recruiter &amp; Explainable Shortlisting
              </p>
            </div>
          </div>

          {/* Stepper Navigation */}
          <nav className="flex items-center bg-[#1B263B]/80 p-1 rounded-xl border border-[#415A77]/40 shadow-inner">
            {steps.map((step, i) => {
              const Icon = step.icon;
              const isActive = location.pathname.startsWith(step.path);
              const isPast = i < currentIdx;

              return (
                <div key={step.path} className="flex items-center">
                  <NavLink
                    to={step.path}
                    className={cn(
                      "relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer",
                      isActive
                        ? "text-white"
                        : isPast
                        ? "text-[#E0E1DD]/80 hover:text-white hover:bg-white/[0.04]"
                        : "text-[#778DA9]/60 hover:text-[#778DA9]"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeStepperTab"
                        className="absolute inset-0 bg-gradient-to-r from-[#415A77] to-[#2b3c52] rounded-lg -z-10 shadow-lg shadow-[#415A77]/40 border border-[#778DA9]/30"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Icon
                      className={cn(
                        "h-3.5 w-3.5",
                        isActive ? "text-[#E0E1DD]" : isPast ? "text-[#778DA9]" : "text-[#415A77]"
                      )}
                    />
                    <span>{step.label}</span>
                    {step.stepNumber && (
                      <span
                        className={cn(
                          "text-[10px] font-mono px-1 rounded opacity-75",
                          isActive ? "bg-black/25 text-[#E0E1DD]" : "text-[#778DA9]"
                        )}
                      >
                        {step.stepNumber}
                      </span>
                    )}
                  </NavLink>

                  {i < steps.length - 1 && (
                    <ChevronRight className="h-3 w-3 text-[#415A77] mx-0.5 opacity-60" />
                  )}
                </div>
              );
            })}
          </nav>

          {/* Live Status Badge */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1B263B]/90 border border-[#415A77]/35 text-xs font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[#E0E1DD] font-medium">
                {totalLoaded > 0 ? `${totalLoaded} Teams Loaded` : "Engine Ready"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main View Container ─────────────────────────────────── */}
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

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-[#415A77]/25 bg-[#0D1B2A]/80 py-4 px-6 text-center text-xs text-[#778DA9] flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto w-full gap-2">
        <div className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-[#778DA9]" />
          <span>Incursion 2k26 • Tunable Hackathon Shortlist Engine</span>
        </div>
        <div className="flex items-center gap-4 text-[#778DA9]/80 font-mono text-[11px]">
          <span>Pure Web Worker Execution</span>
          <span>•</span>
          <span>Auditable &amp; Blind Compliant</span>
        </div>
      </footer>
    </div>
  );
}
