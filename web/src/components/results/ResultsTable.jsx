/**
 * ResultsTable — TanStack Table showing ranked teams.
 *
 * Columns: rank, team name, status badge, score bar, data coverage, flags, actions
 * Clicking a row opens the TeamDetailDrawer.
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
import { ChevronUp, ChevronDown, Pin, Ban, Clock, Search } from "lucide-react";
import useConfigStore from "@/stores/configStore";
import usePresetsStore from "@/stores/presetsStore";

const columnHelper = createColumnHelper();

const STATUS_CLASSES = {
  shortlisted:     "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
  waitlisted:      "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300",
  rejected:        "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300",
  filter_rejected: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
  excluded:        "bg-gray-100 dark:bg-gray-900/40 text-gray-600 dark:text-gray-400",
};

export default function ResultsTable({ data, config, onRowClick }) {
  const [sorting, setSorting]         = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const { pinTeam, excludeTeam, waitlistTeam, clearOverride } = useConfigStore();
  const { logAction } = usePresetsStore();
  const blindMode = config.options?.blindMode;

  const columns = [
    columnHelper.accessor("rank", {
      header: "#",
      cell: (info) => (
        <span className="font-mono text-sm text-muted-foreground">
          {info.getValue() ?? "—"}
        </span>
      ),
      size: 48,
    }),
    columnHelper.accessor("teamName", {
      header: "Team",
      cell: (info) => (
        <div>
          <p className="font-medium text-sm">
            {blindMode ? `Team ${info.row.original.teamId}` : (info.getValue() || info.row.original.teamId)}
          </p>
          {!blindMode && (
            <p className="text-xs text-muted-foreground">
              {info.row.original.members?.length ?? 0} member{info.row.original.members?.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      ),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASSES[info.getValue()] ?? ""}`}>
          {info.getValue()?.replace("_", " ")}
        </span>
      ),
    }),
    columnHelper.accessor("score", {
      header: "Score",
      cell: (info) => {
        const score = info.getValue();
        return (
          <div className="flex items-center gap-2 w-32">
            <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.round((score ?? 0) * 100)}%` }}
              />
            </div>
            <span className="font-mono text-xs w-12 text-right">{score?.toFixed(4) ?? "—"}</span>
          </div>
        );
      },
    }),
    columnHelper.accessor("dataCoverage", {
      header: "Coverage",
      cell: (info) => {
        const pct = Math.round((info.getValue() ?? 0) * 100);
        return (
          <span className={`text-xs font-mono ${pct < 50 ? "text-yellow-600" : "text-muted-foreground"}`}>
            {pct}%
          </span>
        );
      },
      size: 80,
    }),
    columnHelper.accessor("flags", {
      header: "Flags",
      cell: (info) => {
        const flags = info.getValue() ?? [];
        return (
          <div className="flex flex-wrap gap-1">
            {flags.map((f) => (
              <span key={f} className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded">
                {f}
              </span>
            ))}
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: (info) => {
        const teamId = info.row.original.teamId;
        const isPin = config.overrides?.pin?.includes(teamId);
        const isExclude = config.overrides?.exclude?.includes(teamId);

        return (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { isPin ? clearOverride(teamId) : pinTeam(teamId); logAction(isPin ? "UNPIN" : "PIN", { teamId }); }}
              title={isPin ? "Unpin" : "Pin to shortlist"}
              className={`p-1 rounded transition ${isPin ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
            >
              <Pin className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => { isExclude ? clearOverride(teamId) : excludeTeam(teamId); logAction(isExclude ? "UNEXCLUDE" : "EXCLUDE", { teamId }); }}
              title={isExclude ? "Remove exclusion" : "Exclude from shortlist"}
              className={`p-1 rounded transition ${isExclude ? "text-destructive" : "text-muted-foreground hover:text-destructive"}`}
            >
              <Ban className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => { waitlistTeam(teamId); logAction("WAITLIST", { teamId }); }}
              title="Move to waitlist"
              className="p-1 rounded transition text-muted-foreground hover:text-yellow-600"
            >
              <Clock className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      },
      size: 80,
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
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search teams…"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-background"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === "asc" && <ChevronUp className="h-3 w-3" />}
                        {header.column.getIsSorted() === "desc" && <ChevronDown className="h-3 w-3" />}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className="border-t hover:bg-accent/40 cursor-pointer transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No teams match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-right">
        {table.getFilteredRowModel().rows.length} of {data.length} teams shown
      </p>
    </div>
  );
}
