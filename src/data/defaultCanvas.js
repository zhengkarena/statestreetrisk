export const DEFAULT_CANVAS = [
  {
    id: 'stg-data-ingestion',
    name: 'Data Ingestion',
    owner: 'Market Data Ops',
    inputs: 'Bloomberg BPipe, Refinitiv Elektron, internal Snowflake position store',
    outputs: 'Validated EOD market data: FX, rates, equity, vol surfaces',
    sla: 'T+0 by 06:00 ET',
    description:
      'Pull and validate end-of-day market data feeds; reconcile against vendor goldens; flag stale, missing, or out-of-tolerance series before downstream model runs.',
  },
  {
    id: 'stg-model-dev',
    name: 'Model Development',
    owner: 'Quant Team — Model Development',
    inputs: 'Validated market data, historical positions, model spec',
    outputs: 'Calibrated VaR engine (Historical, Parametric, Monte Carlo)',
    sla: 'Quarterly recalibration; ad-hoc on regime change',
    description:
      'Implement and calibrate VaR methodologies; document assumptions, limitations, and parameter choices. Deliverables: model code, calibration report, backtest evidence.',
  },
  {
    id: 'stg-validation',
    name: 'Validation',
    owner: 'Model Risk Management (MRM)',
    inputs: 'Model code, calibration results, backtest history, developer documentation',
    outputs: 'Validation report, model risk rating, approval-to-deploy memo',
    sla: '4 weeks from submission',
    description:
      'Independent review of methodology, implementation, and limits per SR 11-7. Includes conceptual soundness, outcomes analysis, and ongoing monitoring plan.',
  },
  {
    id: 'stg-uat',
    name: 'UAT',
    owner: 'Risk Technology',
    inputs: 'Validated model artifact, UAT environment, MRM-approved test cases',
    outputs: 'UAT sign-off, defect log, regression test report',
    sla: '2 weeks',
    description:
      'End-to-end testing on prod-like data: P&L attribution, backtest exception count, scenario reproducibility, performance and SLA timing under realistic loads.',
  },
  {
    id: 'stg-production',
    name: 'Production',
    owner: 'Risk Production / SRE',
    inputs: 'Approved model artifact, production market data, production position book',
    outputs: 'Daily VaR, Greeks, stress P&L published to risk warehouse',
    sla: 'T+0 by 07:30 ET',
    description:
      'Run model nightly; publish results to downstream consumers (capital, limits, regulatory). Handle reruns on data corrections; manage incident response and rollback.',
  },
  {
    id: 'stg-monitoring',
    name: 'Monitoring',
    owner: 'Enterprise Risk Management',
    inputs: 'Daily VaR output, realized P&L, market regime indicators',
    outputs: 'Backtest exception report, breach escalations, model performance dashboard',
    sla: 'Daily monitoring; weekly ELT review',
    description:
      'Track exceptions against Basel traffic-light zones; flag parameter drift, data anomalies, and regime shifts requiring recalibration or interim overlays.',
  },
  {
    id: 'stg-decommission',
    name: 'Decommission',
    owner: 'Model Owner / MRM',
    inputs: 'Replacement model approval, retention policy, downstream consumer inventory',
    outputs: 'Sunset memo, archived artifacts, updated model inventory entry',
    sla: '30 days post-replacement deployment',
    description:
      'Gracefully retire superseded model; preserve full audit trail; communicate change to all downstream consumers; archive code and reports per retention schedule.',
  },
];
