import { useEffect, useMemo, useState } from 'react';
import { get, set } from '../lib/storage.js';
import { MOCK_TASKS } from '../data/mockTasks.js';

const STORAGE_KEY = 'tasks';

const COLUMNS = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'uat', label: 'UAT' },
  { id: 'done', label: 'Done' },
];

const PRIORITIES = ['low', 'med', 'high'];

const PRIORITY_CHIP = {
  low: 'bg-slate-100 text-slate-700 border-slate-200',
  med: 'bg-amber-100 text-amber-800 border-amber-200',
  high: 'bg-red-100 text-red-800 border-red-200',
};

const UAT_STATUS_CHIP = {
  pending: 'bg-slate-100 text-slate-700 border-slate-200',
  pass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  fail: 'bg-red-100 text-red-800 border-red-200',
};

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2, 10);
}

function newTask() {
  const now = new Date().toISOString();
  return {
    id: uuid(),
    title: 'New task',
    modelName: '',
    owner: '',
    priority: 'med',
    status: 'todo',
    dueDate: null,
    description: '',
    uatCases: [],
    createdAt: now,
    updatedAt: now,
  };
}

function newUatCase() {
  return {
    id: uuid(),
    scenario: '',
    expected: '',
    actual: '',
    status: 'pending',
  };
}

// "today" / "in 3d" / "overdue 2d" / "May 14"
function formatDue(dueDate) {
  if (!dueDate) return { text: '—', tone: 'slate' };
  const d = new Date(dueDate + 'T00:00:00');
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const diff = Math.round((d - t) / 86400000);
  if (diff === 0) return { text: 'today', tone: 'amber' };
  if (diff < 0) return { text: `overdue ${-diff}d`, tone: 'red' };
  if (diff <= 7) return { text: `in ${diff}d`, tone: 'amber' };
  return {
    text: d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
    tone: 'slate',
  };
}

const TONE_CLASS = {
  slate: 'text-slate-500',
  amber: 'text-amber-700 font-medium',
  red: 'text-red-700 font-medium',
};

// ---------- Component ----------

export default function ProjectUAT() {
  const [tasks, setTasks] = useState(() => get(STORAGE_KEY, null) ?? MOCK_TASKS);
  const [selectedId, setSelectedId] = useState(null);
  const [filters, setFilters] = useState({ model: 'all', owner: 'all', status: 'all' });
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    set(STORAGE_KEY, tasks);
  }, [tasks]);

  const selected = tasks.find((t) => t.id === selectedId) || null;

  const models = useMemo(
    () => [...new Set(tasks.map((t) => t.modelName).filter(Boolean))].sort(),
    [tasks],
  );
  const owners = useMemo(
    () => [...new Set(tasks.map((t) => t.owner).filter(Boolean))].sort(),
    [tasks],
  );

  const visible = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (filters.model === 'all' || t.modelName === filters.model) &&
          (filters.owner === 'all' || t.owner === filters.owner) &&
          (filters.status === 'all' || t.status === filters.status),
      ),
    [tasks, filters],
  );

  const updateTask = (id, patch) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t,
      ),
    );
  };

  const moveTask = (id, dir) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    const idx = COLUMNS.findIndex((c) => c.id === t.status);
    const next = idx + dir;
    if (next < 0 || next >= COLUMNS.length) return;
    updateTask(id, { status: COLUMNS[next].id });
  };

  const deleteTask = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const addTask = () => {
    const t = newTask();
    setTasks((prev) => [t, ...prev]);
    setSelectedId(t.id);
  };

  const resetToMock = () => {
    setTasks(MOCK_TASKS);
    setConfirmReset(false);
    setSelectedId(null);
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">
        <Toolbar
          filters={filters}
          setFilters={setFilters}
          models={models}
          owners={owners}
          onAdd={addTask}
          confirmReset={confirmReset}
          onResetClick={() => setConfirmReset(true)}
          onResetConfirm={resetToMock}
          onResetCancel={() => setConfirmReset(false)}
          taskCount={visible.length}
          totalCount={tasks.length}
        />
        <div className="flex-1 overflow-auto p-4 bg-slate-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 min-h-full">
            {COLUMNS.map((col) => (
              <Column
                key={col.id}
                column={col}
                tasks={visible.filter((t) => t.status === col.id)}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onMove={moveTask}
              />
            ))}
          </div>
        </div>
      </div>

      {selected && (
        <SidePanel
          task={selected}
          onClose={() => setSelectedId(null)}
          onUpdate={(patch) => updateTask(selected.id, patch)}
          onDelete={() => deleteTask(selected.id)}
        />
      )}
    </div>
  );
}

// ---------- Toolbar ----------

function Toolbar({
  filters,
  setFilters,
  models,
  owners,
  onAdd,
  confirmReset,
  onResetClick,
  onResetConfirm,
  onResetCancel,
  taskCount,
  totalCount,
}) {
  const set1 = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const reset = () => setFilters({ model: 'all', owner: 'all', status: 'all' });
  const filtered = filters.model !== 'all' || filters.owner !== 'all' || filters.status !== 'all';

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">
        <FilterSelect
          label="Model"
          value={filters.model}
          onChange={(v) => set1('model', v)}
          options={['all', ...models]}
        />
        <FilterSelect
          label="Owner"
          value={filters.owner}
          onChange={(v) => set1('owner', v)}
          options={['all', ...owners]}
        />
        <FilterSelect
          label="Status"
          value={filters.status}
          onChange={(v) => set1('status', v)}
          options={['all', ...COLUMNS.map((c) => c.id)]}
          labelMap={Object.fromEntries(COLUMNS.map((c) => [c.id, c.label]))}
        />
        {filtered && (
          <button
            onClick={reset}
            className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-100"
          >
            Reset filters
          </button>
        )}
        <span className="ml-1 text-xs font-mono text-slate-500">
          {filtered ? `${taskCount} of ${totalCount}` : `${totalCount} tasks`}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {confirmReset ? (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded px-2 py-1">
            <span className="text-xs text-red-800">Replace tasks with mock data?</span>
            <button
              onClick={onResetConfirm}
              className="px-2 py-0.5 text-xs bg-red-600 text-white rounded hover:bg-red-700"
            >
              Yes
            </button>
            <button
              onClick={onResetCancel}
              className="px-2 py-0.5 text-xs border border-slate-300 rounded hover:bg-white"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={onResetClick}
            className="px-3 py-1.5 text-sm border border-slate-300 text-slate-700 rounded hover:bg-slate-100"
          >
            Reset to mock
          </button>
        )}
        <button
          onClick={onAdd}
          className="px-3 py-1.5 text-sm bg-navy-800 text-white rounded hover:bg-navy-700"
        >
          + Add task
        </button>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, labelMap }) {
  return (
    <label className="flex items-center gap-1.5 text-xs">
      <span className="text-slate-500 font-medium">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-1.5 py-1 border border-slate-300 rounded text-xs bg-white max-w-[160px]"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt === 'all' ? 'All' : labelMap?.[opt] || opt}
          </option>
        ))}
      </select>
    </label>
  );
}

// ---------- Kanban column ----------

function Column({ column, tasks, selectedId, onSelect, onMove }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg flex flex-col min-h-[200px]">
      <header className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-700">
          {column.label}
        </div>
        <span className="text-[10px] font-mono text-slate-500">{tasks.length}</span>
      </header>
      <div className="flex-1 p-2 space-y-2">
        {tasks.length === 0 ? (
          <div className="text-[11px] text-slate-400 italic px-2 py-3 text-center">No tasks</div>
        ) : (
          tasks.map((t) => (
            <Card
              key={t.id}
              task={t}
              selected={t.id === selectedId}
              onSelect={() => onSelect(t.id)}
              onMove={(dir) => onMove(t.id, dir)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ---------- Card ----------

function Card({ task, selected, onSelect, onMove }) {
  const due = formatDue(task.dueDate);
  const colIdx = COLUMNS.findIndex((c) => c.id === task.status);
  const canLeft = colIdx > 0;
  const canRight = colIdx < COLUMNS.length - 1;

  const passCount = task.uatCases.filter((c) => c.status === 'pass').length;
  const failCount = task.uatCases.filter((c) => c.status === 'fail').length;
  const totalUat = task.uatCases.length;

  return (
    <div
      className={
        'border rounded p-2.5 bg-white transition-all ' +
        (selected
          ? 'border-navy-700 ring-2 ring-navy-700/20'
          : 'border-slate-200 hover:border-navy-400 hover:shadow-sm')
      }
    >
      <button onClick={onSelect} className="w-full text-left">
        <div className="text-sm font-medium text-slate-900 leading-snug mb-1.5">{task.title}</div>
        {task.modelName && (
          <div className="text-[11px] font-mono text-navy-700 mb-0.5">{task.modelName}</div>
        )}
        <div className="text-[11px] text-slate-500 mb-2">{task.owner || '—'}</div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={
              'text-[10px] font-mono px-1.5 py-0.5 rounded border ' + PRIORITY_CHIP[task.priority]
            }
          >
            {task.priority}
          </span>
          <span className={'text-[11px] font-mono ' + TONE_CLASS[due.tone]}>{due.text}</span>
          {totalUat > 0 && (
            <span
              className={
                'text-[10px] font-mono px-1.5 py-0.5 rounded ' +
                (failCount > 0
                  ? 'bg-red-50 text-red-800'
                  : passCount === totalUat
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'bg-slate-100 text-slate-700')
              }
            >
              UAT {passCount}/{totalUat}
              {failCount > 0 && ` · ${failCount} fail`}
            </span>
          )}
        </div>
      </button>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMove(-1);
          }}
          disabled={!canLeft}
          className="px-1.5 py-0.5 text-xs border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move left"
        >
          ←
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMove(1);
          }}
          disabled={!canRight}
          className="px-1.5 py-0.5 text-xs border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move right"
        >
          →
        </button>
      </div>
    </div>
  );
}

// ---------- Side panel ----------

function SidePanel({ task, onClose, onUpdate, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reset confirm when switching task.
  useEffect(() => {
    setConfirmDelete(false);
  }, [task.id]);

  const updateUat = (caseId, patch) => {
    onUpdate({
      uatCases: task.uatCases.map((c) => (c.id === caseId ? { ...c, ...patch } : c)),
    });
  };
  const addUat = () => onUpdate({ uatCases: [...task.uatCases, newUatCase()] });
  const deleteUat = (caseId) =>
    onUpdate({ uatCases: task.uatCases.filter((c) => c.id !== caseId) });

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/20 z-30"
        onClick={onClose}
        aria-label="Close panel"
      />
      <aside className="fixed top-0 right-0 bottom-0 w-[440px] bg-white border-l border-slate-200 shadow-xl z-40 flex flex-col">
        <header className="flex items-start justify-between px-5 py-4 border-b border-slate-200 gap-3">
          <input
            value={task.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="flex-1 text-sm font-semibold text-slate-900 px-2 py-1 -mx-2 -my-1 border border-transparent hover:border-slate-200 focus:border-navy-300 rounded focus:outline-none"
          />
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg leading-none flex-shrink-0"
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <select
                value={task.status}
                onChange={(e) => onUpdate({ status: e.target.value })}
                className="w-full px-2 py-1 text-sm border border-slate-300 rounded bg-white"
              >
                {COLUMNS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <div className="flex gap-1">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    onClick={() => onUpdate({ priority: p })}
                    className={
                      'flex-1 px-2 py-1 text-xs font-mono rounded border ' +
                      (task.priority === p
                        ? PRIORITY_CHIP[p]
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50')
                    }
                  >
                    {p}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Model">
              <input
                value={task.modelName || ''}
                onChange={(e) => onUpdate({ modelName: e.target.value })}
                className="w-full px-2 py-1 text-sm border border-slate-300 rounded font-mono"
              />
            </Field>
            <Field label="Owner">
              <input
                value={task.owner || ''}
                onChange={(e) => onUpdate({ owner: e.target.value })}
                className="w-full px-2 py-1 text-sm border border-slate-300 rounded"
              />
            </Field>
            <Field label="Due date">
              <div className="flex gap-1">
                <input
                  type="date"
                  value={task.dueDate || ''}
                  onChange={(e) => onUpdate({ dueDate: e.target.value || null })}
                  className="flex-1 px-2 py-1 text-sm border border-slate-300 rounded font-mono"
                />
                {task.dueDate && (
                  <button
                    onClick={() => onUpdate({ dueDate: null })}
                    className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-100"
                    title="Clear date"
                  >
                    ×
                  </button>
                )}
              </div>
            </Field>
            <Field label="Updated">
              <div className="text-xs font-mono text-slate-500 px-2 py-1.5">
                {new Date(task.updatedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: '2-digit',
                  year: 'numeric',
                })}
              </div>
            </Field>
          </div>

          <Field label="Description">
            <textarea
              value={task.description || ''}
              onChange={(e) => onUpdate({ description: e.target.value })}
              rows={4}
              className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded resize-y"
            />
          </Field>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                UAT Cases ({task.uatCases.length})
              </h3>
              <button
                onClick={addUat}
                className="px-2 py-0.5 text-xs border border-navy-300 text-navy-800 rounded hover:bg-navy-50"
              >
                + Add UAT case
              </button>
            </div>

            {task.uatCases.length === 0 ? (
              <div className="text-[11px] text-slate-400 italic border border-dashed border-slate-200 rounded p-3 text-center">
                No UAT cases yet.
              </div>
            ) : (
              <ul className="space-y-2">
                {task.uatCases.map((c, i) => (
                  <UatRow
                    key={c.id}
                    index={i}
                    uatCase={c}
                    onChange={(patch) => updateUat(c.id, patch)}
                    onDelete={() => deleteUat(c.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>

        <footer className="px-5 py-3 border-t border-slate-200">
          {confirmDelete ? (
            <div className="flex items-center justify-between gap-2 bg-red-50 border border-red-200 rounded p-2">
              <span className="text-xs text-red-800">Delete this task and its UAT cases?</span>
              <div className="flex gap-1">
                <button
                  onClick={onDelete}
                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full px-3 py-1.5 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50"
            >
              Delete task
            </button>
          )}
        </footer>
      </aside>
    </>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

function UatRow({ index, uatCase, onChange, onDelete }) {
  return (
    <li className="border border-slate-200 rounded p-2 bg-slate-50">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-mono text-slate-500">
          UAT-{String(index + 1).padStart(3, '0')}
        </span>
        <div className="flex items-center gap-1">
          <select
            value={uatCase.status}
            onChange={(e) => onChange({ status: e.target.value })}
            className={
              'text-[10px] font-mono px-1.5 py-0.5 rounded border ' +
              UAT_STATUS_CHIP[uatCase.status]
            }
          >
            <option value="pending">pending</option>
            <option value="pass">pass</option>
            <option value="fail">fail</option>
          </select>
          <button
            onClick={onDelete}
            className="text-slate-400 hover:text-red-700 text-sm leading-none px-1"
            aria-label="Delete UAT case"
          >
            ×
          </button>
        </div>
      </div>

      <input
        value={uatCase.scenario}
        onChange={(e) => onChange({ scenario: e.target.value })}
        placeholder="Scenario"
        className="w-full px-2 py-1 text-xs border border-slate-300 rounded mb-1 bg-white"
      />
      <div className="grid grid-cols-2 gap-1">
        <input
          value={uatCase.expected}
          onChange={(e) => onChange({ expected: e.target.value })}
          placeholder="Expected"
          className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-mono bg-white"
        />
        <input
          value={uatCase.actual}
          onChange={(e) => onChange({ actual: e.target.value })}
          placeholder="Actual"
          className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-mono bg-white"
        />
      </div>
    </li>
  );
}
