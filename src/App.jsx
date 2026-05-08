import { lazy, Suspense, useState } from 'react';
import Layout from './components/Layout.jsx';
import Settings from './components/Settings.jsx';
import TabLoading from './components/TabLoading.jsx';
import ProcessCanvas from './tabs/ProcessCanvas.jsx';
import DataHub from './tabs/DataHub.jsx';
import ProjectUAT from './tabs/ProjectUAT.jsx';

// Heavy tabs — split into async chunks so they don't bloat the initial bundle.
// Recharts is in RiskMetrics + ProductionMonitor; react-markdown is in
// AICopilot + DocsRepo + ProductionMonitor — Rollup will create shared chunks
// across them automatically.
const RiskMetrics = lazy(() => import('./tabs/RiskMetrics.jsx'));
const AICopilot = lazy(() => import('./tabs/AICopilot.jsx'));
const ProductionMonitor = lazy(() => import('./tabs/ProductionMonitor.jsx'));
const DocsRepo = lazy(() => import('./tabs/DocsRepo.jsx'));

export const TABS = [
  { id: 'process', label: 'Process Canvas', component: ProcessCanvas },
  { id: 'metrics', label: 'Risk Metrics', component: RiskMetrics },
  { id: 'data', label: 'Data Hub', component: DataHub },
  { id: 'ai', label: 'AI Co-Pilot', component: AICopilot },
  { id: 'uat', label: 'Project & UAT', component: ProjectUAT },
  { id: 'monitor', label: 'Production Monitor', component: ProductionMonitor },
  { id: 'docs', label: 'Docs Repo', component: DocsRepo },
];

export default function App() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const active = TABS.find((t) => t.id === activeTab);
  const Active = active?.component ?? ProcessCanvas;

  return (
    <>
      <Layout
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSettings={() => setSettingsOpen(true)}
      >
        <Suspense fallback={<TabLoading label={active?.label} />}>
          <Active />
        </Suspense>
      </Layout>
      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
