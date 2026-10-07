"use client";

import { useApi, type DatasetInfo, type ModelInfo } from "@/lib/api";
import { fmt } from "@/lib/format";

/** Live numbers from the running backend, with placeholders while loading. */
export function LiveStats() {
  const dataset = useApi<DatasetInfo>("/dataset");
  const model = useApi<ModelInfo>("/model");
  const d = dataset.data;
  const m = model.data;

  const stats = [
    { value: d ? fmt.int(d.rows) : "—", label: "Orders analysed" },
    { value: d ? String(d.products * d.regions) : "—", label: "Product × region forecasts" },
    { value: m ? m.features.length.toString() : "—", label: "Engineered model features" },
    { value: "24 mo", label: "Maximum forecast horizon" },
  ];

  return (
    <div className="stats">
      {stats.map((s) => (
        <div key={s.label} className="stat">
          <div className="stat-value">{s.value}</div>
          <div className="stat-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
