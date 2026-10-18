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
    <div className="min-h-screen flex flex-col" style={{ color: "#E0E1DD", background: "#0D1B2A" }}>

      {/* ── Top Header ─────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 px-4 lg:px-8 py-3.5 transition-all"
        style={{
          background: "rgba(13, 27, 42, 0.92)",
          borderBottom: "1px solid rgba(65, 90, 119, 0.30)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: "0 1px 24px -6px rgba(13,27,42,0.8)",
        }}
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">

          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: 180, scale: 1.05 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="h-10 w-10 rounded-xl p-[1.5px] cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #415A77 0%, #778DA9 100%)",
                boxShadow: "0 0 20px -4px rgba(65,90,119,0.6)",
              }}
            >
              <div
                className="h-full w-full rounded-[10px] flex items-center justify-center"
                style={{ background: "#0D1B2A" }}
              >
                <Cpu className="h-5 w-5" style={{ color: "#778DA9" }} />
              </div>
            </motion.div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight" style={{ color: "#E0E1DD" }}>
                  INCURSION{" "}
                  <span className="font-extrabold" style={{ color: "#778DA9" }}>2k26</span>
                </h1>
                <span
                  className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(65, 90, 119, 0.20)",
                    border: "1px solid rgba(65, 90, 119, 0.50)",
                    color: "#778DA9",
                  }}
                >
                  Track 3
                </span>
              </div>
              <p className="text-xs font-medium" style={{ color: "#778DA9" }}>
                Automated Team Recruiter &amp; Explainable Shortlisting
              </p>
            </div>
          </div>

          {/* Stepper Navigation */}
          <nav
            className="flex items-center p-1 rounded-xl"
            style={{
              background: "rgba(27, 38, 59, 0.70)",
              border: "1px solid rgba(65, 90, 119, 0.30)",
            }}
          >
            {steps.map((step, i) => {
              const Icon = step.icon;
              const isActive = location.pathname.startsWith(step.path);
              const isPast = i < currentIdx;

              return (
                <div key={step.path} className="flex items-center">
                  <NavLink
                    to={step.path}
                    className="relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
                    style={{
                      color: isActive
                        ? "#E0E1DD"
                        : isPast
                        ? "#778DA9"
                        : "rgba(119, 141, 169, 0.45)",
                    }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeStepperTab"
                        className="absolute inset-0 rounded-lg -z-10"
                        style={{
                          background: "linear-gradient(135deg, #415A77 0%, #2d445e 100%)",
                          boxShadow: "0 4px 14px -4px rgba(65,90,119,0.60)",
                          border: "1px solid rgba(119, 141, 169, 0.25)",
                        }}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Icon
                      className="h-3.5 w-3.5"
                      style={{
                        color: isActive
                          ? "#E0E1DD"
                          : isPast
                          ? "#778DA9"
                          : "rgba(119, 141, 169, 0.40)",
                      }}
                    />
                    <span>{step.label}</span>
                    {step.stepNumber && (
                      <span
                        className="text-[10px] font-mono px-1 rounded"
                        style={{
                          opacity: 0.7,
                          background: isActive ? "rgba(13,27,42,0.30)" : "transparent",
                          color: isActive ? "#E0E1DD" : "inherit",
                        }}
                      >
                        {step.stepNumber}
                      </span>
                    )}
                  </NavLink>

                  {i < steps.length - 1 && (
                    <ChevronRight className="h-3 w-3 mx-0.5 opacity-30" style={{ color: "#778DA9" }} />
                  )}
                </div>
              );
            })}
          </nav>

          {/* Live Status Badge */}
          <div className="hidden lg:flex items-center gap-3">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                background: "rgba(27, 38, 59, 0.80)",
                border: "1px solid rgba(65, 90, 119, 0.28)",
              }}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ background: "#778DA9" }}
                />
                <span
                  className="relative inline-flex rounded-full h-2 w-2"
                  style={{ background: totalLoaded > 0 ? "#778DA9" : "#415A77" }}
                />
              </span>
              <span style={{ color: "#778DA9" }}>
                {totalLoaded > 0 ? `${totalLoaded} Teams Active` : "Engine Ready"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────────── */}
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
      <footer
        className="py-4 px-6 text-center text-xs flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto w-full gap-2"
        style={{
          borderTop: "1px solid rgba(65, 90, 119, 0.20)",
          background: "rgba(13, 27, 42, 0.50)",
          color: "#415A77",
        }}
      >
        <div className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5" style={{ color: "#415A77" }} />
          <span>Incursion 2k26 • Tunable Hackathon Shortlist Engine</span>
        </div>
        <div
          className="flex items-center gap-4 font-mono text-[11px]"
          style={{ color: "#415A77" }}
        >
          <span>Pure Web Worker Execution</span>
          <span>•</span>
          <span>Auditable &amp; Blind Compliant</span>
        </div>
      </footer>
    </div>
  );
}
