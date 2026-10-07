import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { BeforeAfter } from "@/components/landing/before-after";
import { Reveal } from "@/components/landing/reveal";
import { LiveStats } from "@/components/landing/stats";
import { StrikeTypewriter } from "@/components/landing/typewriter";

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  { icon: "forecast", title: "Recursive ML forecasts", body: "Month-by-month demand for every product and region from a Ridge + Gradient Boosting ensemble, with 80% prediction ranges." },
  { icon: "inventory", title: "Inventory you can act on", body: "Safety stock and reorder points at 90, 95 or 99% service levels, with lead times you can override per plan." },
  { icon: "insights", title: "Power BI-grade analytics", body: "Revenue, margin, state, segment and ship-mode breakdowns with slicers that update every view at once." },
  { icon: "model", title: "Honest model metrics", body: "R², MAE, RMSE, MAPE and time-series CV on a true holdout year, with no leaky features inflating the numbers." },
  { icon: "upload", title: "Bring your own data", body: "Drop in a Superstore-style .xlsx or .csv. It's validated, cleaned and the model retrains in seconds." },
  { icon: "zap", title: "Built for speed", body: "Command palette, keyboard navigation, CSV export on every table, and an API you can call from anywhere." },
];

const STEPS = [
  { title: "Upload order history", body: "Any export with order date, product, region, quantity and sales. Missing columns are derived for you." },
  { title: "Train in seconds", body: "Lags, rolling windows and seasonality are engineered automatically, then evaluated on the most recent year." },
  { title: "Plan with confidence", body: "Forecast demand, size safety stock and set reorder points for every SKU and region from one dashboard." },
];

export default function LandingPage() {
  return (
    <div className="landing" data-theme="dark">
      <header className="l-nav">
        <div className="l-container">
          <div className="l-nav-inner">
            <Link href="/" className="l-brand">
              <span className="l-logo">
                <Icon name="logo" size={20} strokeWidth={2.6} />
              </span>
              SalesCast
            </Link>
            <nav className="l-links" aria-label="Primary">
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/dashboard/forecast">Forecast</Link>
              <a href="/docs" target="_blank" rel="noreferrer">
                API
              </a>
              <Link href="/dashboard" className="btn">
                Open App
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main>
        <section className="l-container">
          <div className="hero">
            <div>
              <h1 className="hero-title">
                Forecast demand
                <br />
                before it
                <br />
                <span className="hl">hits the shelf.</span>
              </h1>
              <p className="hero-sub">
                Stop planning from <StrikeTypewriter phrases={["spreadsheet gut-feel", "last year's numbers", "copy-pasted pivots", "stale BI exports"]} /> .
              </p>
              <ul className="hero-list">
                <li>
                  <span>
                    Every product. Every region. <strong>One model.</strong>
                  </span>
                </li>
                <li>Tagged by category, segment, region and forecast horizon.</li>
                <li>
                  <span>
                    Trained on <strong>your own order history</strong>, retrained in seconds.
                  </span>
                </li>
              </ul>
              <div className="hero-cta">
                <Link href="/dashboard" className="btn lg glow">
                  Open Dashboard <Icon name="arrowRight" size={18} strokeWidth={2.2} className="arrow" />
                </Link>
                <Link href="/dashboard/data" className="btn lg secondary">
                  Upload Your Data
                </Link>
              </div>
            </div>
            <BeforeAfter />
          </div>
        </section>

        <section className="l-section">
          <div className="l-container">
            <Reveal>
              <span className="l-eyebrow">By the numbers</span>
              <h2>Every series forecast. Every number traceable.</h2>
            </Reveal>
            <Reveal delay={80}>
              <LiveStats />
            </Reveal>
          </div>
        </section>

        <section className="l-section">
          <div className="l-container">
            <Reveal>
              <span className="l-eyebrow">Platform</span>
              <h2>From raw orders to a reorder plan.</h2>
              <p className="lede">Everything a planning team needs to go from a messy export to decisions it can defend.</p>
            </Reveal>
            <div className="features">
              {FEATURES.map((f, i) => (
                <Reveal key={f.title} delay={(i % 3) * 80}>
                  <div className="feature">
                    <span className="feature-icon">
                      <Icon name={f.icon} size={20} />
                    </span>
                    <h3>{f.title}</h3>
                    <p>{f.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="l-section">
          <div className="l-container">
            <Reveal>
              <span className="l-eyebrow">How it works</span>
              <h2>Three steps. No data science degree.</h2>
            </Reveal>
            <div className="steps">
              {STEPS.map((s, i) => (
                <Reveal key={s.title} delay={i * 100}>
                  <div className="step">
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="l-section">
          <div className="l-container">
            <Reveal>
              <div className="cta-band">
                <div>
                  <span className="l-eyebrow">Ready when you are</span>
                  <h2 style={{ marginTop: 14 }}>See next quarter before it happens.</h2>
                </div>
                <Link href="/dashboard" className="btn lg glow">
                  Open Dashboard <Icon name="arrowRight" size={18} strokeWidth={2.2} className="arrow" />
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <div className="l-container">
        <footer className="l-footer">
          <span>© {new Date().getFullYear()} SalesCast · Superstore demand forecasting</span>
          <span style={{ display: "flex", gap: 24 }}>
            <Link href="/dashboard">Dashboard</Link>
            <a href="/docs" target="_blank" rel="noreferrer">
              API reference
            </a>
          </span>
        </footer>
      </div>
    </div>
  );
}
