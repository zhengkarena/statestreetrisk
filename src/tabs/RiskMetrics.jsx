import { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { get } from '../lib/storage.js';
import { MOCK_POSITIONS } from '../data/mockPositions.js';
import { getMarketReturns } from '../data/mockMarket.js';
import {
  portfolioSummary,
  positionGreeks,
  portfolioGreeks,
  portfolioPnLSeries,
  historicalVaR,
  parametricVaR,
  monteCarloVaR,
  shockPortfolioPnL,
  normPDF,
} from '../lib/risk.js';

const STORAGE_KEY = 'portfolio';

// ---------- Number formatting ----------

const usd0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function fmtMoney(n, decimals = 0) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const fmt = decimals ? usd2 : usd0;
  return (n < 0 ? '-$' : '$') + fmt.format(Math.abs(n));
}

function signedColor(n) {
  if (n === 0 || n === null || n === undefined || Number.isNaN(n)) return 'text-slate-700';
  return n < 0 ? 'text-red-700' : 'text-emerald-700';
}

const STRESS_PRESETS = [
  { id: 'gfc-2008', label: '2008 GFC', equityShock: -0.38, rateShockBps: -200, volShockPts: 0.30 },
  { id: 'covid-2020', label: '2020 COVID', equityShock: -0.34, rateShockBps: -150, volShockPts: 0.50 },
  { id: 'rates-2022', label: '2022 Rate Shock', equityShock: -0.19, rateShockBps: 425, volShockPts: 0.05 },
];

// ---------- Component ----------

export default function RiskMetrics() {
  const [portfolio, setPortfolio] = useState(() => get(STORAGE_KEY, null) ?? MOCK_POSITIONS);

  // Re-read storage on mount so DataHub commits flow through.
  useEffect(() => {
    setPortfolio(get(STORAGE_KEY, null) ?? MOCK_POSITIONS);
  }, []);

  const summary = useMemo(() => portfolioSummary(portfolio), [portfolio]);
  const totalGreeks = useMemo(() => portfolioGreeks(portfolio), [portfolio]);

  const histPnls = useMemo(
    () => portfolioPnLSeries(portfolio, getMarketReturns),
    [portfolio],
  );

  const histVaR95 = useMemo(() => historicalVaR(histPnls, 95), [histPnls]);
  const histVaR99 = useMemo(() => historicalVaR(histPnls, 99), [histPnls]);
  const paramVaR95 = useMemo(() => parametricVaR(histPnls, 95), [histPnls]);
  const paramVaR99 = useMemo(() => parametricVaR(histPnls, 99), [histPnls]);
  const mcResult = useMemo(
    () => monteCarloVaR(portfolio, getMarketReturns, 95, 10000),
    [portfolio],
  );
  const mcVaR99 = useMemo(
    () => monteCarloVaR(portfolio, getMarketReturns, 99, 10000).var,
    [portfolio],
  );

  const paramSigma = useMemo(() => {
    if (!histPnls.length) return 0;
    const m = histPnls.reduce((a, b) => a + b, 0) / histPnls.length;
    const v = histPnls.reduce((a, b) => a + (b - m) ** 2, 0) / histPnls.length;
    return Math.sqrt(v);
  }, [histPnls]);

  // Stress shock state — initial = no shock.
  const [shock, setShock] = useState({ equityShock: 0, rateShockBps: 0, volShockPts: 0 });
  const stress = useMemo(() => shockPortfolioPnL(portfolio, shock), [portfolio, shock]);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <PortfolioSummary summary={summary} />

      <section>
        <SectionHeader
          title="Value at Risk"
          subtitle="1-day horizon · returns from 252-day seeded history"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <VaRCard
            method="Historical Simulation"
            note="Empirical 5th/1st percentile of historical portfolio P&L."
            v95={histVaR95}
            v99={histVaR99}
            distribution={{ kind: 'histogram', data: histPnls, varAt95: -histVaR95 }}
          />
          <VaRCard
            method="Parametric (Variance-Covariance)"
            note="Assumes P&L ~ N(0, σ²); z(95)=1.645, z(99)=2.326."
            v95={paramVaR95}
            v99={paramVaR99}
            distribution={{ kind: 'normal', sigma: paramSigma, varAt95: -paramVaR95 }}
          />
          <VaRCard
            method="Monte Carlo (10,000 draws)"
            note="Independent per-asset normals; ignores cross-asset correlation."
            v95={mcResult.var}
            v99={mcVaR99}
            distribution={{ kind: 'histogram', data: mcResult.pnls, varAt95: -mcResult.var }}
          />
        </div>
      </section>

      <section>
        <SectionHeader
          title="Greeks"
          subtitle="Position-level sensitivities. Equities: Δ=1 per share. Swaps excluded — see DV01 in Stress."
        />
        <GreeksTable portfolio={portfolio} totalGreeks={totalGreeks} />
      </section>

      <section>
        <SectionHeader
          title="Stress Testing"
          subtitle="Apply preset historical scenarios or custom shocks. Options re-priced via full Black-Scholes; swaps via DV01."
        />
        <StressPanel shock={shock} setShock={setShock} stress={stress} portfolio={portfolio} />
      </section>
    </div>
  );
}

// ---------- Sub-components ----------

function SectionHeader({ title, subtitle }) {
  return (
    <header className="mb-3">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
    </header>
  );
}

function PortfolioSummary({ summary }) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <SummaryCard label="Total notional" value={fmtMoney(summary.notional)} mono />
      <SummaryCard label="Mark-to-market" value={fmtMoney(summary.mtm)} mono signed={summary.mtm} />
      <SummaryCard label="Positions" value={summary.count} mono />
    </section>
  );
}

function SummaryCard({ label, value, mono, signed }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-5 py-4">
      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">{label}</div>
      <div
        className={
          'mt-1 text-2xl font-semibold tabular-nums text-right ' +
          (mono ? 'font-mono ' : '') +
          (signed !== undefined ? signedColor(signed) : 'text-slate-900')
        }
      >
        {value}
      </div>
    </div>
  );
}

function VaRCard({ method, note, v95, v99, distribution }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col">
      <div className="text-[10px] font-mono uppercase tracking-wider text-navy-700">VaR</div>
      <div className="text-sm font-semibold text-slate-900">{method}</div>
      <div className="text-[11px] text-slate-500 mt-0.5 leading-snug min-h-[28px]">{note}</div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <VaRValue label="95% conf." value={v95} />
        <VaRValue label="99% conf." value={v99} />
      </div>

      <div className="mt-3 -mx-1">
        <DistributionChart distribution={distribution} />
      </div>
    </div>
  );
}

function VaRValue({ label, value }) {
  return (
    <div className="bg-slate-50 rounded px-3 py-2">
      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">{label}</div>
      <div className="font-mono text-base font-semibold text-red-700 text-right tabular-nums">
        {fmtMoney(value)}
      </div>
    </div>
  );
}

function DistributionChart({ distribution }) {
  const { kind } = distribution;
  const bins = useMemo(() => {
    if (kind === 'normal') return buildNormalBins(distribution.sigma, distribution.varAt95);
    return buildHistogramBins(distribution.data, distribution.varAt95);
  }, [distribution.kind, distribution.sigma, distribution.varAt95, distribution.data]);

  const cutoff = distribution.varAt95;

  return (
    <div className="h-24">
      <ResponsiveContainer>
        <BarChart data={bins} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <XAxis dataKey="x" hide />
          <YAxis hide />
          <Tooltip
            cursor={{ fill: 'rgba(0,0,0,0.04)' }}
            contentStyle={{
              fontSize: 11,
              fontFamily: 'JetBrains Mono, monospace',
              padding: '4px 8px',
            }}
            formatter={(v) => v.toFixed(3)}
            labelFormatter={(l) => 'P&L bin: ' + fmtMoney(l)}
          />
          <Bar
            dataKey="count"
            fill="#446a93"
            isAnimationActive={false}
            shape={(props) => {
              const { x, y, width, height, payload } = props;
              const inTail = payload.x <= cutoff;
              return (
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill={inTail ? '#dc2626' : '#446a93'}
                />
              );
            }}
          />
          <ReferenceLine x={cutoff} stroke="#7f1d1d" strokeDasharray="3 3" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function buildHistogramBins(values, _cutoff) {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const nBins = 30;
  const step = (max - min) / nBins || 1;
  const bins = new Array(nBins).fill(0).map((_, i) => ({ x: min + i * step, count: 0 }));
  values.forEach((v) => {
    let idx = Math.floor((v - min) / step);
    if (idx >= nBins) idx = nBins - 1;
    if (idx < 0) idx = 0;
    bins[idx].count++;
  });
  return bins;
}

function buildNormalBins(sigma, _cutoff) {
  if (!sigma) return [];
  const range = 4 * sigma;
  const nBins = 60;
  const step = (2 * range) / nBins;
  const out = [];
  for (let i = 0; i < nBins; i++) {
    const x = -range + i * step;
    out.push({ x, count: normPDF(x / sigma) });
  }
  return out;
}

// ---------- Greeks ----------

function GreeksTable({ portfolio, totalGreeks }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <table className="min-w-full text-xs">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <Th align="left">Position</Th>
            <Th align="left">Type</Th>
            <Th align="right">Δ Delta</Th>
            <Th align="right">Γ Gamma</Th>
            <Th align="right">Vega ($/1% IV)</Th>
            <Th align="right">Θ ($/day)</Th>
            <Th align="right">Rho ($/1% rate)</Th>
          </tr>
        </thead>
        <tbody>
          {portfolio.map((p) => {
            const g = positionGreeks(p);
            return (
              <tr key={p.id || p.symbol} className="border-b border-slate-100">
                <Td align="left" className="text-slate-800 font-medium">
                  {p.symbol || '—'}
                </Td>
                <Td align="left" className="text-slate-500">
                  {p.type || 'equity'}
                </Td>
                <Td num>{formatGreek(g.delta, 0)}</Td>
                <Td num>{formatGreek(g.gamma, 4)}</Td>
                <Td num>{fmtMoney(g.vega)}</Td>
                <Td num>{fmtMoney(g.theta)}</Td>
                <Td num>{fmtMoney(g.rho)}</Td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-slate-50 font-semibold">
            <Td align="left" className="text-slate-900">
              Portfolio total
            </Td>
            <Td />
            <Td num>{formatGreek(totalGreeks.delta, 0)}</Td>
            <Td num>{formatGreek(totalGreeks.gamma, 4)}</Td>
            <Td num>{fmtMoney(totalGreeks.vega)}</Td>
            <Td num>{fmtMoney(totalGreeks.theta)}</Td>
            <Td num>{fmtMoney(totalGreeks.rho)}</Td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function formatGreek(n, decimals) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function Th({ children, align = 'left' }) {
  return (
    <th
      className={
        'px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600 ' +
        (align === 'right' ? 'text-right' : 'text-left')
      }
    >
      {children}
    </th>
  );
}

function Td({ children, num, align, className = '' }) {
  return (
    <td
      className={
        'px-3 py-1.5 ' +
        (num
          ? 'text-right font-mono tabular-nums ' + (Number(children?.toString().replace(/[^0-9.-]/g, '')) < 0 ? 'text-red-700' : 'text-slate-800')
          : '') +
        (align === 'left' ? ' text-left' : '') +
        ' ' +
        className
      }
    >
      {children}
    </td>
  );
}

// ---------- Stress ----------

function StressPanel({ shock, setShock, stress, portfolio }) {
  const setField = (k, v) => setShock((s) => ({ ...s, [k]: v }));
  const applyPreset = (p) =>
    setShock({
      equityShock: p.equityShock,
      rateShockBps: p.rateShockBps,
      volShockPts: p.volShockPts,
    });
  const reset = () => setShock({ equityShock: 0, rateShockBps: 0, volShockPts: 0 });

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-4 items-start">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">
            Preset scenarios
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STRESS_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p)}
                className="px-2.5 py-1 text-xs border border-navy-300 text-navy-800 rounded hover:bg-navy-50"
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={reset}
              className="px-2.5 py-1 text-xs border border-slate-300 text-slate-600 rounded hover:bg-slate-100"
            >
              Reset
            </button>
          </div>
        </div>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">
            Custom shocks
          </div>
          <div className="grid grid-cols-3 gap-3">
            <ShockInput
              label="Equity (%)"
              value={shock.equityShock * 100}
              step={1}
              onChange={(v) => setField('equityShock', v / 100)}
            />
            <ShockInput
              label="Rates (bps)"
              value={shock.rateShockBps}
              step={25}
              onChange={(v) => setField('rateShockBps', v)}
            />
            <ShockInput
              label="Vol (IV pts)"
              value={shock.volShockPts * 100}
              step={5}
              onChange={(v) => setField('volShockPts', v / 100)}
            />
          </div>
        </div>
        <div className="md:text-right">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
            Portfolio P&L
          </div>
          <div
            className={
              'font-mono text-2xl font-semibold tabular-nums mt-1 ' + signedColor(stress.total)
            }
          >
            {fmtMoney(stress.total)}
          </div>
        </div>
      </div>

      <table className="min-w-full text-xs">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <Th align="left">Position</Th>
            <Th align="left">Type</Th>
            <Th align="right">Stressed P&L</Th>
          </tr>
        </thead>
        <tbody>
          {stress.breakdown.map((b, i) => {
            const p = portfolio[i];
            return (
              <tr key={b.id || i} className="border-b border-slate-100">
                <Td align="left" className="text-slate-800 font-medium">
                  {b.symbol || p?.symbol || '—'}
                </Td>
                <Td align="left" className="text-slate-500">
                  {b.type || 'equity'}
                </Td>
                <Td num className={signedColor(b.pnl)}>
                  {fmtMoney(b.pnl)}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ShockInput({ label, value, step, onChange }) {
  return (
    <label className="block">
      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </div>
      <input
        type="number"
        value={Number(value).toFixed(0)}
        step={step}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full px-2 py-1 border border-slate-300 rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
      />
    </label>
  );
}
