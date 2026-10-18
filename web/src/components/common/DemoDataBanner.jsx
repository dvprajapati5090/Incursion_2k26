/**
 * DemoDataBanner — Surfaces a prominent advisory banner when the enrichment
 * server operates in mock demo mode (no GITHUB_TOKEN configured).
 *
 * Implements Must-do UI Rule #8 & Section 3/5:
 * "enrichers containing 'mock_github' instead of 'github' means the server has no
 * GitHub token and GitHub numbers are fake demo data (origin: 'mock', and only 5
 * GitHub metrics exist). Show a visible 'demo data' banner in that case."
 */
import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import useImportStore from "@/stores/importStore";

export default function DemoDataBanner({ className = "" }) {
  const { isMockGithub, enrichers } = useImportStore();

  const isMock = isMockGithub || (Array.isArray(enrichers) && enrichers.includes("mock_github"));

  if (!isMock) return null;

  return (
    <div
      className={`rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent p-4 text-amber-200 shadow-[0_0_20px_-5px_rgba(245,158,11,0.3)] backdrop-blur-md ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 shrink-0 mt-0.5">
          <ShieldAlert className="h-4 w-4" />
        </div>
        <div className="space-y-1 flex-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-extrabold tracking-wide uppercase text-[11px] bg-amber-500/25 px-2 py-0.5 rounded text-amber-300 border border-amber-500/40">
              Demo Data Active
            </span>
            <span className="font-semibold text-white">
              Simulated GitHub Activity Signals
            </span>
          </div>
          <p className="text-amber-200/90 leading-relaxed">
            The enrichment server is operating without a GitHub Personal Access Token. GitHub metrics shown
            are synthetic demo values (<code className="font-mono bg-black/40 px-1 py-0.5 rounded text-amber-300">origin: "mock"</code>)
            and only 5 baseline GitHub metrics are populated. Connect a GitHub token on the server for authentic live profile intelligence.
          </p>
        </div>
      </div>
    </div>
  );
}
