"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApp } from "@/components/providers";
import { SeriesPicker } from "@/components/series-picker";
import { Callout, Card, ChartTooltip, DataTable, Kpi, KpiGrid, Legend, PageHeader, PageSkeleton, Spinner } from "@/components/ui";
import { api, useApi, type Evaluation, type ModelInfo } from "@/lib/api";
import { fmt } from "@/lib/format";
import { axisProps, useChartTheme } from "@/lib/theme";

export default function ModelPage() {
  const { version, bump } = useApp();
  const t = useChartTheme();
  const [product, setProduct] = useState("");
  const [region, setRegion] = useState("");
  const [busy, setBusy] = useState(false);
  const [retrainError, setRetrainError] = useState<string | null>(null);
  const model = useApi<ModelInfo>("/model", undefined, version);
  const ev = useApi<Evaluation>("/model/evaluation", { product, region }, version);
  const ax = axisProps(t);
  const actualColor = t.series[1];

  const retrain = async () => {
    setBusy(true);
    setRetrainError(null);
    try {
      await api.post("/model/retrain");
      bump();
    } catch (e) {
      setRetrainError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const m = model.data?.metrics;
  return (
    <>
      <PageHeader
        eyebrow="Model"
        title="Model performance"
        description={
          m ? (
            <>
              Ridge + Gradient Boosting ensemble, evaluated on the {fmt.month(m.test_start)} – {fmt.month(m.test_end)} holdout ({m.test_rows.toLocaleString()} product-region-months).
            </>
          ) : (
            "How well the forecasting model predicts unseen months."
          )
        }
      >
        <SeriesPicker product={product} region={region} onProduct={setProduct} onRegion={setRegion} />
        <button className="btn" onClick={retrain} disabled={busy}>
          {busy ? <Spinner label="Retraining" /> : "Retrain model"}
        </button>
      </PageHeader>
      {retrainError && <Callout tone="danger">{retrainError}</Callout>}
      {model.error && <Callout tone="danger">{model.error}</Callout>}
      {!m && model.loading && <PageSkeleton />}

      {m && model.data && (
        <div className="stack">
          <KpiGrid>
            <Kpi label="R² · holdout" value={m.test_r2.toFixed(3)} hint={`train ${m.train_r2.toFixed(3)} · gap ${m.gap.toFixed(3)}`} />
            <Kpi label="MAE" value={m.mae.toFixed(2)} hint="units per series-month" />
            <Kpi label="RMSE" value={m.rmse.toFixed(2)} hint="units" />
            <Kpi label="MAPE" value={`${m.mape.toFixed(1)}%`} hint="non-zero months" />
            <Kpi label="CV R² · Ridge" value={m.cv_ridge_r2.toFixed(3)} hint="3-fold time series" />
            <Kpi label="CV R² · GBR" value={m.cv_gbr_r2.toFixed(3)} hint="3-fold time series" />
          </KpiGrid>

          {ev.error && <Callout tone="danger">{ev.error}</Callout>}
          {ev.data && (
            <div className={`stack ${ev.loading ? "stale" : ""}`}>
              <Card
                title="Actual vs predicted demand"
                subtitle="Units per month over the holdout period"
                actions={
                  <Legend
                    items={[
                      { label: "Actual", color: actualColor },
                      { label: "Predicted", color: t.accent, dashed: true },
                    ]}
                  />
                }
              >
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={ev.data.by_month} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={t.grid} vertical={false} />
                    <XAxis dataKey="YearMonth" {...ax} tickFormatter={fmt.month} />
                    <YAxis {...ax} axisLine={false} width={50} tickFormatter={fmt.compact} />
                    <Tooltip content={<ChartTooltip formatter={(v) => fmt.num(v)} labelFormatter={fmt.month} />} cursor={{ stroke: t.muted, strokeDasharray: "3 3" }} />
                    <Line type="monotone" dataKey="actual" name="Actual" stroke={actualColor} strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: actualColor }} activeDot={{ r: 5, stroke: t.surface, strokeWidth: 2 }} />
                    <Line type="monotone" dataKey="predicted" name="Predicted" stroke={t.accent} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3, strokeWidth: 0, fill: t.accent }} activeDot={{ r: 5, stroke: t.surface, strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              <div className="grid-3">
                <Card title="Prediction error" subtitle="Actual − predicted; above zero is under-forecast">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={ev.data.by_month} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke={t.grid} vertical={false} />
                      <XAxis dataKey="YearMonth" {...ax} tickFormatter={fmt.month} minTickGap={8} />
                      <YAxis {...ax} axisLine={false} width={44} />
                      <ReferenceLine y={0} stroke={t.axis} />
                      <Tooltip content={<ChartTooltip formatter={(v) => fmt.num(v)} labelFormatter={fmt.month} />} cursor={{ fill: t.grid, fillOpacity: 0.5 }} />
                      <Bar dataKey="error" name="Error" radius={4}>
                        {ev.data.by_month.map((d) => (
                          <Cell key={d.YearMonth} fill={d.error >= 0 ? actualColor : t.accent} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                <Card title="Error distribution" subtitle="Per product-region-month, units">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={ev.data.error_histogram} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="10%">
                      <CartesianGrid stroke={t.grid} vertical={false} />
                      <XAxis dataKey="bin" {...ax} interval={2} tick={{ fill: t.muted, fontSize: 10.5 }} />
                      <YAxis {...ax} axisLine={false} width={38} />
                      <Tooltip content={<ChartTooltip formatter={(v) => fmt.int(v)} />} cursor={{ fill: t.grid, fillOpacity: 0.5 }} />
                      <Bar dataKey="count" name="Count" fill={actualColor} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                <Card title="Feature importance" subtitle="Gradient boosting · top 10">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={model.data.feature_importance.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }} barCategoryGap="20%">
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="feature" {...ax} axisLine={false} width={108} interval={0} />
                      <Tooltip content={<ChartTooltip formatter={(v) => fmt.pct(v)} />} cursor={{ fill: t.grid, fillOpacity: 0.5 }} />
                      <Bar dataKey="importance" name="Importance" fill={t.accent} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              <Card title="Holdout predictions" subtitle="Every product-region-month in the test window">
                <DataTable
                  rows={ev.data.rows}
                  filename="holdout_predictions.csv"
                  searchKeys={["product", "region", "month"]}
                  columns={[
                    { key: "month", label: "Month", render: (r) => fmt.month(r.month) },
                    { key: "product", label: "Product" },
                    { key: "region", label: "Region" },
                    { key: "actual", label: "Actual", align: "right", render: (r) => fmt.int(r.actual) },
                    { key: "predicted", label: "Predicted", align: "right", render: (r) => fmt.num(r.predicted) },
                    { key: "error", label: "Error", align: "right", render: (r) => <span className={Math.abs(r.error) > m.rmse * 2 ? "neg" : ""}>{fmt.num(r.error)}</span> },
                  ]}
                />
              </Card>
            </div>
          )}
          <p className="footnote">
            Trained {new Date(model.data.trained_at).toLocaleString()} · weights Ridge {model.data.ensemble.ridge} / GBR {model.data.ensemble.gbr} · {model.data.features.length} features
          </p>
        </div>
      )}
    </>
  );
}
