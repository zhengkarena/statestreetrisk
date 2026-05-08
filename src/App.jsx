import { useState } from 'react';
import Layout from './components/Layout.jsx';
import Settings from './components/Settings.jsx';
import ProcessCanvas from './tabs/ProcessCanvas.jsx';
import RiskMetrics from './tabs/RiskMetrics.jsx';
import DataHub from './tabs/DataHub.jsx';
import AICopilot from './tabs/AICopilot.jsx';
import ProjectUAT from './tabs/ProjectUAT.jsx';
import ProductionMonitor from './tabs/ProductionMonitor.jsx';
import DocsRepo from './tabs/DocsRepo.jsx';

export const TABS = [
  { id: 'process', label: 'Process Canvas', milestone: 'M2', component: ProcessCanvas },
  { id: 'metrics', label: 'Risk Metrics', milestone: 'M3', component: RiskMetrics },
  { id: 'data', label: 'Data Hub', milestone: 'M3', component: DataHub },
  { id: 'ai', label: 'AI Co-Pilot', milestone: 'M4', component: AICopilot },
  { id: 'uat', label: 'Project & UAT', milestone: 'M5', component: ProjectUAT },
  { id: 'monitor', label: 'Production Monitor', milestone: 'M5', component: ProductionMonitor },
  { id: 'docs', label: 'Docs Repo', milestone: 'M5', component: DocsRepo },
];

export default function App() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const Active = TABS.find((t) => t.id === activeTab)?.component ?? ProcessCanvas;

  return (
    <>
      <Layout
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSettings={() => setSettingsOpen(true)}
      >
        <Active />
      </Layout>
      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
