import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
  Scatter,
  ComposedChart,
} from 'recharts';
import Markdown from '../components/Markdown.jsx';
import {
  BASE_TILES,
  BASE_ALERTS,
  buildBacktestSeries,
  exceptionCount,
  baselZone,
} from '../data/mockMonitor.js';

// ---------- Refresh jitter ----------
//
// Deterministic per (base, key) so the displayed numbers are stable until
// the user clicks Refresh again. Clicking Refresh tends to produce smaller
// numbers (feels fresher).
function jitter(base, key) {
  if (key === 0) return base;
  const n = ((key * 9301 + 49297 + base) >>> 0) % 233280;
  const factor = 0.1 + (n / 233280) * 0.7; // 0.10 – 0.80
  return Math.max(15, Math.floor(base * factor));
}

function formatRelative(seconds) {
  if (seconds < 60) return `${seconds}s ago`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m ago` : `${h}h ago`;
}

const STATUS_DOT = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
};

const ZONE_TEXT = {
  green: 'text-emerald-700',
  amber: 'text-amber-700',
  red: 'text-red-700',
};

const SEV_BADGE = {
  info: 'bg-slate-100 text-slate-700 border-slate-200',
  warn: 'bg-amber-100 text-amber-800 border-amber-200',
  critical: 'bg-red-100 text-red-800 border-red-200',
};

const fmtMoney0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
function fmtMoney(n) {
  return (n < 0 ? '-$' : '$') + fmtMoney0.format(Math.abs(n));
}

// ---------- Component ----------

export default function ProductionMonitor() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedAlertId, setExpandedAlertId] = useState(null);

  const tiles = useMemo(
    () =>
      BASE_TILES.map((t) => ({
        ...t,
        lastRunSecondsAgo: jitter(t.lastRunSecondsAgo, refreshKey),
        dataFreshnessSecondsAgo: jitter(t.dataFreshnessSecondsAgo, refreshKey),
      })),
    [refreshKey],
  );

  const alerts = useMemo(
    () =>
      BASE_ALERTS.map((a) => ({
        ...a,
        secondsAgo: jitter(a.secondsAgo, refreshKey),
      })),
    [refreshKey],
  );

  // Backtest series is fully deterministic; don't recompute on refresh.
  const series = useMemo(() => buildBacktestSeries(), []);
  const exceptions = useMemo(() => exceptionCount(series), [series]);
  const zone = useMemo(() => baselZone(exceptions), [exceptions]);

  const lastRefreshedSeconds = jitter(15, refreshKey);

  const refresh = () => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setRefreshing(false), 450);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <Toolbar
        onRefresh={refresh}
        refreshing={refreshing}
        lastRefreshedText={`Updated ${formatRelative(lastRefreshedSeconds)}`}
      />

      <section>
        <SectionHeader title="Model Health" subtitle="Live status across production model engines." />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tiles.map((t) => (
            <HealthTile key={t.id} tile={t} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader
          title="Equity & Options Portfolio Backtest"
          subtitle="VaR(99) vs realized P&L over the rolling 250-day window. Per-model exception counts in the tiles above are tracked independently — this chart is the portfolio-level series."
        />
        <BacktestChart series={series} />
        <div className="mt-2 flex items-center gap-3 text-xs">
          <span className="font-mono text-slate-700">
            <strong>{exceptions}</strong> exceptions in last 250 days
          </span>
          <span className="text-slate-300">·</span>
          <span className={'font-mono font-semibold ' + ZONE_TEXT[zone.zone]}>{zone.label}</span>
        </div>
      </section>

      <section>
        <SectionHeader
          title="Active Alerts"
          subtitle="Recent operational signals. Click Investigate for the runbook."
        />
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-200">
          {alerts.map((a) => (
            <AlertRow
              key={a.id}
              alert={a}
              expanded={expandedAlertId === a.id}
              onToggle={() => setExpandedAlertId((cur) => (cur === a.id ? null : a.id))}
            />
          ))}
        </div>
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

function Toolbar({ onRefresh, refreshing, lastRefreshedText }) {
  return (
    <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-5 py-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Production Monitor</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time view of model engines, backtesting, and operational alerts. Mock state for
          demo — replace with live telemetry per deployment.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-slate-500">{lastRefreshedText}</span>
        <button
          onClick={onRefresh}
          className="px-3 py-1.5 text-sm bg-navy-800 text-white rounded hover:bg-navy-700 inline-flex items-center gap-1.5"
        >
          <RefreshIcon spinning={refreshing} />
          Refresh
        </button>
      </div>
    </div>
  );
}

function RefreshIcon({ spinning }) {
  return (
    <svg
      className={'h-3.5 w-3.5 ' + (spinning ? 'animate-spin' : '')}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

function HealthTile({ tile }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className={'h-2.5 w-2.5 rounded-full ' + STATUS_DOT[tile.status]} />
            <span className="text-sm font-semibold text-slate-900">{tile.name}</span>
          </div>
        </div>
        <span
          className={
            'text-[10px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider ' +
            (tile.status === 'green'
              ? 'bg-emerald-50 text-emerald-700'
              : tile.status === 'amber'
                ? 'bg-amber-50 text-amber-700'
                : 'bg-red-50 text-red-700')
          }
        >
          {tile.status}
        </span>
      </div>

      <dl className="space-y-1 text-xs">
        <KV label="Last run" value={formatRelative(tile.lastRunSecondsAgo)} mono />
        <KV
          label="Market data"
          value={formatRelative(tile.dataFreshnessSecondsAgo)}
          mono
          warnAbove={tile.dataFreshnessSecondsAgo > 300}
        />
        <KV
          label="Backtest exceptions"
          value={`${tile.exceptions.count} / ${tile.exceptions.limit} limit`}
          mono
          tone={tile.exceptions.zone}
        />
      </dl>
    </div>
  );
}

function KV({ label, value, mono, tone, warnAbove }) {
  const valueClass =
    tone === 'red'
      ? 'text-red-700 font-semibold'
      : tone === 'amber'
        ? 'text-amber-700 font-semibold'
        : tone === 'green'
          ? 'text-emerald-700'
          : warnAbove
            ? 'text-amber-700'
            : 'text-slate-800';
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={(mono ? 'font-mono ' : '') + valueClass}>{value}</span>
    </div>
  );
}

function BacktestChart({ series }) {
  const exceptionPoints = useMemo(
    () => series.filter((d) => d.isException).map((d) => ({ day: d.day, pnl: d.pnl })),
    [series],
  );

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="h-72">
        <ResponsiveContainer>
          <ComposedChart data={series} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
              stroke="#94a3b8"
              label={{
                value: 'trading day',
                position: 'insideBottom',
                offset: -2,
                fontSize: 10,
                fill: '#64748b',
              }}
            />
            <YAxis
              tick={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
              tickFormatter={(v) => fmtMoney(v)}
              stroke="#94a3b8"
              width={80}
            />
            <Tooltip
              contentStyle={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
              formatter={(v, name) => [fmtMoney(v), name]}
              labelFormatter={(l) => `Day ${l}`}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, fontFamily: 'Inter, system-ui' }}
              verticalAlign="top"
              height={20}
              iconType="line"
            />
            <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={1} />
            <Line
              type="monotone"
              dataKey="varLine"
              name="VaR(99)"
              stroke="#dc2626"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="pnl"
              name="Realized P&L"
              stroke="#334155"
              strokeWidth={1}
              dot={false}
              isAnimationActive={false}
            />
            <Scatter
              data={exceptionPoints}
              dataKey="pnl"
              name="Exception"
              fill="#dc2626"
              shape="triangle"
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AlertRow({ alert, expanded, onToggle }) {
  return (
    <div>
      <div className="flex items-start gap-3 px-4 py-3">
        <span
          className={
            'mt-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase tracking-wider ' +
            SEV_BADGE[alert.severity]
          }
        >
          {alert.severity}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-slate-900">{alert.title}</div>
          <div className="text-xs text-slate-600 mt-0.5">{alert.description}</div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            {formatRelative(alert.secondsAgo)}
          </div>
        </div>
        <button
          onClick={onToggle}
          className={
            'flex-shrink-0 px-3 py-1.5 text-sm rounded border ' +
            (expanded
              ? 'bg-navy-800 text-white border-navy-800 hover:bg-navy-700'
              : 'border-slate-300 text-slate-700 hover:bg-slate-100')
          }
        >
          {expanded ? 'Hide runbook' : 'Investigate'}
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-2 bg-slate-50 border-t border-slate-200">
          <div className="bg-white border border-slate-200 rounded p-4">
            <Markdown body={alert.runbook} />
          </div>
        </div>
      )}
    </div>
  );
}
