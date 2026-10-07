"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, Treemap, XAxis, YAxis, ZAxis } from "recharts";
import { FilterBar } from "@/components/filter-bar";
import { useApp } from "@/components/providers";
import { StateTileMap } from "@/components/state-tile-map";
import { Callout, Card, ChartTooltip, DataTable, Legend, PageHeader, PageSkeleton, TooltipBox } from "@/components/ui";
import { useApi, type Insights } from "@/lib/api";
import { fmt } from "@/lib/format";
import { axisProps, colorMap, useChartTheme } from "@/lib/theme";

interface TreeNodeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  sales?: number;
  category?: string;
}

function TreeNode({ x = 0, y = 0, width = 0, height = 0, name, sales, category, colors, surface }: TreeNodeProps & { colors: Record<string, string>; surface: string }) {
  if (!name) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={6} fill={colors[category ?? ""]} stroke={surface} strokeWidth={3} />
      {width > 72 && height > 38 && (
        <>
          <text x={x + 10} y={y + 21} fill="#fff" fontSize={12.5} fontWeight={600}>
            {name}
          </text>
          <text x={x + 10} y={y + 37} fill="#fff" fillOpacity={0.85} fontSize={11.5}>
            {fmt.usdK(sales ?? 0)}
          </text>
        </>
      )}
    </g>
  );
}

export default function InsightsPage() {
  const { filters, options, version } = useApp();
  const t = useChartTheme();
  const { data, error, loading } = useApi<Insights>("/insights", { ...filters }, version);
  const catColors = colorMap(options?.categories ?? [], t.series);
  const segColors = colorMap(options?.segments ?? [], t.series);
  const catLegend = Object.entries(catColors).map(([label, color]) => ({ label, color }));
  const ax = axisProps(t);
  const segTotal = data?.by_segment.reduce((s, d) => s + d.sales, 0) || 1;

  return (
    <>
      <PageHeader eyebrow="Analytics" title="Sales insights" description="Where revenue and profit come from, by sub-category, product, state, segment and shipping." />
      <FilterBar />
      {error && <Callout tone="danger">{error}</Callout>}
      {!data && loading && <PageSkeleton />}
      {data && (
        <div className={`stack ${loading ? "stale" : ""}`}>
          <div className="grid-2">
            <Card title="Sales by sub-category" actions={<Legend items={catLegend} />}>
              <ResponsiveContainer width="100%" height={310}>
                <Treemap data={data.by_subcategory as unknown as Record<string, unknown>[]} dataKey="sales" nameKey="name" isAnimationActive={false} content={<TreeNode colors={catColors} surface={t.surface} />}>
                  <Tooltip content={<ChartTooltip formatter={(v) => fmt.usd(v)} />} />
                </Treemap>
              </ResponsiveContainer>
            </Card>

            <Card title="Sales vs profit" subtitle="Each bubble is a product, sized by units sold" actions={<Legend items={catLegend} />}>
              <ResponsiveContainer width="100%" height={310}>
                <ScatterChart margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={t.grid} />
                  <XAxis type="number" dataKey="sales" name="Sales" {...ax} tickFormatter={fmt.usdK} />
                  <YAxis type="number" dataKey="profit" name="Profit" {...ax} axisLine={false} tickFormatter={fmt.usdK} width={56} />
                  <ZAxis type="number" dataKey="quantity" range={[90, 640]} name="Units" />
                  <ReferenceLine y={0} stroke={t.muted} strokeDasharray="4 4" />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3", stroke: t.muted }}
                    content={({ active, payload }) => {
                      const p = active ? (payload?.[0]?.payload as Insights["products"][number] | undefined) : undefined;
                      if (!p) return null;
                      return (
                        <TooltipBox
                          title={p.product}
                          rows={[
                            { label: "Sales", value: fmt.usd(p.sales) },
                            { label: "Profit", value: fmt.usd(p.profit) },
                            { label: "Margin", value: fmt.pct(p.margin) },
                            { label: "Units", value: fmt.int(p.quantity) },
                          ]}
                        />
                      );
                    }}
                  />
                  {Object.entries(catColors).map(([cat, color]) => (
                    <Scatter key={cat} name={cat} data={data.products.filter((p) => p.category === cat)} fill={color} fillOpacity={0.9} stroke={t.surface} strokeWidth={2} />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <div className="grid-3">
            <Card title="Sales by state" className="span-2">
              <StateTileMap data={data.by_state} />
            </Card>
            <Card title="Sales by segment">
              <div className="donut-wrap">
                <div className="donut-center">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={data.by_segment} dataKey="sales" nameKey="name" innerRadius="64%" outerRadius="92%" paddingAngle={2} stroke={t.surface} strokeWidth={2} cornerRadius={4}>
                        {data.by_segment.map((d) => (
                          <Cell key={d.name} fill={segColors[d.name] ?? t.accent} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip formatter={(v) => fmt.usd(v)} />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="donut-label">
                    <div>
                      <strong>{fmt.usdK(segTotal)}</strong>
                      <span>Total sales</span>
                    </div>
                  </div>
                </div>
                <div className="donut-legend">
                  {data.by_segment.map((d) => (
                    <div key={d.name} className="donut-row">
                      <span className="swatch" style={{ background: segColors[d.name] }} />
                      {d.name}
                      <span className="val">{fmt.pct(d.sales / segTotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          <div className="grid-2">
            <Card title="Orders by ship mode">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.by_ship_mode} margin={{ top: 22, right: 4, left: 0, bottom: 0 }} barCategoryGap="34%">
                  <CartesianGrid stroke={t.grid} vertical={false} />
                  <XAxis dataKey="name" {...ax} />
                  <YAxis {...ax} axisLine={false} width={44} />
                  <Tooltip content={<ChartTooltip formatter={(v) => fmt.int(v)} />} cursor={{ fill: t.grid, fillOpacity: 0.5 }} />
                  <Bar dataKey="orders" name="Orders" fill={t.accent} radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="orders" position="top" fill={t.muted} fontSize={11.5} formatter={(v: unknown) => fmt.int(Number(v))} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card
              title="Demand variability"
              subtitle="Std. dev. of monthly units by sub-category; above the median needs more safety stock"
              actions={<Legend items={[{ label: `Median ${data.variability_median}`, color: t.muted, dashed: true }]} />}
            >
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.demand_variability} margin={{ top: 10, right: 4, left: 0, bottom: 0 }} barCategoryGap="24%">
                  <CartesianGrid stroke={t.grid} vertical={false} />
                  <XAxis dataKey="name" {...ax} interval={0} angle={-32} textAnchor="end" height={58} />
                  <YAxis {...ax} axisLine={false} width={40} />
                  <Tooltip content={<ChartTooltip formatter={(v) => fmt.num(v)} />} cursor={{ fill: t.grid, fillOpacity: 0.5 }} />
                  <ReferenceLine y={data.variability_median} stroke={t.muted} strokeDasharray="5 4" />
                  <Bar dataKey="std" name="Std. dev." radius={[4, 4, 0, 0]}>
                    {data.demand_variability.map((d) => (
                      <Cell key={d.name} fill={d.std > data.variability_median ? t.accent : t.neutral} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card title="Product performance" subtitle="All products in the current selection">
            <DataTable
              rows={data.products}
              filename="product_performance.csv"
              searchKeys={["product", "category", "sub_category"]}
              initialSort={{ key: "sales", dir: "desc" }}
              columns={[
                { key: "product", label: "Product", render: (r) => <strong style={{ fontWeight: 500 }}>{r.product}</strong> },
                { key: "category", label: "Category" },
                { key: "sub_category", label: "Sub-category" },
                { key: "quantity", label: "Units", align: "right", render: (r) => fmt.int(r.quantity) },
                { key: "sales", label: "Sales", align: "right", render: (r) => fmt.usd(r.sales) },
                { key: "profit", label: "Profit", align: "right", render: (r) => <span className={r.profit < 0 ? "neg" : ""}>{fmt.usd(r.profit)}</span> },
                { key: "margin", label: "Margin", align: "right", render: (r) => fmt.pct(r.margin) },
              ]}
            />
          </Card>
        </div>
      )}
    </>
  );
}
