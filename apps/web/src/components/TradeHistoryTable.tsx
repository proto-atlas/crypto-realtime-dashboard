import {
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnPinningState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, ChevronsUpDown, Pin, RotateCcw, Search } from "lucide-react";
import { type CSSProperties, useDeferredValue, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatCompactUsd, formatUsd } from "@/lib/format";
import {
  createTradeHistoryRows,
  matchesTradeSearch,
  summarizeTradeHistory,
  type TradeHistoryRow,
  type TradeSide,
  type TradeStatus,
} from "@/lib/tradeHistory";
import { cn } from "@/lib/utils";

const symbolOptions = ["all", "BTC/USDT", "ETH/USDT", "SOL/USDT", "XRP/USDT", "DOGE/USDT"];
const sideOptions = ["all", "buy", "sell"] as const;
const statusOptions = ["all", "filled", "canceled", "rejected"] as const;

const sideLabels: Record<TradeSide, string> = {
  buy: "Buy",
  sell: "Sell",
};

const statusLabels: Record<TradeStatus, string> = {
  filled: "Filled",
  canceled: "Canceled",
  rejected: "Rejected",
};

const tradeTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone: "UTC",
});

const quantityFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 5,
});

const integerFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

export function TradeHistoryTable() {
  const [globalFilter, setGlobalFilter] = useState("");
  const deferredGlobalFilter = useDeferredValue(globalFilter);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>(() => createDefaultSorting());
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>(() =>
    createDefaultColumnPinning(),
  );
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const generation = useMemo(() => {
    const startedAt = performance.now();
    const rows = createTradeHistoryRows();

    return {
      rows,
      durationMs: performance.now() - startedAt,
    };
  }, []);
  const summary = useMemo(() => summarizeTradeHistory(generation.rows), [generation.rows]);
  const columns = useMemo<ColumnDef<TradeHistoryRow>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Trade ID",
        size: 140,
        minSize: 120,
        cell: (info) => (
          <span className="font-mono text-xs font-semibold text-slate-950 dark:text-slate-50">
            {info.getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "executedAtMs",
        header: "Time (UTC)",
        size: 150,
        minSize: 130,
        cell: (info) => (
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {tradeTimeFormatter.format(new Date(info.getValue<number>()))}
          </span>
        ),
      },
      {
        accessorKey: "symbol",
        header: "Pair",
        size: 130,
        minSize: 120,
        filterFn: "equalsString",
        cell: (info) => (
          <span className="font-semibold text-slate-950 dark:text-slate-50">
            {info.getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "side",
        header: "Side",
        size: 100,
        minSize: 92,
        filterFn: "equalsString",
        cell: (info) => {
          const side = info.getValue<TradeSide>();

          return (
            <span
              className={cn(
                "rounded-md px-2 py-1 text-xs font-semibold",
                side === "buy"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
              )}
            >
              {sideLabels[side]}
            </span>
          );
        },
      },
      {
        accessorKey: "priceUsd",
        header: "Price",
        size: 120,
        minSize: 110,
        cell: (info) => <span className="font-medium">{formatUsd(info.getValue<number>())}</span>,
      },
      {
        accessorKey: "quantity",
        header: "Qty",
        size: 120,
        minSize: 100,
        cell: (info) => quantityFormatter.format(info.getValue<number>()),
      },
      {
        accessorKey: "notionalUsd",
        header: "Notional",
        size: 130,
        minSize: 120,
        cell: (info) => <span className="font-medium">{formatUsd(info.getValue<number>())}</span>,
      },
      {
        accessorKey: "feeUsd",
        header: "Fee",
        size: 100,
        minSize: 90,
        cell: (info) => formatUsd(info.getValue<number>()),
      },
      {
        accessorKey: "venue",
        header: "Venue",
        size: 150,
        minSize: 130,
        cell: (info) => (
          <span className="text-slate-600 dark:text-slate-400">{info.getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 120,
        minSize: 110,
        filterFn: "equalsString",
        cell: (info) => {
          const status = info.getValue<TradeStatus>();

          return (
            <span
              className={cn(
                "rounded-md px-2 py-1 text-xs font-semibold",
                status === "filled"
                  ? "bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300"
                  : status === "canceled"
                    ? "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
              )}
            >
              {statusLabels[status]}
            </span>
          );
        },
      },
    ],
    [],
  );
  const table = useReactTable({
    data: generation.rows,
    columns,
    columnResizeMode: "onChange",
    enableColumnResizing: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
    globalFilterFn: (row, _columnId, filterValue) =>
      matchesTradeSearch(row.original, String(filterValue)),
    onColumnFiltersChange: setColumnFilters,
    onColumnPinningChange: setColumnPinning,
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    state: {
      columnFilters,
      columnPinning,
      globalFilter: deferredGlobalFilter,
      sorting,
    },
  });
  const filteredRows = table.getRowModel().rows;
  const visibleColumnCount = table.getVisibleLeafColumns().length;
  const headerGroups = table.getHeaderGroups();
  const headerGroupCount = headerGroups.length;
  const isIdPinned = Boolean(columnPinning.left?.includes("id"));
  const rowVirtualizer = useVirtualizer({
    count: filteredRows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 52,
    overscan: 14,
  });

  function updateColumnFilter(columnId: "symbol" | "side" | "status", value: string) {
    table.getColumn(columnId)?.setFilterValue(value === "all" ? undefined : value);
  }

  function resetTableState() {
    setGlobalFilter("");
    setColumnFilters([]);
    setSorting(createDefaultSorting());
    setColumnPinning(createDefaultColumnPinning());
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 xl:flex-row xl:items-start xl:justify-between dark:border-slate-800">
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">取引履歴ラボ</h2>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
            <MetricPill label="Rows" value={integerFormatter.format(summary.totalRows)} />
            <MetricPill label="Visible" value={integerFormatter.format(filteredRows.length)} />
            <MetricPill label="Notional" value={formatCompactUsd(summary.totalNotionalUsd)} />
            <MetricPill label="Generated" value={`${generation.durationMs.toFixed(1)} ms`} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={isIdPinned ? "default" : "secondary"}
            aria-pressed={isIdPinned}
            onClick={() =>
              setColumnPinning((current) => ({
                ...current,
                left: isIdPinned ? [] : ["id"],
              }))
            }
          >
            <Pin className="size-4" aria-hidden="true" />
            Trade ID固定
          </Button>
          <Button size="sm" variant="secondary" onClick={resetTableState}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Reset
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_160px_170px]">
        <label className="relative block">
          <span className="sr-only">Search trades</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-cyan-950"
            placeholder="Trade ID / pair / venue"
            type="search"
          />
        </label>
        <FilterSelect
          label="Pair"
          value={String(table.getColumn("symbol")?.getFilterValue() ?? "all")}
          options={symbolOptions}
          onChange={(value) => updateColumnFilter("symbol", value)}
        />
        <FilterSelect
          label="Side"
          value={String(table.getColumn("side")?.getFilterValue() ?? "all")}
          options={sideOptions}
          onChange={(value) => updateColumnFilter("side", value)}
        />
        <FilterSelect
          label="Status"
          value={String(table.getColumn("status")?.getFilterValue() ?? "all")}
          options={statusOptions}
          onChange={(value) => updateColumnFilter("status", value)}
        />
      </div>

      <div
        ref={tableContainerRef}
        className="mt-4 h-[540px] overflow-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
      >
        <table
          aria-colcount={visibleColumnCount}
          aria-rowcount={filteredRows.length + headerGroupCount}
          className="grid min-w-[1260px] border-collapse text-left text-sm"
        >
          <thead className="sticky top-0 z-30 grid bg-slate-100 shadow-sm dark:bg-slate-800">
            {headerGroups.map((headerGroup, headerGroupIndex) => (
              <tr key={headerGroup.id} aria-rowindex={headerGroupIndex + 1} className="flex w-full">
                {headerGroup.headers.map((header, columnIndex) => (
                  <th
                    key={header.id}
                    scope="col"
                    aria-colindex={columnIndex + 1}
                    aria-sort={getAriaSortValue(
                      header.column.getCanSort(),
                      header.column.getIsSorted(),
                    )}
                    className="relative flex h-12 items-center border-b border-slate-200 px-3 text-xs font-semibold uppercase tracking-normal text-slate-600 dark:border-slate-700 dark:text-slate-300"
                    style={{
                      width: header.getSize(),
                      ...getColumnPinningStyle(header.column, "header"),
                    }}
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        className={cn(
                          "flex min-w-0 items-center gap-1 text-left",
                          header.column.getCanSort() ? "cursor-pointer" : "cursor-default",
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <span className="truncate">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        {header.column.getCanSort() ? (
                          <SortIcon direction={header.column.getIsSorted()} />
                        ) : null}
                      </button>
                    )}
                    {header.column.getCanResize() ? (
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-hidden="true"
                        className="absolute right-0 top-0 h-full w-2 cursor-col-resize border-r border-transparent hover:border-cyan-500"
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                      />
                    ) : null}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="relative" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = filteredRows[virtualRow.index];

              if (row === undefined) {
                return null;
              }

              return (
                <tr
                  key={row.id}
                  aria-rowindex={virtualRow.index + headerGroupCount + 1}
                  className="absolute flex w-full border-b border-slate-100 bg-white hover:bg-cyan-50/40 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-cyan-950/30"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {row.getVisibleCells().map((cell, columnIndex) => (
                    <td
                      key={cell.id}
                      aria-colindex={columnIndex + 1}
                      className="flex items-center overflow-hidden px-3 text-slate-700 dark:text-slate-300"
                      style={{
                        width: cell.column.getSize(),
                        ...getColumnPinningStyle(cell.column, "cell"),
                      }}
                    >
                      <div className="min-w-0 truncate">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        仮想データのみ。実注文、投資助言、取引所口座連携はありません。
      </p>
    </section>
  );
}

function createDefaultSorting(): SortingState {
  return [{ id: "executedAtMs", desc: true }];
}

function createDefaultColumnPinning(): ColumnPinningState {
  return { left: ["id"] };
}

function getAriaSortValue(
  canSort: boolean,
  direction: false | "asc" | "desc",
): "ascending" | "descending" | "none" | undefined {
  if (!canSort) {
    return undefined;
  }

  if (direction === "asc") {
    return "ascending";
  }

  if (direction === "desc") {
    return "descending";
  }

  return "none";
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-cyan-950"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === "all" ? `All ${label}` : option}
          </option>
        ))}
      </select>
    </label>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 dark:border-slate-700 dark:bg-slate-950">
      {label}: <span className="text-slate-950 dark:text-slate-50">{value}</span>
    </span>
  );
}

function SortIcon({ direction }: { direction: false | "asc" | "desc" }) {
  if (direction === "asc") {
    return <ArrowUp className="size-3.5 shrink-0" aria-hidden="true" />;
  }

  if (direction === "desc") {
    return <ArrowDown className="size-3.5 shrink-0" aria-hidden="true" />;
  }

  return (
    <ChevronsUpDown
      className="size-3.5 shrink-0 text-slate-400 dark:text-slate-500"
      aria-hidden="true"
    />
  );
}

function getColumnPinningStyle(
  column: Column<TradeHistoryRow>,
  layer: "header" | "cell",
): CSSProperties {
  const pinnedSide = column.getIsPinned();

  if (!pinnedSide) {
    return {};
  }

  return {
    background:
      layer === "header" ? "var(--table-sticky-header-bg)" : "var(--table-sticky-cell-bg)",
    boxShadow:
      pinnedSide === "left" && column.getIsLastColumn("left")
        ? "2px 0 0 var(--table-sticky-shadow)"
        : undefined,
    left: pinnedSide === "left" ? `${column.getStart("left")}px` : undefined,
    position: "sticky",
    right: pinnedSide === "right" ? `${column.getAfter("right")}px` : undefined,
    zIndex: layer === "header" ? 40 : 20,
  };
}
