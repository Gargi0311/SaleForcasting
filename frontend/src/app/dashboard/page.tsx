"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FilterBar } from "@/components/filter-bar";
import { Icon, type IconName } from "@/components/icons";
import { useApp } from "@/components/providers";
import { Callout, Card, ChartTooltip, Kpi, KpiGrid, PageHeader, PageSkeleton, Segmented } from "@/components/ui";
import { useApi, type Overview } from "@/lib/api";
import { fmt } from "@/lib/format";
import { axisProps, colorMap, useChartTheme } from "@/lib/theme";

type Metric = "sales" | "profit" | "quantity";
const METRIC_FMT: Record<Metric, (v: number) => string> = { sales: fmt.usdK, profit: fmt.usdK, quantity: fmt.compact };
const METRIC_TIP: Record<Metric, (v: number) => string> = { sales: fmt.usd, profit: fmt.usd, quantity: fmt.int };

interface Insight {
  icon: IconName;
  tone: "green" | "blue" | "amber" | "red";
  text: React.ReactNode;
  sub: string;
}

function buildInsights(d: Overview): Insight[] {
  const out: Insight[] = [];
  const totalSales = d.kpis.total_sales || 1;
  if (d.yoy) {
    const c = d.yoy.change.total_sales ?? 0;
    out.push({
      icon: c >= 0 ? "trendUp" : "trendDown",
      tone: c >= 0 ? "green" : "red",
      text: (
        <>
          Revenue is <strong>{c >= 0 ? "up" : "down"} {fmt.pct(Math.abs(c))}</strong> over the last 12 months
        </>
      ),
      sub: `${fmt.usdK(d.yoy.current.total_sales)} vs ${fmt.usdK(d.yoy.previous.total_sales)} the year before`,
    });
  }
  if (d.trend.length) {
    const peak = d.trend.reduce((a, b) => (b.sales > a.sales ? b : a));
    out.push({ icon: "zap", tone: "amber", text: <>Peak month was <strong>{fmt.month(peak.month)}</strong></>, sub: `${fmt.usd(peak.sales)} in sales, ${fmt.int(peak.quantity)} units` });
  }
  const topRegion = d.by_region[0];
  if (topRegion) {
    out.push({ icon: "map", tone: "blue", text: <><strong>{topRegion.name}</strong> leads with {fmt.pct(topRegion.sales / totalSales)} of revenue</>, sub: `${fmt.usdK(topRegion.sales)} across ${fmt.int(topRegion.orders)} orders` });
  }
  const margins = d.by_category.filter((c) => c.sales > 0).map((c) => ({ ...c, margin: c.profit / c.sales }));
  if (margins.length > 1) {
    const low = margins.reduce((a, b) => (b.margin < a.margin ? b : a));
    out.push({ icon: "alert", tone: low.margin < 0.05 ? "red" : "amber", text: <><strong>{low.name}</strong> has the thinnest margin at {fmt.pct(low.margin)}</>, sub: "Review discounting and pricing for this category" });
  }
  return out;
}

export default function OverviewPage() {
  const { filters, options, version } = useApp();
  const t = useChartTheme();
  const [metric, setMetric] = useState<Metric>("sales");
  const { data, error, loading } = useApi<Overview>("/overview", { ...filters }, version);
  const catColors = colorMap(options?.categories ?? [], t.series);
  const regColors = colorMap(options?.regions ?? [], t.series);
  const ax = axisProps(t);
  const insights = useMemo(() => (data ? buildInsights(data) : []), [data]);
  const last12 = data?.trend.slice(-12) ?? [];
  const ch = data?.yoy?.change;

  return (
    <>
      <PageHeader eyebrow="Analytics" title="Sales overview" description="Revenue, profitability and volume across the selected period, regions, categories and segments.">
        {data?.yoy && <span className="tag neutral">Trailing 12 mo to {fmt.month(data.yoy.period_end)}</span>}
      </PageHeader>
      <FilterBar />
      {error && <Callout tone="danger">{error}</Callout>}
      {!data && loading && <PageSkeleton />}
      {data && (
        <div className={`stack ${loading ? "stale" : ""}`}>
          <KpiGrid>
            <Kpi label="Total sales" value={fmt.usdK(data.kpis.total_sales)} delta={ch?.total_sales} hint="vs prior 12 mo" spark={last12.map((m) => m.sales)} />
            <Kpi label="Total profit" value={fmt.usdK(data.kpis.total_profit)} delta={ch?.total_profit} hint={`${fmt.pct(data.kpis.profit_margin)} margin`} spark={last12.map((m) => m.profit)} />
            <Kpi label="Units sold" value={fmt.compact(data.kpis.total_quantity)} delta={ch?.total_quantity} hint={`${fmt.int(data.kpis.total_quantity)} units`} spark={last12.map((m) => m.quantity)} />
            <Kpi label="Orders" value={fmt.int(data.kpis.total_orders)} delta={ch?.total_orders} hint={`${fmt.usd(data.kpis.total_sales / Math.max(1, data.kpis.total_orders))} avg order`} spark={last12.map((m) => m.orders)} />
            <Kpi label="Avg discount" value={fmt.pct(data.kpis.avg_discount)} delta={ch?.avg_discount} invert hint="lower is better" />
            <Kpi label="Avg lead time" value={`${data.kpis.avg_lead_time.toFixed(1)}d`} delta={ch?.avg_lead_time} invert hint="order to ship" />
          </KpiGrid>

          <div className="grid-main">
            <Card
              title="Performance trend"
              subtitle="Monthly totals for the selected slice"
              actions={
                <Segmented
                  label="Metric"
                  value={metric}
                  onChange={setMetric}
                  options={[
                    { value: "sales", label: "Revenue" },
                    { value: "profit", label: "Profit" },
                    { value: "quantity", label: "Units" },
                  ]}
                />
              }
            >
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={t.accent} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={t.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={t.grid} vertical={false} />
                  <XAxis dataKey="month" {...ax} tickFormatter={fmt.month} minTickGap={28} />
                  <YAxis {...ax} axisLine={false} tickFormatter={METRIC_FMT[metric]} width={60} />
                  <Tooltip content={<ChartTooltip formatter={(v) => METRIC_TIP[metric](v)} labelFormatter={fmt.month} />} cursor={{ stroke: t.muted, strokeDasharray: "3 3" }} />
                  <Area type="monotone" dataKey={metric} name={metric === "sales" ? "Revenue" : metric === "profit" ? "Profit" : "Units"} stroke={t.accent} strokeWidth={2} fill="url(#trendFill)" activeDot={{ r: 5, stroke: t.surface, strokeWidth: 2 }} animationDuration={700} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Key insights" subtitle="Generated from the current selection">
              <div className="insight-list">
                {insights.map((i, k) => (
                  <div key={k} className="insight">
                    <span className={`insight-icon ${i.tone}`}>
                      <Icon name={i.icon} size={15} />
                    </span>
                    <div>
                      <p>{i.text}</p>
                      <span>{i.sub}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid-3">
            <Card title="Revenue by category">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.by_category} margin={{ top: 22, right: 4, left: 0, bottom: 0 }} barCategoryGap="32%">
                  <CartesianGrid stroke={t.grid} vertical={false} />
                  <XAxis dataKey="name" {...ax} />
                  <YAxis {...ax} axisLine={false} tickFormatter={fmt.usdK} width={56} />
                  <Tooltip content={<ChartTooltip formatter={(v) => fmt.usd(v)} />} cursor={{ fill: t.grid, fillOpacity: 0.6 }} />
                  <Bar dataKey="sales" name="Revenue" radius={[4, 4, 0, 0]} animationDuration={700}>
                    {data.by_category.map((d) => (
                      <Cell key={d.name} fill={catColors[d.name] ?? t.accent} />
                    ))}
                    <LabelList dataKey="sales" position="top" formatter={(v: unknown) => fmt.usdK(Number(v))} fill={t.muted} fontSize={11.5} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Revenue share by region">
              <div className="share-list">
                {data.by_region.map((r) => {
                  const share = r.sales / (data.kpis.total_sales || 1);
                  return (
                    <div key={r.name} className="share-row">
                      <span>{r.name}</span>
                      <span className="val">
                        {fmt.usdK(r.sales)} · {fmt.pct(share)}
                      </span>
                      <div className="share-bar">
                        <i style={{ width: `${share * 100}%`, background: regColors[r.name] ?? t.accent }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card title="Top products" subtitle="By revenue">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.top_products} layout="vertical" margin={{ top: 0, right: 52, left: 0, bottom: 0 }} barCategoryGap="24%">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" {...ax} axisLine={false} width={138} interval={0} />
                  <Tooltip content={<ChartTooltip formatter={(v) => fmt.usd(v)} />} cursor={{ fill: t.grid, fillOpacity: 0.6 }} />
                  <Bar dataKey="sales" name="Revenue" fill={t.accent} radius={[0, 4, 4, 0]} animationDuration={700}>
                    <LabelList dataKey="sales" position="right" formatter={(v: unknown) => fmt.usdK(Number(v))} fill={t.muted} fontSize={11.5} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
