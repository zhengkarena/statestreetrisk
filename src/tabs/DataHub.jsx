import { useEffect, useRef, useState } from 'react';
import { get, set, remove } from '../lib/storage.js';
import { MOCK_POSITIONS } from '../data/mockPositions.js';
import {
  parseFile,
  validateRequired,
  normalizeRows,
  inferColumnTypes,
  buildQualitySummary,
  REQUIRED_COLUMNS,
} from '../lib/parse.js';

const STORAGE_KEY = 'portfolio';
const SOURCE_META_KEY = 'portfolioSource'; // 'mock' | 'upload'

export default function DataHub() {
  const [activeSource, setActiveSource] = useState(() => get(SOURCE_META_KEY, 'mock'));
  const [activePortfolio, setActivePortfolio] = useState(
    () => get(STORAGE_KEY, null) ?? MOCK_POSITIONS,
  );

  // Pending upload state (preview before commit)
  const [pending, setPending] = useState(null); // { rows, columns, types, quality, validation, fileName }
  const [parseError, setParseError] = useState(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setBusy(true);
    setParseError(null);
    setPending(null);
    const { rows, columns, error } = await parseFile(file);
    if (error) {
      setParseError(error);
      setBusy(false);
      return;
    }
    if (!rows.length) {
      setParseError(
        'File parsed but no data rows were found. Check that the first row contains column headers and at least one row of data follows.',
      );
      setBusy(false);
      return;
    }
    const validation = validateRequired(columns);
    const types = inferColumnTypes(rows, columns);
    const quality = buildQualitySummary(rows, columns, types);
    setPending({ rows, columns, types, quality, validation, fileName: file.name });
    setBusy(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const onSelect = (e) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = ''; // allow re-select of same file
  };

  const useDataset = () => {
    if (!pending || !pending.validation.ok) return;
    const normalized = normalizeRows(pending.rows, pending.columns);
    set(STORAGE_KEY, normalized);
    set(SOURCE_META_KEY, 'upload');
    setActivePortfolio(normalized);
    setActiveSource('upload');
    setPending(null);
  };

  const resetToMock = () => {
    remove(STORAGE_KEY);
    set(SOURCE_META_KEY, 'mock');
    setActivePortfolio(MOCK_POSITIONS);
    setActiveSource('mock');
    setPending(null);
    setParseError(null);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <ArchitectureDiagram />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <UploadZone
            onSelect={onSelect}
            onDrop={onDrop}
            inputRef={inputRef}
            busy={busy}
            error={parseError}
          />

          {pending && (
            <PendingPreview
              pending={pending}
              onUse={useDataset}
              onDiscard={() => setPending(null)}
            />
          )}
        </div>

        <ActivePortfolioPanel
          portfolio={activePortfolio}
          source={activeSource}
          onResetToMock={resetToMock}
        />
      </div>
    </div>
  );
}

// ---------- Architecture diagram ----------

function ArchitectureDiagram() {
  const sources = [
    { label: 'Bloomberg', sub: 'Market Data' },
    { label: 'Refinitiv', sub: 'Market Data' },
    { label: 'Databricks', sub: 'Lakehouse' },
    { label: 'Snowflake', sub: 'Warehouse' },
    { label: 'AWS S3', sub: 'Data Lake' },
  ];
  return (
    <section className="bg-white border border-slate-200 rounded-lg p-6">
      <header className="mb-4">
        <h2 className="text-sm font-semibold text-slate-900">Source Data Architecture</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Logical view of where portfolio and market data flow into RiskFlow Studio. Vendors are
          illustrative — replace per deployment.
        </p>
      </header>
      <svg viewBox="0 0 900 280" className="w-full h-auto" role="img" aria-label="Data architecture">
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#94afcb" />
          </marker>
        </defs>

        {sources.map((s, i) => {
          const y = 20 + i * 50;
          return (
            <g key={s.label}>
              <rect
                x="20"
                y={y}
                width="180"
                height="40"
                rx="4"
                fill="#fff"
                stroke="#c2d1e3"
                strokeWidth="1"
              />
              <text
                x="32"
                y={y + 18}
                fontSize="13"
                fontWeight="600"
                fill="#1e3a5f"
                fontFamily="Inter, system-ui, sans-serif"
              >
                {s.label}
              </text>
              <text
                x="32"
                y={y + 32}
                fontSize="10"
                fill="#6488ad"
                fontFamily="JetBrains Mono, monospace"
              >
                {s.sub.toUpperCase()}
              </text>
              <line
                x1="200"
                y1={y + 20}
                x2="350"
                y2="140"
                stroke="#94afcb"
                strokeWidth="1"
                markerEnd="url(#arrow)"
              />
            </g>
          );
        })}

        <rect
          x="350"
          y="110"
          width="200"
          height="60"
          rx="4"
          fill="#f3f6fa"
          stroke="#446a93"
          strokeWidth="1.5"
        />
        <text
          x="450"
          y="138"
          textAnchor="middle"
          fontSize="13"
          fontWeight="600"
          fill="#1e3a5f"
          fontFamily="Inter, system-ui, sans-serif"
        >
          Ingestion + Validation
        </text>
        <text
          x="450"
          y="156"
          textAnchor="middle"
          fontSize="10"
          fill="#446a93"
          fontFamily="JetBrains Mono, monospace"
        >
          SCHEMA · QUALITY · LINEAGE
        </text>

        <line
          x1="550"
          y1="140"
          x2="690"
          y2="140"
          stroke="#94afcb"
          strokeWidth="1.5"
          markerEnd="url(#arrow)"
        />

        <rect
          x="690"
          y="110"
          width="190"
          height="60"
          rx="4"
          fill="#1e3a5f"
          stroke="#152a45"
          strokeWidth="1"
        />
        <text
          x="785"
          y="138"
          textAnchor="middle"
          fontSize="13"
          fontWeight="600"
          fill="#fff"
          fontFamily="Inter, system-ui, sans-serif"
        >
          RiskFlow Studio
        </text>
        <text
          x="785"
          y="156"
          textAnchor="middle"
          fontSize="10"
          fill="#94afcb"
          fontFamily="JetBrains Mono, monospace"
        >
          VAR · GREEKS · STRESS
        </text>
      </svg>
    </section>
  );
}

// ---------- Upload zone ----------

function UploadZone({ onSelect, onDrop, inputRef, busy, error }) {
  return (
    <section className="bg-white border border-slate-200 rounded-lg p-6">
      <header className="mb-3">
        <h2 className="text-sm font-semibold text-slate-900">Upload portfolio data</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          CSV or Excel. Required columns:{' '}
          <span className="font-mono text-slate-700">{REQUIRED_COLUMNS.join(', ')}</span>{' '}
          (case-insensitive). Extra columns are preserved.
        </p>
      </header>

      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-navy-400 hover:bg-slate-50 transition-colors"
      >
        <p className="text-sm text-slate-700">
          Drop a <span className="font-mono">.csv</span>, <span className="font-mono">.xlsx</span>,
          or <span className="font-mono">.xls</span> file here
        </p>
        <p className="text-xs text-slate-500 mt-1 mb-3">or</p>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="px-3 py-1.5 text-sm bg-navy-800 text-white rounded hover:bg-navy-700 disabled:opacity-50"
        >
          {busy ? 'Parsing…' : 'Choose file'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={onSelect}
        />
      </div>

      {error && (
        <div className="mt-4 border border-red-300 bg-red-50 rounded p-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-red-800 mb-1">
            Could not load file
          </div>
          <div className="text-sm text-red-900">{error}</div>
        </div>
      )}
    </section>
  );
}

// ---------- Pending preview ----------

function PendingPreview({ pending, onUse, onDiscard }) {
  const { rows, columns, types, quality, validation, fileName } = pending;
  const previewRows = rows.slice(0, 20);

  return (
    <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <header className="flex items-start justify-between gap-4 px-5 py-3 border-b border-slate-200">
        <div className="min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
            Preview
          </div>
          <div className="text-sm font-semibold text-slate-900 truncate">{fileName}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {rows.length.toLocaleString()} rows · {columns.length} columns · showing first{' '}
            {previewRows.length}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onDiscard}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-100"
          >
            Discard
          </button>
          <button
            onClick={onUse}
            disabled={!validation.ok}
            className="px-3 py-1.5 text-sm bg-navy-800 text-white rounded hover:bg-navy-700 disabled:opacity-40 disabled:cursor-not-allowed"
            title={validation.ok ? '' : 'Fix missing required columns first'}
          >
            Use this dataset
          </button>
        </div>
      </header>

      {!validation.ok && (
        <div className="px-5 py-3 bg-red-50 border-b border-red-200">
          <div className="text-xs font-semibold uppercase tracking-wider text-red-800 mb-1">
            Validation failed
          </div>
          <div className="text-sm text-red-900">{validation.errorMessage}</div>
        </div>
      )}

      <DataQualityPanel quality={quality} columns={columns} types={types} />

      <div className="overflow-auto max-h-96 border-t border-slate-200">
        <table className="min-w-full text-xs font-mono">
          <thead className="bg-slate-50 sticky top-0">
            <tr>
              {columns.map((c) => (
                <th key={c} className="px-3 py-2 text-left border-b border-slate-200">
                  <div className="font-semibold text-slate-800">{c}</div>
                  <div className="text-[10px] text-slate-500 font-normal">{types[c]}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                {columns.map((c) => (
                  <td
                    key={c}
                    className={
                      'px-3 py-1.5 ' +
                      (types[c] === 'number' ? 'text-right text-slate-900' : 'text-slate-700')
                    }
                  >
                    {row[c] === '' || row[c] == null ? (
                      <span className="text-slate-300">—</span>
                    ) : (
                      String(row[c])
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DataQualityPanel({ quality, columns, types }) {
  const totalMissing = Object.values(quality.missing).reduce((a, b) => a + b, 0);
  const totalOutliers = Object.values(quality.outliers).reduce((a, b) => a + (b ?? 0), 0);

  return (
    <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
        <Stat label="Missing values" value={totalMissing} accent={totalMissing ? 'amber' : 'ok'} />
        <Stat
          label="Outliers (|z| > 3)"
          value={totalOutliers}
          accent={totalOutliers ? 'amber' : 'ok'}
        />
        {quality.dateRange && (
          <Stat
            label="Date range"
            value={`${quality.dateRange.from} → ${quality.dateRange.to}`}
            mono
          />
        )}
      </div>

      {(totalMissing > 0 || totalOutliers > 0) && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-slate-600 hover:text-slate-900">
            Per-column breakdown
          </summary>
          <table className="mt-2 text-xs">
            <thead>
              <tr className="text-slate-500">
                <th className="text-left pr-4 font-medium">Column</th>
                <th className="text-left pr-4 font-medium">Type</th>
                <th className="text-right pr-4 font-medium">Missing</th>
                <th className="text-right pr-4 font-medium">Outliers</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {columns.map((c) => (
                <tr key={c}>
                  <td className="pr-4 text-slate-800">{c}</td>
                  <td className="pr-4 text-slate-600">{types[c]}</td>
                  <td className="pr-4 text-right text-slate-700">{quality.missing[c]}</td>
                  <td className="pr-4 text-right text-slate-700">
                    {quality.outliers[c] === null ? '—' : quality.outliers[c]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}

function Stat({ label, value, accent, mono }) {
  const color =
    accent === 'amber' ? 'text-amber-700' : accent === 'ok' ? 'text-emerald-700' : 'text-slate-800';
  return (
    <div>
      <span className="text-slate-500 mr-1.5">{label}:</span>
      <span className={(mono ? 'font-mono ' : 'font-semibold ') + color}>{value}</span>
    </div>
  );
}

// ---------- Active portfolio summary ----------

function ActivePortfolioPanel({ portfolio, source, onResetToMock }) {
  const total = portfolio.length;
  const byType = portfolio.reduce((acc, p) => {
    const t = p.type || 'other';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  return (
    <aside className="bg-white border border-slate-200 rounded-lg p-5 self-start">
      <header className="mb-3">
        <h2 className="text-sm font-semibold text-slate-900">Active portfolio</h2>
        <div className="text-xs text-slate-500 mt-0.5">
          Source:{' '}
          <span
            className={
              'font-mono ' + (source === 'upload' ? 'text-emerald-700' : 'text-slate-600')
            }
          >
            {source === 'upload' ? 'uploaded' : 'mock (default)'}
          </span>
        </div>
      </header>

      <div className="space-y-1.5 mb-4">
        <KV label="Positions" value={total} />
        {Object.entries(byType).map(([k, v]) => (
          <KV key={k} label={'  · ' + k} value={v} sub />
        ))}
      </div>

      <div className="text-[11px] text-slate-500 mb-3">
        Risk Metrics (next milestone) will compute VaR, Greeks, and stress P&amp;L from this
        dataset.
      </div>

      {source === 'upload' && (
        <button
          onClick={onResetToMock}
          className="w-full px-3 py-1.5 text-sm border border-slate-300 text-slate-700 rounded hover:bg-slate-100"
        >
          Reset to mock portfolio
        </button>
      )}
    </aside>
  );
}

function KV({ label, value, sub }) {
  return (
    <div
      className={
        'flex items-center justify-between text-xs ' + (sub ? 'text-slate-500' : 'text-slate-700')
      }
    >
      <span className={sub ? '' : 'font-medium'}>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
