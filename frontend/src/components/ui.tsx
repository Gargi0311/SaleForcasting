"use client";

import { useMemo, useState, type ReactNode } from "react";
import type React from "react";
import { downloadCsv } from "@/lib/format";

export function PageHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: ReactNode; children?: ReactNode }) {
  return (
    <div className="page-head reveal">
      <div className="page-head-text">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p className="lede">{description}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </div>
  );
}

export function Card({ title, subtitle, actions, children, className = "", flush }: { title?: string; subtitle?: string; actions?: ReactNode; children: ReactNode; className?: string; flush?: boolean }) {
  return (
    <section className={`card reveal ${flush ? "flush" : ""} ${className}`}>
      {(title || actions) && (
        <header className="card-head">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p className="card-sub">{subtitle}</p>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

function Sparkline({ data: raw }: { data: number[] }) {
  const data = raw.filter((v) => Number.isFinite(v));
  if (data.length < 2) return null;
  const w = 84, h = 30, pad = 2;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [pad + (i / (data.length - 1)) * (w - pad * 2), pad + (1 - (v - min) / span) * (h - pad * 2)]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const area = `${line}L${pts[pts.length - 1][0].toFixed(1)},${h}L${pts[0][0].toFixed(1)},${h}Z`;
  return (
    <svg className="kpi-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
      <path d={area} fill="var(--accent)" opacity={0.1} />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Delta({ value, invert = false }: { value: number | null | undefined; invert?: boolean }) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const flat = Math.abs(value) < 0.0005;
  const good = invert ? value < 0 : value > 0;
  const cls = flat ? "flat" : good ? "up" : "down";
  return (
    <span className={`delta ${cls}`} title={invert ? "Lower is better" : undefined}>
      {flat ? "→" : value > 0 ? "↑" : "↓"} {(Math.abs(value) * 100).toFixed(1)}%
    </span>
  );
}

export function Kpi({
  label,
  value,
  hint,
  delta,
  invert,
  spark,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: number | null;
  invert?: boolean;
  spark?: number[];
}) {
  return (
    <div className="kpi">
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <Delta value={delta} invert={invert} />
      </div>
      <span className="kpi-value">{value}</span>
      <span className="kpi-hint" style={spark ? { paddingRight: 92 } : undefined}>
        {hint}
      </span>
      {spark && <Sparkline data={spark} />}
    </div>
  );
}

export function KpiGrid({ children }: { children: ReactNode }) {
  const count = Array.isArray(children) ? children.filter(Boolean).length : 1;
  return (
    <div className="kpi-grid reveal" style={{ "--cols": count } as React.CSSProperties}>
      {children}
    </div>
  );
}

export function Skeleton({ height = 280 }: { height?: number }) {
  return <div className="skeleton" style={{ height }} aria-hidden />;
}

export function PageSkeleton() {
  return (
    <div className="stack" aria-busy="true" aria-label="Loading">
      <div className="kpi-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 92 }} />
        ))}
      </div>
      <Skeleton height={340} />
      <div className="grid-2">
        <Skeleton />
        <Skeleton />
      </div>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="spinner-row">
      <span className="spinner" aria-hidden />
      {label}
    </span>
  );
}

export function Callout({ tone = "info", children }: { tone?: "info" | "danger" | "success"; children: ReactNode }) {
  return (
    <div className={`callout ${tone}`} role={tone === "danger" ? "alert" : "status"}>
      {children}
    </div>
  );
}

interface TooltipEntry {
  name?: string | number;
  value?: number | string | (number | string)[];
  color?: string;
  payload?: Record<string, unknown>;
}

export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  formatter?: (v: number, name: string) => string;
  labelFormatter?: (l: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tooltip">
      {label !== undefined && label !== "" && <div className="tooltip-label">{labelFormatter ? labelFormatter(String(label)) : label}</div>}
      {payload
        .filter((p) => p.value !== undefined && p.value !== null && !Array.isArray(p.value))
        .map((p, i) => (
          <div key={i} className="tooltip-row">
            <span className="swatch" style={{ background: p.color }} />
            <span className="tooltip-name">{p.name}</span>
            <span className="tooltip-value">{formatter ? formatter(Number(p.value), String(p.name)) : String(p.value)}</span>
          </div>
        ))}
    </div>
  );
}

export function TooltipBox({ title, rows }: { title: string; rows: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="tooltip">
      <div className="tooltip-label">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="tooltip-row">
          {r.color && <span className="swatch" style={{ background: r.color }} />}
          <span className="tooltip-name">{r.label}</span>
          <span className="tooltip-value">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean; band?: boolean }[] }) {
  return (
    <div className="legend">
      {items.map((i) => (
        <span key={i.label} className="legend-item">
          <span className={`legend-key ${i.dashed ? "dashed" : ""} ${i.band ? "band" : ""}`} style={i.dashed ? { borderColor: i.color } : { background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} role="radio" aria-checked={o.value === value} className={o.value === value ? "active" : ""} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Select({ value, onChange, label, children }: { value: string; onChange: (v: string) => void; label: string; children: ReactNode }) {
  return (
    <label className="select">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        {children}
      </select>
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="m6 9 6 6 6-6" />
      </svg>
    </label>
  );
}

export interface Column<R> {
  key: keyof R & string;
  label: string;
  align?: "left" | "right";
  render?: (row: R) => ReactNode;
}

export function DataTable<R extends object>({
  rows,
  columns,
  filename,
  pageSize = 10,
  searchKeys,
  initialSort,
}: {
  rows: R[];
  columns: Column<R>[];
  filename?: string;
  pageSize?: number;
  searchKeys?: (keyof R & string)[];
  initialSort?: { key: keyof R & string; dir: "asc" | "desc" };
}) {
  const [sort, setSort] = useState(initialSort ?? null);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");

  const view = useMemo(() => {
    let out = rows;
    if (query && searchKeys) {
      const q = query.toLowerCase();
      out = out.filter((r) => searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(q)));
    }
    if (sort) {
      out = [...out].sort((a, b) => {
        const x = a[sort.key] as unknown;
        const y = b[sort.key] as unknown;
        const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }
    return out;
  }, [rows, sort, query, searchKeys]);

  const pages = Math.max(1, Math.ceil(view.length / pageSize));
  const current = Math.min(page, pages - 1);
  const slice = view.slice(current * pageSize, (current + 1) * pageSize);
  const toggle = (key: keyof R & string) => setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));

  return (
    <div className="table">
      {(searchKeys || filename) && (
        <div className="table-tools">
          {searchKeys ? (
            <div className="search">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                placeholder="Search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
              />
            </div>
          ) : (
            <span />
          )}
          {filename && (
            <button className="btn secondary sm" onClick={() => downloadCsv(filename, view as Record<string, unknown>[])}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" />
              </svg>
              Export CSV
            </button>
          )}
        </div>
      )}
      <div className="table-scroll" data-lenis-prevent-wheel-horizontal>
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={c.align === "right" ? "num" : ""} aria-sort={sort?.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
                  <button onClick={() => toggle(c.key)}>
                    {c.label}
                    <span className="sort-ind">{sort?.key === c.key ? (sort.dir === "asc" ? "↑" : "↓") : ""}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((r, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c.key} className={c.align === "right" ? "num" : ""}>
                    {c.render ? c.render(r) : String(r[c.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
            {!slice.length && (
              <tr>
                <td colSpan={columns.length} className="empty">
                  No matching rows
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="pager">
          <span>
            {current * pageSize + 1}–{Math.min((current + 1) * pageSize, view.length)} of {view.length.toLocaleString()}
          </span>
          <div className="pager-btns">
            <button className="btn secondary sm" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Previous page">
              ←
            </button>
            <button className="btn secondary sm" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} aria-label="Next page">
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
