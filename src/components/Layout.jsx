export default function Layout({ tabs, activeTab, onTabChange, onOpenSettings, children }) {
  const active = tabs.find((t) => t.id === activeTab);

  return (
    <div className="flex h-full w-full">
      <aside className="flex w-60 flex-col bg-navy-900 text-slate-200">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-navy-800">
          <div className="h-7 w-7 rounded-sm bg-navy-500 flex items-center justify-center text-white font-semibold text-xs">
            RF
          </div>
          <div>
            <div className="text-sm font-semibold text-white tracking-tight">RiskFlow Studio</div>
            <div className="text-[10px] uppercase tracking-wider text-navy-300">
              Risk Modeling Workbench
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {tabs.map((t) => {
            const isActive = t.id === activeTab;
            return (
              <button
                key={t.id}
                onClick={() => onTabChange(t.id)}
                className={
                  'w-full px-3 py-2 rounded text-left text-sm transition-colors ' +
                  (isActive
                    ? 'bg-navy-700 text-white'
                    : 'text-navy-100 hover:bg-navy-800 hover:text-white')
                }
              >
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t border-navy-800">
          <button
            onClick={onOpenSettings}
            className="w-full px-3 py-2 rounded text-sm text-navy-100 hover:bg-navy-800 hover:text-white text-left"
          >
            Settings
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col bg-slate-50 min-w-0">
        <header className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white">
          <h1 className="text-base font-semibold text-slate-900">{active?.label}</h1>
          <div className="text-xs font-mono text-slate-500">
            {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: '2-digit',
            })}
          </div>
        </header>

        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}
