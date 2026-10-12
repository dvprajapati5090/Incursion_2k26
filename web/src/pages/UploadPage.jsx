/**
 * UploadPage — Step 1
 *
 * Lets the organizer:
 *   1. Drop or select a CSV or JSON file
 *   2. Preview columns and map them if names differ from canonical names
 *   3. See the import report (team count, issue summary, source coverage)
 *   4. Trigger enrichment (GitHub fetch, resume parse)
 *   5. Proceed to Configure once enriched data is ready
 */
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileJson, FileText, CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadFile, enrichImport, getEnriched } from "@/lib/api";
import useImportStore from "@/stores/importStore";
import usePresetsStore from "@/stores/presetsStore";
import ImportReport from "@/components/upload/ImportReport";
import ColumnMapper from "@/components/upload/ColumnMapper";

export default function UploadPage() {
  const navigate = useNavigate();
  const { phase, report, filename, importId, rawTeams, error, enrichSummary,
    setUploading, setImported, setEnriching, setEnriched, setError, reset } = useImportStore();
  const { logAction } = usePresetsStore();

  const [dragging, setDragging] = useState(false);
  const [columnMap, setColumnMap] = useState({});
  const [showMapper, setShowMapper] = useState(false);

  // ---- Upload ----
  const handleFile = useCallback(async (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["csv", "json"].includes(ext)) {
      setError("Only .csv and .json files are supported");
      return;
    }

    setUploading();
    try {
      const result = await uploadFile(file, columnMap);
      setImported({ importId: result.importId, filename: file.name, report: result.report, teams: [] });
      logAction("FILE_UPLOADED", { filename: file.name, importId: result.importId });
      if (ext === "csv" && result.report?.columns?.extra?.length > 0) {
        setShowMapper(false); // mapper shows after upload via ImportReport
      }
    } catch (e) {
      setError(e.message);
    }
  }, [columnMap, setUploading, setImported, setError, logAction]);

  // ---- Drag & Drop ----
  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer?.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ---- Enrich ----
  const handleEnrich = async () => {
    if (!importId) return;
    setEnriching();
    try {
      const enrichResult = await enrichImport(importId);
      const enriched = await getEnriched(importId);
      setEnriched({ teams: enriched.teams, summary: enrichResult.summary });
      logAction("ENRICHMENT_COMPLETE", { importId, summary: enrichResult.summary });
    } catch (e) {
      setError(e.message);
    }
  };

  const isEnriched = phase === "enriched";
  const isImported = phase === "imported" || isEnriched;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Upload Team Data</h2>
        <p className="text-muted-foreground mt-1">
          Upload a CSV (Google Forms export) or JSON file with team registrations.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer",
          dragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50",
          phase === "uploading" && "pointer-events-none opacity-60"
        )}
        onClick={() => document.getElementById("file-input").click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".csv,.json"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {phase === "uploading" ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="text-muted-foreground">Uploading {filename}…</p>
          </div>
        ) : phase === "enriching" ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="text-muted-foreground">Enriching teams (GitHub, resumes)…</p>
          </div>
        ) : isImported ? (
          <div className="flex flex-col items-center gap-3">
            {isEnriched ? (
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            ) : (
              <FileText className="h-10 w-10 text-primary" />
            )}
            <p className="font-medium">{filename}</p>
            <p className="text-sm text-muted-foreground">
              {isEnriched ? "Enriched and ready" : "Imported — click to replace"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">Drop a CSV or JSON file here</p>
              <p className="text-sm text-muted-foreground mt-1">
                Supports Google Forms exports (one row per member) and the normalized JSON format
              </p>
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><FileText className="h-3 w-3" />.csv</span>
              <span className="flex items-center gap-1"><FileJson className="h-3 w-3" />.json</span>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-lg">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Import Report */}
      {report && <ImportReport report={report} />}

      {/* Column Mapper (if CSV has unmapped columns) */}
      {report?.columns && showMapper && (
        <ColumnMapper
          columns={report.columns}
          columnMap={columnMap}
          onChange={setColumnMap}
        />
      )}

      {/* Actions */}
      {isImported && !isEnriched && (
        <div className="flex gap-3">
          <button
            onClick={handleEnrich}
            disabled={phase === "enriching"}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition"
          >
            {phase === "enriching" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Enrich Teams (GitHub + Resume)
          </button>
          <button
            onClick={() => navigate("/config")}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-accent transition"
          >
            Skip Enrichment
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {isEnriched && (
        <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">
              {enrichSummary?.teamsEnriched ?? "?"} teams enriched — ready to configure
            </span>
          </div>
          <button
            onClick={() => navigate("/config")}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
          >
            Continue to Configure
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
