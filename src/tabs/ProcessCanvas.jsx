import { useEffect, useState } from 'react';
import { get, set } from '../lib/storage.js';
import { DEFAULT_CANVAS } from '../data/defaultCanvas.js';

const STORAGE_KEY = 'canvas';

function newStage() {
  return {
    id: 'stg-' + Math.random().toString(36).slice(2, 9),
    name: 'New Stage',
    owner: '',
    inputs: '',
    outputs: '',
    sla: '',
    description: '',
  };
}

function downloadJSON(stages) {
  const blob = new Blob([JSON.stringify(stages, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `riskflow-canvas-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ProcessCanvas() {
  const [stages, setStages] = useState(() => get(STORAGE_KEY, null) ?? DEFAULT_CANVAS);
  const [selectedId, setSelectedId] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    set(STORAGE_KEY, stages);
  }, [stages]);

  const selectedIndex = stages.findIndex((s) => s.id === selectedId);
  const selected = selectedIndex >= 0 ? stages[selectedIndex] : null;

  const updateSelected = (patch) => {
    setStages((prev) => prev.map((s) => (s.id === selectedId ? { ...s, ...patch } : s)));
  };

  const addStage = () => {
    const stage = newStage();
    setStages((prev) => [...prev, stage]);
    setSelectedId(stage.id);
  };

  const deleteSelected = () => {
    if (!selected) return;
    setStages((prev) => prev.filter((s) => s.id !== selectedId));
    setSelectedId(null);
  };

  const moveSelected = (dir) => {
    if (selectedIndex < 0) return;
    const target = selectedIndex + dir;
    if (target < 0 || target >= stages.length) return;
    setStages((prev) => {
      const next = prev.slice();
      const [s] = next.splice(selectedIndex, 1);
      next.splice(target, 0, s);
      return next;
    });
  };

  const resetToDefault = () => {
    setStages(DEFAULT_CANVAS);
    setSelectedId(null);
    setConfirmReset(false);
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">
        <Toolbar
          onAdd={addStage}
          onExport={() => downloadJSON(stages)}
          onResetClick={() => setConfirmReset(true)}
          confirmReset={confirmReset}
          onResetConfirm={resetToDefault}
          onResetCancel={() => setConfirmReset(false)}
          stageCount={stages.length}
        />

        <div className="flex-1 overflow-auto p-6 bg-slate-50">
          {stages.length === 0 ? (
            <EmptyState onAdd={addStage} />
          ) : (
            <div className="flex items-stretch gap-3 min-w-min pb-4">
              {stages.map((stage, i) => (
                <StageCardWithConnector
                  key={stage.id}
                  stage={stage}
                  index={i}
                  isLast={i === stages.length - 1}
                  isSelected={stage.id === selectedId}
                  onSelect={() => setSelectedId(stage.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <Editor
        selected={selected}
        selectedIndex={selectedIndex}
        total={stages.length}
        stages={stages}
        onSelect={setSelectedId}
        onUpdate={updateSelected}
        onDelete={deleteSelected}
        onMove={moveSelected}
        onAdd={addStage}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}

function Toolbar({
  onAdd,
  onExport,
  onResetClick,
  confirmReset,
  onResetConfirm,
  onResetCancel,
  stageCount,
}) {
  return (
    <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200">
      <div className="text-xs font-mono text-slate-500">
        {stageCount} {stageCount === 1 ? 'stage' : 'stages'} · auto-saved
      </div>
      <div className="flex items-center gap-2">
        {confirmReset ? (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded px-2 py-1">
            <span className="text-xs text-red-800">Replace canvas with default VaR lifecycle?</span>
            <button
              onClick={onResetConfirm}
              className="px-2 py-0.5 text-xs bg-red-600 text-white rounded hover:bg-red-700"
            >
              Yes
            </button>
            <button
              onClick={onResetCancel}
              className="px-2 py-0.5 text-xs border border-slate-300 rounded hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={onResetClick}
            className="px-3 py-1.5 text-sm border border-slate-300 text-slate-700 rounded hover:bg-slate-100"
          >
            Reset to default
          </button>
        )}
        <button
          onClick={onExport}
          className="px-3 py-1.5 text-sm border border-slate-300 text-slate-700 rounded hover:bg-slate-100"
        >
          Export JSON
        </button>
        <button
          onClick={onAdd}
          className="px-3 py-1.5 text-sm bg-navy-800 text-white rounded hover:bg-navy-700"
        >
          + Add stage
        </button>
      </div>
    </div>
  );
}

function StageCardWithConnector({ stage, index, isLast, isSelected, onSelect }) {
  return (
    <div className="flex items-center">
      <button
        onClick={onSelect}
        className={
          'w-72 flex-shrink-0 text-left bg-white border rounded-lg p-4 transition-all ' +
          (isSelected
            ? 'border-navy-800 ring-2 ring-navy-800/20 shadow-md'
            : 'border-slate-200 hover:border-navy-400 hover:shadow-sm')
        }
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-navy-700">
            Stage {String(index + 1).padStart(2, '0')}
          </span>
          <span className="text-[10px] font-mono text-slate-500">{stage.sla || '—'}</span>
        </div>
        <div className="text-sm font-semibold text-slate-900 mb-1">
          {stage.name || '(untitled)'}
        </div>
        <div className="text-xs text-navy-700 mb-3 truncate">{stage.owner || '—'}</div>

        <FieldRow label="Inputs" value={stage.inputs} />
        <FieldRow label="Outputs" value={stage.outputs} />
      </button>
      {!isLast && (
        <div className="px-1 text-slate-400 text-xl select-none" aria-hidden>
          →
        </div>
      )}
    </div>
  );
}

function FieldRow({ label, value }) {
  return (
    <div className="mb-1.5 last:mb-0">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-xs text-slate-700 line-clamp-2">{value || '—'}</div>
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-sm">
        <div className="text-sm text-slate-600 mb-3">
          No stages yet. Add the first stage to start designing the lifecycle.
        </div>
        <button
          onClick={onAdd}
          className="px-3 py-1.5 text-sm bg-navy-800 text-white rounded hover:bg-navy-700"
        >
          + Add stage
        </button>
      </div>
    </div>
  );
}

function Editor({
  selected,
  selectedIndex,
  total,
  stages,
  onSelect,
  onUpdate,
  onDelete,
  onMove,
  onAdd,
  onClose,
}) {
  return (
    <aside className="w-[360px] flex-shrink-0 border-l border-slate-200 bg-white flex flex-col">
      {selected ? (
        <SelectedEditor
          stage={selected}
          index={selectedIndex}
          total={total}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onMove={onMove}
          onClose={onClose}
        />
      ) : (
        <StageIndex stages={stages} onSelect={onSelect} onAdd={onAdd} />
      )}
    </aside>
  );
}

function StageIndex({ stages, onSelect, onAdd }) {
  return (
    <>
      <header className="px-5 py-4 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900">Lifecycle index</h3>
        <p className="text-xs text-slate-500 mt-0.5">Click a stage to edit its details.</p>
      </header>
      <div className="flex-1 overflow-auto px-3 py-3 space-y-1">
        {stages.map((s, i) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className="w-full text-left px-3 py-2 rounded hover:bg-slate-100 group"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400 w-5">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-sm font-medium text-slate-800 group-hover:text-navy-800 truncate">
                {s.name || '(untitled)'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 ml-7 truncate">{s.owner || '—'}</div>
          </button>
        ))}
      </div>
      <div className="px-5 py-3 border-t border-slate-200">
        <button
          onClick={onAdd}
          className="w-full px-3 py-1.5 text-sm bg-navy-800 text-white rounded hover:bg-navy-700"
        >
          + Add stage
        </button>
      </div>
    </>
  );
}

function SelectedEditor({ stage, index, total, onUpdate, onDelete, onMove, onClose }) {
  return (
    <>
      <header className="flex items-start justify-between px-5 py-4 border-b border-slate-200">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-navy-700">
            Stage {String(index + 1).padStart(2, '0')} of {total}
          </div>
          <h3 className="text-sm font-semibold text-slate-900 mt-0.5 truncate max-w-[260px]">
            {stage.name || '(untitled)'}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 text-lg leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </header>

      <div className="flex items-center justify-between px-5 py-2 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
            title="Move earlier"
          >
            ← Move
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
            title="Move later"
          >
            Move →
          </button>
        </div>
        <button
          onClick={onDelete}
          className="px-2 py-1 text-xs border border-red-300 text-red-700 rounded hover:bg-red-50"
        >
          Delete
        </button>
      </div>

      <div className="flex-1 overflow-auto px-5 py-4 space-y-3">
        <Field label="Stage name" value={stage.name} onChange={(v) => onUpdate({ name: v })} />
        <Field
          label="Owner / role"
          value={stage.owner}
          onChange={(v) => onUpdate({ owner: v })}
          placeholder="e.g. Quant Team — Model Development"
        />
        <Field
          label="SLA"
          value={stage.sla}
          onChange={(v) => onUpdate({ sla: v })}
          mono
          placeholder="e.g. T+0 by 06:00 ET"
        />
        <Field
          label="Inputs"
          value={stage.inputs}
          onChange={(v) => onUpdate({ inputs: v })}
          textarea
        />
        <Field
          label="Outputs"
          value={stage.outputs}
          onChange={(v) => onUpdate({ outputs: v })}
          textarea
        />
        <Field
          label="Description"
          value={stage.description}
          onChange={(v) => onUpdate({ description: v })}
          textarea
          rows={4}
        />
      </div>
    </>
  );
}

function Field({ label, value, onChange, textarea, rows = 2, mono, placeholder }) {
  const baseClass =
    'w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-navy-500 ' +
    (mono ? 'font-mono ' : '');
  return (
    <label className="block">
      <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </span>
      {textarea ? (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className={baseClass + 'resize-y'}
        />
      ) : (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={baseClass}
        />
      )}
    </label>
  );
}
