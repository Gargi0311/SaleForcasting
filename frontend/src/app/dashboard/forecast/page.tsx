"use client";

import { useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApp } from "@/components/providers";
import { SeriesPicker } from "@/components/series-picker";
import { Callout, Card, DataTable, Kpi, KpiGrid, Legend, PageHeader, PageSkeleton, Segmented, TooltipBox } from "@/components/ui";
import { useApi, type Forecast } from "@/lib/api";
import { fmt } from "@/lib/format";
import { axisProps, useChartTheme } from "@/lib/theme";

interface Point {
  month: string;
  actual?: number;
  predicted?: number;
  band?: [number, number];
  isForecast?: boolean;
}

export default function ForecastPage() {
  const { version } = useApp();
  const t = useChartTheme();
  const [horizon, setHorizon] = useState(6);
  const [product, setProduct] = useState("");
  const [region, setRegion] = useState("");
  const { data, error, loading } = useApi<Forecast>("/forecast", { horizon, product, region }, version);
  const ax = axisProps(t);
  const actualColor = t.series[1];

  const points = useMemo<Point[]>(() => {
    if (!data) return [];
    const hist: Point[] = data.history.map((h) => ({ month: h.month, actual: h.actual }));
    const last = hist[hist.length - 1];
    if (last?.actual !== undefined) {
      // Anchor the forecast line and band to the last actual so they connect.
      last.predicted = last.actual;
      last.band = [last.actual, last.actual];
    }
    return [...hist, ...data.forecast.map((f) => ({ month: f.month, predicted: f.predicted, band: [f.lower, f.upper] as [number, number], isForecast: true }))];
  }, [data]);

  const totals = data?.totals;
  const change = totals && totals.last_year_units ? totals.units / totals.last_year_units - 1 : null;
  const revChange = totals && totals.last_year_sales ? totals.sales / totals.last_year_sales - 1 : null;
  const lastActual = data?.history[data.history.length - 1]?.month;

  return (
    <>
      <PageHeader eyebrow="Planning" title="Demand forecast" description="Recursive month-by-month forecast of units sold per product and region, with an approximate 80% range from holdout errors.">
        <SeriesPicker product={product} region={region} onProduct={setProduct} onRegion={setRegion} />
        <Segmented
          label="Forecast horizon"
          value={horizon}
          onChange={setHorizon}
          options={[
            { value: 3, label: "3M" },
            { value: 6, label: "6M" },
            { value: 12, label: "12M" },
          ]}
        />
      </PageHeader>
      {error && <Callout tone="danger">{error}</Callout>}
      {!data && loading && <PageSkeleton />}
      {data && totals && (
        <div className={`stack ${loading ? "stale" : ""}`}>
          <KpiGrid>
            <Kpi
              label={`Forecast units · ${horizon}M`}
              value={fmt.int(totals.units)}
              delta={change}
              hint={`vs prior ${horizon} months`}
            />
            <Kpi
              label="Expected revenue"
              value={fmt.usdK(totals.sales)}
              delta={revChange}
              hint={`vs ${fmt.usdK(totals.last_year_sales)}`}
            />
            <Kpi label="Avg per month" value={fmt.int(totals.units / horizon)} hint="units" />
            <Kpi label="Window" value={`${horizon} months`} hint={data.forecast.length ? `${fmt.month(data.forecast[0].month)} – ${fmt.month(data.forecast[data.forecast.length - 1].month)}` : undefined} />
          </KpiGrid>

          <Card
            title="History and forecast"
            subtitle="Units per month"
            actions={
              <Legend
                items={[
                  { label: "Actual", color: actualColor },
                  { label: "Forecast", color: t.accent, dashed: true },
                  { label: "80% range", color: t.accent, band: true },
                ]}
              />
            }
          >
            <ResponsiveContainer width="100%" height={360}>
              <ComposedChart data={points} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={t.grid} vertical={false} />
                <XAxis dataKey="month" {...ax} tickFormatter={fmt.month} minTickGap={24} />
                <YAxis {...ax} axisLine={false} width={50} tickFormatter={fmt.compact} />
                {lastActual && <ReferenceLine x={lastActual} stroke={t.axis} strokeDasharray="3 3" label={{ value: "Forecast →", fill: t.muted, fontSize: 11.5, position: "insideTopRight", dy: -14 }} />}
                <Tooltip
                  cursor={{ stroke: t.muted, strokeDasharray: "3 3" }}
                  content={({ active, payload, label }) => {
                    const p = active ? (payload?.[0]?.payload as Point | undefined) : undefined;
                    if (!p) return null;
                    const rows = p.isForecast
                      ? [
                          { label: "Forecast", value: fmt.int(p.predicted ?? 0), color: t.accent },
                          ...(p.band ? [{ label: "80% range", value: `${fmt.int(p.band[0])} – ${fmt.int(p.band[1])}` }] : []),
                        ]
                      : [{ label: "Actual", value: fmt.int(p.actual ?? 0), color: actualColor }];
                    return <TooltipBox title={fmt.month(String(label))} rows={rows} />;
                  }}
                />
                <Area type="monotone" dataKey="band" stroke="none" fill={t.accent} fillOpacity={0.14} isAnimationActive={false} activeDot={false} />
                <Line type="monotone" dataKey="actual" name="Actual" stroke={actualColor} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: t.surface, strokeWidth: 2 }} />
                <Line type="monotone" dataKey="predicted" name="Forecast" stroke={t.accent} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3, strokeWidth: 0, fill: t.accent }} activeDot={{ r: 5, stroke: t.surface, strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Forecast detail" subtitle="Per product, region and month">
            <DataTable
              rows={data.detail}
              filename={`forecast_${horizon}m.csv`}
              searchKeys={["product", "region", "category", "month"]}
              columns={[
                { key: "month", label: "Month", render: (r) => fmt.month(r.month) },
                { key: "product", label: "Product" },
                { key: "category", label: "Category" },
                { key: "region", label: "Region" },
                { key: "predicted", label: "Forecast", align: "right", render: (r) => <strong style={{ fontWeight: 600 }}>{fmt.num(r.predicted)}</strong> },
                { key: "lower", label: "Low", align: "right", render: (r) => <span className="muted">{fmt.num(r.lower)}</span> },
                { key: "upper", label: "High", align: "right", render: (r) => <span className="muted">{fmt.num(r.upper)}</span> },
                { key: "expected_sales", label: "Revenue", align: "right", render: (r) => fmt.usd(r.expected_sales) },
              ]}
            />
          </Card>
        </div>
      )}
    </>
  );
}
