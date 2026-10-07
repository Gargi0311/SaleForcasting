"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export interface ChartTheme {
  mode: "light" | "dark";
  surface: string;
  grid: string;
  axis: string;
  text: string;
  muted: string;
  /** Brand accent, used for single-series charts. */
  accent: string;
  /** Fixed categorical order, validated for CVD separation + contrast on `surface`. */
  series: string[];
  good: string;
  bad: string;
  neutral: string;
}

const LIGHT: ChartTheme = {
  mode: "light",
  surface: "#FFFFFF",
  grid: "#EFEFEF",
  axis: "#DCDCDC",
  text: "#0A0A0A",
  muted: "#6B6B6B",
  accent: "#16A34A",
  series: ["#16A34A", "#2563EB", "#C2410C", "#7C3AED"],
  good: "#16A34A",
  bad: "#DC2626",
  neutral: "#D4D4D4",
};

const DARK: ChartTheme = {
  mode: "dark",
  surface: "#0F0F0F",
  grid: "#1C1C1C",
  axis: "#2A2A2A",
  text: "#FFFFFF",
  muted: "#8A8A8A",
  accent: "#4ADE80",
  series: ["#22A85A", "#3B82F6", "#D97706", "#A371F7"],
  good: "#4ADE80",
  bad: "#F87171",
  neutral: "#2E2E2E",
};

/** Chart colors for the active theme (SVG attributes can't read CSS variables reliably). */
export function useChartTheme(): ChartTheme {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return !mounted || resolvedTheme !== "light" ? DARK : LIGHT;
}

/** Color follows the entity (alphabetical slot), never its rank in the current view. */
export function colorMap(names: string[], series: string[]): Record<string, string> {
  return Object.fromEntries([...names].sort().map((n, i) => [n, series[i % series.length]]));
}

export function axisProps(t: ChartTheme) {
  return {
    stroke: t.axis,
    tick: { fill: t.muted, fontSize: 11.5, fontFamily: "var(--font-sans)" },
    tickLine: false,
  } as const;
}
