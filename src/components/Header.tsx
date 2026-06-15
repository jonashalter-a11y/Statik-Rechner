import React, { useEffect, useState } from 'react';
import { useStore, woodTypeToId } from '../store/useStore';
import { api } from '../api';

interface Props {
  onAdminClick?: () => void;
  onNormChange?: (normId: string) => void;
}

interface Norm { id: string; name: string; label: string; year: number; description: string; }

function normSubLabel(norm: Norm): string {
  const prefix = `${norm.name} – `;
  return norm.label.startsWith(prefix) ? norm.label.slice(prefix.length) : '';
}

export default function Header({ onAdminClick, onNormChange }: Props) {
  const [norms, setNorms] = useState<Norm[]>([]);
  const [dbWoodTypes, setDbWoodTypes] = useState<string[]>([]);
  const {
    discipline, normId, woodType, woodClassId,
    setDiscipline, setWoodType, setWoodClassId,
    apiWoodTypes, apiWoodClasses,
  } = useStore();

  useEffect(() => {
    let alive = true;
    api.getNorms()
      .then((data: Norm[]) => { if (alive && Array.isArray(data)) setNorms(data); })
      .catch(() => {
        if (alive) setNorms([
          { id: 'sia265', name: 'SIA 265', label: 'SIA 265 – Holzbau', year: 2021, description: '' },
          { id: 'sia261', name: 'SIA 261', label: 'SIA 261 – Einwirkungen', year: 2020, description: '' },
        ]);
      });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    api.getTables('sia265')
      .then((tables: any[]) => {
        const woodTable = tables.find(t => String(t.title || '').trim().toLowerCase() === 'holzart');
        if (!woodTable) return null;
        return api.getTableFull(woodTable.id);
      })
      .then((table: any) => {
        if (!alive || !table) return;
        const values = (table.rows || [])
          .map((row: string[]) => String(row?.[0] || '').trim())
          .filter(Boolean);
        setDbWoodTypes(Array.from(new Set<string>(values)));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const typeId = woodTypeToId(woodType);
  const filteredClasses = apiWoodClasses.filter(c => c.wood_type_id === typeId);
  const effectiveClassId = filteredClasses.some(c => c.id === woodClassId) ? woodClassId : filteredClasses[0]?.id ?? '';
  const isSIA265 = normId === 'sia265';
  const activeNorm = norms.find(n => n.id === normId);
  const woodTypeOptions = dbWoodTypes.length > 0
    ? dbWoodTypes
    : apiWoodTypes.length > 0
      ? apiWoodTypes.map(t => t.name)
      : ['Vollholz', 'Brettschichtholz', 'Brettsperrholz'];

  useEffect(() => {
    if (isSIA265 && woodTypeOptions.length > 0 && !woodTypeOptions.includes(woodType)) {
      setWoodType(woodTypeOptions[0] as any);
    }
  }, [isSIA265, woodTypeOptions.join('|'), woodType]);

  const handleNormClick = (id: string) => {
    onNormChange?.(id);
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
        {norms.map(n => (
          <button key={n.id} onClick={() => handleNormClick(n.id)} style={{
            background: normId === n.id ? 'rgba(255,255,255,0.28)' : 'transparent',
            border: normId === n.id ? '1px solid rgba(255,255,255,0.5)' : '1px solid transparent',
            color: '#fff', borderRadius: 5, padding: '3px 9px',
            cursor: 'pointer', fontSize: 12, fontWeight: normId === n.id ? 700 : 400,
            whiteSpace: 'nowrap',
          }}>
            {n.name} <span style={{ fontSize: 9, opacity: 0.65 }}>{normSubLabel(n)}</span>
          </button>
        ))}
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
      {isSIA265 && <>
        {divider}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)' }}>Holzart</span>
          <select style={sel} value={woodType} onChange={e => setWoodType(e.target.value as any)}>
            {woodTypeOptions.map(t => <option key={t} value={t}>{t}</option>)}
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

      {/* Norm-Beschreibung */}
      {!isSIA265 && activeNorm?.description && (
        <div style={{ fontSize: 10, color: '#bfdbfe', background: 'rgba(255,255,255,0.1)', borderRadius: 4, padding: '2px 8px', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {activeNorm.description}
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* Norm-Info */}
      {activeNorm && (
        <div style={{ background: 'rgba(255,255,255,0.10)', borderRadius: 4, padding: '2px 7px', fontSize: 10, color: '#93c5fd', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {activeNorm.label}:{activeNorm.year}
        </div>
      )}

      <button onClick={onAdminClick} style={{
        background: 'rgba(124,58,237,0.7)', border: '1px solid rgba(167,139,250,0.4)',
        color: '#fff', borderRadius: 5, padding: '3px 9px', cursor: 'pointer',
        fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        ⚙️ Admin
      </button>
    </div>
  );
}
