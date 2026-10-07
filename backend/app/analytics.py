"""Descriptive analytics that back the dashboard pages (mirrors the Power BI report
and the EDA cells in the notebook)."""
from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd


def _records(df: pd.DataFrame, decimals: int = 2) -> list[dict[str, Any]]:
    out = df.copy()
    for col in out.select_dtypes(include="number").columns:
        out[col] = out[col].round(decimals)
    return out.replace({np.nan: None}).to_dict(orient="records")


def _group(df: pd.DataFrame, by: str | list[str], sort: str | None = "sales") -> pd.DataFrame:
    g = (
        df.groupby(by)
        .agg(sales=("Sales", "sum"), profit=("Profit", "sum"), quantity=("Quantity", "sum"), orders=("Order ID", "nunique"))
        .reset_index()
    )
    if sort:
        g = g.sort_values(sort, ascending=False)
    return g


def filter_options(df: pd.DataFrame) -> dict[str, Any]:
    return {
        "regions": sorted(df["Region"].unique().tolist()),
        "categories": sorted(df["Category"].unique().tolist()),
        "segments": sorted(df["Segment"].unique().tolist()),
        "products": (
            df[["Product ID", "Product Name"]]
            .drop_duplicates("Product ID")
            .sort_values("Product Name")
            .rename(columns={"Product ID": "id", "Product Name": "name"})
            .to_dict(orient="records")
        ),
        "min_date": df["Order Date"].min().date().isoformat(),
        "max_date": df["Order Date"].max().date().isoformat(),
    }


def kpis(df: pd.DataFrame) -> dict[str, float]:
    sales = float(df["Sales"].sum())
    profit = float(df["Profit"].sum())
    return {
        "total_sales": round(sales, 2),
        "total_profit": round(profit, 2),
        "total_quantity": int(df["Quantity"].sum()),
        "total_orders": int(df["Order ID"].nunique()),
        "avg_discount": round(float(df["Discount"].mean()), 4) if len(df) else 0.0,
        "avg_lead_time": round(float(df["Lead Time (Days)"].mean()), 2) if len(df) else 0.0,
        "profit_margin": round(profit / sales, 4) if sales else 0.0,
    }


def monthly_trend(df: pd.DataFrame) -> list[dict[str, Any]]:
    if df.empty:
        return []
    m = (
        df.assign(month=df["Order Date"].dt.to_period("M").astype(str))
        .groupby("month")
        .agg(sales=("Sales", "sum"), profit=("Profit", "sum"), quantity=("Quantity", "sum"), orders=("Order ID", "nunique"))
        .reset_index()
    )
    return _records(m)


def year_over_year(df: pd.DataFrame) -> dict[str, Any] | None:
    """KPIs for the trailing 12 months vs the 12 months before that."""
    if df.empty:
        return None
    end = df["Order Date"].max().to_period("M")
    current = df[df["Order Date"].dt.to_period("M") > end - 12]
    previous = df[(df["Order Date"].dt.to_period("M") <= end - 12) & (df["Order Date"].dt.to_period("M") > end - 24)]
    if previous.empty:
        return None
    cur, prev = kpis(current), kpis(previous)
    change = {k: round(cur[k] / prev[k] - 1, 4) if prev[k] else None for k in cur}
    return {"period_end": str(end), "current": cur, "previous": prev, "change": change}


def overview(df: pd.DataFrame) -> dict[str, Any]:
    """Page 1 of the Power BI report."""
    return {
        "kpis": kpis(df),
        "yoy": year_over_year(df),
        "trend": monthly_trend(df),
        "by_category": _records(_group(df, "Category").rename(columns={"Category": "name"})),
        "by_region": _records(_group(df, "Region").rename(columns={"Region": "name"})),
        "top_products": _records(_group(df, "Product Name").head(10).rename(columns={"Product Name": "name"})),
    }


def insights(df: pd.DataFrame) -> dict[str, Any]:
    """Page 2 of the Power BI report + the notebook's EDA panels."""
    products = _group(df, ["Product Name", "Category", "Sub-Category"]).rename(
        columns={"Product Name": "product", "Category": "category", "Sub-Category": "sub_category"}
    )
    products["margin"] = np.where(products["sales"] > 0, products["profit"] / products["sales"], 0)

    # Demand variability by sub-category (notebook cell 7, "Key for Safety Stock")
    mq = (
        df.assign(month=df["Order Date"].dt.month)
        .groupby(["Sub-Category", "month"])["Quantity"]
        .sum()
        .reset_index()
    )
    var = mq.groupby("Sub-Category")["Quantity"].std().fillna(0).sort_values(ascending=False)
    variability = [{"name": k, "std": round(float(v), 2)} for k, v in var.items()]

    sample = df.sample(min(500, len(df)), random_state=42) if len(df) else df
    return {
        "by_subcategory": _records(_group(df, ["Category", "Sub-Category"]).rename(columns={"Category": "category", "Sub-Category": "name"})),
        "by_state": _records(_group(df, ["State", "Region"]).rename(columns={"State": "name", "Region": "region"})),
        "by_segment": _records(_group(df, "Segment").rename(columns={"Segment": "name"})),
        "by_ship_mode": _records(_group(df, "Ship Mode", sort="orders").rename(columns={"Ship Mode": "name"})),
        "products": _records(products, 4),
        "demand_variability": variability,
        "variability_median": round(float(var.median()), 2) if len(var) else 0.0,
        "order_scatter": _records(sample[["Sales", "Profit"]].rename(columns=str.lower)),
    }
