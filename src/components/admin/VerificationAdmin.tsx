import React, { useEffect, useState, useContext } from 'react';
import { api } from '../../api';
import MathDisplay from '../MathDisplay';
import { NormContext } from './AdminPage';
import { nameToLatex } from '../../utils/formatName';

interface Option { label: string; value: string; }
interface Variable {
  id?: string; name: string; label: string; unit: string;
  type: string; default_value: string; description: string;
  options?: Option[];
}
interface Verification {
  id: string; chapter_id: string; title: string;
  formula_latex: string; formula_description: string;
  compute_expr: string;
  variables: Variable[];
}
interface Chapter { id: string; number: string; title: string; parent_id: string | null; }
interface ChapterNode extends Chapter { children: ChapterNode[]; verifications: Verification[]; expanded?: boolean; totalCount: number; }

function buildTree(chapters: Chapter[], verifications: Verification[]): ChapterNode[] {
  const map = new Map<string, ChapterNode>();
  chapters.forEach(c => map.set(c.id, { ...c, children: [], verifications: [], totalCount: 0 }));

  // Attach verifications
  verifications.forEach(v => {
    const node = map.get(v.chapter_id);
    if (node) node.verifications.push(v);
  });

  // Build tree
  const roots: ChapterNode[] = [];
  chapters.forEach(c => {
    const node = map.get(c.id)!;
    if (c.parent_id && map.has(c.parent_id)) map.get(c.parent_id)!.children.push(node);
    else roots.push(node);
  });

  // Compute totalCount recursively
  const computeCount = (n: ChapterNode): number => {
    const sub = n.children.reduce((s, c) => s + computeCount(c), 0);
    n.totalCount = n.verifications.length + sub;
    return n.totalCount;
  };
  roots.forEach(computeCount);

  return roots;
}

const emptyVar = (): Variable => ({ name: '', label: '', unit: '', type: 'number', default_value: '0', description: '', options: [] });

function VariableEditor({ variable, onChange, onDelete }: {
  variable: Variable; onChange: (v: Variable) => void; onDelete: () => void;
}) {
  const addOption = () => onChange({ ...variable, options: [...(variable.options || []), { label: '', value: '' }] });
  const updateOption = (i: number, field: 'label' | 'value', val: string) => {
    const opts = [...(variable.options || [])];
    opts[i] = { ...opts[i], [field]: val };
    onChange({ ...variable, options: opts });
  };
  const removeOption = (i: number) => onChange({ ...variable, options: (variable.options || []).filter((_, j) => j !== i) });

  const inp = (field: keyof Variable, placeholder = '') => (
    <input
      value={String(variable[field] ?? '')}
      placeholder={placeholder}
      onChange={e => onChange({ ...variable, [field]: e.target.value })}
      style={{ border: '1px solid #d1d5db', borderRadius: 4, padding: '4px 8px', fontSize: 12, width: '100%' }}
    />
  );

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>Name (z.B. f_m_k → f_{"{m,k}"})</div>
          {inp('name', 'f_m_k')}
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
            Vorschau: <MathDisplay latex={variable.name ? nameToLatex(variable.name) : '?'} />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>Bezeichnung</div>
          {inp('label', 'Biegefestigkeit')}
        </div>
        <div style={{ width: 80 }}>
          <div style={labelStyle}>Einheit</div>
          {inp('unit', 'N/mm²')}
        </div>
        <div style={{ width: 110 }}>
          <div style={labelStyle}>Typ</div>
          <select value={variable.type} onChange={e => onChange({ ...variable, type: e.target.value })}
            style={{ border: '1px solid #d1d5db', borderRadius: 4, padding: '4px 8px', fontSize: 12, width: '100%' }}>
            <option value="number">Zahl</option>
            <option value="dropdown">Dropdown</option>
            <option value="number_info">Zahl + Info</option>
          </select>
        </div>
        <div style={{ width: 80 }}>
          <div style={labelStyle}>Standardwert</div>
          {inp('default_value', '0')}
        </div>
        <button onClick={onDelete} style={{ marginTop: 16, background: '#fee2e2', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', color: '#b91c1c', fontSize: 12 }}>✕</button>
      </div>
      <div>
        <div style={labelStyle}>Beschreibung</div>
        {inp('description', 'Charakteristische Biegefestigkeit nach Tab. 3')}
      </div>

      {variable.type === 'dropdown' && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={labelStyle}>Dropdown-Optionen</span>
            <button onClick={addOption} style={{ background: '#dbeafe', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 11, color: '#1e40af' }}>+ Option</button>
          </div>
          {(variable.options || []).map((opt, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
              <input value={opt.label} placeholder="Beschriftung" onChange={e => updateOption(i, 'label', e.target.value)}
                style={{ flex: 2, border: '1px solid #d1d5db', borderRadius: 4, padding: '3px 6px', fontSize: 12 }} />
              <input value={opt.value} placeholder="Wert" onChange={e => updateOption(i, 'value', e.target.value)}
                style={{ flex: 1, border: '1px solid #d1d5db', borderRadius: 4, padding: '3px 6px', fontSize: 12 }} />
              <button onClick={() => removeOption(i)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 };

function ChapterTreeNode({
  node, depth, selectedId, expanded, onToggle, onSelect, onNewIn,
}: {
  node: ChapterNode; depth: number; selectedId: string | null;
  expanded: Set<string>; onToggle: (id: string) => void;
  onSelect: (v: Verification) => void; onNewIn: (chapterId: string) => void;
}) {
  const isOpen = expanded.has(node.id);
  const expandable = node.children.length > 0 || node.verifications.length > 0;

  return (
    <div style={{ marginLeft: depth * 10 }}>
      <div
        onClick={() => expandable && onToggle(node.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '3px 6px', cursor: expandable ? 'pointer' : 'default',
          borderRadius: 4, userSelect: 'none',
        }}
      >
        {expandable ? (
          <span style={{ fontSize: 9, color: '#6b7280', width: 10 }}>{isOpen ? '▼' : '▶'}</span>
        ) : (
          <span style={{ width: 10 }} />
        )}
        <span style={{
          fontSize: 12, color: '#374151', fontWeight: depth === 0 ? 600 : 400,
          flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {node.number} {node.title}
        </span>
        {node.totalCount > 0 && (
          <span style={{
            fontSize: 9, background: '#dbeafe', color: '#1e40af',
            padding: '1px 5px', borderRadius: 8, fontWeight: 600,
          }}>{node.totalCount}</span>
        )}
        <button
          onClick={e => { e.stopPropagation(); onNewIn(node.id); }}
          title="Neuen Nachweis in diesem Kapitel erstellen"
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#9ca3af', fontSize: 14, padding: 0, lineHeight: 1,
          }}
        >+</button>
      </div>

      {isOpen && node.children.map(child => (
        <ChapterTreeNode key={child.id} node={child} depth={depth + 1}
          selectedId={selectedId} expanded={expanded} onToggle={onToggle}
          onSelect={onSelect} onNewIn={onNewIn} />
      ))}

      {isOpen && node.verifications.map(v => (
        <div
          key={v.id}
          onClick={e => { e.stopPropagation(); onSelect(v); }}
          style={{
            marginLeft: (depth + 1) * 10 + 8,
            padding: '4px 8px', fontSize: 12, cursor: 'pointer',
            background: selectedId === v.id ? '#dbeafe' : 'transparent',
            borderLeft: selectedId === v.id ? '3px solid #2563eb' : '3px solid transparent',
            borderRadius: 4,
          }}
        >
          <div style={{ color: selectedId === v.id ? '#1e40af' : '#374151', fontWeight: 500 }}>
            📐 {v.title}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function VerificationAdmin() {
  const { normId, normLabel } = useContext(NormContext);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selected, setSelected] = useState<Verification | null>(null);
  const [editing, setEditing] = useState<Verification | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const reload = () => {
    api.getVerifications(normId).then((vs: Verification[]) => {
      setVerifications(vs);
      api.getChapters(normId).then((chs: Chapter[]) => {
        setChapters(chs);
        const parentOf = new Map<string, string>();
        chs.forEach(c => { if (c.parent_id) parentOf.set(c.id, c.parent_id); });
        const toOpen = new Set<string>();
        vs.forEach((v: Verification) => {
          let cur: string | undefined = v.chapter_id;
          while (cur) { toOpen.add(cur); cur = parentOf.get(cur); }
        });
        setExpanded(toOpen);
      });
    });
  };

  useEffect(() => {
    setSelected(null); setEditing(null);
    reload();
  }, [normId]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const newInChapter = (chapter_id: string) => {
    const blank: Verification = {
      id: '', chapter_id, title: 'Neuer Nachweis',
      formula_latex: '\\eta = \\frac{\\sigma_d}{f_d} \\leq 1.0',
      formula_description: '',
      compute_expr: 'sigma_d / f_d',
      variables: [],
    };
    setSelected(null);
    setEditing(blank);
    setMsg('');
    // Stelle sicher dass das Kapitel aufgeklappt bleibt
    setExpanded(prev => new Set(prev).add(chapter_id));
  };

  const selectVerification = (v: Verification) => {
    setSelected(v);
    setEditing(JSON.parse(JSON.stringify({ ...v, compute_expr: v.compute_expr || '' })));
    setMsg('');
  };

  const newVerification = () => {
    const blank: Verification = {
      id: '', chapter_id: '4.2.3', title: 'Neuer Nachweis',
      formula_latex: '\\eta = \\frac{\\sigma_d}{f_d} \\leq 1.0',
      formula_description: '',
      compute_expr: 'sigma_d / f_d',
      variables: [],
    };
    setSelected(null);
    setEditing(blank);
    setMsg('');
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      let id = editing.id;
      if (!id) {
        const r = await api.createVerification({ norm_id: normId, chapter_id: editing.chapter_id, title: editing.title, formula_latex: editing.formula_latex, formula_description: editing.formula_description, compute_expr: editing.compute_expr });
        id = r.id;
      } else {
        await api.updateVerification(id, { title: editing.title, chapter_id: editing.chapter_id, formula_latex: editing.formula_latex, formula_description: editing.formula_description, compute_expr: editing.compute_expr });
        // Delete existing variables and recreate
        for (const v of (selected?.variables || [])) {
          if (v.id) await api.deleteVariable(v.id);
        }
      }
      for (const v of editing.variables) {
        await api.createVariable(id, v);
      }
      const fresh = await api.getVerifications(normId);
      setVerifications(fresh);
      const updated = fresh.find((x: Verification) => x.id === id);
      if (updated) { setSelected(updated); setEditing(JSON.parse(JSON.stringify(updated))); }
      setMsg('✓ Gespeichert');
    } catch (e) {
      setMsg('⚠ Fehler beim Speichern');
    }
    setSaving(false);
  };

  const deleteV = async (id: string) => {
    if (!confirm('Nachweis löschen?')) return;
    await api.deleteVerification(id);
    const fresh = await api.getVerifications(normId);
    setVerifications(fresh);
    setSelected(null); setEditing(null);
  };

  const addVariable = () => {
    if (!editing) return;
    setEditing({ ...editing, variables: [...editing.variables, emptyVar()] });
  };

  const updateVar = (i: number, v: Variable) => {
    if (!editing) return;
    const vars = [...editing.variables];
    vars[i] = v;
    setEditing({ ...editing, variables: vars });
  };

  const deleteVar = (i: number) => {
    if (!editing) return;
    setEditing({ ...editing, variables: editing.variables.filter((_, j) => j !== i) });
  };

  const flatChapters = chapters.map(c => ({ ...c, display: `${c.number} ${c.title}` }));
  const tree = buildTree(chapters, verifications);

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Left: Hierarchical Tree (SIA 265 chapter structure) */}
      <div style={{ width: 280, borderRight: '1px solid #e5e7eb', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Kapitel</div>
            <div style={{ fontSize: 10, color: '#6b7280' }}>{normLabel}</div>
          </div>
          <button onClick={newVerification} title="Neuen Nachweis erstellen" style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>+ Neu</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {tree.map(node => (
            <ChapterTreeNode
              key={node.id} node={node} depth={0}
              selectedId={selected?.id || null}
              expanded={expanded} onToggle={toggleExpand}
              onSelect={selectVerification} onNewIn={newInChapter}
            />
          ))}
        </div>
        <div style={{ borderTop: '1px solid #e5e7eb', padding: '6px 12px', fontSize: 11, color: '#6b7280', background: '#f8fafc' }}>
          {verifications.length} Nachweise · {chapters.length} Kap. · {normLabel}
        </div>
      </div>

      {/* Right: Editor */}
      {editing ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>{editing.id ? 'Nachweis bearbeiten' : 'Neuer Nachweis'}</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {msg && <span style={{ fontSize: 12, color: msg.startsWith('✓') ? '#15803d' : '#b91c1c' }}>{msg}</span>}
              {editing.id && <button onClick={() => deleteV(editing.id)} style={{ background: '#fee2e2', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', color: '#b91c1c', fontSize: 12 }}>🗑 Löschen</button>}
              <button onClick={save} disabled={saving} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                {saving ? 'Speichern…' : '💾 Speichern'}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <div style={labelStyle}>Titel</div>
              <input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })}
                style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 10px', fontSize: 13, width: '100%' }} />
            </div>
            <div>
              <div style={labelStyle}>Kapitel</div>
              <select value={editing.chapter_id} onChange={e => setEditing({ ...editing, chapter_id: e.target.value })}
                style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 10px', fontSize: 13, width: '100%' }}>
                {flatChapters.map(c => <option key={c.id} value={c.id}>{c.display}</option>)}
              </select>
            </div>
          </div>

          {/* Formula */}
          <div style={{ marginBottom: 16 }}>
            <div style={labelStyle}>LaTeX-Formel (Anzeige)</div>
            <textarea value={editing.formula_latex} onChange={e => setEditing({ ...editing, formula_latex: e.target.value })}
              style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 10px', fontSize: 12, width: '100%', fontFamily: 'monospace', minHeight: 50, boxSizing: 'border-box' }} />
            <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 6, padding: '10px 16px', marginTop: 6, overflowX: 'auto' }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Vorschau:</div>
              <MathDisplay latex={editing.formula_latex} display={true} />
            </div>
          </div>

          {/* Compute expression */}
          <div style={{ marginBottom: 16 }}>
            <div style={labelStyle}>Berechnungsausdruck (JavaScript)</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
              Berechnet η (Ausnutzungsgrad). Variablen über ihren Namen referenzieren. Math.* verfügbar.
            </div>
            <textarea value={editing.compute_expr} onChange={e => setEditing({ ...editing, compute_expr: e.target.value })}
              placeholder="z.B. (M_d * 1e6 / ((b * h * h) / 6)) / ((k_mod * f_m_k) / gamma_M)"
              style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 10px', fontSize: 12, width: '100%', fontFamily: 'monospace', minHeight: 60, boxSizing: 'border-box', background: '#fffbeb' }} />
          </div>

          {/* Variables */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={labelStyle}>Variablen ({editing.variables.length})</div>
              <button onClick={addVariable} style={{ background: '#dbeafe', border: 'none', borderRadius: 5, padding: '4px 12px', cursor: 'pointer', color: '#1e40af', fontSize: 12 }}>+ Variable</button>
            </div>
            {editing.variables.map((v, i) => (
              <VariableEditor key={i} variable={v} onChange={nv => updateVar(i, nv)} onDelete={() => deleteVar(i)} />
            ))}
            {editing.variables.length === 0 && (
              <div style={{ color: '#9ca3af', fontSize: 13, padding: 16, textAlign: 'center', border: '2px dashed #e5e7eb', borderRadius: 8 }}>
                Noch keine Variablen — klicken Sie «+ Variable»
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40 }}>📐</div>
            <div>Wählen Sie einen Nachweis oder erstellen Sie einen neuen</div>
          </div>
        </div>
      )}
    </div>
  );
}
