"use client";

import { useState } from "react";
import { fmt } from "@/lib/format";
import { useChartTheme } from "@/lib/theme";

// Equal-area tile grid of US states: [abbr, name, col, row]
const TILES: [string, string, number, number][] = [
  ["AK", "Alaska", 0, 0], ["ME", "Maine", 11, 0],
  ["VT", "Vermont", 10, 1], ["NH", "New Hampshire", 11, 1],
  ["WA", "Washington", 1, 2], ["ID", "Idaho", 2, 2], ["MT", "Montana", 3, 2], ["ND", "North Dakota", 4, 2], ["MN", "Minnesota", 5, 2], ["IL", "Illinois", 6, 2], ["WI", "Wisconsin", 7, 2], ["MI", "Michigan", 8, 2], ["NY", "New York", 9, 2], ["RI", "Rhode Island", 10, 2], ["MA", "Massachusetts", 11, 2],
  ["OR", "Oregon", 1, 3], ["NV", "Nevada", 2, 3], ["WY", "Wyoming", 3, 3], ["SD", "South Dakota", 4, 3], ["IA", "Iowa", 5, 3], ["IN", "Indiana", 6, 3], ["OH", "Ohio", 7, 3], ["PA", "Pennsylvania", 8, 3], ["NJ", "New Jersey", 9, 3], ["CT", "Connecticut", 10, 3],
  ["CA", "California", 1, 4], ["UT", "Utah", 2, 4], ["CO", "Colorado", 3, 4], ["NE", "Nebraska", 4, 4], ["MO", "Missouri", 5, 4], ["KY", "Kentucky", 6, 4], ["WV", "West Virginia", 7, 4], ["VA", "Virginia", 8, 4], ["MD", "Maryland", 9, 4], ["DE", "Delaware", 10, 4],
  ["AZ", "Arizona", 2, 5], ["NM", "New Mexico", 3, 5], ["KS", "Kansas", 4, 5], ["AR", "Arkansas", 5, 5], ["TN", "Tennessee", 6, 5], ["NC", "North Carolina", 7, 5], ["SC", "South Carolina", 8, 5], ["DC", "District of Columbia", 9, 5],
  ["OK", "Oklahoma", 4, 6], ["LA", "Louisiana", 5, 6], ["MS", "Mississippi", 6, 6], ["AL", "Alabama", 7, 6], ["GA", "Georgia", 8, 6],
  ["HI", "Hawaii", 0, 7], ["TX", "Texas", 4, 7], ["FL", "Florida", 9, 7],
];

const SIZE = 44;
const GAP = 5;

/** "Sales by State": a sequential single-hue tile map (replaces the Power BI map visual). */
export function StateTileMap({ data }: { data: { name: string; sales: number; region: string }[] }) {
  const t = useChartTheme();
  const [hover, setHover] = useState<string | null>(null);
  const byName = new Map(data.map((d) => [d.name, d]));
  const max = Math.max(1, ...data.map((d) => d.sales));
  const hovered = hover ? byName.get(hover) : undefined;

  return (
    <div className="tile-map">
      <svg viewBox={`0 0 ${12 * (SIZE + GAP)} ${8 * (SIZE + GAP)}`} role="img" aria-label="Sales by state tile map">
        {TILES.map(([abbr, name, col, row]) => {
          const d = byName.get(name);
          const k = d ? 0.15 + 0.85 * (d.sales / max) : 0;
          const isHover = hover === name;
          return (
            <g
              key={abbr}
              transform={`translate(${col * (SIZE + GAP)},${row * (SIZE + GAP)})`}
              onMouseEnter={() => d && setHover(name)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: d ? "pointer" : "default" }}
            >
              <rect width={SIZE} height={SIZE} rx={7} fill={d ? t.accent : "transparent"} fillOpacity={d ? k : 1} stroke={isHover ? t.text : d ? "none" : t.axis} strokeWidth={isHover ? 2 : 1} />
              <text x={SIZE / 2} y={SIZE / 2 + 4} textAnchor="middle" fontSize={11.5} fontWeight={600} fill={d && k > 0.55 ? "#fff" : d ? t.text : t.muted}>
                {abbr}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="tile-map-foot">
        <div className="tile-scale">
          <span>Lower</span>
          <span className="tile-gradient" style={{ background: `linear-gradient(90deg, ${t.accent}26, ${t.accent})` }} />
          <span>{fmt.usdK(max)}</span>
        </div>
        <div className="tile-readout">
          {hovered ? (
            <>
              <strong>{hover}</strong> <span className="muted">· {hovered.region}</span> <span className="tabular">{fmt.usd(hovered.sales)}</span>
            </>
          ) : (
            <span className="muted">Hover a state for details</span>
          )}
        </div>
      </div>
    </div>
  );
}
