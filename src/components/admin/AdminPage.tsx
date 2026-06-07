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
  const [showNewNorm, setShowNewNorm] = useState(false);
  const [newNorm, setNewNorm] = useState({ name: '', year: String(new Date().getFullYear()) });
  const [normMsg, setNormMsg] = useState('');

  const loadNorms = () => {
    api.getNorms().then(setNorms).catch(() => {
      setNorms([
        { id: 'sia265', name: 'SIA 265', label: 'SIA 265 – Holzbau', year: 2021, description: '' },
        { id: 'sia261', name: 'SIA 261', label: 'SIA 261 – Einwirkungen', year: 2020, description: '' },
      ]);
    });
  };

  useEffect(() => { loadNorms(); }, []);

  const currentNorm = norms.find(n => n.id === activeNorm);

  const createNorm = async () => {
    setNormMsg('');
    const name = newNorm.name.trim();
    const year = Number(newNorm.year);
    if (!name || !year) {
      setNormMsg('Bitte Name und Jahr ausfüllen.');
      return;
    }
    const id = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '') || `norm_${Date.now().toString(36)}`;
    const label = name;
    try {
      await api.createNorm({ id, name, label, year, description: '' });
      const loaded = await api.getNorms();
      setNorms(loaded);
      setActiveNorm(id);
      setShowNewNorm(false);
      setNewNorm({ name: '', year: String(new Date().getFullYear()) });
    } catch (e: any) {
      setNormMsg(e?.message && e.message !== 'The string did not match the expected pattern.'
        ? e.message
        : 'Norm konnte nicht erstellt werden.');
    }
  };

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
            <button onClick={() => { setShowNewNorm(true); setNormMsg(''); }} title="Neue Norm erstellen" style={{
              background: 'rgba(255,255,255,0.16)',
              border: '1px solid rgba(255,255,255,0.35)',
              color: '#fff', borderRadius: 5, padding: '3px 8px',
              cursor: 'pointer', fontSize: 13, fontWeight: 700,
            }}>+</button>
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

        {showNewNorm && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(15,23,42,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 420, background: '#fff', borderRadius: 8, boxShadow: '0 18px 45px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
              <div style={{ background: '#4f46e5', color: '#fff', padding: '10px 14px', fontWeight: 700, fontSize: 14 }}>
                Neue Norm
              </div>
              <div style={{ padding: 14, display: 'grid', gap: 10 }}>
                <input value={newNorm.name} onChange={e => setNewNorm({ ...newNorm, name: e.target.value })} placeholder="Name, z.B. SIA 262" style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '7px 9px', fontSize: 13 }} />
                <input inputMode="numeric" value={newNorm.year} onChange={e => setNewNorm({ ...newNorm, year: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="Jahr" style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '7px 9px', fontSize: 13 }} />
                {normMsg && <div style={{ color: '#b91c1c', fontSize: 12 }}>{normMsg}</div>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button onClick={() => setShowNewNorm(false)} style={{ border: '1px solid #d1d5db', background: '#fff', borderRadius: 6, padding: '7px 12px', cursor: 'pointer' }}>Abbrechen</button>
                  <button onClick={createNorm} style={{ border: 'none', background: '#2563eb', color: '#fff', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontWeight: 600 }}>Erstellen</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </NormContext.Provider>
  );
}
