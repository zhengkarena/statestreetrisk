import { useEffect, useMemo, useState } from 'react';
import Markdown from '../components/Markdown.jsx';
import { get, set } from '../lib/storage.js';

const STORAGE_KEY = 'docs';

const TYPES = ['Process Design', 'Ops Manual', 'Bottleneck Analysis', 'UAT Cases', 'Manual'];

const TYPE_BADGE = {
  'Process Design': 'bg-navy-100 text-navy-800',
  'Ops Manual': 'bg-emerald-100 text-emerald-800',
  'Bottleneck Analysis': 'bg-amber-100 text-amber-800',
  'UAT Cases': 'bg-violet-100 text-violet-800',
  Manual: 'bg-slate-200 text-slate-800',
};

function newDoc() {
  const now = new Date().toISOString();
  return {
    id: 'doc-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title: 'Untitled document',
    type: 'Manual',
    body: '# Untitled document\n\nWrite your content here. Markdown supported.',
    createdAt: now,
    updatedAt: now,
  };
}

function slugify(s) {
  return (
    String(s || 'document')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase()
      .slice(0, 80) || 'document'
  );
}

function downloadMd(doc) {
  const blob = new Blob([doc.body], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = slugify(doc.title) + '.md';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

export default function DocsRepo() {
  const [docs, setDocs] = useState(() => get(STORAGE_KEY, []) || []);
  const [selectedId, setSelectedId] = useState(() => (get(STORAGE_KEY, []) || [])[0]?.id ?? null);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Persist on every change.
  useEffect(() => {
    set(STORAGE_KEY, docs);
  }, [docs]);

  const sorted = useMemo(
    () => docs.slice().sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    [docs],
  );

  const selected = docs.find((d) => d.id === selectedId) || null;

  const updateSelected = (patch) => {
    setDocs((prev) =>
      prev.map((d) =>
        d.id === selectedId ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d,
      ),
    );
  };

  const addNew = () => {
    const d = newDoc();
    setDocs((prev) => [d, ...prev]);
    setSelectedId(d.id);
    setEditing(true);
    setConfirmDelete(false);
  };

  const deleteSelected = () => {
    if (!selected) return;
    setDocs((prev) => prev.filter((d) => d.id !== selectedId));
    setSelectedId(null);
    setConfirmDelete(false);
    setEditing(false);
  };

  return (
    <div className="flex h-full">
      <Sidebar
        docs={sorted}
        selectedId={selectedId}
        onSelect={(id) => {
          setSelectedId(id);
          setEditing(false);
          setConfirmDelete(false);
        }}
        onNew={addNew}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-slate-50">
        {!docs.length ? (
          <EmptyRepoState onNew={addNew} />
        ) : !selected ? (
          <NoSelectionState />
        ) : (
          <DocView
            doc={selected}
            editing={editing}
            confirmDelete={confirmDelete}
            onEditToggle={() => setEditing((v) => !v)}
            onChangeTitle={(t) => updateSelected({ title: t })}
            onChangeBody={(b) => updateSelected({ body: b })}
            onChangeType={(t) => updateSelected({ type: t })}
            onExport={() => downloadMd(selected)}
            onDeleteClick={() => setConfirmDelete(true)}
            onDeleteConfirm={deleteSelected}
            onDeleteCancel={() => setConfirmDelete(false)}
          />
        )}
      </main>
    </div>
  );
}

// ---------- Sidebar ----------

function Sidebar({ docs, selectedId, onSelect, onNew }) {
  return (
    <aside className="w-[260px] flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
      <header className="px-4 py-3 border-b border-slate-200">
        <button
          onClick={onNew}
          className="w-full px-3 py-1.5 text-sm bg-navy-800 text-white rounded hover:bg-navy-700"
        >
          + New Doc
        </button>
      </header>

      <div className="flex-1 overflow-auto">
        {!docs.length ? (
          <div className="px-4 py-6 text-xs text-slate-500">
            No saved documents yet. Create one or generate one in the AI Co-Pilot.
          </div>
        ) : (
          <ul className="py-1">
            {docs.map((d) => {
              const active = d.id === selectedId;
              return (
                <li key={d.id}>
                  <button
                    onClick={() => onSelect(d.id)}
                    className={
                      'w-full text-left px-4 py-2 border-l-2 transition-colors ' +
                      (active
                        ? 'bg-navy-50 border-navy-700'
                        : 'border-transparent hover:bg-slate-50')
                    }
                  >
                    <div className="text-sm font-medium text-slate-900 truncate">{d.title}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <TypeBadge type={d.type} />
                      <span className="text-[11px] font-mono text-slate-500">
                        {fmtDate(d.updatedAt)}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}

function TypeBadge({ type }) {
  const cls = TYPE_BADGE[type] || TYPE_BADGE.Manual;
  return (
    <span className={'text-[10px] font-mono px-1.5 py-0.5 rounded ' + cls}>{type || 'Manual'}</span>
  );
}

// ---------- Empty states ----------

function EmptyRepoState({ onNew }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="text-sm font-semibold text-slate-900 mb-1">No documents yet</div>
        <p className="text-xs text-slate-600 mb-4">
          Generate documents from the AI Co-Pilot (process design, ops manual, bottleneck analysis,
          UAT test cases) and click <em>Save to Docs Repo</em>, or add a manual document below.
        </p>
        <button
          onClick={onNew}
          className="px-3 py-1.5 text-sm bg-navy-800 text-white rounded hover:bg-navy-700"
        >
          + New Doc
        </button>
      </div>
    </div>
  );
}

function NoSelectionState() {
  return (
    <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
      Select a document from the left.
    </div>
  );
}

// ---------- Doc view ----------

function DocView({
  doc,
  editing,
  confirmDelete,
  onEditToggle,
  onChangeTitle,
  onChangeBody,
  onChangeType,
  onExport,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
}) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <DocHeader
        doc={doc}
        editing={editing}
        confirmDelete={confirmDelete}
        onEditToggle={onEditToggle}
        onChangeTitle={onChangeTitle}
        onChangeType={onChangeType}
        onExport={onExport}
        onDeleteClick={onDeleteClick}
        onDeleteConfirm={onDeleteConfirm}
        onDeleteCancel={onDeleteCancel}
      />

      <div className="flex-1 overflow-auto">
        {editing ? (
          <textarea
            value={doc.body}
            onChange={(e) => onChangeBody(e.target.value)}
            className="w-full h-full px-6 py-5 font-mono text-xs text-slate-800 bg-white border-0 focus:outline-none resize-none"
            spellCheck={false}
          />
        ) : (
          <div className="px-8 py-6 max-w-4xl">
            <Markdown body={doc.body} />
          </div>
        )}
      </div>
    </div>
  );
}

function DocHeader({
  doc,
  editing,
  confirmDelete,
  onEditToggle,
  onChangeTitle,
  onChangeType,
  onExport,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
}) {
  const [titleDraft, setTitleDraft] = useState(doc.title);
  const [titleEditing, setTitleEditing] = useState(false);

  // Sync draft if doc switches under us.
  useEffect(() => {
    setTitleDraft(doc.title);
    setTitleEditing(false);
  }, [doc.id, doc.title]);

  const commitTitle = () => {
    const v = titleDraft.trim() || 'Untitled document';
    if (v !== doc.title) onChangeTitle(v);
    setTitleEditing(false);
  };

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {titleEditing ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitTitle();
                if (e.key === 'Escape') {
                  setTitleDraft(doc.title);
                  setTitleEditing(false);
                }
              }}
              className="w-full text-base font-semibold text-slate-900 px-2 py-1 -mx-2 -my-1 border border-navy-300 rounded focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
          ) : (
            <button
              onClick={() => setTitleEditing(true)}
              className="text-base font-semibold text-slate-900 hover:bg-slate-50 px-2 py-1 -mx-2 -my-1 rounded text-left max-w-full truncate"
              title="Click to rename"
            >
              {doc.title}
            </button>
          )}

          <div className="flex items-center gap-3 mt-1.5">
            <select
              value={doc.type}
              onChange={(e) => onChangeType(e.target.value)}
              className="text-[11px] font-mono px-1.5 py-0.5 border border-slate-300 rounded bg-white"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <span className="text-[11px] font-mono text-slate-500">
              Created {fmtDate(doc.createdAt)} · Updated {fmtDate(doc.updatedAt)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onEditToggle}
            className={
              'px-3 py-1.5 text-sm rounded border ' +
              (editing
                ? 'bg-navy-800 text-white border-navy-800 hover:bg-navy-700'
                : 'border-slate-300 text-slate-700 hover:bg-slate-100')
            }
          >
            {editing ? 'View' : 'Edit'}
          </button>
          <button
            onClick={onExport}
            className="px-3 py-1.5 text-sm border border-slate-300 text-slate-700 rounded hover:bg-slate-100"
          >
            Export .md
          </button>

          {confirmDelete ? (
            <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded px-2 py-1">
              <span className="text-xs text-red-800">Delete?</span>
              <button
                onClick={onDeleteConfirm}
                className="px-2 py-0.5 text-xs bg-red-600 text-white rounded hover:bg-red-700"
              >
                Yes
              </button>
              <button
                onClick={onDeleteCancel}
                className="px-2 py-0.5 text-xs border border-slate-300 rounded hover:bg-white"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={onDeleteClick}
              className="px-3 py-1.5 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
