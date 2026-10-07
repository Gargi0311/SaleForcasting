"""Dataset loading, validation and filtering."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import BinaryIO, Sequence

import pandas as pd

REQUIRED_COLUMNS = [
    "Order ID",
    "Order Date",
    "Region",
    "Category",
    "Sub-Category",
    "Product ID",
    "Product Name",
    "Sales",
    "Quantity",
    "Profit",
]
# Optional columns get a sensible default (or are derived) when missing.
OPTIONAL_DEFAULTS = {
    "Ship Mode": "Unknown",
    "Segment": "Unknown",
    "State": "Unknown",
    "Discount": 0.0,
}
NUMERIC_COLUMNS = ["Sales", "Quantity", "Discount", "Profit", "Unit Price", "Lead Time (Days)"]


class DatasetError(ValueError):
    """Raised when an uploaded dataset can't be used."""


def read_table(source: Path | BinaryIO, filename: str) -> pd.DataFrame:
    suffix = Path(filename).suffix.lower()
    try:
        if suffix in (".xlsx", ".xls"):
            return pd.read_excel(source)
        if suffix == ".csv":
            return pd.read_csv(source)
    except Exception as exc:  # pandas raises many different error types
        raise DatasetError(f"Could not read {filename}: {exc}") from exc
    raise DatasetError("Unsupported file type. Upload a .csv or .xlsx file.")


def clean(raw: pd.DataFrame) -> pd.DataFrame:
    df = raw.copy()
    df.columns = [str(c).strip() for c in df.columns]

    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise DatasetError(f"Missing required column(s): {', '.join(missing)}")

    df["Order Date"] = pd.to_datetime(df["Order Date"], errors="coerce")
    if "Ship Date" in df.columns:
        df["Ship Date"] = pd.to_datetime(df["Ship Date"], errors="coerce")

    for col, default in OPTIONAL_DEFAULTS.items():
        if col not in df.columns:
            df[col] = default
    for col in NUMERIC_COLUMNS:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    if "Lead Time (Days)" not in df.columns:
        if "Ship Date" in df.columns:
            df["Lead Time (Days)"] = (df["Ship Date"] - df["Order Date"]).dt.days
        else:
            df["Lead Time (Days)"] = 0
    if "Unit Price" not in df.columns:
        df["Unit Price"] = df["Sales"] / (df["Quantity"] * (1 - df["Discount"].fillna(0))).where(df["Quantity"] > 0)

    df = df.dropna(subset=["Order Date", "Product ID", "Region", "Sales", "Quantity"])
    df["Discount"] = df["Discount"].fillna(0)
    df["Lead Time (Days)"] = df["Lead Time (Days)"].fillna(df["Lead Time (Days)"].median()).clip(lower=0)
    df["Unit Price"] = df["Unit Price"].fillna(df["Unit Price"].median())
    df["Profit"] = df["Profit"].fillna(0)
    for col in ["Region", "Category", "Sub-Category", "Product ID", "Product Name", "Segment", "Ship Mode", "State"]:
        df[col] = df[col].astype(str).str.strip()

    if df.empty:
        raise DatasetError("No usable rows after cleaning.")
    months = df["Order Date"].dt.to_period("M").nunique()
    if months < 6:
        raise DatasetError(f"Need at least 6 months of history to train a forecast (found {months}).")
    return df.sort_values("Order Date", kind="stable").reset_index(drop=True)


def load_dataset(path: Path) -> pd.DataFrame:
    return clean(read_table(path, path.name))


def fingerprint(df: pd.DataFrame) -> str:
    return format(int(pd.util.hash_pandas_object(df, index=False).sum()) & 0xFFFFFFFFFFFF, "x")


@dataclass
class Filters:
    start: date | None = None
    end: date | None = None
    regions: Sequence[str] = field(default_factory=list)
    categories: Sequence[str] = field(default_factory=list)
    segments: Sequence[str] = field(default_factory=list)

    def apply(self, df: pd.DataFrame) -> pd.DataFrame:
        mask = pd.Series(True, index=df.index)
        if self.start:
            mask &= df["Order Date"] >= pd.Timestamp(self.start)
        if self.end:
            mask &= df["Order Date"] < pd.Timestamp(self.end) + pd.Timedelta(days=1)
        if self.regions:
            mask &= df["Region"].isin(self.regions)
        if self.categories:
            mask &= df["Category"].isin(self.categories)
        if self.segments:
            mask &= df["Segment"].isin(self.segments)
        return df[mask]
