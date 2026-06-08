import React, { useEffect, useRef, useState, useContext } from 'react';
import { api } from '../../api';
import { NormContext } from './AdminPage';
import BuildingShape from '../BuildingShape';
import MathDisplay from '../MathDisplay';
import { useStore } from '../../store/useStore';

interface TableMeta { id: string; norm_id: string; chapter_id: string | null; title: string; description: string; }
interface TableFull extends TableMeta { headers: string[]; rows: string[][]; }
interface Chapter { id: string; number: string; title: string; parent_id: string | null; }
interface ChapterNode extends Chapter { children: ChapterNode[]; tables: TableMeta[]; totalCount: number; }

const L: React.CSSProperties = { fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 };

function buildTree(chapters: Chapter[], tables: TableMeta[]): ChapterNode[] {
  const map = new Map<string, ChapterNode>();
  chapters.forEach(c => map.set(c.id, { ...c, children: [], tables: [], totalCount: 0 }));
  tables.forEach(t => {
    if (t.chapter_id) {
      const node = map.get(t.chapter_id);
      if (node) node.tables.push(t);
    }
  });
  const roots: ChapterNode[] = [];
  chapters.forEach(c => {
    const node = map.get(c.id)!;
    if (c.parent_id && map.has(c.parent_id)) map.get(c.parent_id)!.children.push(node);
    else roots.push(node);
  });
  const computeCount = (n: ChapterNode): number => {
    const sub = n.children.reduce((s, c) => s + computeCount(c), 0);
    n.totalCount = n.tables.length + sub;
    return n.totalCount;
  };
  roots.forEach(computeCount);
  return roots;
}

function emptyTable(normId: string, chapterId: string | null): TableFull {
  return { id: '', norm_id: normId, chapter_id: chapterId, title: 'Neue Tabelle', description: '', headers: ['Spalte 1', 'Spalte 2'], rows: [['', '']] };
}

// ── CSV Parser ─────────────────────────────────────────────────────────────────
function parseCsv(text: string): string[][] {
  const sep = text.indexOf(';') >= 0 ? ';' : ',';
  return text.split(/\r?\n/).filter(l => l.trim()).map(line => {
    const cells: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === sep && !inQ) { cells.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  });
}

// ── Kapitelbaum-Knoten ────────────────────────────────────────────────────────
function ChapterTreeNode({ node, depth, selectedTableId, selectedChapterId, expanded, dragOverId, onToggle, onSelectTable, onSelectChapter, onNewIn, onCsvIn, onDragOverChapter, onDragLeave, onDropOnChapter }: {
  node: ChapterNode; depth: number; selectedTableId: string | null; selectedChapterId: string | null;
  expanded: Set<string>; dragOverId: string | null;
  onToggle: (id: string) => void;
  onSelectTable: (t: TableMeta) => void;
  onSelectChapter: (id: string) => void;
  onNewIn: (chapterId: string) => void;
  onCsvIn: (chapterId: string) => void;
  onDragOverChapter: (id: string) => void;
  onDragLeave: () => void;
  onDropOnChapter: (chapterId: string, tableId: string) => void;
}) {
  const isOpen = expanded.has(node.id);
  const isOver = dragOverId === node.id;
  const isChapterSelected = selectedChapterId === node.id;
  const sharedProps = { selectedTableId, selectedChapterId, dragOverId, onToggle, onSelectTable, onSelectChapter, onNewIn, onCsvIn, onDragOverChapter, onDragLeave, onDropOnChapter };
  return (
    <div style={{ marginLeft: depth * 10 }}>
      <div
        onClick={() => { onToggle(node.id); onSelectChapter(node.id); }}
        onDragOver={e => { e.preventDefault(); e.stopPropagation(); onDragOverChapter(node.id); }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) { e.stopPropagation(); onDragLeave(); } }}
        onDrop={e => { e.preventDefault(); e.stopPropagation(); onDropOnChapter(node.id, e.dataTransfer.getData('text/plain')); }}
        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 6px', cursor: 'pointer', borderRadius: 4, userSelect: 'none', background: isOver ? '#dbeafe' : isChapterSelected ? '#f0f9ff' : 'transparent', outline: isOver ? '2px dashed #2563eb' : 'none', outlineOffset: -2, borderLeft: isChapterSelected && !isOver ? '3px solid #7dd3fc' : '3px solid transparent' }}
      >
        <span style={{ fontSize: 9, color: '#6b7280', width: 10 }}>{isOpen ? '▼' : '▶'}</span>
        <span style={{ fontSize: 12, color: isOver ? '#1e40af' : isChapterSelected ? '#0369a1' : '#374151', fontWeight: depth === 0 ? 600 : 400, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {node.number} {node.title}
        </span>
        {node.totalCount > 0 && (
          <span style={{ fontSize: 9, background: '#dbeafe', color: '#1e40af', padding: '1px 5px', borderRadius: 8, fontWeight: 600 }}>{node.totalCount}</span>
        )}
        <button onClick={e => { e.stopPropagation(); onCsvIn(node.id); }} title="CSV importieren" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 11, padding: '0 2px', lineHeight: 1 }}>CSV</button>
        <button onClick={e => { e.stopPropagation(); onNewIn(node.id); }} title="Neue Tabelle in diesem Kapitel" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 14, padding: 0, lineHeight: 1 }}>+</button>
      </div>
      {isOpen && node.children.map(child => (
        <ChapterTreeNode key={child.id} node={child} depth={depth + 1} expanded={expanded} {...sharedProps} />
      ))}
      {isOpen && node.tables.map(t => (
        <div key={t.id} onClick={() => onSelectTable(t)}
          style={{ marginLeft: (depth + 1) * 10 + 8, padding: '4px 8px', fontSize: 12, cursor: 'pointer', background: selectedTableId === t.id ? '#dbeafe' : 'transparent', borderLeft: selectedTableId === t.id ? '3px solid #2563eb' : '3px solid transparent', borderRadius: 4 }}>
          <div style={{ color: selectedTableId === t.id ? '#1e40af' : '#374151', fontWeight: 500 }}>📊 {t.title}</div>
          {t.description && <div style={{ fontSize: 10, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description.replace(/^shape:[^|]*\|?/, '')}</div>}
        </div>
      ))}
    </div>
  );
}

// ── CSV-Import-Modal ──────────────────────────────────────────────────────────
function CsvImportModal({ normId, chapterId, chapters, onClose, onImported }: {
  normId: string; chapterId: string; chapters: Chapter[];
  onClose: () => void; onImported: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const chapter = chapters.find(c => c.id === chapterId);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = (ev.target?.result as string) || '';
      setCsvText(text);
      parsePreview(text);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const parsePreview = (text: string) => {
    const rows = parseCsv(text);
    if (rows.length < 1) { setPreview(null); return; }
    const [headerRow, ...dataRows] = rows;
    setPreview({ headers: headerRow, rows: dataRows });
  };

  const handleTextChange = (v: string) => {
    setCsvText(v);
    parsePreview(v);
  };

  const doImport = async () => {
    if (!preview || !title.trim()) { setErr('Titel und CSV erforderlich'); return; }
    setSaving(true);
    setErr('');
    try {
      await (api as any).createDbTable({ norm_id: normId, chapter_id: chapterId, title: title.trim(), description, headers: preview.headers, rows: preview.rows });
      onImported();
      onClose();
    } catch { setErr('Fehler beim Importieren'); }
    setSaving(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 10, padding: 24, width: 660, maxHeight: '85vh', display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>CSV importieren</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Kapitel: {chapter?.number} {chapter?.title}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af' }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={L}>Tabellenname *</div>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="z.B. Tab. 31 – Windstau" style={{ border: '1px solid #d1d5db', borderRadius: 4, padding: '5px 8px', fontSize: 12, width: '100%' }} />
          </div>
          <div>
            <div style={L}>Beschreibung</div>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Kurze Beschreibung" style={{ border: '1px solid #d1d5db', borderRadius: 4, padding: '5px 8px', fontSize: 12, width: '100%' }} />
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={L}>CSV-Datei (erste Zeile = Spaltenköpfe)</div>
            <button onClick={() => fileRef.current?.click()} style={{ background: '#f1f5f9', border: '1px solid #d1d5db', borderRadius: 4, padding: '2px 10px', cursor: 'pointer', fontSize: 11 }}>Datei wählen</button>
            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{ display: 'none' }} />
          </div>
          <textarea
            value={csvText}
            onChange={e => handleTextChange(e.target.value)}
            placeholder={"Höhe [m];Staudruck [kN/m²];Faktor\n10;0.65;1.0\n20;0.80;1.2"}
            style={{ width: '100%', height: 90, border: '1px solid #d1d5db', borderRadius: 4, padding: '6px 8px', fontSize: 11, fontFamily: 'monospace', resize: 'vertical' }}
          />
        </div>

        {preview && (
          <div style={{ overflowX: 'auto', maxHeight: 180, border: '1px solid #e5e7eb', borderRadius: 6 }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  {preview.headers.map((h, i) => <th key={i} style={{ padding: '4px 8px', border: '1px solid #e5e7eb', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    {row.map((cell, ci) => <td key={ci} style={{ padding: '3px 8px', border: '1px solid #f0f0f0' }}>{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {preview && <div style={{ fontSize: 11, color: '#6b7280' }}>{preview.rows.length} Zeilen × {preview.headers.length} Spalten</div>}

        {err && <div style={{ fontSize: 12, color: '#b91c1c' }}>{err}</div>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: 12 }}>Abbrechen</button>
          <button onClick={doImport} disabled={saving || !preview || !title.trim()} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: 12, fontWeight: 600, opacity: saving || !preview || !title.trim() ? 0.5 : 1 }}>
            {saving ? '…' : '📥 Importieren'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────
export default function DbTableAdmin() {
  const { normId, normLabel } = useContext(NormContext);
  const globalUnits = useStore(s => s.globalUnits);
  const [tables, setTables]     = useState<TableMeta[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [unassigned, setUnassigned] = useState<TableMeta[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing]   = useState<TableFull | null>(null);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [csvChapter, setCsvChapter] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [dragTableId, setDragTableId] = useState<string | null>(null);
  const [dragOverChapterId, setDragOverChapterId] = useState<string | null>(null);

  const load = async () => {
    const [tbls, chs] = await Promise.all([
      (api as any).getDbTables(normId) as Promise<TableMeta[]>,
      fetch(`/api/chapters?norm=${normId}`).then(r => r.json()) as Promise<Chapter[]>,
    ]);
    setTables(tbls);
    setChapters(chs);
    setUnassigned(tbls.filter(t => !t.chapter_id));
  };

  useEffect(() => { load(); setEditing(null); setSelected(null); setSelectedChapterId(null); }, [normId]);

  const selectTable = async (t: TableMeta) => {
    const full = await (api as any).getDbTableFull(t.id);
    setSelected(t.id);
    setEditing(JSON.parse(JSON.stringify(full)));
    setMsg('');
  };

  const selectChapter = (id: string) => {
    setSelectedChapterId(id);
    setEditing(null);
    setSelected(null);
    setMsg('');
  };

  const newInChapter = (chapterId: string) => {
    setSelected(null);
    setEditing(emptyTable(normId, chapterId));
    setMsg('');
    setExpanded(prev => new Set(prev).add(chapterId));
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (!editing.id) {
        const { id } = await (api as any).createDbTable(editing) as { id: string };
        setSelected(id);
        setEditing({ ...editing, id });
      } else {
        await (api as any).updateDbTable(editing.id, editing);
      }
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

  const dropOnChapter = async (chapterId: string, tableId: string) => {
    setDragOverChapterId(null);
    const id = tableId || dragTableId;
    if (!id) return;
    const t = tables.find(x => x.id === id);
    if (!t) return;
    const full = await (api as any).getDbTableFull(id);
    await (api as any).updateDbTable(id, { ...full, chapter_id: chapterId });
    setDragTableId(null);
    setExpanded(prev => new Set(prev).add(chapterId));
    await load();
  };

  const toggle = (id: string) => setExpanded(prev => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });

  const addCol = () => editing && setEditing({ ...editing, headers: [...editing.headers, `Sp. ${editing.headers.length + 1}`], rows: editing.rows.map(r => [...r, '']) });
  const remCol = (ci: number) => editing && setEditing({ ...editing, headers: editing.headers.filter((_, i) => i !== ci), rows: editing.rows.map(r => r.filter((_, i) => i !== ci)) });
  const addRow = () => editing && setEditing({ ...editing, rows: [...editing.rows, editing.headers.map(() => '')] });
  const remRow = (ri: number) => editing && setEditing({ ...editing, rows: editing.rows.filter((_, i) => i !== ri) });
  const setH    = (ci: number, v: string) => { if (!editing) return; const h = [...editing.headers]; h[ci] = v; setEditing({ ...editing, headers: h }); };
  const setCell = (ri: number, ci: number, v: string) => editing && setEditing({ ...editing, rows: editing.rows.map((r, i) => i === ri ? r.map((c, j) => j === ci ? v : c) : r) });

  const tree = buildTree(chapters, tables);
  const flatChapters = chapters.map(c => ({ ...c, display: `${c.number} ${c.title}` }));

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

      {/* ── Links: Kapitelbaum ── */}
      <div style={{ width: 270, borderRight: '1px solid #e5e7eb', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Normtabellen</div>
            <div style={{ fontSize: 10, color: '#6b7280' }}>{normLabel}</div>
          </div>
          <button onClick={() => { setSelected(null); setEditing(emptyTable(normId, null)); setMsg(''); }}
            style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>+ Neu</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 4px' }} onDragOver={e => e.preventDefault()}>
          {tree.map(node => (
            <ChapterTreeNode key={node.id} node={node} depth={0} selectedTableId={selected} selectedChapterId={selectedChapterId} expanded={expanded} dragOverId={dragOverChapterId} onToggle={toggle} onSelectTable={selectTable} onSelectChapter={selectChapter} onNewIn={newInChapter} onCsvIn={id => setCsvChapter(id)} onDragOverChapter={setDragOverChapterId} onDragLeave={() => setDragOverChapterId(null)} onDropOnChapter={dropOnChapter} />
          ))}

          {/* Nicht zugewiesen */}
          {unassigned.length > 0 && (
            <div style={{ marginTop: 8, borderTop: '1px solid #f0f0f0', paddingTop: 6 }}>
              <div style={{ padding: '3px 6px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Nicht zugewiesen ({unassigned.length})
              </div>
              {unassigned.map(t => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={e => { e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed = 'move'; setDragTableId(t.id); }}
                  onDragEnd={() => { setDragTableId(null); setDragOverChapterId(null); }}
                  onClick={() => selectTable(t)}
                  style={{ padding: '4px 14px', fontSize: 12, cursor: 'grab', background: selected === t.id ? '#dbeafe' : dragTableId === t.id ? '#fef9c3' : 'transparent', borderLeft: selected === t.id ? '3px solid #2563eb' : '3px solid transparent', opacity: dragTableId === t.id ? 0.6 : 1 }}
                >
                  <div style={{ color: '#374151', fontWeight: 500 }}>⠿ 📊 {t.title}</div>
                </div>
              ))}
              <div style={{ padding: '3px 10px', fontSize: 10, color: '#d1d5db', fontStyle: 'italic' }}>↑ ins Kapitel ziehen</div>
            </div>
          )}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: 10, marginBottom: 14 }}>
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
              <div style={L}>Kapitel</div>
              <select value={editing.chapter_id || ''} onChange={async e => {
                const newChapterId = e.target.value || null;
                const updated = { ...editing, chapter_id: newChapterId };
                setEditing(updated);
                if (updated.id) {
                  await (api as any).updateDbTable(updated.id, updated);
                  await load();
                  setMsg('✓ Kapitel gespeichert');
                  if (newChapterId) setExpanded(prev => new Set(prev).add(newChapterId));
                }
              }}
                style={{ border: '1px solid #d1d5db', borderRadius: 4, padding: '5px 7px', fontSize: 12, width: '100%' }}>
                <option value="">– Nicht zugewiesen –</option>
                {flatChapters.map(c => <option key={c.id} value={c.id}>{c.display}</option>)}
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
                    {row.map((cell, ci) => {
                      const isUnitCol = /^einheit$/i.test((editing.headers[ci] || '').trim());
                      return (
                        <td key={ci} style={{ padding: '2px 3px', border: '1px solid #f0f0f0' }}>
                          {isUnitCol && globalUnits.length > 0 ? (
                            <select value={cell} onChange={e => setCell(ri, ci, e.target.value)}
                              style={{ border: 'none', background: 'transparent', fontSize: 12, width: '100%', outline: 'none', padding: '2px 4px', cursor: 'pointer' }}>
                              <option value="">— wählen —</option>
                              {globalUnits.map((u, i) => <option key={i} value={u}>{u}</option>)}
                              {cell && !globalUnits.includes(cell) && <option value={cell}>{cell}</option>}
                            </select>
                          ) : (
                            <input value={cell} onChange={e => setCell(ri, ci, e.target.value)}
                              style={{ border: 'none', background: 'transparent', fontSize: 12, width: '100%', outline: 'none', padding: '2px 4px' }} />
                          )}
                        </td>
                      );
                    })}
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
      ) : selectedChapterId ? (() => {
        const chap = chapters.find(c => c.id === selectedChapterId);
        const chapTables = tables.filter(t => t.chapter_id === selectedChapterId);
        return (
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>{normLabel}</div>
                <h2 style={{ margin: 0, fontSize: 16 }}>{chap?.number} {chap?.title}</h2>
              </div>
              <button onClick={() => setCsvChapter(selectedChapterId)} style={{ background: '#f1f5f9', border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>📥 CSV Import</button>
              <button onClick={() => newInChapter(selectedChapterId)} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>+ Neue Tabelle</button>
            </div>

            {chapTables.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
                <div>Noch keine Tabellen in diesem Kapitel</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>Tabelle erstellen oder CSV importieren</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                {chapTables.map(t => (
                  <div key={t.id} onClick={() => selectTable(t)} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 14px', cursor: 'pointer', background: '#fff', transition: 'box-shadow 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.10)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#1e40af', marginBottom: 4 }}>📊 {t.title}</div>
                    {t.description && <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>{t.description.replace(/^shape:[^|]*\|?/, '')}</div>}
                    <div style={{ fontSize: 10, color: '#d1d5db' }}>Klicken zum Bearbeiten</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })() : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', gap: 8 }}>
          <div style={{ fontSize: 40 }}>📊</div>
          <div>Kapitel auswählen und Tabelle öffnen oder neu erstellen</div>
          <button onClick={() => { setSelected(null); setEditing(emptyTable(normId, null)); }}
            style={{ marginTop: 6, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 18px', cursor: 'pointer', fontSize: 13 }}>
            + Neue Tabelle für {normLabel}
          </button>
        </div>
      )}

      {/* ── CSV-Import-Modal ── */}
      {csvChapter && (
        <CsvImportModal
          normId={normId}
          chapterId={csvChapter}
          chapters={chapters}
          onClose={() => setCsvChapter(null)}
          onImported={load}
        />
      )}
    </div>
  );
}
