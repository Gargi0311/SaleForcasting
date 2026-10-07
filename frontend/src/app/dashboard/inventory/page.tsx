"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApp } from "@/components/providers";
import { SeriesPicker } from "@/components/series-picker";
import { Callout, Card, ChartTooltip, DataTable, Kpi, KpiGrid, Legend, PageHeader, PageSkeleton, Segmented } from "@/components/ui";
import { useApi, type Inventory } from "@/lib/api";
import { fmt } from "@/lib/format";
import { axisProps, useChartTheme } from "@/lib/theme";

export default function InventoryPage() {
  const { version } = useApp();
  const t = useChartTheme();
  const [serviceLevel, setServiceLevel] = useState(0.95);
  const [leadInput, setLeadInput] = useState("");
  const [region, setRegion] = useState("");
  const lead = leadInput === "" ? undefined : Number(leadInput);
  const { data, error, loading } = useApi<Inventory>("/inventory", { service_level: serviceLevel, lead_time: lead, region }, version);
  const ax = axisProps(t);
  const cycleColor = t.series[1];
  const ssColor = t.accent;

  const byProduct = useMemo(() => {
    if (!data) return [];
    const agg = new Map<string, { product: string; safety_stock: number; cycle_stock: number }>();
    for (const r of data.rows) {
      const a = agg.get(r.product) ?? { product: r.product, safety_stock: 0, cycle_stock: 0 };
      a.safety_stock += r.safety_stock;
      a.cycle_stock += r.reorder_point - r.safety_stock;
      agg.set(r.product, a);
    }
    return [...agg.values()].sort((a, b) => b.safety_stock + b.cycle_stock - (a.safety_stock + a.cycle_stock));
  }, [data]);

  const totals = data?.rows.reduce((s, r) => ({ ss: s.ss + r.safety_stock, rop: s.rop + r.reorder_point, demand: s.demand + r.predicted }), { ss: 0, rop: 0, demand: 0 });

  return (
    <>
      <PageHeader eyebrow="Planning" title="Inventory planning" description="Safety stock and reorder points from next month's forecast and the model's error spread.">
        <SeriesPicker region={region} onRegion={setRegion} />
        <label className="field">
          Lead time
          <input className="input" type="number" min={0} max={365} step={0.5} placeholder="Auto" value={leadInput} onChange={(e) => setLeadInput(e.target.value)} aria-label="Lead time in days" />
        </label>
        <Segmented
          label="Service level"
          value={serviceLevel}
          onChange={setServiceLevel}
          options={[
            { value: 0.9, label: "90%" },
            { value: 0.95, label: "95%" },
            { value: 0.99, label: "99%" },
          ]}
        />
      </PageHeader>
      {error && <Callout tone="danger">{error}</Callout>}
      {!data && loading && <PageSkeleton />}
      {data && totals && (
        <div className={`stack ${loading ? "stale" : ""}`}>
          <KpiGrid>
            <Kpi label="Planning month" value={data.month ? fmt.month(data.month) : "–"} hint="Next forecast month" />
            <Kpi label="Forecast demand" value={fmt.int(totals.demand)} hint="units across all series" />
            <Kpi label="Safety stock" value={fmt.int(totals.ss)} hint={`z = ${data.z} at ${fmt.pct(serviceLevel, 0)} service`} />
            <Kpi label="Reorder points" value={fmt.int(totals.rop)} hint="sum across series, units" />
          </KpiGrid>

          <Card
            title="Reorder point by product"
            subtitle="Lead-time demand plus safety stock, summed across regions"
            actions={
              <Legend
                items={[
                  { label: "Lead-time demand", color: cycleColor },
                  { label: "Safety stock", color: ssColor },
                ]}
              />
            }
          >
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={byProduct} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="28%">
                <CartesianGrid stroke={t.grid} vertical={false} />
                <XAxis dataKey="product" {...ax} interval={0} angle={-24} textAnchor="end" height={72} />
                <YAxis {...ax} axisLine={false} width={44} />
                <Tooltip content={<ChartTooltip formatter={(v) => `${fmt.num(v)} units`} />} cursor={{ fill: t.grid, fillOpacity: 0.5 }} />
                <Bar dataKey="cycle_stock" name="Lead-time demand" stackId="a" fill={cycleColor} stroke={t.surface} strokeWidth={2} />
                <Bar dataKey="safety_stock" name="Safety stock" stackId="a" fill={ssColor} stroke={t.surface} strokeWidth={2} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Inventory plan" subtitle="Per product and region" actions={<span className="formula">SS = z·σ·√L  ·  ROP = d·L + SS</span>}>
            <DataTable
              rows={data.rows}
              filename="inventory_plan.csv"
              searchKeys={["product", "region", "category"]}
              initialSort={{ key: "reorder_point", dir: "desc" }}
              columns={[
                { key: "product", label: "Product" },
                { key: "region", label: "Region" },
                { key: "predicted", label: "Forecast / mo", align: "right", render: (r) => fmt.num(r.predicted) },
                { key: "daily_demand", label: "Daily demand", align: "right", render: (r) => r.daily_demand.toFixed(2) },
                { key: "lead_time", label: "Lead time", align: "right", render: (r) => `${r.lead_time.toFixed(1)}d` },
                { key: "sigma", label: "σ monthly", align: "right", render: (r) => r.sigma.toFixed(1) },
                { key: "demand_cv", label: "Demand CV", align: "right", render: (r) => fmt.pct(r.demand_cv, 0) },
                { key: "safety_stock", label: "Safety stock", align: "right", render: (r) => fmt.num(r.safety_stock) },
                { key: "reorder_point", label: "Reorder point", align: "right", render: (r) => <strong style={{ fontWeight: 600 }}>{fmt.num(r.reorder_point)}</strong> },
              ]}
            />
          </Card>
        </div>
      )}
    </>
  );
}
