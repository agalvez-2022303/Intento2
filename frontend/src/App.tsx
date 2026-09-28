import React, { useEffect, useState } from 'react';
import { TileSim } from '@/ui/TileSim';
import { BeamSim } from '@/ui/BeamSim';
import { CadEditor } from '@/ui/CadEditor';
import { MaterialsEditor } from '@/ui/MaterialsEditor';
import { ReportTab } from '@/ui/ReportTab';
import { useApp } from '@/ui/store';
import { Footprints, Activity, Boxes, Database, FileText, Zap, Cpu } from 'lucide-react';

type Tab = 'tile' | 'beam' | 'cad' | 'materials' | 'report';

const VALID: Tab[] = ['tile', 'beam', 'cad', 'materials', 'report'];
function initialTab(): Tab {
  const h = (typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '') as Tab;
  return VALID.includes(h) ? h : 'tile';
}

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'tile', label: 'Simulación 1 · Baldosa', icon: <Footprints size={15} /> },
  { id: 'beam', label: 'Simulación 2 · Viga', icon: <Activity size={15} /> },
  { id: 'cad', label: 'Editor CAD', icon: <Boxes size={15} /> },
  { id: 'materials', label: 'Materiales', icon: <Database size={15} /> },
  { id: 'report', label: 'Reporte', icon: <FileText size={15} /> },
];

export default function App() {
  const [tab, setTabState] = useState<Tab>(initialTab);
  const setTab = (t: Tab) => {
    setTabState(t);
    if (typeof window !== 'undefined') window.location.hash = t;
  };
  const app = useApp();
  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.replace('#', '') as Tab;
      if (VALID.includes(h)) setTabState(h);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const busy = (tab === 'tile' && app.tileBusy) || (tab === 'beam' && app.beamBusy);

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="logo">
            <Zap size={17} />
          </span>
          <span>
            PiezoLab
            <br />
            <small>Simulación 3D · Cosecha piezoeléctrica</small>
          </span>
        </div>
        <nav className="tabs" data-testid="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
              data-testid={`tab-${t.id}`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>
        <div className="spacer" />
        <span className="pill" data-testid="worker-status">
          <Cpu size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />
          {busy ? 'calculando…' : 'solver listo'}
        </span>
        <span className="pill">SI · RK4 adaptativo</span>
      </header>

      {tab === 'tile' && <TileSim />}
      {tab === 'beam' && <BeamSim />}
      {tab === 'cad' && <CadEditor />}
      {tab === 'materials' && <MaterialsEditor />}
      {tab === 'report' && <ReportTab />}
    </div>
  );
}
