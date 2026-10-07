import * as React from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Data table for dashboards.
 *
 * Deliberately not a component library table: dashboards here need sticky
 * headers, a numeric column alignment mode, client-side sorting, and a
 * consistent empty/loading state — all of which are easier to guarantee with
 * a purpose-built table than with a generic primitive.
 */

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  /** Right-aligns and applies tabular figures. Use for money and counts. */
  numeric?: boolean;
  sortable?: boolean;
  width?: string;
  className?: string;
  headerClassName?: string;
  cell: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  caption?: string;
  emptyState?: React.ReactNode;
  onRowClick?: (row: T) => void;
  /** Client-side sort state; omit to disable sorting. */
  sort?: { key: string; dir: "asc" | "desc" } | null;
  onSortChange?: (key: string) => void;
  className?: string;
  /** Sticky header — enable inside a scroll container. */
  stickyHeader?: boolean;
  compact?: boolean;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  emptyState,
  onRowClick,
  sort,
  onSortChange,
  className,
  stickyHeader,
  compact,
}: DataTableProps<T>) {
  const cellPad = compact ? "px-4 py-2.5" : "px-5 py-3.5";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-line bg-surface shadow-xs",
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-full border-collapse text-left">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead
            className={cn(
              "border-b border-line bg-surface-raised/70",
              stickyHeader && "sticky top-0 z-10 backdrop-blur-sm",
            )}
          >
            <tr>
              {columns.map((col) => {
                const isSorted = sort?.key === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    style={col.width ? { width: col.width } : undefined}
                    className={cn(
                      cellPad,
                      "text-2xs font-medium uppercase tracking-[0.12em] text-subtle",
                      col.numeric && "text-right",
                      col.sortable && "cursor-pointer select-none hover:text-heading",
                      col.headerClassName,
                    )}
                    onClick={col.sortable ? () => onSortChange?.(col.key) : undefined}
                    aria-sort={
                      isSorted ? (sort?.dir === "asc" ? "ascending" : "descending") : undefined
                    }
                  >
                    {col.sortable ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5",
                          col.numeric && "flex-row-reverse",
                        )}
                      >
                        {col.header}
                        {isSorted ? (
                          sort?.dir === "asc" ? (
                            <ArrowUp className="size-3 text-accent-muted" />
                          ) : (
                            <ArrowDown className="size-3 text-accent-muted" />
                          )
                        ) : (
                          <ChevronsUpDown className="size-3 opacity-35" />
                        )}
                      </span>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  {emptyState ?? (
                    <p className="px-5 py-12 text-center text-sm text-subtle">No records yet</p>
                  )}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-b border-line last:border-b-0 transition-colors",
                    onRowClick
                      ? "cursor-pointer hover:bg-surface-raised/60"
                      : "hover:bg-surface-raised/35",
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        cellPad,
                        "align-middle text-sm",
                        col.numeric && "tnum text-right",
                        col.className,
                      )}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───────────────────────────── Pagination ────────────────────────────── */

export function Pagination({
  page,
  totalPages,
  total,
  perPage,
  className,
}: {
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  className?: string;
}) {
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex flex-wrap items-center justify-between gap-4 pt-2", className)}
    >
      <p className="tnum text-xs text-subtle">
        Showing <span className="text-heading">{from}</span>–
        <span className="text-heading">{to}</span> of{" "}
        <span className="text-heading">{total.toLocaleString("en-IN")}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <PageButton disabled={page <= 1} href={`?page=${page - 1}`}>
          Previous
        </PageButton>
        <span className="tnum px-3 text-xs text-body">
          {page} / {totalPages}
        </span>
        <PageButton disabled={page >= totalPages} href={`?page=${page + 1}`}>
          Next
        </PageButton>
      </div>
    </nav>
  );
}

function PageButton({
  children,
  href,
  disabled,
}: {
  children: React.ReactNode;
  href: string;
  disabled?: boolean;
}) {
  return (
    <a
      href={disabled ? undefined : href}
      aria-disabled={disabled}
      className={cn(
        "inline-flex h-9 items-center rounded-lg border px-3 text-xs font-medium transition-colors",
        disabled
          ? "pointer-events-none border-line bg-surface-sunken text-subtle/60"
          : "border-line bg-surface text-heading hover:border-line-strong hover:bg-surface-raised",
      )}
    >
      {children}
    </a>
  );
}

/* ───────────────────────── Key/value definition list ─────────────────── */

export function DataList({
  items,
  className,
  columns = 2,
}: {
  items: { label: string; value: React.ReactNode }[];
  className?: string;
  columns?: 1 | 2 | 3;
}) {
  const cols = { 1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3" }[columns];
  return (
    <dl className={cn("grid grid-cols-1 gap-x-8 gap-y-5", cols, className)}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-overline">{item.label}</dt>
          <dd className="mt-1 break-words text-sm text-heading">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}