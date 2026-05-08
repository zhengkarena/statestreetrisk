import { mulberry32 } from '../lib/risk.js';

// ---------- Health tiles ----------
//
// Basel backtesting traffic-light at 99% confidence over rolling 250 days:
//   green ≤ 4, amber 5–9, red ≥ 10.
// We display "<count> / 5 limit" where 5 is the amber-zone entry threshold.

export const BASE_TILES = [
  {
    id: 'equity-var',
    name: 'Equity VaR',
    status: 'green',
    lastRunSecondsAgo: 90,
    dataFreshnessSecondsAgo: 38,
    exceptions: { count: 2, limit: 5, zone: 'green' },
  },
  {
    id: 'credit-var',
    name: 'Credit VaR',
    status: 'red',
    lastRunSecondsAgo: 320,
    dataFreshnessSecondsAgo: 120,
    exceptions: { count: 11, limit: 5, zone: 'red' },
  },
  {
    id: 'greeks-engine',
    name: 'Greeks Engine',
    status: 'amber',
    lastRunSecondsAgo: 45,
    dataFreshnessSecondsAgo: 22,
    exceptions: { count: 4, limit: 5, zone: 'green' },
  },
  {
    id: 'ir-risk',
    name: 'IR Risk Engine',
    status: 'green',
    lastRunSecondsAgo: 180,
    dataFreshnessSecondsAgo: 60,
    exceptions: { count: 1, limit: 5, zone: 'green' },
  },
  {
    id: 'stress-engine',
    name: 'Stress Engine',
    status: 'green',
    lastRunSecondsAgo: 720,
    dataFreshnessSecondsAgo: 95,
    exceptions: { count: 3, limit: 5, zone: 'green' },
  },
  {
    id: 'market-data-pipeline',
    name: 'Market Data Pipeline',
    status: 'amber',
    lastRunSecondsAgo: 60,
    dataFreshnessSecondsAgo: 740, // ~12 min — matches the Bloomberg FX delay alert
    exceptions: { count: 0, limit: 5, zone: 'green' },
  },
];

// ---------- Backtest series ----------
//
// 250-day series of VaR(99) and realized P&L, seeded for stability.
// VaR baseline ≈ -$1.05M (matches our Risk Metrics output) with mild drift.
// Realized P&L drawn from N(0, σ²) with occasional fat-tail draws to produce
// 6–8 exceptions over the window — Basel amber zone.

const VAR_BASE = -1_050_000;
const SIGMA = 450_000;

export function buildBacktestSeries() {
  const rng = mulberry32(0x10001);
  const days = 250;
  const out = [];
  for (let i = 0; i < days; i++) {
    // Mild drift in VaR (regime feel): slow sine wave ±5%.
    const drift = 1 + 0.05 * Math.sin((i / days) * Math.PI * 2);
    const varLine = VAR_BASE * drift;

    // Two-uniform Box-Muller normal for realized P&L.
    let u1 = 0;
    while (u1 === 0) u1 = rng();
    const u2 = rng();
    let z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    // Inject fat tails on a sparse set of days to land in Basel amber zone.
    // Force negative sign on these days so they reliably breach VaR.
    const fatTailDay = i === 18 || i === 47 || i === 89 || i === 134 || i === 178 || i === 211;
    if (fatTailDay) z = -Math.abs(z) * (2.6 + rng() * 0.5);

    let pnl = z * SIGMA;
    // One-off positive tail to break monotony.
    if (i === 102) pnl = Math.abs(pnl) * 2.1;

    out.push({
      day: i + 1,
      pnl: Math.round(pnl),
      varLine: Math.round(varLine),
      isException: pnl < varLine,
    });
  }
  return out;
}

export function exceptionCount(series) {
  return series.filter((d) => d.isException).length;
}

export function baselZone(count) {
  if (count <= 4) return { zone: 'green', label: 'Basel zone: green' };
  if (count <= 9) return { zone: 'amber', label: 'Basel zone: amber' };
  return { zone: 'red', label: 'Basel zone: red' };
}

// ---------- Alerts + runbooks ----------

export const BASE_ALERTS = [
  {
    id: 'alrt-fx-delay',
    severity: 'warn',
    title: 'Bloomberg BPipe FX feed delay 12 min on EUR pairs',
    description:
      'Refinitiv heartbeat OK; BPipe upstream queue backing up against Snowflake landing zone.',
    secondsAgo: 720,
    runbook: `## Diagnosis steps

1. **Check Bloomberg status page** — https://www.bloomberg.com/professional/support/system-status
2. **Verify BPipe heartbeat** in BPipe Admin: \`bpipe-admin --health-check\`.
3. **Inspect upstream queue depth** on the Snowflake landing zone:
\`\`\`sql
SELECT COUNT(*) AS pending
FROM raw_md.fx_landing
WHERE ingested_at > current_timestamp - interval '15 minutes';
\`\`\`
4. If queue is backing up: **page Market Data Ops on-call** (#md-ops-oncall, ext 5512).
5. If vendor outage confirmed: trigger fallback Refinitiv FX route via \`bin/failover-fx.sh\`.

**Last similar incident:** 2026-04-12 — vendor-side, resolved in 23 min.`,
  },
  {
    id: 'alrt-cvar-basel',
    severity: 'critical',
    title: 'Credit VaR backtest: 11 exceptions over rolling 250d, Basel red zone breach',
    description:
      'Capital multiplier auto-escalates from 3.0× to 4.0× per Basel framework. CRO notification required.',
    secondsAgo: 1380,
    runbook: `## Severity: CRITICAL

Credit VaR has crossed Basel red zone (≥10 exceptions over rolling 250 days at 99% conf). The capital multiplier auto-escalates from 3.0× to 4.0× per Basel framework §718.94.

## Required actions

1. **Notify CRO and Head of MRM within 1 business day** (regulatory requirement).
2. **Open SR 11-7 incident** in MRM tracker; tag for board-level escalation.
3. **Run root-cause backtest** with extended window (504d, 1000d) to confirm regime shift vs implementation defect.
4. **Page on-call quant** (#quant-oncall, ext 5301) for parallel methodology review.
5. **Hold deployment** of any related model changes until cleared by MRM.

## References

- Basel III §718.94 (backtesting traffic-light)
- Internal Policy MRM-2024-03`,
  },
  {
    id: 'alrt-snowflake-skip',
    severity: 'critical',
    title: 'Snowflake position table refresh skipped at 06:00 ET — cron alert',
    description:
      'Airflow DAG position_store_load_daily failed; downstream VaR runs blocked pending manual reload.',
    secondsAgo: 3600,
    runbook: `## Diagnosis steps

1. Check Airflow DAG \`position_store_load_daily\` — Run ID for the 06:00 ET slot.
2. Inspect Snowflake task \`RISK_PROD.LOAD_POSITIONS_EOD\` — last successful state and error message.
3. Common causes:
   - Upstream ETL warehouse paused (auto-suspend after 5 min idle)
   - Schema migration v3 lock not released
   - Source FTP file missing from upstream feed
4. **Recovery**: trigger manual reload:
\`\`\`bash
bin/load-positions.sh --eod $(date -d yesterday +%F)
\`\`\`
5. Page **Risk Technology on-call** (#risk-tech-oncall, ext 5440) if reload fails.`,
  },
  {
    id: 'alrt-mc-perf',
    severity: 'warn',
    title: 'MC VaR runtime regression: 4.2s → 12.7s on AAPL options book',
    description: '3× slowdown observed since deploy v4.2.1. APM p99 sustained above SLA.',
    secondsAgo: 2280,
    runbook: `## Diagnosis steps

1. Check recent deployments to \`mc-var-engine\` repo — last 14 days.
2. Inspect \`apm.runtime_p99\` for \`monte_carlo_var.run\` over last 30 days.
3. Profile a single-book run:
\`\`\`bash
bin/profile-mcvar.sh AAPL_OPTIONS
\`\`\`
4. Common causes for 3× regression:
   - Cholesky decomposition added unintentionally — check git log
   - Increased draw count from 10k to 50k
   - GC pressure from new vol-surface object allocation
5. If unbounded: **rollback last deployment**, page on-call quant.`,
  },
  {
    id: 'alrt-validation-pack',
    severity: 'info',
    title: 'Validation pack auto-generated for Credit VaR Q1 cycle',
    description: 'Pack uploaded to MRM document repository; reviewer assigned per round-robin.',
    secondsAgo: 7200,
    runbook: `## Info — no action required

Validation pack for Credit VaR Q1 cycle generated successfully and uploaded to the MRM document repository.

- **Pack ID:** \`MRM-VAL-CVAR-2026Q1\`
- **Submitted by:** validation-bot@statestreet
- **MRM reviewer:** assigned per round-robin

Track progress in the Project & UAT board (filter Model = Credit VaR).`,
  },
  {
    id: 'alrt-vega-limit',
    severity: 'warn',
    title: 'Vega Greek limit breach: SPX index options book at 142% of limit',
    description: 'Aggregate vega exposure exceeds desk limit. 30-min escalation SLA active.',
    secondsAgo: 2820,
    runbook: `## Diagnosis steps

1. Verify breach magnitude via Greeks dashboard — confirm 142% reading.
2. Identify the **top 3 contributing books** to aggregate vega.
3. **Required actions**:
   - Notify **Head of Trading and Market Risk within 30 minutes** (limit breach SLA).
   - Hedge to within limit by close of business **OR** submit limit-extension request to MRM.
4. Document the breach in the limit-monitoring log.
5. If the limit appears mis-calibrated for current portfolio composition: open a ticket with the **limits committee**.`,
  },
  {
    id: 'alrt-aapl-recon',
    severity: 'warn',
    title: 'AAPL EOD price reconciliation: 4 outliers vs IBKR',
    description:
      'Bloomberg vs IBKR divergence > 30bps on 4 trading days last week. Holding downstream VaR run.',
    secondsAgo: 3540,
    runbook: `## Diagnosis steps

1. Pull AAPL EOD prices from primary (Bloomberg) and secondary (IBKR):
\`\`\`sql
SELECT source, price, asof
FROM market_data.eod_prices
WHERE symbol = 'AAPL' AND asof BETWEEN current_date - 7 AND current_date - 1;
\`\`\`
2. Outliers usually trace to:
   - Bloomberg corp-action adjustment lag (~15 min on ex-div days)
   - Stale IBKR snapshot (intraday cutoff vs official close)
3. If divergence > 50bps: **hold downstream VaR run**, escalate to Market Data Ops.
4. Otherwise: log and continue to today's run.`,
  },
];
