/**
 * ResultsTable — High-impact TanStack Leaderboard.
 * Features podium medals for top 3, glowing score meters, signal coverage indicators,
 * instant filter searching, and row override action menus.
 */
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  Pin,
  Ban,
  Clock,
  Search,
  Award,
  Users,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import useConfigStore from "@/stores/configStore";
import usePresetsStore from "@/stores/presetsStore";
import { FLAG_DEFINITIONS, getSafeFlagDetail } from "@/lib/handoffFormatters";

const columnHelper = createColumnHelper();

const STATUS_BADGES = {
  shortlisted: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300",
  waitlisted:  "bg-amber-500/15 border-amber-500/40 text-amber-300",
  rejected:    "bg-rose-500/15 border-rose-500/40 text-rose-300",
  filter_rejected: "bg-orange-500/15 border-orange-500/40 text-orange-300",
  excluded:    "bg-[#415A77]/25 border-[#778DA9]/30 text-[#778DA9]",
};

export default function ResultsTable({ data, config, onRowClick }) {
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const { pinTeam, excludeTeam, waitlistTeam, clearOverride } = useConfigStore();
  const { logAction } = usePresetsStore();
  const blindMode = config?.options?.blindMode;

  const columns = [
    // Rank column with Podium Medals
    columnHelper.accessor("rank", {
      header: "#",
      cell: (info) => {
        const rank = info.getValue();
        if (!rank) return <span className="text-[#415A77]/70 font-mono text-xs">—</span>;

        if (rank === 1) {
          return (
            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-400/20 text-amber-300 font-extrabold text-xs border border-amber-400/40 shadow-[0_0_8px_rgba(251,191,36,0.5)]">
              1
            </span>
          );
        }
        if (rank === 2) {
          return (
            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-300/20 text-[#E0E1DD] font-extrabold text-xs border border-slate-300/40 shadow-[0_0_8px_rgba(203,213,225,0.4)]">
              2
            </span>
          );
        }
        if (rank === 3) {
          return (
            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-700/20 text-amber-500 font-extrabold text-xs border border-amber-700/40 shadow-[0_0_8px_rgba(180,83,9,0.4)]">
              3
            </span>
          );
        }
        return (
          <span className="font-mono text-xs text-[#778DA9]/80 font-medium">
            #{rank}
          </span>
        );
      },
      size: 52,
    }),

    // Team column
    columnHelper.accessor("teamName", {
      header: "Team Name",
      cell: (info) => {
        const teamId = info.row.original.teamId;
        const isPin = config?.overrides?.pin?.includes(teamId);
        const isWaitlist = config?.overrides?.waitlist?.includes(teamId);
        const isExclude = config?.overrides?.exclude?.includes(teamId);

        return (
          <div>
            <p className="font-bold text-sm text-white group-hover:text-[#778DA9] transition-colors">
              {blindMode ? `Team ${teamId}` : (info.getValue() || teamId)}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              <span className="text-[11px] font-mono text-[#415A77]">{teamId}</span>
              {isPin && (
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#415A77]/20 text-[#778DA9] border border-[#415A77]/45 font-semibold tracking-wide">
                  PINNED
                </span>
              )}
              {isWaitlist && (
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold tracking-wide">
                  OVERRIDE WAITLIST
                </span>
              )}
              {isExclude && (
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold tracking-wide">
                  EXCLUDED
                </span>
              )}
              {!blindMode && (
                <span className="text-[11px] text-[#778DA9]/80 flex items-center gap-1">
                  • {info.row.original.members?.length ?? 0} members
                </span>
              )}
            </div>
          </div>
        );
      },
    }),

    // Status column
    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => {
        const val = info.getValue() || "shortlisted";
        const badgeStyle = STATUS_BADGES[val] || STATUS_BADGES.shortlisted;
        return (
          <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border capitalize ${badgeStyle}`}>
            {val.replace("_", " ")}
          </span>
        );
      },
      size: 110,
    }),

    // Score column
    columnHelper.accessor("score", {
      header: "Composite Score",
      cell: (info) => {
        const score = info.getValue() ?? 0;
        const pct = Math.min(100, Math.max(0, Math.round(score * 100)));
        return (
          <div className="flex items-center gap-3 w-40">
            <div className="flex-1 h-2 rounded-full bg-[#1B263B] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#415A77] to-[#778DA9] rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="font-mono text-xs font-bold text-[#E0E1DD] w-12 text-right">
              {score.toFixed(4)}
            </span>
          </div>
        );
      },
    }),

    // Data coverage column
    columnHelper.accessor("dataCoverage", {
      header: "Coverage",
      cell: (info) => {
        const pct = Math.round((info.getValue() ?? 0) * 100);
        return (
          <span className={`text-xs font-mono font-semibold ${
            pct >= 75 ? "text-emerald-400" : pct >= 40 ? "text-amber-400" : "text-rose-400"
          }`}>
            {pct}%
          </span>
        );
      },
      size: 80,
    }),

    // Flags column (Must-do UI Rule #4)
    columnHelper.display({
      id: "flags",
      header: "Flags & Notices",
      cell: (info) => {
        const row = info.row.original;
        const rawFlags = row.flags ?? [];
        const memberFlags = (row.members ?? []).flatMap((m) => m.flags ?? []);

        // Deduplicate flags by code
        const flagsMap = new Map();
        for (const f of rawFlags) {
          const code = typeof f === "string" ? f : f?.code;
          if (code && !flagsMap.has(code)) {
            flagsMap.set(code, typeof f === "object" ? f : { code });
          }
        }
        for (const f of memberFlags) {
          if (f?.code && !flagsMap.has(f.code)) {
            flagsMap.set(f.code, f);
          }
        }

        const flags = Array.from(flagsMap.values());
        if (flags.length === 0) {
          return <span className="text-[11px] text-[#415A77]/70 font-mono">—</span>;
        }

        return (
          <div className="flex flex-wrap gap-1">
            {flags.map((f) => {
              const def = FLAG_DEFINITIONS[f.code] || {
                defaultSeverity: "warn",
                title: f.code,
              };
              const isWarn = (f.severity || def.defaultSeverity) === "warn";
              const safeDetail = getSafeFlagDetail(f, blindMode);

              return (
                <span
                  key={f.code}
                  title={`${def.title || f.code}: ${safeDetail}`}
                  className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${
                    isWarn
                      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                      : "bg-blue-500/15 text-blue-300 border-blue-500/30"
                  }`}
                >
                  {f.code}
                </span>
              );
            })}
          </div>
        );
      },
    }),

    // Action Overrides column
    columnHelper.display({
      id: "actions",
      header: "",
      cell: (info) => {
        const teamId = info.row.original.teamId;
        const status = info.row.original.status;
        const isPin = config?.overrides?.pin?.includes(teamId);
        const isExclude = config?.overrides?.exclude?.includes(teamId);
        const isWaitlist = config?.overrides?.waitlist?.includes(teamId);
        const isShortlisted = status === "shortlisted";

        return (
          <div className="flex items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
            {/* Quick Prominent "Move to Shortlist" for non-shortlisted teams */}
            {!isShortlisted && (
              <button
                onClick={() => {
                  pinTeam(teamId);
                  logAction("PIN", { teamId });
                }}
                title="Move to shortlist"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-[#415A77]/40 text-emerald-300 font-semibold text-xs transition cursor-pointer shadow-sm hover:shadow-[0_0_10px_rgba(16,185,129,0.3)]"
              >
                <Award className="h-3.5 w-3.5 text-emerald-400" />
                <span className="whitespace-nowrap">Move to Shortlist</span>
              </button>
            )}

            {/* Pin Button (Active if pinned, toggles on/off) */}
            {isShortlisted && (
              <button
                onClick={() => {
                  isPin ? clearOverride(teamId) : pinTeam(teamId);
                  logAction(isPin ? "UNPIN" : "PIN", { teamId });
                }}
                title={isPin ? "Pinned in shortlist (Click to unpin)" : "Pin to shortlist"}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  isPin
                    ? "bg-[#415A77]/25 text-[#778DA9] border border-[#415A77]/55 shadow-[0_0_8px_rgba(99,102,241,0.4)]"
                    : "text-[#415A77] hover:text-[#778DA9] hover:bg-[#1B263B]"
                }`}
              >
                <Pin className={`h-3.5 w-3.5 ${isPin ? "fill-current" : ""}`} />
              </button>
            )}

            {/* Exclude Button */}
            <button
              onClick={() => {
                isExclude ? clearOverride(teamId) : excludeTeam(teamId);
                logAction(isExclude ? "UNEXCLUDE" : "EXCLUDE", { teamId });
              }}
              title={isExclude ? "Excluded (Click to remove exclusion)" : "Exclude team"}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                isExclude
                  ? "bg-rose-500/25 text-rose-300 border border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                  : "text-[#415A77] hover:text-rose-400 hover:bg-[#1B263B]"
              }`}
            >
              <Ban className="h-3.5 w-3.5" />
            </button>

            {/* Move to Waitlist Button */}
            <button
              onClick={() => {
                isWaitlist ? clearOverride(teamId) : waitlistTeam(teamId);
                logAction(isWaitlist ? "CLEAR_WAITLIST" : "WAITLIST", { teamId });
              }}
              title={isWaitlist ? "Manually waitlisted (Click to reset)" : "Move to waitlist"}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                isWaitlist
                  ? "bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                  : "text-[#415A77] hover:text-amber-400 hover:bg-[#1B263B]"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
            </button>

            <ChevronRight className="h-4 w-4 text-[#415A77]/70 group-hover:text-[#778DA9] transition ml-1" />
          </div>
        );
      },
      size: 160,
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel:    getCoreRowModel(),
    getSortedRowModel:  getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-4">
      {/* Search Input Filter */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#778DA9]" />
        <input
          type="text"
          placeholder="Filter by team name, ID, or keywords…"
          value={globalFilter ?? ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1B263B] border border-[#415A77]/60 text-xs text-[#E0E1DD] placeholder-[#778DA9]/60 focus:border-[#778DA9] focus:outline-none focus:ring-1 focus:ring-[#778DA9] transition shadow-inner"
        />
      </div>

      {/* Leaderboard Table Container */}
      <div className="glass-panel rounded-2xl border border-[#415A77]/45 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0D1B2A] border-b border-[#415A77]/45 text-[#778DA9] font-bold tracking-wider uppercase">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className="px-4 py-3.5 font-bold text-[#778DA9] cursor-pointer select-none whitespace-nowrap hover:text-white transition"
                    >
                      <div className="flex items-center gap-1.5">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === "asc" && <ChevronUp className="h-3.5 w-3.5 text-[#E0E1DD]" />}
                        {header.column.getIsSorted() === "desc" && <ChevronDown className="h-3.5 w-3.5 text-[#E0E1DD]" />}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-[#415A77]/25">
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className="group hover:bg-[#415A77]/20 cursor-pointer transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}

              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-[#415A77]">
                    <p className="font-medium text-[#778DA9]/80">No teams found</p>
                    <p className="text-xs text-[#415A77]/70 mt-0.5">Try adjusting your search query or tab filters</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-[#415A77] px-1 font-mono">
        <span>Showing {table.getFilteredRowModel().rows.length} of {data.length} teams in view</span>
        <span>Click any row to open the detailed explanation drawer</span>
      </div>
    </div>
  );
}
