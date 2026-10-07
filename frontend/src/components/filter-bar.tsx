"use client";

import { useEffect, useRef, useState } from "react";
import { EMPTY_FILTERS, useApp, type FilterState } from "./providers";

function MultiSelect({ label, options, selected, onChange }: { label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const toggle = (o: string) => onChange(selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o]);
  const summary = selected.length === 0 ? "All" : selected.length === 1 ? selected[0] : `${selected.length} selected`;

  return (
    <div className="ms" ref={ref}>
      <button className={`ms-trigger ${selected.length ? "has-value" : ""}`} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="ms-label">{label}</span>
        <span className="ms-value">{summary}</span>
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="ms-menu" role="listbox" aria-multiselectable>
          {options.map((o) => (
            <label key={o} className="ms-option">
              <input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)} />
              <span className="check" aria-hidden />
              {o}
            </label>
          ))}
          {selected.length > 0 && (
            <button className="ms-clear" onClick={() => onChange([])}>
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** The slicers from the Power BI report: Order Date, Region, Category, Segment. */
export function FilterBar() {
  const { options, filters, setFilters } = useApp();
  if (!options) return <div className="filter-bar placeholder" />;
  const set = (patch: Partial<FilterState>) => setFilters({ ...filters, ...patch });
  const active = Boolean(filters.start || filters.end || filters.region.length || filters.category.length || filters.segment.length);

  return (
    <div className="filter-bar reveal">
      <div className="date-range">
        <span className="ms-label">Order date</span>
        <input type="date" min={options.min_date} max={options.max_date} value={filters.start} onChange={(e) => set({ start: e.target.value })} aria-label="Start date" />
        <span className="muted">→</span>
        <input type="date" min={options.min_date} max={options.max_date} value={filters.end} onChange={(e) => set({ end: e.target.value })} aria-label="End date" />
      </div>
      <MultiSelect label="Region" options={options.regions} selected={filters.region} onChange={(region) => set({ region })} />
      <MultiSelect label="Category" options={options.categories} selected={filters.category} onChange={(category) => set({ category })} />
      <MultiSelect label="Segment" options={options.segments} selected={filters.segment} onChange={(segment) => set({ segment })} />
      {active && (
        <button className="btn ghost sm" onClick={() => setFilters(EMPTY_FILTERS)}>
          Reset
        </button>
      )}
    </div>
  );
}
