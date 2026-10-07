"use client";

import { useApp } from "./providers";
import { Select } from "./ui";

export function SeriesPicker({ product, region, onProduct, onRegion }: { product?: string; region: string; onProduct?: (v: string) => void; onRegion: (v: string) => void }) {
  const { options } = useApp();
  return (
    <>
      {onProduct && (
        <Select label="Product" value={product ?? ""} onChange={onProduct}>
          <option value="">All products</option>
          {options?.products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      )}
      <Select label="Region" value={region} onChange={onRegion}>
        <option value="">All regions</option>
        {options?.regions.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </Select>
    </>
  );
}
