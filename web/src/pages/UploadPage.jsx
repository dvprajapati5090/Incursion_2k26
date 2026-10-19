/**
 * UploadPage — Step 1
 *
 * High-tech intake portal for tabular CSV / JSON hackathon registrations.
 * Features drag-and-drop, automated header mapping, health diagnostics,
 * multi-phase enrichment polling with live telemetry, and data quality audits.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileJson,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadFile, getImport, enrichImport, getJob, getEnriched, getHealth } from "@/lib/api";
import { parseClientCsv, parseClientJson, enrichTeamsClient } from "@/lib/clientImport";
import useImportStore from "@/stores/importStore";
import usePresetsStore from "@/stores/presetsStore";
import ImportReport from "@/components/upload/ImportReport";
import ColumnMapper from "@/components/upload/ColumnMapper";
import DataQualityDashboard from "@/components/upload/DataQualityDashboard";
import DemoDataBanner from "@/components/common/DemoDataBanner";

const PHASE_LABELS = {
  enrich: "Phase 1/4: Multi-Source Signal Ingestion (GitHub, Resumes, Portfolios)",
  llm: "Phase 2/4: AI Resume Parsing & LLM Refinement (~4s cadence)",
  flags: "Phase 3/4: Profile Integrity & Duplicate Signal Audit",
  saving: "Phase 4/4: Persisting Cohort Database Records",
};

export default function UploadPage() {
  const navigate = useNavigate();
  const {
    phase,
    report,
    filename,
    importId,
    rawTeams,
    error,
    enrichSummary,
    asOf,
    enrichedAt,
    enrichers,
    isMockGithub,
    setUploading,
    setImported,
    setEnriching,
    setEnriched,
    setError,
    reset,
  } = useImportStore();
  const { logAction } = usePresetsStore();

  const [dragging, setDragging] = useState(false);
  const [columnMap, setColumnMap] = useState({});
  const [showMapper, setShowMapper] = useState(false);
  const [missingTeamIdHeaders, setMissingTeamIdHeaders] = useState([]);
  const [lastFile, setLastFile] = useState(null);
  const [serverOnline, setServerOnline] = useState(null);
  const [infoNotice, setInfoNotice] = useState(null);
  const [activeJob, setActiveJob] = useState(null);

  const pollTimerRef = useRef(null);

  // Clear polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Check backend server health
  const checkHealth = useCallback(async () => {
    try {
      const res = await getHealth();
      setServerOnline(res?.status === "ok");
    } catch {
      setServerOnline(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  // Upload handler with 422 MISSING_TEAM_ID_COLUMN recovery & client fallback
  const handleFile = useCallback(async (file, explicitColumnMap = columnMap) => {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["csv", "json"].includes(ext)) {
      setError("Only .csv and .json files are supported");
      return;
    }

    setLastFile(file);
    setUploading();
    setInfoNotice(null);
    setMissingTeamIdHeaders([]);

    try {
      const result = await uploadFile(file, explicitColumnMap);
      let teams = [];
      try {
        const full = await getImport(result.importId);
        teams = full.teams || [];
      } catch {}

      setImported({
        importId: result.importId,
        filename: file.name,
        report: result.report,
        teams,
      });
      logAction("FILE_UPLOADED", { filename: file.name, importId: result.importId, mode: "server" });
      setServerOnline(true);
      setShowMapper(false);
    } catch (serverErr) {
      // Catch 422 MISSING_TEAM_ID_COLUMN
      if (
        (serverErr.code === "MISSING_TEAM_ID_COLUMN" || serverErr.status === 422) &&
        Array.isArray(serverErr.details?.headers)
      ) {
        setMissingTeamIdHeaders(serverErr.details.headers);
        setShowMapper(true);
        setError("Missing team_id column: please select which header identifies the team.");
        return;
      }

      console.warn("Backend upload failed or offline, utilizing browser-side client engine:", serverErr);
      try {
        const text = await file.text();
        const clientResult = ext === "csv"
          ? parseClientCsv(text, explicitColumnMap)
          : parseClientJson(text);

        setImported({
          importId: clientResult.importId,
          filename: file.name,
          report: clientResult.report,
          teams: clientResult.teams,
        });
        setServerOnline(false);
        setInfoNotice("Running in Client-Side Mode — parsed and normalized directly in the browser.");
        logAction("FILE_UPLOADED", { filename: file.name, importId: clientResult.importId, mode: "client" });
      } catch (parseErr) {
        setError(parseErr.message || serverErr.message);
      }
    }
  }, [columnMap, setUploading, setImported, setError, logAction]);

  // Drag & drop handlers
  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer?.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // Re-upload with mapping chosen from ColumnMapper

  const handleApplyMapping = async () => {
    if (lastFile) {
      await handleFile(lastFile, columnMap);
    }
  };

  // Enrichment pipeline with active job polling
  const handleEnrich = async () => {
    if (!importId) return;
    setEnriching();
    setActiveJob(null);

    // Client-side fallback if offline
    if (importId.startsWith("client_") || serverOnline === false) {
      const enriched = enrichTeamsClient(rawTeams);
      setEnriched({
        teams: enriched.teams,
        summary: enriched.summary,
        asOf: enriched.asOf,
        enrichedAt: enriched.enrichedAt,
        enrichers: enriched.enrichers,
      });
      logAction("ENRICHMENT_COMPLETE", { importId, summary: enriched.summary, mode: "client" });
      return;
    }

    try {
      const job = await enrichImport(importId);
      setActiveJob(job);

      // Start polling GET /api/jobs/:jobId every 1.2s per Handoff spec
      pollTimerRef.current = setInterval(async () => {
        try {
          const currentJob = await getJob(job.jobId);
          setActiveJob(currentJob);

          if (currentJob.status === "done") {
            clearInterval(pollTimerRef.current);
            const enriched = await getEnriched(importId);
            setEnriched({
              teams: enriched.teams,
              summary: enriched.summary || currentJob.summary,
              asOf: enriched.asOf,
              enrichedAt: enriched.enrichedAt,
              enrichers: enriched.enrichers,
            });
            logAction("ENRICHMENT_COMPLETE", {
              importId,
              summary: enriched.summary,
              mode: "server",
            });
          } else if (currentJob.status === "failed") {
            clearInterval(pollTimerRef.current);
            setError(currentJob.error?.message || "Enrichment pipeline failed");
          }
        } catch (pollErr) {
          // If job expired (404), check if enriched file was already written
          if (pollErr.status === 404 || pollErr.code === "JOB_NOT_FOUND") {
            try {
              const enriched = await getEnriched(importId);
              clearInterval(pollTimerRef.current);
              setEnriched({
                teams: enriched.teams,
                summary: enriched.summary,
                asOf: enriched.asOf,
                enrichedAt: enriched.enrichedAt,
                enrichers: enriched.enrichers,
              });
              return;
            } catch {
              clearInterval(pollTimerRef.current);
              setError("Job expired from memory. Please start enrichment again.");
            }
          }
        }
      }, 1200);
    } catch (e) {
      console.warn("Backend enrich trigger failed, utilizing browser fallback:", e);
      const fallback = enrichTeamsClient(rawTeams);
      setEnriched({
        teams: fallback.teams,
        summary: fallback.summary,
        asOf: fallback.asOf,
        enrichedAt: fallback.enrichedAt,
        enrichers: fallback.enrichers,
      });
      setInfoNotice("Generated rich profile metrics locally so you can proceed to scoring.");
      logAction("ENRICHMENT_COMPLETE", { importId, summary: fallback.summary, mode: "client_fallback" });
    }
  };

  const isEnriched = phase === "enriched";
  const isImported = phase === "imported" || isEnriched;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Demo Data Banner (Must-do UI Rule #8) */}
      <DemoDataBanner />

      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1B263B] border border-[#415A77]/60 text-[#E0E1DD] text-xs font-semibold mb-3 shadow-sm">
            <Zap className="h-3.5 w-3.5 text-[#778DA9]" />
            <span>Stage 1 • Data Intake &amp; Multi-Source Normalization</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            Load Hackathon Registrations
          </h2>
          <p className="text-[#778DA9] mt-2 text-sm max-w-2xl leading-relaxed">
            Accepts raw Google Forms exports, multi-member CSVs, and canonical JSON.
            Individual profile links (GitHub, Resume, Portfolio, LinkedIn) are mapped and normalized automatically.
          </p>
        </div>

        {/* Server Status Badge */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1B263B] border border-[#415A77]/50 text-xs font-medium shadow-md">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                serverOnline === true
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                  : serverOnline === false
                  ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                  : "bg-[#778DA9]"
              )}
            />
            <span className="text-[#E0E1DD] font-mono">
              {serverOnline === true
                ? "Backend: Port 4000"
                : serverOnline === false
                ? "Browser Engine"
                : "Checking server…"}
            </span>
            <button
              onClick={checkHealth}
              title="Refresh connection"
              className="text-[#778DA9] hover:text-white transition ml-1 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <AnimatePresence>
        {infoNotice && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between p-4 rounded-xl bg-[#1B263B] border border-[#415A77]/60 text-[#E0E1DD] text-xs font-medium shadow-lg"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-[#778DA9] shrink-0" />
              <span>{infoNotice}</span>
            </div>
            <button
              onClick={() => setInfoNotice(null)}
              className="text-[#778DA9] hover:text-white underline ml-4 text-[11px] cursor-pointer"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Futuristic Dropzone */}
      <motion.div
        whileHover={{ scale: 1.005 }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => document.getElementById("file-input").click()}
        className={cn(
          "relative overflow-hidden rounded-2xl border-2 border-dashed p-10 md:p-14 text-center transition-all duration-300 cursor-pointer",
          dragging
            ? "border-[#E0E1DD] bg-[#415A77]/30 shadow-[0_0_40px_rgba(119,141,169,0.35)]"
            : "border-[#415A77]/60 bg-[#1B263B]/60 hover:border-[#778DA9] hover:bg-[#1B263B]/85 hover:shadow-[0_0_30px_rgba(65,90,119,0.3)]",
          phase === "uploading" && "pointer-events-none opacity-60"
        )}
      >
        <input
          id="file-input"
          type="file"
          accept=".csv,.json"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {phase === "uploading" ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 text-[#E0E1DD] animate-spin" />
            <div>
              <p className="font-bold text-white text-base">Normalizing registrations…</p>
              <p className="text-xs text-[#778DA9] mt-1 font-mono">{filename || "Processing file"}</p>
            </div>
          </div>
        ) : phase === "enriching" ? (
          <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto">
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-md bg-[#415A77]/40 animate-pulse" />
              <Loader2 className="h-12 w-12 text-[#E0E1DD] animate-spin relative" />
            </div>
            <div className="text-center w-full space-y-2">
              <p className="font-bold text-white text-base">
                {activeJob?.phase ? PHASE_LABELS[activeJob.phase] || "Enriching profile signals…" : "Enriching profile signals…"}
              </p>

              {activeJob?.progress?.total > 0 && (
                <div className="space-y-1.5">
                  <div className="h-2.5 w-full rounded-full bg-[#0D1B2A] border border-[#415A77]/50 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#415A77] via-[#778DA9] to-[#E0E1DD] rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.round((activeJob.progress.done / activeJob.progress.total) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-[#778DA9]">
                    <span>{activeJob.progress.done} of {activeJob.progress.total} processed</span>
                    <span className="font-bold text-[#E0E1DD]">{Math.round((activeJob.progress.done / activeJob.progress.total) * 100)}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : isImported ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-[#0D1B2A]/60">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <p className="font-bold text-white text-lg">{filename}</p>
              <p className="text-xs text-[#778DA9] mt-0.5">
                {isEnriched
                  ? "Enrichment complete — ready for criteria configuration"
                  : "Imported & normalized — click to select a different file"}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-b from-[#415A77]/30 to-[#1B263B] border border-[#778DA9]/40 flex items-center justify-center text-[#E0E1DD] shadow-xl shadow-[#0D1B2A]/70 group-hover:scale-105 transition-transform">
              <Upload className="h-8 w-8 text-[#E0E1DD]" />
            </div>
            <div>
              <p className="font-bold text-white text-lg">
                Drag and drop your team spreadsheet or JSON
              </p>
              <p className="text-xs text-[#778DA9] mt-1.5 max-w-md mx-auto">
                Supports Google Forms CSV (one row per member), multi-member records, and custom team fields. Max 20 MB.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono pt-2">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0D1B2A] border border-[#415A77]/50 text-[#E0E1DD]">
                <FileText className="h-3.5 w-3.5 text-[#778DA9]" /> .csv
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0D1B2A] border border-[#415A77]/50 text-[#E0E1DD]">
                <FileJson className="h-3.5 w-3.5 text-[#778DA9]" /> .json
              </span>
            </div>
            <p className="text-[11px] text-[#778DA9]/80 mt-1">
              Drive files (resume &amp; LinkedIn PDF) must be shared as &quot;Anyone with the link&quot;
            </p>
          </div>
        )}
      </motion.div>

      {/* Error alert */}
      {error && (
        <div className="flex items-center gap-3 text-rose-200 text-sm p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl shadow-lg">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Warning notice banner if import has warnings */}
      {report?.issueCounts?.warning > 0 && !error && (
        <div className="flex items-center justify-between gap-3 text-amber-200 text-xs p-3.5 bg-amber-950/30 border border-amber-500/35 rounded-xl">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>
              <strong>{report.issueCounts.warning} Data Hygiene Warning(s)</strong> detected during import (e.g. LinkedIn PDF links in URL column). All items were safely routed — review the telemetry log below.
            </span>
          </div>
        </div>
      )}

      {/* Column Mapper (for custom columns OR 422 recovery) */}
      {(showMapper || missingTeamIdHeaders.length > 0) && (
        <ColumnMapper
          columns={report?.columns}
          availableHeaders={missingTeamIdHeaders}
          columnMap={columnMap}
          onChange={setColumnMap}
          onReupload={handleApplyMapping}
          missingTeamIdError={missingTeamIdHeaders.length > 0}
        />
      )}

      {/* Import Report Section */}
      {report && <ImportReport report={report} />}

      {/* Data Quality Dashboard (Must-do UI Rule #2) */}
      {isEnriched && enrichSummary?.byMetric && (
        <DataQualityDashboard
          summary={enrichSummary}
          asOf={asOf}
          enrichedAt={enrichedAt}
        />
      )}

      {/* Action Bar (Trigger Enrichment) */}
      {isImported && !isEnriched && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-[#415A77]/50 shadow-xl"
        >
          <div>
            <h4 className="font-bold text-white text-base">Next Step: Profile Signal Enrichment</h4>
            <p className="text-xs text-[#778DA9] mt-0.5">
              Pull GitHub contribution counts, verify live portfolio links, and extract skills from resumes.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleEnrich}
              disabled={phase === "enriching"}
              className="glow-btn flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg shadow-[#415A77]/40"
            >
              {phase === "enriching" ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#E0E1DD]" />
              ) : (
                <Sparkles className="h-4 w-4 text-[#E0E1DD]" />
              )}
              <span>Enrich Profiles</span>
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Enriched Success Ready Card */}
      {isEnriched && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-emerald-500/40 bg-[#1B263B]/90 shadow-xl"
        >
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">
                Enrichment Complete • {enrichSummary?.teams ?? rawTeams.length} Teams Ready
              </h4>
              <p className="text-xs text-[#778DA9] mt-0.5">
                All profile signals, LLM extractions, and data quality metrics are attached to applicant records.
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/config")}
            className="btn-primary flex items-center gap-2 px-6 py-3 text-xs font-bold rounded-xl shadow-lg cursor-pointer"
          >
            <span>Proceed to Configure Selection</span>
            <ArrowRight className="h-4 w-4" />
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
