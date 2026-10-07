# Sales Forecasting

A full-stack sales analytics and demand-forecasting app built on the Superstore dataset. It turns the analysis in `minor project (1).ipynb` and the `sales forecasting.pbix` Power BI report into a web dashboard you can run locally.

- **Backend:** FastAPI + pandas + scikit-learn. It runs the notebook's feature engineering and its Ridge + Gradient Boosting ensemble, and serves analytics, forecasts and inventory plans over a REST API.
- **Frontend:** Next.js 16 (App Router) + TypeScript + Recharts, set in Space Grotesk on a near-black and green palette.
  - **Landing page (`/`):** an animated before/after demo that shows a live forecast from the API, live stats and a feature overview.
  - **Dashboard (`/dashboard/*`):** interactive versions of the three Power BI pages, plus Forecast, Inventory and Data pages.
  - **Dashboard extras:** a collapsible sidebar, a ⌘K command palette, keyboard shortcuts, KPI cards with year-over-year deltas and sparklines, auto-generated insights, a dark/light/system theme toggle and Lenis smooth scrolling.

## Pages

| Page | What it shows | Source |
|------|---------------|--------|
| **Landing** (`/`) | Hero with a before/after toggle (scattered spreadsheets vs. a live forecast card), live dataset stats, features, how it works | New |
| **Overview** | KPI cards with YoY change and sparklines, revenue/profit/units trend, key insights, category, region share, top products. Filters for date, region, category and segment. | Power BI page 1 |
| **Insights** | Sub-category treemap, sales vs profit by product, sales by state (tile map), segment donut, orders by ship mode, demand variability, product table | Power BI page 2 + notebook EDA |
| **Forecast** | 3/6/12-month recursive forecast per product and region, with an approximate 80% interval and expected revenue. CSV export. | New |
| **Inventory** | Safety stock and reorder point per product/region, with adjustable service level and lead time | Notebook's safety-stock idea |
| **Model** | R², MAE, RMSE, MAPE, CV scores, actual vs predicted, prediction error, error distribution, feature importance, holdout table, retrain button | Power BI page 3 |
| **Data** | Upload your own `.xlsx`/`.csv` (the model retrains automatically), restore sample data, preview | New |

## Quick start

Requirements: Python 3.10+ and Node 20+.

### 1. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

On first start the API trains the model (a few seconds) and caches it in `backend/models/`. API docs: http://localhost:8000/docs

### 2. Frontend (dev mode)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 for the landing page and http://localhost:3000/dashboard for the app. In dev mode, Next.js proxies `/api` and `/docs` to the backend on port 8000 (override with `API_URL`).

### Single-server mode

`npm run build` writes a static export to `frontend/out/`. FastAPI then serves it at http://localhost:8000:

```bash
cd frontend && npm run build
```

To host the frontend on its own (Vercel, Netlify, S3), set `NEXT_PUBLIC_API_URL` to the backend's URL at build time, and add the frontend's origin to `SF_CORS_ORIGINS` on the backend.

### Keyboard shortcuts (dashboard)

| Keys | Action |
|------|--------|
| `Ctrl/⌘ K` | Command palette (navigate, retrain, switch theme, open API docs) |
| `g` then `o` / `i` / `f` / `v` / `m` / `d` | Go to Overview / Insights / Forecast / Inventory / Model / Data |
| `[` | Collapse or expand the sidebar |

### Docker

```bash
docker compose up --build
```

Then open http://localhost:8000.

## Data

The original `superstore_dataset.xlsx` used in the notebook isn't in this repo. So the app ships with **synthetic sample data** in the same 17-column schema: `backend/data/superstore_dataset.csv`, 9,000 orders, 2021–2023, made by `backend/scripts/generate_sample_data.py`.

To use the real data, upload the Excel file on the **Data** page. It's validated, saved to `backend/data/uploads/`, and the model is retrained right away. Required columns are `Order ID, Order Date, Region, Category, Sub-Category, Product ID, Product Name, Sales, Quantity, Profit`. Optional columns (`Ship Date, Ship Mode, Segment, State, Discount, Unit Price, Lead Time (Days)`) are derived or defaulted when missing.

## Model

`backend/app/ml.py` follows the notebook:

1. Aggregate orders to product × region × month.
2. Features: lags 1/2/3/6/12, rolling mean/std over 3/6/12 months, calendar flags (Q4, summer), category codes, average lead time, discount and unit price.
3. Ensemble `0.55 × Ridge(α=10, scaled) + 0.45 × GradientBoosting(300 trees, depth 2)`, clipped at 0.
4. Evaluate on the last 12 months (2023 in the sample data), with 3-fold `TimeSeriesSplit` CV.
5. Refit on all data and forecast recursively month by month.

A few changes were needed to make the notebook's model usable for real forecasts:

- **Lags per product *and* region.** The notebook grouped by `Product ID` only, so `lag_1` was often a different region's value for the same month.
- **Dropped `Num_Orders`.** It's the order count for the same month, so it's unknown when forecasting the future (target leakage).
- **Gap months filled with 0** so lags are true calendar lags.
- **Chronological CV.** The CV ran on product-sorted rows, so its folds weren't time-ordered.
- **Safety stock / reorder point in consistent units.** `SS = z·σ_daily·√L` and `ROP = daily_demand·L + SS`. The notebook mixed monthly σ with daily lead time, multiplied demand by unit price, and overwrote the 95% z (1.645) with 2.326.

Without the leaky feature, scores are lower but honest. Accuracy on your real data will differ from the synthetic sample.

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/filters` | Filter options + date bounds |
| GET | `/api/overview` | KPIs, trend, category/region/product breakdowns |
| GET | `/api/insights` | Sub-category, state, segment, ship mode, product stats |
| GET | `/api/model` | Metrics, feature importance |
| GET | `/api/model/evaluation` | Holdout actual vs predicted (`product`, `region`) |
| POST | `/api/model/retrain` | Retrain on the active dataset |
| GET | `/api/forecast` | `horizon` (1–24), `product`, `region` |
| GET | `/api/inventory` | `service_level`, `lead_time`, `product`, `region` |
| GET | `/api/dataset` | Active dataset info + preview |
| POST | `/api/dataset/upload` | Upload `.csv`/`.xlsx` (multipart `file`) |
| POST | `/api/dataset/reset` | Return to the sample dataset |

`/api/overview` and `/api/insights` accept `start`, `end` (YYYY-MM-DD) and repeatable `region`, `category`, `segment`.

## Tests

```bash
cd backend
pytest
```

## Project layout

```
backend/
  app/            FastAPI app: main.py (routes), ml.py, analytics.py, data.py, state.py
  scripts/        sample-data generator
  data/           sample dataset (+ uploads/)
  tests/
frontend/
  src/app/            / (landing) and /dashboard/{insights,forecast,inventory,model,data}
  src/components/     shell, command palette, providers (theme + Lenis), filter bar, tables, tile map, UI kit
  src/components/landing/  before/after demo, typewriter, scroll reveal, live stats
  src/lib/            API client, formatting, chart theme
minor project (1).ipynb   original analysis notebook
sales forecasting.pbix    original Power BI report
```
