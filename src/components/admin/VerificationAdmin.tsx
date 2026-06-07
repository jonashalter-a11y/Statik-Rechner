import React, { useEffect, useState, useContext } from 'react';
import { api } from '../../api';
import { NormContext } from './AdminPage';
import GraphEditor from './graph/GraphEditor';
import { DbTableMeta } from './graph/graphContext';
import { VerificationGraph, emptyGraph } from '../../types/graph';
import { getGraph } from '../../utils/legacyToGraph';

interface Variable {
  id?: string; name: string; label: string; unit: string;
  type: string; default_value: string; description: string;
  options?: { label: string; value: string }[];
  table_ref?: string | null; table_col?: number | null;
}
interface Verification {
  id: string; chapter_id: string; title: string;
  formula_latex: string; formula_description: string;
  compute_expr: string;
  graph_json?: string | null;
  variables: Variable[];
}
interface Chapter { id: string; number: string; title: string; parent_id: string | null; }
interface ChapterNode extends Chapter { children: ChapterNode[]; verifications: Verification[]; expanded?: boolean; totalCount: number; }

function buildTree(chapters: Chapter[], verifications: Verification[]): ChapterNode[] {
  const map = new Map<string, ChapterNode>();
  chapters.forEach(c => map.set(c.id, { ...c, children: [], verifications: [], totalCount: 0 }));
  verifications.forEach(v => { const node = map.get(v.chapter_id); if (node) node.verifications.push(v); });
  const roots: ChapterNode[] = [];
  chapters.forEach(c => {
    const node = map.get(c.id)!;
    if (c.parent_id && map.has(c.parent_id)) map.get(c.parent_id)!.children.push(node);
    else roots.push(node);
  });
  const computeCount = (n: ChapterNode): number => {
    const sub = n.children.reduce((s, c) => s + computeCount(c), 0);
    n.totalCount = n.verifications.length + sub;
    return n.totalCount;
  };
  roots.forEach(computeCount);
  return roots;
}

const labelStyle: React.CSSProperties = { fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 };

function ChapterTreeNode({ node, depth, selectedId, expanded, onToggle, onSelect, onNewIn }: {
  node: ChapterNode; depth: number; selectedId: string | null;
  expanded: Set<string>; onToggle: (id: string) => void;
  onSelect: (v: Verification) => void; onNewIn: (chapterId: string) => void;
}) {
  const isOpen = expanded.has(node.id);
  const expandable = node.children.length > 0 || node.verifications.length > 0;
  return (
    <div style={{ marginLeft: depth * 10 }}>
      <div onClick={() => expandable && onToggle(node.id)}
        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 6px', cursor: expandable ? 'pointer' : 'default', borderRadius: 4, userSelect: 'none' }}>
        {expandable ? <span style={{ fontSize: 9, color: '#6b7280', width: 10 }}>{isOpen ? '▼' : '▶'}</span> : <span style={{ width: 10 }} />}
        <span style={{ fontSize: 12, color: '#374151', fontWeight: depth === 0 ? 600 : 400, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {node.number} {node.title}
        </span>
        {node.totalCount > 0 && <span style={{ fontSize: 9, background: '#dbeafe', color: '#1e40af', padding: '1px 5px', borderRadius: 8, fontWeight: 600 }}>{node.totalCount}</span>}
        <button onClick={e => { e.stopPropagation(); onNewIn(node.id); }} title="Neuen Nachweis in diesem Kapitel" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 14, padding: 0, lineHeight: 1 }}>+</button>
      </div>
      {isOpen && node.children.map(child => (
        <ChapterTreeNode key={child.id} node={child} depth={depth + 1} selectedId={selectedId} expanded={expanded} onToggle={onToggle} onSelect={onSelect} onNewIn={onNewIn} />
      ))}
      {isOpen && node.verifications.map(v => (
        <div key={v.id} onClick={e => { e.stopPropagation(); onSelect(v); }}
          style={{ marginLeft: (depth + 1) * 10 + 8, padding: '4px 8px', fontSize: 12, cursor: 'pointer', background: selectedId === v.id ? '#dbeafe' : 'transparent', borderLeft: selectedId === v.id ? '3px solid #2563eb' : '3px solid transparent', borderRadius: 4 }}>
          <div style={{ color: selectedId === v.id ? '#1e40af' : '#374151', fontWeight: 500 }}>
            {v.graph_json ? '🔗' : '📐'} {v.title}
          </div>
        </div>
      ))}
    </div>
  );
}

interface Editing { id: string; chapter_id: string; title: string; graph: VerificationGraph; }

export default function VerificationAdmin() {
  const { normId, normLabel } = useContext(NormContext);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [dbTables, setDbTables] = useState<DbTableMeta[]>([]);
  const [selected, setSelected] = useState<Verification | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.getDbTables(normId)
      .then((metas: any[]) => setDbTables(metas.map((t: any) => ({ id: t.id, title: t.title }))))
      .catch(() => {});
  }, [normId]);

  const reload = () => {
    api.getVerifications(normId).then((vs: Verification[]) => {
      setVerifications(vs);
      api.getChapters(normId).then((chs: Chapter[]) => {
        setChapters(chs);
        const parentOf = new Map<string, string>();
        chs.forEach(c => { if (c.parent_id) parentOf.set(c.id, c.parent_id); });
        const toOpen = new Set<string>();
        vs.forEach((v: Verification) => { let cur: string | undefined = v.chapter_id; while (cur) { toOpen.add(cur); cur = parentOf.get(cur); } });
        setExpanded(toOpen);
      });
    });
  };

  useEffect(() => { setSelected(null); setEditing(null); reload(); }, [normId]);

  const toggleExpand = (id: string) => setExpanded(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const newInChapter = (chapter_id: string) => {
    setSelected(null);
    setEditing({ id: '', chapter_id, title: 'Neuer Nachweis', graph: emptyGraph() });
    setMsg('');
    setExpanded(prev => new Set(prev).add(chapter_id));
  };
  const newVerification = () => { setSelected(null); setEditing({ id: '', chapter_id: chapters[0]?.id || '', title: 'Neuer Nachweis', graph: emptyGraph() }); setMsg(''); };

  const selectVerification = (v: Verification) => {
    setSelected(v);
    setEditing({ id: v.id, chapter_id: v.chapter_id, title: v.title, graph: getGraph(v) });
    setMsg('');
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const graph_json = JSON.stringify(editing.graph);
      // Anzeige-Formel = erste calc/stdcalc-Formel (Fallback für Listen)
      const firstCalc = editing.graph.nodes.find(n => n.type === 'calc' || n.type === 'stdcalc');
      const formula_latex = firstCalc ? (firstCalc.data as any).latex || '' : '';
      let id = editing.id;
      if (!id) {
        const r = await api.createVerification({ norm_id: normId, chapter_id: editing.chapter_id, title: editing.title, formula_latex, formula_description: '', compute_expr: '', graph_json });
        id = r.id;
      } else {
        await api.updateVerification(id, { title: editing.title, chapter_id: editing.chapter_id, formula_latex, formula_description: '', compute_expr: '', graph_json });
      }
      const fresh = await api.getVerifications(normId);
      setVerifications(fresh);
      const updated = fresh.find((x: Verification) => x.id === id);
      if (updated) { setSelected(updated); setEditing({ id: updated.id, chapter_id: updated.chapter_id, title: updated.title, graph: getGraph(updated) }); }
      setMsg('✓ Gespeichert');
    } catch { setMsg('⚠ Fehler beim Speichern'); }
    setSaving(false);
  };

  const deleteV = async (id: string) => {
    if (!confirm('Nachweis löschen?')) return;
    await api.deleteVerification(id);
    const fresh = await api.getVerifications(normId);
    setVerifications(fresh);
    setSelected(null); setEditing(null);
  };

  const flatChapters = chapters.map(c => ({ ...c, display: `${c.number} ${c.title}` }));
  const tree = buildTree(chapters, verifications);

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Kapitelbaum */}
      <div style={{ width: 280, borderRight: '1px solid #e5e7eb', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Kapitel</div>
            <div style={{ fontSize: 10, color: '#6b7280' }}>{normLabel}</div>
          </div>
          <button onClick={newVerification} title="Neuen Nachweis erstellen" style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>+ Neu</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {tree.map(node => (
            <ChapterTreeNode key={node.id} node={node} depth={0} selectedId={selected?.id || null} expanded={expanded} onToggle={toggleExpand} onSelect={selectVerification} onNewIn={newInChapter} />
          ))}
        </div>
        <div style={{ borderTop: '1px solid #e5e7eb', padding: '6px 12px', fontSize: 11, color: '#6b7280', background: '#f8fafc' }}>
          {verifications.length} Nachweise · {chapters.length} Kap. · {normLabel}
        </div>
      </div>

      {/* Node-Editor */}
      {editing ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {/* Kopfzeile */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 14px', borderBottom: '1px solid #e5e7eb', background: '#fff', flexShrink: 0 }}>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>Titel</div>
              <input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })}
                style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '5px 10px', fontSize: 13, width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ width: 240 }}>
              <div style={labelStyle}>Kapitel</div>
              <select value={editing.chapter_id} onChange={e => setEditing({ ...editing, chapter_id: e.target.value })}
                style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '5px 10px', fontSize: 13, width: '100%' }}>
                {flatChapters.map(c => <option key={c.id} value={c.id}>{c.display}</option>)}
              </select>
            </div>
            {msg && <span style={{ fontSize: 12, color: msg.startsWith('✓') ? '#15803d' : '#b91c1c', alignSelf: 'flex-end', paddingBottom: 6 }}>{msg}</span>}
            {editing.id && <button onClick={() => deleteV(editing.id)} style={{ alignSelf: 'flex-end', background: '#fee2e2', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', color: '#b91c1c', fontSize: 12 }}>🗑</button>}
            <button onClick={save} disabled={saving} style={{ alignSelf: 'flex-end', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              {saving ? 'Speichern…' : '💾 Speichern'}
            </button>
          </div>
          {/* Canvas */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <GraphEditor key={editing.id || 'new'} graph={editing.graph} dbTables={dbTables} onChange={g => setEditing(prev => prev ? { ...prev, graph: g } : prev)} />
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40 }}>🔗</div>
            <div>Wählen Sie einen Nachweis oder erstellen Sie einen neuen</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>Neu: Nachweise werden als Block-Diagramm gebaut</div>
          </div>
        </div>
      )}
    </div>
  );
}
