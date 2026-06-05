import React, { useState, useEffect } from 'react';
import VerificationAdmin from './VerificationAdmin';
import WoodAdmin from './WoodAdmin';
import DbTableAdmin from './DbTableAdmin';
import SqlImportAdmin from './SqlImportAdmin';
import { api } from '../../api';

type Tab = 'verifications' | 'wood' | 'database' | 'sql';

interface Norm { id: string; name: string; label: string; year: number; description: string; }

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'verifications', label: 'Nachweise & Formeln', icon: '📐' },
  { id: 'wood',          label: 'Holzarten & Klassen', icon: '🌲' },
  { id: 'database',      label: 'Datenbank / Tabellen',  icon: '📊' },
  { id: 'sql',           label: 'SQL-Import',           icon: '🗄' },
];

// Context: aktive Norm fürs Backend
export const NormContext = React.createContext<{ normId: string; normLabel: string }>({ normId: 'sia265', normLabel: 'SIA 265' });

export default function AdminPage({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>('verifications');
  const [norms, setNorms] = useState<Norm[]>([]);
  const [activeNorm, setActiveNorm] = useState<string>('sia265');

  useEffect(() => {
    api.getNorms().then(setNorms).catch(() => {
      setNorms([
        { id: 'sia265', name: 'SIA 265', label: 'SIA 265 – Holzbau', year: 2021, description: '' },
        { id: 'sia261', name: 'SIA 261', label: 'SIA 261 – Einwirkungen', year: 2020, description: '' },
      ]);
    });
  }, []);

  const currentNorm = norms.find(n => n.id === activeNorm);

  const selStyle: React.CSSProperties = {
    border: '1px solid rgba(255,255,255,0.35)',
    borderRadius: 6, padding: '4px 8px',
    fontSize: 12, background: 'rgba(255,255,255,0.18)',
    color: '#fff', cursor: 'pointer', fontWeight: 600,
  };

  return (
    <NormContext.Provider value={{ normId: activeNorm, normLabel: currentNorm?.label ?? activeNorm }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>

        {/* ── Admin Header ── */}
        <div style={{
          background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
          padding: '0 16px', height: 52,
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>
            ⚙️ Backend
          </span>

          {/* Norm-Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.2)', borderRadius: 7, padding: '3px 6px' }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)' }}>Norm:</span>
            {norms.map(n => (
              <button key={n.id} onClick={() => setActiveNorm(n.id)} style={{
                background: activeNorm === n.id ? 'rgba(255,255,255,0.3)' : 'transparent',
                border: activeNorm === n.id ? '1px solid rgba(255,255,255,0.5)' : '1px solid transparent',
                color: '#fff', borderRadius: 5, padding: '3px 10px',
                cursor: 'pointer', fontSize: 12, fontWeight: activeNorm === n.id ? 700 : 400,
              }}>
                {n.name} <span style={{ fontSize: 10, opacity: 0.7 }}>{n.year}</span>
              </button>
            ))}
          </div>

          {/* Aktive Norm Info */}
          {currentNorm && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
              {currentNorm.description}
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 3 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                background: activeTab === t.id ? 'rgba(255,255,255,0.22)' : 'transparent',
                border: activeTab === t.id ? '1px solid rgba(255,255,255,0.4)' : '1px solid transparent',
                color: '#fff', borderRadius: 6, padding: '4px 12px',
                cursor: 'pointer', fontSize: 12, fontWeight: activeTab === t.id ? 600 : 400,
              }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
            color: '#fff', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12,
          }}>
            ← Zurück
          </button>
        </div>

        {/* ── Content ── */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
          {activeTab === 'verifications' && <VerificationAdmin />}
          {activeTab === 'wood'          && <WoodAdmin />}
          {activeTab === 'database'      && <DbTableAdmin />}
          {activeTab === 'sql'           && <SqlImportAdmin />}
        </div>
      </div>
    </NormContext.Provider>
  );
}
