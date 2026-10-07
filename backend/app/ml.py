"""Demand-forecasting model, ported from `minor project (1).ipynb`.

Pipeline (same as the notebook):
  orders -> monthly aggregation per product/region -> lag + rolling + calendar
  features -> 0.55 * Ridge + 0.45 * GradientBoosting ensemble.

Changes made so the model can be used for real forward forecasts:
  * Lags/rolling windows are computed per (Product ID, Region) series. The
    notebook grouped by Product ID only, so `lag_1` was often another region's
    value for the same month.
  * Missing months are filled with zero demand so lags are true calendar lags.
  * `Num_Orders` was dropped: it is the same-month order count, which isn't
    known when forecasting the future (target leakage).
  * TimeSeriesSplit CV runs on rows sorted by month (the notebook's frame was
    sorted by product, so the folds weren't chronological).
  * After evaluation on the holdout, the models are refit on all data before
    producing future forecasts.
"""
from __future__ import annotations

from datetime import datetime, timezone
from statistics import NormalDist
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import TimeSeriesSplit, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

KEYS = ["Product ID", "Region"]
STATIC = ["Product Name", "Category", "Sub-Category"]
EXOG = ["Avg_Lead_Time", "Avg_Discount", "Avg_Unit_Price"]
LAGS = [1, 2, 3, 6, 12]
WINDOWS = [3, 6, 12]
FEATURES = (
    [f"lag_{l}" for l in LAGS]
    + [f"RM_{w}" for w in WINDOWS]
    + [f"RS_{w}" for w in WINDOWS]
    + ["Month", "Year", "Quarter", "Is_Q4", "Is_summer", "Month_Index", "Cat_Code", "SubCat_Code"]
    + EXOG
)
TARGET = "Total_Quantity"
RIDGE_WEIGHT, GBR_WEIGHT = 0.55, 0.45
INTERVAL_Z = 1.2816  # ~80% prediction interval


# --------------------------------------------------------------------------- features
def build_monthly(df: pd.DataFrame) -> pd.DataFrame:
    """Aggregate orders to one row per product/region/month, with gaps filled."""
    d = df.assign(YearMonth=df["Order Date"].dt.to_period("M"))
    m = (
        d.groupby(KEYS + ["YearMonth"])
        .agg(
            Total_Quantity=("Quantity", "sum"),
            Total_Sales=("Sales", "sum"),
            Avg_Discount=("Discount", "mean"),
            Avg_Profit=("Profit", "mean"),
            Avg_Unit_Price=("Unit Price", "mean"),
            Num_Orders=("Order ID", "count"),
            Avg_Lead_Time=("Lead Time (Days)", "mean"),
        )
        .reset_index()
    )

    periods = pd.DataFrame({"YearMonth": pd.period_range(m["YearMonth"].min(), d["YearMonth"].max(), freq="M")})
    first_seen = m.groupby(KEYS)["YearMonth"].min().rename("first_seen").reset_index()
    grid = first_seen.merge(periods, how="cross")
    grid = grid[grid["YearMonth"] >= grid["first_seen"]].drop(columns="first_seen")

    m = grid.merge(m, on=KEYS + ["YearMonth"], how="left")
    for col in ["Total_Quantity", "Total_Sales", "Num_Orders", "Avg_Profit"]:
        m[col] = m[col].fillna(0)
    m = m.sort_values(KEYS + ["YearMonth"]).reset_index(drop=True)
    for col in EXOG:
        m[col] = m.groupby(KEYS)[col].transform(lambda s: s.ffill().bfill())

    static = d.drop_duplicates("Product ID").set_index("Product ID")[STATIC]
    m = m.join(static, on="Product ID")

    ts = m["YearMonth"].dt.to_timestamp()
    m["Month"] = ts.dt.month
    m["Year"] = ts.dt.year
    m["Quarter"] = ts.dt.quarter
    return m


def _calendar(period: pd.Period, base_year: int) -> dict[str, float]:
    return {
        "Month": period.month,
        "Year": period.year,
        "Quarter": period.quarter,
        "Is_Q4": int(period.quarter == 4),
        "Is_summer": int(period.month in (6, 7, 8)),
        "Month_Index": (period.year - base_year) * 12 + period.month,
    }


def add_features(m: pd.DataFrame, base_year: int, cat_map: dict, sub_map: dict) -> pd.DataFrame:
    m = m.copy()
    g = m.groupby(KEYS)[TARGET]
    for lag in LAGS:
        m[f"lag_{lag}"] = g.shift(lag)
    for w in WINDOWS:
        m[f"RM_{w}"] = g.transform(lambda x: x.shift(1).rolling(w, min_periods=1).mean())
        m[f"RS_{w}"] = g.transform(lambda x: x.shift(1).rolling(w, min_periods=2).std())

    m["Is_Q4"] = (m["Quarter"] == 4).astype(int)
    m["Is_summer"] = m["Month"].isin([6, 7, 8]).astype(int)
    m["Month_Index"] = (m["Year"] - base_year) * 12 + m["Month"]
    m["Cat_Code"] = m["Category"].map(cat_map).fillna(-1).astype(int)
    m["SubCat_Code"] = m["Sub-Category"].map(sub_map).fillna(-1).astype(int)
    return m


def history_features(hist: np.ndarray) -> dict[str, float]:
    """Lag/rolling features for the month right after `hist` (mirrors add_features)."""
    out: dict[str, float] = {}
    for lag in LAGS:
        out[f"lag_{lag}"] = float(hist[-lag]) if len(hist) >= lag else 0.0
    for w in WINDOWS:
        win = hist[-w:]
        out[f"RM_{w}"] = float(win.mean()) if len(win) else 0.0
        out[f"RS_{w}"] = float(win.std(ddof=1)) if len(win) >= 2 else 0.0
    return out


# --------------------------------------------------------------------------- models
def _make_models() -> tuple[Pipeline, GradientBoostingRegressor]:
    ridge = Pipeline([("scaler", StandardScaler()), ("model", Ridge(alpha=10))])
    gbr = GradientBoostingRegressor(
        n_estimators=300,
        max_depth=2,
        learning_rate=0.05,
        subsample=0.6,
        min_samples_leaf=15,
        max_features=0.7,
        random_state=42,
    )
    return ridge, gbr


def _ensemble(ridge, gbr, X: pd.DataFrame) -> np.ndarray:
    return np.maximum(RIDGE_WEIGHT * ridge.predict(X) + GBR_WEIGHT * gbr.predict(X), 0)


def _mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    mask = y_true != 0
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100) if mask.any() else 0.0


def train(df: pd.DataFrame) -> dict[str, Any]:
    monthly = build_monthly(df)
    base_year = int(monthly["Year"].min())
    cat_map = {c: i for i, c in enumerate(sorted(monthly["Category"].unique()))}
    sub_map = {c: i for i, c in enumerate(sorted(monthly["Sub-Category"].unique()))}

    feat = add_features(monthly, base_year, cat_map, sub_map)
    feat = feat.dropna(subset=["lag_1"]).sort_values(["YearMonth"] + KEYS).reset_index(drop=True)
    feat[FEATURES] = feat[FEATURES].fillna(0)

    # Holdout = last 12 months (the notebook used calendar 2023), or last quarter of history.
    months = sorted(feat["YearMonth"].unique())
    n_test = 12 if len(months) >= 24 else max(1, len(months) // 4)
    cutoff = months[-n_test]
    train_df, test_df = feat[feat["YearMonth"] < cutoff], feat[feat["YearMonth"] >= cutoff]

    ridge, gbr = _make_models()
    ridge.fit(train_df[FEATURES], train_df[TARGET])
    gbr.fit(train_df[FEATURES], train_df[TARGET])
    pred_train = _ensemble(ridge, gbr, train_df[FEATURES])
    pred_test = _ensemble(ridge, gbr, test_df[FEATURES])
    y_train, y_test = train_df[TARGET].to_numpy(), test_df[TARGET].to_numpy()

    tscv = TimeSeriesSplit(n_splits=3)
    cv_ridge = cross_val_score(_make_models()[0], feat[FEATURES], feat[TARGET], cv=tscv, scoring="r2")
    cv_gbr = cross_val_score(_make_models()[1], feat[FEATURES], feat[TARGET], cv=tscv, scoring="r2")

    train_r2 = r2_score(y_train, pred_train)
    test_r2 = r2_score(y_test, pred_test)
    metrics = {
        "train_r2": train_r2,
        "test_r2": test_r2,
        "mae": mean_absolute_error(y_test, pred_test),
        "rmse": float(np.sqrt(mean_squared_error(y_test, pred_test))),
        "mape": _mape(y_test, pred_test),
        "gap": train_r2 - test_r2,
        "cv_ridge_r2": float(cv_ridge.mean()),
        "cv_gbr_r2": float(cv_gbr.mean()),
        "train_rows": int(len(train_df)),
        "test_rows": int(len(test_df)),
        "test_start": str(cutoff),
        "test_end": str(months[-1]),
    }
    metrics = {k: (round(float(v), 4) if isinstance(v, (float, np.floating)) else v) for k, v in metrics.items()}

    evaluation = test_df[KEYS + STATIC + ["YearMonth"]].copy()
    evaluation["actual"] = y_test
    evaluation["predicted"] = pred_test
    evaluation["error"] = evaluation["actual"] - evaluation["predicted"]
    evaluation["YearMonth"] = evaluation["YearMonth"].astype(str)

    resid = evaluation.groupby(KEYS)["error"].std(ddof=1)
    residual_std = {f"{k[0]}|{k[1]}": float(v) for k, v in resid.fillna(metrics["rmse"]).items()}

    importances = sorted(
        ({"feature": f, "importance": round(float(i), 4)} for f, i in zip(FEATURES, gbr.feature_importances_)),
        key=lambda r: r["importance"],
        reverse=True,
    )

    # Refit on everything for forward-looking forecasts.
    final_ridge, final_gbr = _make_models()
    final_ridge.fit(feat[FEATURES], feat[TARGET])
    final_gbr.fit(feat[FEATURES], feat[TARGET])

    return {
        "ridge": final_ridge,
        "gbr": final_gbr,
        "features": FEATURES,
        "base_year": base_year,
        "cat_map": cat_map,
        "sub_map": sub_map,
        "metrics": metrics,
        "evaluation": evaluation,
        "residual_std": residual_std,
        "feature_importance": importances,
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }


# --------------------------------------------------------------------------- forecasting
def forecast(bundle: dict[str, Any], monthly: pd.DataFrame, horizon: int) -> pd.DataFrame:
    """Recursive multi-step forecast for every product/region series.

    Returns one row per series per future month with predicted quantity, an
    approximate 80% interval (from holdout residuals) and expected revenue.
    """
    series = []
    for (pid, region), s in monthly.groupby(KEYS, sort=True):
        recent = s.tail(6)
        series.append(
            {
                "Product ID": pid,
                "Region": region,
                "Product Name": s["Product Name"].iloc[0],
                "Category": s["Category"].iloc[0],
                "Sub-Category": s["Sub-Category"].iloc[0],
                "hist": s[TARGET].to_numpy(dtype=float),
                "last": s["YearMonth"].iloc[-1],
                "exog": {c: float(recent[c].mean()) for c in EXOG},
                "sigma": bundle["residual_std"].get(f"{pid}|{region}", bundle["metrics"]["rmse"]),
            }
        )
    if not series:
        return pd.DataFrame()

    rows = []
    for h in range(1, horizon + 1):
        X = []
        for s in series:
            period = s["last"] + h
            feats = history_features(s["hist"])
            feats.update(_calendar(period, bundle["base_year"]))
            feats["Cat_Code"] = bundle["cat_map"].get(s["Category"], -1)
            feats["SubCat_Code"] = bundle["sub_map"].get(s["Sub-Category"], -1)
            feats.update(s["exog"])
            X.append(feats)
        preds = _ensemble(bundle["ridge"], bundle["gbr"], pd.DataFrame(X, columns=bundle["features"]))
        for s, p in zip(series, preds):
            s["hist"] = np.append(s["hist"], p)
            price = s["exog"]["Avg_Unit_Price"] * (1 - s["exog"]["Avg_Discount"])
            rows.append(
                {
                    "Product ID": s["Product ID"],
                    "Product Name": s["Product Name"],
                    "Category": s["Category"],
                    "Sub-Category": s["Sub-Category"],
                    "Region": s["Region"],
                    "YearMonth": str(s["last"] + h),
                    "step": h,
                    "predicted": float(p),
                    "sigma": float(s["sigma"]),
                    "expected_sales": float(p * price),
                    "lead_time": s["exog"]["Avg_Lead_Time"],
                }
            )
    return pd.DataFrame(rows)


def inventory_plan(
    next_month: pd.DataFrame,
    monthly: pd.DataFrame,
    service_level: float,
    lead_time_override: float | None = None,
) -> pd.DataFrame:
    """Safety stock and reorder point per series from next month's forecast.

    SS  = z * sigma_daily * sqrt(L)        (sigma from forecast residuals)
    ROP = forecast_daily_demand * L + SS
    The notebook's version multiplied demand by unit price and used monthly
    sigma with daily lead time; this keeps everything in units/day.
    """
    z = NormalDist().inv_cdf(service_level)
    recent_cv = (
        monthly.groupby(KEYS)[TARGET]
        .apply(lambda s: s.tail(12).std(ddof=1) / s.tail(12).mean() if s.tail(12).mean() else 0.0)
        .rename("demand_cv")
        .reset_index()
    )
    plan = next_month.merge(recent_cv, on=KEYS, how="left")
    lead = plan["lead_time"] if lead_time_override is None else pd.Series(lead_time_override, index=plan.index)
    plan["lead_time"] = lead
    plan["daily_demand"] = plan["predicted"] / 30
    plan["safety_stock"] = z * (plan["sigma"] / np.sqrt(30)) * np.sqrt(lead)
    plan["reorder_point"] = plan["daily_demand"] * lead + plan["safety_stock"]
    plan["z"] = z
    return plan
