import { useEffect, useState } from 'react';
import { get, set, clearAll } from '../lib/storage.js';
import { ping, DEFAULT_MODEL } from '../lib/ai.js';

const KEY_STORAGE = 'apiKey';

export default function Settings({ open, onClose }) {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [testStatus, setTestStatus] = useState(null); // null | 'testing' | 'ok' | 'err'
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    if (open) {
      setApiKey(get(KEY_STORAGE, '') || '');
      setSaved(false);
      setConfirmReset(false);
      setTestStatus(null);
      setTestMessage('');
    }
  }, [open]);

  if (!open) return null;

  const handleSave = () => {
    set(KEY_STORAGE, apiKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleTest = async () => {
    // Persist the current input first so the wrapper sees it.
    set(KEY_STORAGE, apiKey.trim());
    setTestStatus('testing');
    setTestMessage('');
    try {
      await ping();
      setTestStatus('ok');
      setTestMessage(`Connected — ${DEFAULT_MODEL}`);
    } catch (e) {
      setTestStatus('err');
      setTestMessage(e.message || 'Connection failed.');
    }
  };

  const handleReset = () => {
    clearAll();
    setApiKey('');
    setConfirmReset(false);
    setSaved(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="flex-1 bg-slate-900/40"
        onClick={onClose}
        aria-label="Close settings"
      />
      <aside className="w-[420px] bg-white border-l border-slate-200 shadow-xl flex flex-col">
        <header className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">Settings</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-auto px-5 py-5 space-y-6">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              OpenAI API
            </h3>
            <label className="block text-xs text-slate-600 mb-1">API key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
              autoComplete="off"
              spellCheck={false}
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Stored in localStorage on this machine. Used only for direct calls to
              api.openai.com.
            </p>

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleSave}
                className="px-3 py-1.5 text-sm bg-navy-800 text-white rounded hover:bg-navy-700"
              >
                Save
              </button>

              <button
                onClick={handleTest}
                disabled={testStatus === 'testing' || !apiKey.trim()}
                className="px-3 py-1.5 text-sm border border-slate-300 text-slate-700 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testStatus === 'testing' ? 'Testing…' : 'Test connection'}
              </button>

              {saved && <span className="text-xs text-emerald-600">Saved</span>}
            </div>

            {testStatus === 'ok' && (
              <p className="mt-2 text-xs text-emerald-700">{testMessage}</p>
            )}
            {testStatus === 'err' && (
              <p className="mt-2 text-xs text-red-700 break-words">{testMessage}</p>
            )}
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Data
            </h3>
            {!confirmReset ? (
              <button
                onClick={() => setConfirmReset(true)}
                className="px-3 py-1.5 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50"
              >
                Reset all data
              </button>
            ) : (
              <div className="border border-red-300 bg-red-50 rounded p-3">
                <p className="text-xs text-red-800 mb-2">
                  This clears all RiskFlow data in localStorage (API key, saved canvas, uploaded
                  datasets, docs, tasks). Continue?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleReset}
                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Yes, reset
                  </button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
