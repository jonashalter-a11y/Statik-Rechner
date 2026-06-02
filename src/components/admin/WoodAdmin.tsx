import React, { useEffect, useState } from 'react';
import { api } from '../../api';

interface Property { key: string; label: string; value: number; unit: string; }
interface WoodClass { id: string; wood_type_id: string; name: string; label: string; properties: Property[]; }
interface WoodType { id: string; name: string; label: string; }

const labelStyle: React.CSSProperties = { fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 };

const defaultProps: Property[] = [
  { key: 'f_m_k', label: 'Biegefestigkeit', value: 24, unit: 'N/mm²' },
  { key: 'f_t_0_k', label: 'Zugfestigkeit parallel', value: 14, unit: 'N/mm²' },
  { key: 'f_c_0_k', label: 'Druckfestigkeit parallel', value: 21, unit: 'N/mm²' },
  { key: 'f_v_k', label: 'Scherfestigkeit', value: 2.5, unit: 'N/mm²' },
  { key: 'E_0_mean', label: 'E-Modul', value: 11000, unit: 'N/mm²' },
  { key: 'rho_k', label: 'Rohdichte', value: 350, unit: 'kg/m³' },
];

export default function WoodAdmin() {
  const [types, setTypes] = useState<WoodType[]>([]);
  const [classes, setClasses] = useState<WoodClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<WoodClass | null>(null);
  const [editClass, setEditClass] = useState<WoodClass | null>(null);
  const [newTypeName, setNewTypeName] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => {
    setTypes(await api.getWoodTypes());
    setClasses(await api.getWoodClasses());
  };

  useEffect(() => { load(); }, []);

  const addType = async () => {
    if (!newTypeName.trim()) return;
    await api.createWoodType({ name: newTypeName, label: newTypeName });
    setNewTypeName('');
    load();
  };

  const deleteType = async (id: string) => {
    if (!confirm('Holzart löschen? Alle zugehörigen Klassen werden auch gelöscht.')) return;
    await api.deleteWoodType(id);
    load();
  };

  const newClass = (wood_type_id: string) => {
    setSelectedClass(null);
    setEditClass({ id: '', wood_type_id, name: '', label: '', properties: defaultProps.map(p => ({ ...p })) });
    setMsg('');
  };

  const selectClass = (c: WoodClass) => {
    setSelectedClass(c);
    setEditClass(JSON.parse(JSON.stringify(c)));
    setMsg('');
  };

  const saveClass = async () => {
    if (!editClass) return;
    if (editClass.id) {
      await api.updateWoodClass(editClass.id, editClass);
    } else {
      await api.createWoodClass(editClass);
    }
    setMsg('✓ Gespeichert');
    await load();
  };

  const deleteClass = async (id: string) => {
    if (!confirm('Holzklasse löschen?')) return;
    await api.deleteWoodClass(id);
    setEditClass(null); setSelectedClass(null);
    load();
  };

  const updateProp = (i: number, field: keyof Property, val: string | number) => {
    if (!editClass) return;
    const props = [...editClass.properties];
    props[i] = { ...props[i], [field]: val };
    setEditClass({ ...editClass, properties: props });
  };

  const addProp = () => {
    if (!editClass) return;
    setEditClass({ ...editClass, properties: [...editClass.properties, { key: '', label: '', value: 0, unit: 'N/mm²' }] });
  };

  const removeProp = (i: number) => {
    if (!editClass) return;
    setEditClass({ ...editClass, properties: editClass.properties.filter((_, j) => j !== i) });
  };

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Left: Types + Classes list */}
      <div style={{ width: 260, borderRight: '1px solid #e5e7eb', background: '#fff', overflowY: 'auto' }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>Holzarten</span>
        </div>

        {types.map(t => (
          <div key={t.id}>
            <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>🌲 {t.label}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => newClass(t.id)} style={{ background: '#dbeafe', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 11, color: '#1e40af' }}>+ Klasse</button>
                <button onClick={() => deleteType(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 13 }}>✕</button>
              </div>
            </div>
            {classes.filter(c => c.wood_type_id === t.id).map(c => (
              <div key={c.id} onClick={() => selectClass(c)} style={{
                padding: '6px 16px', cursor: 'pointer', fontSize: 13,
                background: selectedClass?.id === c.id ? '#dbeafe' : 'transparent',
                borderLeft: selectedClass?.id === c.id ? '3px solid #2563eb' : '3px solid transparent',
              }}>
                <div style={{ fontWeight: 500 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{c.label}</div>
              </div>
            ))}
          </div>
        ))}

        {/* Add type */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid #e5e7eb', marginTop: 8 }}>
          <div style={labelStyle}>Neue Holzart</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="z.B. Laubholz"
              style={{ flex: 1, border: '1px solid #d1d5db', borderRadius: 4, padding: '4px 8px', fontSize: 12 }} />
            <button onClick={addType} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>+</button>
          </div>
        </div>
      </div>

      {/* Right: Class Editor */}
      {editClass ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>{editClass.id ? 'Holzklasse bearbeiten' : 'Neue Holzklasse'}</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {msg && <span style={{ fontSize: 12, color: '#15803d' }}>{msg}</span>}
              {editClass.id && <button onClick={() => deleteClass(editClass.id)} style={{ background: '#fee2e2', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', color: '#b91c1c', fontSize: 12 }}>🗑 Löschen</button>}
              <button onClick={saveClass} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>💾 Speichern</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <div style={labelStyle}>Name (kurz, z.B. C24)</div>
              <input value={editClass.name} onChange={e => setEditClass({ ...editClass, name: e.target.value })}
                style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 10px', fontSize: 13, width: '100%' }} />
            </div>
            <div>
              <div style={labelStyle}>Bezeichnung (lang)</div>
              <input value={editClass.label} onChange={e => setEditClass({ ...editClass, label: e.target.value })}
                style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 10px', fontSize: 13, width: '100%' }} />
            </div>
          </div>

          {/* Properties Table */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={labelStyle}>Kennwerte</div>
              <button onClick={addProp} style={{ background: '#dbeafe', border: 'none', borderRadius: 5, padding: '4px 12px', cursor: 'pointer', color: '#1e40af', fontSize: 12 }}>+ Kennwert</button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  {['Schlüssel', 'Bezeichnung', 'Wert', 'Einheit', ''].map(h => (
                    <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 500, fontSize: 11, color: '#6b7280' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {editClass.properties.map((p, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {(['key', 'label', 'value', 'unit'] as const).map(f => (
                      <td key={f} style={{ padding: '4px 6px' }}>
                        <input value={String(p[f])} type={f === 'value' ? 'number' : 'text'}
                          onChange={e => updateProp(i, f, f === 'value' ? Number(e.target.value) : e.target.value)}
                          style={{ border: '1px solid #d1d5db', borderRadius: 4, padding: '3px 6px', fontSize: 12, width: '100%' }} />
                      </td>
                    ))}
                    <td style={{ padding: '4px 6px' }}>
                      <button onClick={() => removeProp(i)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40 }}>🌲</div>
            <div>Wählen Sie eine Holzklasse oder erstellen Sie eine neue</div>
          </div>
        </div>
      )}
    </div>
  );
}
