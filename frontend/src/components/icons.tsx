import type { SVGProps } from "react";

const PATHS = {
  overview: "M4 19V10M10 19V5M16 19v-7M22 19H2",
  insights: "M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z",
  forecast: "M3 17l5-6 4 3 8-9M15 5h5v5",
  inventory: "M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10",
  model: "M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM12 12l4-3M12 4v2M20 12h-2M6 12H4",
  data: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-3.5-3.5",
  logo: "M4 17l6-6 4 4 7-8",
  sun: "M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  moon: "M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z",
  monitor: "M3 5h18v11H3zM8 20h8M12 16v4",
  refresh: "M20 11a8 8 0 0 0-14.9-3M4 13a8 8 0 0 0 14.9 3M4 4v4h4M20 20v-4h-4",
  external: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  collapse: "M4 4h16v16H4zM9 4v16M15 10l-2 2 2 2",
  expand: "M4 4h16v16H4zM9 4v16M13 10l2 2-2 2",
  menu: "M4 7h16M4 12h16M4 17h16",
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  chevronRight: "m9 6 6 6-6 6",
  chevronDown: "m6 9 6 6 6-6",
  x: "M6 6l12 12M18 6 6 18",
  upload: "M12 16V4m0 0-4 4m4-4 4 4M5 20h14",
  download: "M12 4v11m0 0-4-4m4 4 4-4M5 20h14",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2",
  trendUp: "M3 17l6-6 4 4 8-8M15 7h6v6",
  trendDown: "M3 7l6 6 4-4 8 8M15 17h6v-6",
  alert: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  layers: "M12 3 2 8l10 5 10-5-10-5ZM2 13l10 5 10-5M2 17.5l10 5 10-5",
  cpu: "M6 6h12v12H6zM9 9h6v6H9zM9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4",
  shield: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z",
  zap: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
  map: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2ZM9 4v14M15 6v14",
  file: "M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5ZM14 3v5h5",
  check: "M5 12l5 5 9-10",
  github: "M9 19c-4 1.5-4-2-6-2.5M15 22v-3.9a3.4 3.4 0 0 0-1-2.6c3.1-.4 6.4-1.5 6.4-6.9a5.4 5.4 0 0 0-1.5-3.7 5 5 0 0 0-.1-3.7s-1.2-.4-3.9 1.5a13.4 13.4 0 0 0-7 0C5.3 1.6 4.1 2 4.1 2a5 5 0 0 0-.1 3.7A5.4 5.4 0 0 0 2.5 9.4c0 5.4 3.3 6.5 6.4 6.9a3.4 3.4 0 0 0-1 2.6V22",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, strokeWidth = 1.8, ...rest }: { name: IconName; size?: number; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...rest}>
      <path d={PATHS[name]} />
    </svg>
  );
}
