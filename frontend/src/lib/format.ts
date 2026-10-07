const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usdCompact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const num = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

export const fmt = {
  usd: (v: number) => usd.format(v),
  usdK: (v: number) => usdCompact.format(v),
  compact: (v: number) => compact.format(v),
  num: (v: number) => num.format(v),
  int: (v: number) => Math.round(v).toLocaleString("en-US"),
  pct: (v: number, d = 1) => `${(v * 100).toFixed(d)}%`,
  month: (ym: string) => {
    const [y, m] = ym.split("-").map(Number);
    return new Date(y, m - 1).toLocaleString("en-US", { month: "short", year: "2-digit" });
  },
};

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}
