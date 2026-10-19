/**
 * DemoDataBanner — Surfaces a prominent advisory banner when GitHub metrics
 * are generated locally or by the server's mock enricher.
 *
 * Show this warning whenever the active GitHub enricher is synthetic, regardless
 * of whether the estimates came from the browser or the server.
 */
import { ShieldAlert } from "lucide-react";
import useImportStore from "@/stores/importStore";

export default function DemoDataBanner({ className = "" }) {
  const { isMockGithub, enrichers, enrichSummary } = useImportStore();

  const isMock = isMockGithub || (Array.isArray(enrichers) && enrichers.includes("mock_github"));
  const isClientFallback = enrichSummary?.mode === "client_fallback";

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
            {isClientFallback
              ? "The app could not use the enrichment server and generated GitHub estimates locally. Check the production API URL and backend availability to enable live enrichment."
              : <>The enrichment server is using mock GitHub data, which usually means <code className="font-mono bg-black/40 px-1 py-0.5 rounded text-amber-300">GITHUB_TOKEN</code> was not available when it started. GitHub metrics shown are synthetic demo values (<code className="font-mono bg-black/40 px-1 py-0.5 rounded text-amber-300">origin: "mock"</code>). Configure the token on the backend service and restart it for live profile intelligence.</>}
          </p>
        </div>
      </div>
    </div>
  );
}
