"""Generate a synthetic Superstore dataset with the same schema as the notebook's
`superstore_dataset.xlsx` (9,000 orders, 2021-2023, 17 columns).

The original Excel file is not part of the repository, so this script lets the
app run end-to-end out of the box. Upload your real dataset from the "Data"
page (or drop it into backend/data/) to replace it.

Usage:
    python backend/scripts/generate_sample_data.py [--rows 9000] [--out path]
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd

SEED = 42

# (Product ID, Product Name, Category, Sub-Category, base unit price, base monthly qty per region)
PRODUCTS = [
    ("FUR-BO-001", "Bush Bookcase", "Furniture", "Bookcases", 280.0, 50),
    ("FUR-CH-001", "HON Office Chair", "Furniture", "Chairs", 420.0, 44),
    ("FUR-TA-001", "Bretford Conference Table", "Furniture", "Tables", 1450.0, 26),
    ("OFF-BI-001", "Avery Binder", "Office Supplies", "Binders", 22.0, 70),
    ("OFF-PA-001", "Xerox Copy Paper", "Office Supplies", "Paper", 38.0, 78),
    ("OFF-ST-001", "Fellowes Storage Box", "Office Supplies", "Storage", 95.0, 52),
    ("OFF-AR-001", "Sanford Markers", "Office Supplies", "Art", 19.0, 66),
    ("TEC-AC-001", "Logitech Keyboard", "Technology", "Accessories", 100.0, 58),
    ("TEC-PH-001", "Samsung Galaxy", "Technology", "Phones", 960.0, 34),
    ("TEC-CO-001", "Canon Copier", "Technology", "Copiers", 2100.0, 18),
]

REGIONS = {
    "East": ["New York", "Pennsylvania", "Massachusetts", "New Jersey", "Ohio", "Virginia"],
    "West": ["California", "Washington", "Oregon", "Arizona", "Colorado", "Nevada"],
    "Central": ["Texas", "Illinois", "Michigan", "Minnesota", "Missouri", "Wisconsin"],
    "South": ["Florida", "Georgia", "North Carolina", "Tennessee", "Alabama", "Louisiana"],
}
REGION_WEIGHT = {"East": 1.15, "West": 1.25, "Central": 0.9, "South": 0.75}
SEGMENTS = (["Consumer", "Corporate", "Home Office"], [0.52, 0.30, 0.18])
SHIP_MODES = {  # mode: (probability, lead-time choices)
    "Same Day": (0.06, [1]),
    "First Class": (0.16, [1, 2]),
    "Second Class": (0.20, [2, 3, 4]),
    "Standard Class": (0.58, [3, 4, 5]),
}
DISCOUNTS = ([0.0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3], [0.38, 0.12, 0.18, 0.1, 0.12, 0.05, 0.05])
# Seasonality multipliers by month (Q4 peak, summer lift, Jan/Feb dip)
SEASONALITY = np.array([0.78, 0.82, 0.95, 0.97, 1.0, 1.08, 1.1, 1.06, 1.02, 1.08, 1.22, 1.35])


def generate(rows: int = 9000, seed: int = SEED) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    months = pd.period_range("2021-01", "2023-12", freq="M")
    regions = list(REGIONS)

    # Allocate the order count across (product, region, month) cells proportionally
    # to expected demand so quantities show trend + seasonality.
    cells, weights = [], []
    for p_idx, p in enumerate(PRODUCTS):
        for r in regions:
            for m_idx, m in enumerate(months):
                trend = 1 + 0.012 * m_idx  # ~40% growth over 3 years
                w = p[5] * REGION_WEIGHT[r] * SEASONALITY[m.month - 1] * trend
                cells.append((p_idx, r, m))
                weights.append(w * rng.lognormal(0, 0.15))
    weights = np.array(weights) / np.sum(weights)

    # Guarantee every cell has at least one order, then distribute the rest.
    counts = np.ones(len(cells), dtype=int)
    counts += rng.multinomial(rows - len(cells), weights)

    modes = list(SHIP_MODES)
    mode_p = [SHIP_MODES[m][0] for m in modes]
    records = []
    for (p_idx, region, month), n in zip(cells, counts):
        pid, name, cat, sub, base_price, _ = PRODUCTS[p_idx]
        for _ in range(n):
            day = int(rng.integers(1, month.days_in_month + 1))
            order_date = pd.Timestamp(year=month.year, month=month.month, day=day)
            mode = modes[rng.choice(len(modes), p=mode_p)]
            lead = int(rng.choice(SHIP_MODES[mode][1]))
            qty = int(np.clip(rng.poisson(7.4), 1, 14))
            discount = float(rng.choice(DISCOUNTS[0], p=DISCOUNTS[1]))
            unit_price = round(base_price * rng.uniform(0.85, 1.18), 2)
            sales = round(qty * unit_price * (1 - discount), 2)
            margin = rng.normal(0.17, 0.09) - 1.1 * discount
            profit = round(sales * margin, 2)
            records.append(
                {
                    "Order Date": order_date,
                    "Ship Date": order_date + pd.Timedelta(days=lead),
                    "Ship Mode": mode,
                    "Segment": rng.choice(SEGMENTS[0], p=SEGMENTS[1]),
                    "Region": region,
                    "State": rng.choice(REGIONS[region]),
                    "Category": cat,
                    "Sub-Category": sub,
                    "Product ID": pid,
                    "Product Name": name,
                    "Sales": sales,
                    "Quantity": qty,
                    "Discount": discount,
                    "Profit": profit,
                    "Unit Price": unit_price,
                    "Lead Time (Days)": lead,
                }
            )

    df = pd.DataFrame.from_records(records).sort_values("Order Date").reset_index(drop=True)
    ids = df.groupby(df["Order Date"].dt.year).cumcount() + 10000
    df.insert(0, "Order ID", "CA-" + df["Order Date"].dt.year.astype(str) + "-" + ids.astype(str))
    return df


def main() -> None:
    default_out = Path(__file__).resolve().parents[1] / "data" / "superstore_dataset.csv"
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--rows", type=int, default=9000)
    parser.add_argument("--seed", type=int, default=SEED)
    parser.add_argument("--out", type=Path, default=default_out)
    args = parser.parse_args()

    df = generate(args.rows, args.seed)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    if args.out.suffix.lower() in (".xlsx", ".xls"):
        df.to_excel(args.out, index=False)
    else:
        df.to_csv(args.out, index=False, date_format="%Y-%m-%d")
    print(f"Wrote {len(df):,} rows to {args.out}")


if __name__ == "__main__":
    main()
