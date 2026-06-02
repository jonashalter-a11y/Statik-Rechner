import React from 'react';
import { useStore, woodTypeToId } from '../store/useStore';

interface Props {
  onAdminClick?: () => void;
  onNormChange?: (normId: string) => void;
}

const NORMS = [
  { id: 'sia265', label: 'SIA 265', sub: 'Holzbau', year: '2021', flag: '🇨🇭' },
  { id: 'sia261', label: 'SIA 261', sub: 'Einwirkungen', year: '2020', flag: '🇨🇭' },
];

export default function Header({ onAdminClick, onNormChange }: Props) {
  const {
    discipline, standard, normId, woodType, woodClassId,
    setDiscipline, setStandard, setWoodType, setWoodClassId,
    apiWoodTypes, apiWoodClasses,
  } = useStore();

  const typeId = woodTypeToId(woodType);
  const filteredClasses = apiWoodClasses.filter(c => c.wood_type_id === typeId);
  const effectiveClassId = filteredClasses.some(c => c.id === woodClassId) ? woodClassId : filteredClasses[0]?.id ?? '';

  const isSIA261 = normId === 'sia261';
  const activeNorm = NORMS.find(n => n.id === normId);

  const handleNormClick = (id: string) => {
    onNormChange?.(id);
    // SIA261 ist immer "SIA"-Standard im Sinne von nicht-Eurocode
    if (id === 'sia261' || id === 'sia265') setStandard('SIA');
  };

  const sel: React.CSSProperties = {
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 5, padding: '3px 6px',
    fontSize: 11, background: 'rgba(255,255,255,0.15)',
    color: '#fff', cursor: 'pointer', minWidth: 0,
  };

  const divider = <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)',
      padding: '0 12px', height: 48,
      display: 'flex', alignItems: 'center', gap: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)', flexShrink: 0, overflowX: 'auto',
    }}>
      {/* Logo */}
      <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', flexShrink: 0 }}>
        SIA <span style={{ fontSize: 9, fontWeight: 400, color: '#93c5fd' }}>Rechner</span>
      </div>

      {divider}

      {/* Norm-Pills */}
      <div style={{ display: 'flex', gap: 3, background: 'rgba(0,0,0,0.2)', borderRadius: 7, padding: '2px 4px', flexShrink: 0 }}>
        {NORMS.map(n => (
          <button key={n.id} onClick={() => handleNormClick(n.id)} style={{
            background: normId === n.id ? 'rgba(255,255,255,0.28)' : 'transparent',
            border: normId === n.id ? '1px solid rgba(255,255,255,0.5)' : '1px solid transparent',
            color: '#fff', borderRadius: 5, padding: '3px 9px',
            cursor: 'pointer', fontSize: 12, fontWeight: normId === n.id ? 700 : 400,
            whiteSpace: 'nowrap',
          }}>
            {n.label} <span style={{ fontSize: 9, opacity: 0.65 }}>{n.sub}</span>
          </button>
        ))}
        {/* Eurocode */}
        <button onClick={() => setStandard('Eurocode')} style={{
          background: standard === 'Eurocode' ? 'rgba(251,191,36,0.3)' : 'transparent',
          border: standard === 'Eurocode' ? '1px solid rgba(251,191,36,0.6)' : '1px solid transparent',
          color: '#fff', borderRadius: 5, padding: '3px 9px',
          cursor: 'pointer', fontSize: 12, fontWeight: standard === 'Eurocode' ? 700 : 400,
          whiteSpace: 'nowrap',
        }}>
          EC5 <span style={{ fontSize: 9, opacity: 0.65 }}>Eurocode</span>
        </button>
      </div>

      {divider}

      {/* Bereich */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)' }}>Bereich</span>
        <select style={sel} value={discipline} onChange={e => setDiscipline(e.target.value as any)}>
          <option value="Statik">Statik</option>
          <option value="Bauphysik">Bauphysik</option>
        </select>
      </div>

      {/* Holzart + Holzklasse — nur bei SIA 265 relevant */}
      {!isSIA261 && standard === 'SIA' && <>
        {divider}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)' }}>Holzart</span>
          <select style={sel} value={woodType} onChange={e => setWoodType(e.target.value as any)}>
            {apiWoodTypes.length > 0
              ? apiWoodTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)
              : <>
                  <option value="Vollholz">Vollholz</option>
                  <option value="Brettschichtholz">Brettschichtholz</option>
                  <option value="Brettsperrholz">Brettsperrholz</option>
                </>
            }
          </select>
        </div>

        {filteredClasses.length > 0 && <>
          {divider}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)' }}>Klasse</span>
            <select style={{ ...sel, maxWidth: 180 }} value={effectiveClassId} onChange={e => setWoodClassId(e.target.value)}>
              {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        </>}
      </>}

      {/* SIA 261 Badge */}
      {isSIA261 && (
        <div style={{ fontSize: 10, color: '#bfdbfe', background: 'rgba(255,255,255,0.1)', borderRadius: 4, padding: '2px 8px', whiteSpace: 'nowrap', flexShrink: 0 }}>
          Einwirkungen auf Tragwerke
        </div>
      )}

      {/* Eurocode-Hinweis */}
      {standard === 'Eurocode' && (
        <div style={{ background: 'rgba(251,191,36,0.2)', border: '1px solid rgba(251,191,36,0.4)', borderRadius: 4, padding: '2px 8px', fontSize: 10, color: '#fde68a', whiteSpace: 'nowrap' }}>
          ⚠ Eurocode 5 noch nicht implementiert
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* Norm-Info */}
      {activeNorm && standard !== 'Eurocode' && (
        <div style={{ background: 'rgba(255,255,255,0.10)', borderRadius: 4, padding: '2px 7px', fontSize: 10, color: '#93c5fd', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {activeNorm.flag} {activeNorm.label}:{activeNorm.year}
        </div>
      )}

      <button onClick={onAdminClick} style={{
        background: 'rgba(124,58,237,0.7)', border: '1px solid rgba(167,139,250,0.4)',
        color: '#fff', borderRadius: 5, padding: '3px 9px', cursor: 'pointer',
        fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        ⚙️ Backend
      </button>
    </div>
  );
}
