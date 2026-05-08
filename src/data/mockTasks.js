// 12 mock model-risk project cards distributed across To Do (3) /
// In Progress (4) / UAT (3) / Done (2). Stable IDs so the demo can
// reference specific UAT cases without random-key churn.

const today = new Date();
function days(n) {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export const MOCK_TASKS = [
  // ---------- To Do ----------
  {
    id: 'tsk-01',
    title: 'Recalibrate equity VaR — historical window extension Q1',
    modelName: 'Equity VaR',
    owner: 'Quant Team',
    priority: 'med',
    status: 'todo',
    dueDate: days(14),
    description:
      'Extend rolling historical window from 252 to 504 trading days for the equity VaR engine. Run parallel calibration vs current production, document divergence per Basel multiplier band, and prepare MRM submission package.',
    uatCases: [],
    createdAt: days(-21),
    updatedAt: days(-3),
  },
  {
    id: 'tsk-02',
    title: 'Stress scenario library expansion: add 2023 SVB regional bank shock',
    modelName: 'Stress Framework',
    owner: 'Market Risk',
    priority: 'med',
    status: 'todo',
    dueDate: days(28),
    description:
      'Codify SVB / regional bank stress as a named scenario: parallel rate +50bp, regional bank equity -45%, AT1 spread +600bp, USD funding cost +75bp. Wire into Tab 2 stress panel and document calibration sources.',
    uatCases: [],
    createdAt: days(-10),
    updatedAt: days(-2),
  },
  {
    id: 'tsk-03',
    title: 'MC VaR Cholesky decomposition for cross-asset correlation',
    modelName: 'Monte Carlo VaR',
    owner: 'Quant Team',
    priority: 'low',
    status: 'todo',
    dueDate: null,
    description:
      'Replace independent-normal MC sampling with Cholesky-decomposed empirical correlation matrix. Expected impact: tighter MC VaR vs Historical, closer alignment between methods. Backlog item.',
    uatCases: [],
    createdAt: days(-30),
    updatedAt: days(-30),
  },

  // ---------- In Progress ----------
  {
    id: 'tsk-04',
    title: 'Vega Greek calculation discrepancy on long-dated SPX options',
    modelName: 'Greeks Engine',
    owner: 'Quant Team',
    priority: 'high',
    status: 'in_progress',
    dueDate: days(4),
    description:
      'Production Vega for SPX options >1Y diverges from vendor benchmark by 8-12%. Investigation points to incorrect day-count convention in T scaling. Hotfix branch open; pending parallel run on 30 days of EOD data.',
    uatCases: [],
    createdAt: days(-7),
    updatedAt: days(0),
  },
  {
    id: 'tsk-05',
    title: 'Refinitiv FX rate ingestion latency spike — root cause',
    modelName: 'Market Data Pipeline',
    owner: 'Market Data Ops',
    priority: 'high',
    status: 'in_progress',
    dueDate: days(2),
    description:
      'Refinitiv Elektron FX feed delayed by 8-15 minutes on 4 of last 7 days, threatening 06:00 ET SLA. Vendor TAC engaged; in parallel investigating internal queue back-pressure on Snowflake landing zone.',
    uatCases: [],
    createdAt: days(-5),
    updatedAt: days(0),
  },
  {
    id: 'tsk-06',
    title: 'Add EMU sovereign yield curve to rate stress framework',
    modelName: 'Stress Framework',
    owner: 'Market Risk',
    priority: 'med',
    status: 'in_progress',
    dueDate: days(10),
    description:
      'Onboard ECB sovereign curves (DE, FR, IT, ES) for granular EMU rate stress. Currently using a single bunds curve as proxy. Coordinating with Market Data Ops on Bloomberg BCURVES feed.',
    uatCases: [],
    createdAt: days(-12),
    updatedAt: days(-1),
  },
  {
    id: 'tsk-07',
    title: 'Backtest exception remediation — XOM equity model breach Q4',
    modelName: 'Equity VaR',
    owner: 'Model Risk Management',
    priority: 'high',
    status: 'in_progress',
    dueDate: days(7),
    description:
      'Q4 backtest exceptions on XOM book breached Basel yellow-zone threshold (5 exceptions over 250 days at 99% conf). Root-cause analysis: oil price regime shift not captured in 252-day window. Mitigation memo drafted.',
    uatCases: [],
    createdAt: days(-15),
    updatedAt: days(-1),
  },

  // ---------- UAT ----------
  {
    id: 'tsk-08',
    title: 'SR 11-7 annual model validation cycle — Credit VaR',
    modelName: 'Credit VaR',
    owner: 'Model Risk Management',
    priority: 'high',
    status: 'uat',
    dueDate: days(5),
    description:
      'Annual independent validation per SR 11-7. Scope: methodology, calibration, implementation, outcomes analysis. UAT exit criteria: all PD/LGD backtests pass and concentration limit logic verified end-to-end.',
    uatCases: [
      {
        id: 'uat-08-1',
        scenario: 'PD calibration backtest, 2-year window',
        expected: 'KS test p-value > 0.05',
        actual: 'p = 0.12',
        status: 'pass',
      },
      {
        id: 'uat-08-2',
        scenario: 'LGD distribution stability across recovery rate states',
        expected: '95% CI width < 5pp across 4 states',
        actual: 'max width 4.2pp',
        status: 'pass',
      },
      {
        id: 'uat-08-3',
        scenario: 'Single-name concentration limit logic',
        expected: 'Warn at 8% notional, block at 10%',
        actual: 'Warns at 8.0%, blocks at 10.0%',
        status: 'pass',
      },
      {
        id: 'uat-08-4',
        scenario: 'Recovery rate scenario sensitivity',
        expected: '±15% LGD shift produces ±X PV impact per spec table',
        actual: 'Deviation 22% from spec on shift-down state',
        status: 'fail',
      },
    ],
    createdAt: days(-25),
    updatedAt: days(0),
  },
  {
    id: 'tsk-09',
    title: 'IR Swap DV01 calculation — production parallel run',
    modelName: 'IR Risk',
    owner: 'Risk Production',
    priority: 'med',
    status: 'uat',
    dueDate: days(3),
    description:
      'New DV01 engine in parallel with legacy for 10 trading days. Exit on close-of-business agreement and zero P&L attribution residual outliers >$5k.',
    uatCases: [
      {
        id: 'uat-09-1',
        scenario: '5Y SOFR receive-fixed DV01 vs vendor benchmark',
        expected: 'Within $50/bp on $25M notional',
        actual: '$12/bp deviation',
        status: 'pass',
      },
      {
        id: 'uat-09-2',
        scenario: '10Y receive-fixed under +100bp parallel shift',
        expected: '-$3.36M reval (analytical)',
        actual: '-$3.31M',
        status: 'pass',
      },
      {
        id: 'uat-09-3',
        scenario: 'Cross-currency basis spread reproducibility',
        expected: 'Deterministic across reruns',
        actual: '',
        status: 'pending',
      },
    ],
    createdAt: days(-18),
    updatedAt: days(-1),
  },
  {
    id: 'tsk-10',
    title: 'Snowflake position store schema migration v3',
    modelName: 'Position Pipeline',
    owner: 'Risk Technology',
    priority: 'med',
    status: 'uat',
    dueDate: days(6),
    description:
      'Migrate position store to v3 schema (adds book hierarchy, regulatory netting set, sub-account). Backwards-compat view for downstream consumers during cutover. Exit when all 14 consumers green and load throughput meets SLA.',
    uatCases: [
      {
        id: 'uat-10-1',
        scenario: 'Schema v3 backwards compatibility with downstream consumers',
        expected: 'All 14 consumers green on backwards-compat view',
        actual: '13 green, 1 fail (Capital reporting on netting set field)',
        status: 'fail',
      },
      {
        id: 'uat-10-2',
        scenario: 'Position load throughput',
        expected: '< 90s for 250k rows',
        actual: '67s',
        status: 'pass',
      },
    ],
    createdAt: days(-20),
    updatedAt: days(-1),
  },

  // ---------- Done ----------
  {
    id: 'tsk-11',
    title: 'Quarterly Greeks attribution report automation',
    modelName: 'Greeks Engine',
    owner: 'Quant Team',
    priority: 'low',
    status: 'done',
    dueDate: days(-5),
    description:
      'Automate quarterly P&L attribution report (delta / gamma / vega / theta / unexplained). Replaces manual Excel pull. Sign-off received from Market Risk and Finance.',
    uatCases: [
      {
        id: 'uat-11-1',
        scenario: 'Daily P&L attribution sums to total ±$1k',
        expected: '|residual| < $1,000',
        actual: '$237 max over 30 days',
        status: 'pass',
      },
      {
        id: 'uat-11-2',
        scenario: 'Vega contribution rolls up correctly per book',
        expected: 'Matches per-book sum',
        actual: 'Matches across 6 books',
        status: 'pass',
      },
    ],
    createdAt: days(-60),
    updatedAt: days(-5),
  },
  {
    id: 'tsk-12',
    title: 'Decommission legacy Parametric VaR engine v1',
    modelName: 'Equity VaR',
    owner: 'Model Risk Management',
    priority: 'med',
    status: 'done',
    dueDate: days(-12),
    description:
      'Retire v1 Parametric VaR after v2 deployment. Sunset memo distributed; archive of code, data, and reports retained per 7-year model retention policy.',
    uatCases: [
      {
        id: 'uat-12-1',
        scenario: 'All consumers migrated off legacy endpoint',
        expected: 'Zero calls to legacy URL in 30-day audit window',
        actual: '0 calls',
        status: 'pass',
      },
      {
        id: 'uat-12-2',
        scenario: 'Archive of v1 source code, data, and reports',
        expected: 'Stored per 7-year retention policy',
        actual: 'Stored on archive bucket, hash verified',
        status: 'pass',
      },
    ],
    createdAt: days(-90),
    updatedAt: days(-12),
  },
];
