import React, { useEffect, useState, useContext } from 'react';
import { api } from '../../api';
import { NormContext } from './AdminPage';
import BuildingShape from '../BuildingShape';

interface TableMeta { id: string; norm_id: string; category: string; title: string; description: string; }
interface TableFull extends TableMeta { headers: string[]; rows: string[][]; }

const L: React.CSSProperties = { fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 };

const CATS: Record<string, string[]> = {
  sia265: ['Baustoffe', 'Sicherheit', 'Verbindungen', 'Gebrauchstauglichkeit', 'Sonstiges'],
  sia261: ['Eigenlasten', 'Schnee', 'Wind', 'Wind Anh. C', 'Nutzlasten', 'Temperatur', 'Erddruck', 'Erdbeben', 'Sonstiges'],
};

function emptyTable(normId: string): TableFull {
  const cat = (CATS[normId] || CATS.sia265)[0];
  return { id: '', norm_id: normId, category: cat, title: 'Neue Tabelle', description: '', headers: ['Spalte 1', 'Spalte 2'], rows: [['', '']] };
}

export default function DbTableAdmin() {
  const { normId, normLabel } = useContext(NormContext);
  const [tables, setTables]   = useState<TableMeta[]>([]);
  const [editing, setEditing] = useState<TableFull | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState('');

  const cats = CATS[normId] || CATS.sia265;

  const load = async () => {
    const data = await (api as any).getDbTables(normId);
    setTables(data);
  };
  useEffect(() => { load(); setEditing(null); setSelected(null); }, [normId]);

  const selectTable = async (id: string) => {
    const full = await (api as any).getDbTableFull(id);
    setSelected(id);
    setEditing(JSON.parse(JSON.stringify(full)));
    setMsg('');
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (!editing.id) await (api as any).createDbTable(editing);
      else             await (api as any).updateDbTable(editing.id, editing);
      await load();
      setMsg('✓ Gespeichert');
    } catch { setMsg('⚠ Fehler'); }
    setSaving(false);
  };

  const del = async (id: string) => {
    if (!confirm('Tabelle löschen?')) return;
    await (api as any).deleteDbTable(id);
    setEditing(null); setSelected(null);
    await load();
  };

  const addCol = () => editing && setEditing({ ...editing, headers: [...editing.headers, `Sp. ${editing.headers.length + 1}`], rows: editing.rows.map(r => [...r, '']) });
  const remCol = (ci: number) => editing && setEditing({ ...editing, headers: editing.headers.filter((_, i) => i !== ci), rows: editing.rows.map(r => r.filter((_, i) => i !== ci)) });
  const addRow = () => editing && setEditing({ ...editing, rows: [...editing.rows, editing.headers.map(() => '')] });
  const remRow = (ri: number) => editing && setEditing({ ...editing, rows: editing.rows.filter((_, i) => i !== ri) });
  const setH   = (ci: number, v: string) => { if (!editing) return; const h = [...editing.headers]; h[ci] = v; setEditing({ ...editing, headers: h }); };
  const setCell= (ri: number, ci: number, v: string) => editing && setEditing({ ...editing, rows: editing.rows.map((r, i) => i === ri ? r.map((c, j) => j === ci ? v : c) : r) });

  // Tabellen nach Kategorie
  const bycat = cats.reduce<Record<string, TableMeta[]>>((a, c) => { a[c] = tables.filter(t => t.category === c); return a; }, {});

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

      {/* ── Links: Kategorieliste ── */}
      <div style={{ width: 256, borderRight: '1px solid #e5e7eb', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Normtabellen</div>
            <div style={{ fontSize: 10, color: '#6b7280' }}>{normLabel}</div>
          </div>
          <button onClick={() => { setSelected(null); setEditing(emptyTable(normId)); setMsg(''); }} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>+ Neu</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {cats.map(cat => {
            const ct = bycat[cat] || [];
            return (
              <div key={cat}>
                <div style={{ padding: '5px 12px 3px', fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f8fafc', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {cat}
                  {ct.length > 0 && <span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: 8, padding: '0 5px', fontSize: 9, fontWeight: 700 }}>{ct.length}</span>}
                </div>
                {ct.length === 0
                  ? <div style={{ padding: '3px 16px', fontSize: 11, color: '#d1d5db', fontStyle: 'italic' }}>–</div>
                  : ct.map(t => (
                      <div key={t.id} onClick={() => selectTable(t.id)} style={{
                        padding: '5px 14px', cursor: 'pointer', fontSize: 12,
                        background: selected === t.id ? '#dbeafe' : 'transparent',
                        borderLeft: selected === t.id ? '3px solid #2563eb' : '3px solid transparent',
                      }}>
                        <div style={{ fontWeight: 500, color: '#374151' }}>📊 {t.title}</div>
                        {t.description && <div style={{ fontSize: 10, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</div>}
                      </div>
                    ))
                }
              </div>
            );
          })}
        </div>
        <div style={{ padding: '5px 12px', borderTop: '1px solid #e5e7eb', fontSize: 10, color: '#9ca3af', background: '#fafafa' }}>
          {tables.length} Tabellen · {normLabel}
        </div>
      </div>

      {/* ── Rechts: Editor ── */}
      {editing ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 16, flex: 1 }}>{editing.id ? 'Tabelle bearbeiten' : 'Neue Tabelle'}</h2>
            {msg && <span style={{ fontSize: 12, color: msg.startsWith('✓') ? '#15803d' : '#b91c1c' }}>{msg}</span>}
            {editing.id && <button onClick={() => del(editing.id)} style={{ background: '#fee2e2', border: 'none', borderRadius: 5, padding: '5px 10px', cursor: 'pointer', color: '#b91c1c', fontSize: 12 }}>🗑</button>}
            <button onClick={save} disabled={saving} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              {saving ? '…' : '💾 Speichern'}
            </button>
          </div>

          {/* Meta */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, marginBottom: 14 }}>
            <div>
              <div style={L}>Titel</div>
              <input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })}
                style={{ border: '1px solid #d1d5db', borderRadius: 4, padding: '5px 8px', fontSize: 12, width: '100%' }} />
            </div>
            <div>
              <div style={L}>Beschreibung</div>
              <input value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })}
                placeholder="Kurze Beschreibung" style={{ border: '1px solid #d1d5db', borderRadius: 4, padding: '5px 8px', fontSize: 12, width: '100%' }} />
            </div>
            <div>
              <div style={L}>Kategorie</div>
              <select value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })}
                style={{ border: '1px solid #d1d5db', borderRadius: 4, padding: '5px 7px', fontSize: 12 }}>
                {[...cats, 'Sonstiges'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Tabellenaktionen */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <button onClick={addCol} style={{ background: '#dbeafe', border: 'none', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', color: '#1e40af', fontSize: 12 }}>+ Spalte</button>
            <button onClick={addRow} style={{ background: '#dcfce7', border: 'none', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', color: '#15803d', fontSize: 12 }}>+ Zeile</button>
            <span style={{ fontSize: 11, color: '#9ca3af', alignSelf: 'center' }}>{editing.rows.length} Zeilen × {editing.headers.length} Sp.</span>
          </div>

          {/* Grid-Editor */}
          <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ padding: '4px 6px', border: '1px solid #e5e7eb', color: '#9ca3af', fontSize: 10, width: 30 }}>#</th>
                  {editing.headers.map((h, ci) => (
                    <th key={ci} style={{ padding: '2px 4px', border: '1px solid #e5e7eb', minWidth: 110 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <input value={h} onChange={e => setH(ci, e.target.value)}
                          style={{ border: 'none', background: 'transparent', fontWeight: 600, fontSize: 12, width: '100%', outline: 'none', padding: '2px' }} />
                        <button onClick={() => remCol(ci)} style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 12, lineHeight: 1 }}>×</button>
                      </div>
                    </th>
                  ))}
                  <th style={{ width: 26, border: '1px solid #e5e7eb' }} />
                </tr>
              </thead>
              <tbody>
                {editing.rows.map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '3px 6px', border: '1px solid #f0f0f0', color: '#9ca3af', fontSize: 10, textAlign: 'center' }}>{ri + 1}</td>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{ padding: '2px 3px', border: '1px solid #f0f0f0' }}>
                        <input value={cell} onChange={e => setCell(ri, ci, e.target.value)}
                          style={{ border: 'none', background: 'transparent', fontSize: 12, width: '100%', outline: 'none', padding: '2px 4px' }} />
                      </td>
                    ))}
                    <td style={{ border: '1px solid #f0f0f0', textAlign: 'center' }}>
                      <button onClick={() => remRow(ri)} style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 13 }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Vorschau */}
          <div style={{ marginTop: 16, background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Vorschau</div>
            {/* Gebäudeskizze aus Beschreibung extrahieren (shape:xxx) */}
            {(() => {
              const match = (editing.description || '').match(/^shape:([^|]+)/);
              return match && match[1] !== 'none' ? <BuildingShape shapeKey={match[1]} /> : null;
            })()}
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{editing.title}</div>
            {editing.description && <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>{(editing.description || '').replace(/^shape:[^|]*\|?/, '')}</div>}
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#e2e8f0' }}>
                  {editing.headers.map((h, i) => <th key={i} style={{ padding: '4px 8px', textAlign: 'left', border: '1px solid #cbd5e1', fontWeight: 600 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {editing.rows.map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    {row.map((cell, ci) => <td key={ci} style={{ padding: '4px 8px', border: '1px solid #e5e7eb' }}>{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', gap: 8 }}>
          <div style={{ fontSize: 40 }}>📊</div>
          <div>Tabelle auswählen oder neue erstellen</div>
          <button onClick={() => { setSelected(null); setEditing(emptyTable(normId)); }}
            style={{ marginTop: 6, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 18px', cursor: 'pointer', fontSize: 13 }}>
            + Neue Tabelle für {normLabel}
          </button>
        </div>
      )}
    </div>
  );
}
