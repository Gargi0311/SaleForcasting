"use client";

import { useEffect, useState } from "react";
import { api, type FilterOptions, type Forecast, type Inventory, type ModelInfo } from "@/lib/api";
import { fmt } from "@/lib/format";
import { Icon } from "../icons";

interface Live {
  product: string;
  productId: string;
  category: string;
  region: string;
  window: string;
  units: number;
  revenue: number;
  safetyStock: number;
  reorderPoint: number;
  r2: number;
  series: number;
}

// Shown until (or if) the API responds, so the card never renders empty.
const FALLBACK: Live = {
  product: "Samsung Galaxy",
  productId: "TEC-PH-001",
  category: "Technology",
  region: "West",
  window: "Jan – Jun 2024",
  units: 312,
  revenue: 301000,
  safetyStock: 14.2,
  reorderPoint: 23.8,
  r2: 0.46,
  series: 40,
};

const CHAOS = [
  { top: "0%", left: "2%", rot: -4, delay: 0, src: "Excel", color: "#16a34a", title: "Q3_forecast_FINAL_v7 (2).xlsx", grid: true },
  { top: "6%", left: "40%", rot: 5, delay: 0.8, src: "Slack · #ops", color: "#a855f7", title: "Can someone send last month's numbers?? Need them for the 3pm", meta: "14 replies · 0 answers" },
  { top: "35%", left: "6%", rot: 2, delay: 1.6, src: "Email", color: "#3b82f6", title: "RE: RE: FWD: inventory count (updated) (2)", meta: "Attachment removed" },
  { top: "55%", left: "38%", rot: -3, delay: 0.4, src: "Power BI", color: "#eab308", title: "Weekly sales dashboard", err: "Data refresh failed · 3 days ago" },
  { top: "74%", left: "4%", rot: 3, delay: 1.2, src: "Sticky note", color: "#f97316", title: "Order more chairs?? ask Raj how many", meta: "Found under keyboard" },
];

export function BeforeAfter() {
  const [after, setAfter] = useState(false);
  const [touched, setTouched] = useState(false);
  const [live, setLive] = useState<Live>(FALLBACK);
  const [isLive, setIsLive] = useState(false);

  // Flip to "after" automatically once, unless the visitor already toggled.
  useEffect(() => {
    if (touched) return;
    const t = setTimeout(() => setAfter(true), 2600);
    return () => clearTimeout(t);
  }, [touched]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const opts = await api.get<FilterOptions>("/filters");
        const product = opts.products.find((p) => p.id === "TEC-PH-001") ?? opts.products[0];
        const region = opts.regions.includes("West") ? "West" : opts.regions[0];
        const [fc, inv, model] = await Promise.all([
          api.get<Forecast>("/forecast", { horizon: 6, product: product.id, region, history_months: 0 }),
          api.get<Inventory>("/inventory", { product: product.id, region }),
          api.get<ModelInfo>("/model"),
        ]);
        const row = inv.rows[0];
        const first = fc.forecast[0]?.month;
        const last = fc.forecast[fc.forecast.length - 1]?.month;
        if (!alive) return;
        setLive({
          product: product.name,
          productId: product.id,
          category: fc.detail[0]?.category ?? "",
          region,
          window: first && last ? `${fmt.month(first)} – ${fmt.month(last)}` : FALLBACK.window,
          units: fc.totals.units,
          revenue: fc.totals.sales,
          safetyStock: row?.safety_stock ?? 0,
          reorderPoint: row?.reorder_point ?? 0,
          r2: model.metrics.test_r2,
          series: opts.products.length * opts.regions.length,
        });
        setIsLive(true);
      } catch {
        /* keep the fallback */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const toggle = () => {
    setTouched(true);
    setAfter((a) => !a);
  };

  return (
    <div className="demo">
      <div className="demo-toggle">
        <span className={after ? "" : "on"}>BEFORE</span>
        <button className={`switch ${after ? "on" : ""}`} role="switch" aria-checked={after} aria-label="Show before and after" onClick={toggle} />
        <span className={after ? "on" : ""}>AFTER</span>
      </div>

      <div className="demo-stage">
        <div className={`demo-pane ${after ? "hidden" : ""}`} aria-hidden={after}>
          {CHAOS.map((c) => (
            <div key={c.title} className="chaos-card" style={{ top: c.top, left: c.left, rotate: `${c.rot}deg`, animationDelay: `${c.delay}s` }}>
              <span className="x">✕</span>
              <div className="src">
                <i style={{ background: c.color }} />
                {c.src}
              </div>
              <strong>{c.title}</strong>
              {c.grid && (
                <div className="cell-grid">
                  <span>SKU</span>
                  <span>Q2</span>
                  <span>Q3</span>
                  <span>Δ</span>
                  <span>CHR</span>
                  <span>412</span>
                  <span className="bad">#REF!</span>
                  <span className="bad">#DIV/0!</span>
                </div>
              )}
              {c.meta && <div className="meta">{c.meta}</div>}
              {c.err && <div className="err">{c.err}</div>}
            </div>
          ))}
        </div>

        <div className={`demo-pane ${after ? "" : "hidden"}`} aria-hidden={!after}>
          <div className="search-mock">
            <Icon name="search" size={18} />
            Search products, regions…
          </div>
          <div className="chip-row">
            <span className="chip on">
              {live.category || "Technology"} <Icon name="x" size={13} strokeWidth={2.4} />
            </span>
            <span className="chip">
              {live.region} <Icon name="x" size={13} strokeWidth={2.4} />
            </span>
            <span className="chip outline">
              Horizon <Icon name="chevronDown" size={13} />
            </span>
            <span className="chip">
              95% SL <Icon name="x" size={13} strokeWidth={2.4} />
            </span>
          </div>

          <div className="result">
            <div className="result-head">
              <div>
                <div className="result-title">
                  {live.product}
                  <span>· {live.productId}</span>
                </div>
                <div className="result-meta">
                  {live.region} · {live.window} · <span className="ok">Forecast ready</span>
                </div>
              </div>
              <div className="result-by">
                MODEL
                <div>R² {live.r2.toFixed(2)}</div>
              </div>
            </div>
            <div className="result-row">
              <span className="tag green">Forecast</span> 6-month demand
              <span className="val">{fmt.int(live.units)} units</span>
              <Icon name="chevronRight" size={16} />
            </div>
            <div className="result-row">
              <span className="tag blue">Revenue</span> Expected sales
              <span className="val">{fmt.usdK(live.revenue)}</span>
              <Icon name="chevronRight" size={16} />
            </div>
            <div className="result-row">
              <span className="tag amber">Inventory</span> Reorder point
              <span className="val">{fmt.num(live.reorderPoint)} units</span>
              <Icon name="chevronRight" size={16} />
            </div>
            <div className="result-foot">
              <span>
                <Icon name="shield" size={13} /> Safety stock {fmt.num(live.safetyStock)}
              </span>
              <span>
                <Icon name="trendUp" size={13} /> Ridge + GBR ensemble
              </span>
              {isLive && (
                <span style={{ marginLeft: "auto", color: "var(--accent)" }}>
                  <span className="status-dot up" /> Live
                </span>
              )}
            </div>
          </div>
          <div className="demo-more">+ {Math.max(0, live.series - 1)} more product-region forecasts ready</div>
        </div>
      </div>
    </div>
  );
}
