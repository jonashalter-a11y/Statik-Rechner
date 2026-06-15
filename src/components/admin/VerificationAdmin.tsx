import React, { useCallback, useEffect, useRef, useState, useContext } from 'react';
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
  notes?: string;
  variables: Variable[];
}
interface Chapter { id: string; norm_id: string; number: string; title: string; parent_id: string | null; }
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

// ── Kapitel-Formular-Modal ────────────────────────────────────────────────────
function ChapterFormModal({ normId, chapters, editing, onClose, onSaved }: {
  normId: string;
  chapters: Chapter[];
  editing: { id: string; number: string; title: string; parent_id: string | null } | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !editing?.id;
  const [num, setNum]       = useState(editing?.number || '');
  const [title, setTitle]   = useState(editing?.title || '');
  const [parentId, setParentId] = useState<string>(editing?.parent_id || '');
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  const save = async () => {
    if (!num.trim() || !title.trim()) { setErr('Nummer und Titel erforderlich'); return; }
    setSaving(true);
    try {
      if (isNew) {
        const id = `${normId}_${num.replace(/\./g, '_')}_${Date.now().toString(36)}`;
        await api.createChapter({ id, norm_id: normId, parent_id: parentId || null, number: num.trim(), title: title.trim() });
      } else {
        await api.updateChapter(editing!.id, { number: num.trim(), title: title.trim() });
      }
      onSaved();
      onClose();
    } catch { setErr('Fehler beim Speichern'); }
    setSaving(false);
  };

  const del = async () => {
    if (!editing?.id) return;
    if (!confirm(`Kapitel "${editing.number} ${editing.title}" löschen?\nAlle Nachweise darin werden ebenfalls gelöscht.`)) return;
    await api.deleteChapter(editing.id);
    onSaved();
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 10, padding: 24, width: 420, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{isNew ? 'Neues Kapitel' : 'Kapitel bearbeiten'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af' }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>Nummer *</div>
            <input value={num} onChange={e => setNum(e.target.value)} placeholder="z.B. 4.1" style={{ border: '1px solid #d1d5db', borderRadius: 4, padding: '6px 8px', fontSize: 13, width: '100%' }} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>Titel *</div>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Kapitelname" style={{ border: '1px solid #d1d5db', borderRadius: 4, padding: '6px 8px', fontSize: 13, width: '100%' }} />
          </div>
        </div>

        {isNew && (
          <div>
            <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>Übergeordnetes Kapitel (optional)</div>
            <select value={parentId} onChange={e => setParentId(e.target.value)} style={{ border: '1px solid #d1d5db', borderRadius: 4, padding: '6px 8px', fontSize: 13, width: '100%' }}>
              <option value="">– Kein (Top-Level) –</option>
              {chapters.map(c => <option key={c.id} value={c.id}>{c.number} {c.title}</option>)}
            </select>
          </div>
        )}

        {err && <div style={{ fontSize: 12, color: '#b91c1c' }}>{err}</div>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          {!isNew
            ? <button onClick={del} style={{ background: '#fee2e2', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', color: '#b91c1c', fontSize: 12 }}>🗑 Löschen</button>
            : <span />}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ background: '#f1f5f9', border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12 }}>Abbrechen</button>
            <button onClick={save} disabled={saving} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              {saving ? '…' : isNew ? '+ Erstellen' : '💾 Speichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface NotesData { text: string; table: { headers: string[]; rows: string[][] }; }

function parseNotes(raw: string): NotesData {
  if (raw && raw.startsWith('{')) {
    try {
      const p = JSON.parse(raw);
      if (typeof p.text === 'string') return { text: p.text, table: p.table || { headers: [], rows: [] } };
    } catch {}
  }
  return { text: raw || '', table: { headers: [], rows: [] } };
}

function serializeNotes(d: NotesData): string {
  const hasTable = d.table.headers.length > 0 || d.table.rows.length > 0;
  return hasTable ? JSON.stringify(d) : d.text;
}

const labelStyle: React.CSSProperties = { fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 };

function ChapterTreeNode({ node, depth, selectedId, expanded, hideEmpty, canPaste, onToggle, onSelect, onNewIn, onEditChapter, onNewSubChapter, onPasteIn }: {
  node: ChapterNode; depth: number; selectedId: string | null;
  expanded: Set<string>; hideEmpty: boolean; canPaste: boolean; onToggle: (id: string) => void;
  onSelect: (v: Verification) => void;
  onNewIn: (chapterId: string) => void;
  onEditChapter: (c: Chapter) => void;
  onNewSubChapter: (parentId: string) => void;
  onPasteIn: (chapterId: string) => void;
}) {
  if (hideEmpty && node.totalCount === 0) return null;
  const isOpen = expanded.has(node.id);
  const btnStyle: React.CSSProperties = { background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 12, padding: '0 2px', lineHeight: 1 };
  return (
    <div style={{ marginLeft: depth * 10 }}>
      <div onClick={() => onToggle(node.id)}
        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 6px', cursor: 'pointer', borderRadius: 4, userSelect: 'none' }}>
        <span style={{ fontSize: 9, color: '#6b7280', width: 10 }}>{isOpen ? '▼' : '▶'}</span>
        <span style={{ fontSize: 12, color: '#374151', fontWeight: depth === 0 ? 600 : 400, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {node.number} {node.title}
        </span>
        {node.totalCount > 0 && <span style={{ fontSize: 9, background: '#dbeafe', color: '#1e40af', padding: '1px 5px', borderRadius: 8, fontWeight: 600 }}>{node.totalCount}</span>}
        <button onClick={e => { e.stopPropagation(); onEditChapter(node); }} title="Kapitel umbenennen" style={btnStyle}>✎</button>
        <button onClick={e => { e.stopPropagation(); onNewSubChapter(node.id); }} title="Unterkapitel hinzufügen" style={btnStyle}>⊕</button>
        {canPaste && <button onClick={e => { e.stopPropagation(); onPasteIn(node.id); }} title="Kopierten Nachweis in dieses Kapitel einfügen" style={btnStyle}>⧉</button>}
        <button onClick={e => { e.stopPropagation(); onNewIn(node.id); }} title="Neuen Nachweis in diesem Kapitel" style={{ ...btnStyle, fontSize: 14 }}>+</button>
      </div>
      {isOpen && node.children.map(child => (
        <ChapterTreeNode key={child.id} node={child} depth={depth + 1} selectedId={selectedId} expanded={expanded} hideEmpty={hideEmpty} canPaste={canPaste} onToggle={onToggle} onSelect={onSelect} onNewIn={onNewIn} onEditChapter={onEditChapter} onNewSubChapter={onNewSubChapter} onPasteIn={onPasteIn} />
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

interface Editing { id: string; originalId?: string; chapter_id: string; title: string; graph: VerificationGraph; notes: NotesData; }

function editingSnapshot(editing: Editing | null): string {
  if (!editing) return '';
  return JSON.stringify({
    id: editing.id,
    originalId: editing.originalId || editing.id,
    chapter_id: editing.chapter_id,
    title: editing.title,
    graph: editing.graph,
    notes: editing.notes,
  });
}

function NotesTextarea({ text, onChange }: { text: string; onChange: (t: string) => void }) {
  const [local, setLocal] = useState(text);
  const lastEmitted = useRef(text);

  useEffect(() => {
    if (text !== lastEmitted.current) {
      setLocal(text);
      lastEmitted.current = text;
    }
  }, [text]);

  const update = (val: string) => {
    setLocal(val);
    lastEmitted.current = val;
    onChange(val);
  };

  return (
    <textarea
      value={local}
      onChange={e => update(e.target.value)}
      placeholder="Kontroll-Beispiele aus dem Unterricht, Anmerkungen zur Formel, TODO-Liste für diesen Nachweis…"
      rows={6}
      style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 10px', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', background: '#fff', color: '#374151', lineHeight: 1.5 }}
    />
  );
}

function NotesTableEditor({ table, onChange }: {
  table: { headers: string[]; rows: string[][] };
  onChange: (t: { headers: string[]; rows: string[][] }) => void;
}) {
  const [local, setLocal] = useState(table);
  const lastEmitted = useRef(JSON.stringify(table));

  // Only sync from parent when the change came from outside (e.g. selecting a different verification)
  const incomingJson = JSON.stringify(table);
  useEffect(() => {
    if (incomingJson !== lastEmitted.current) {
      setLocal(table);
      lastEmitted.current = incomingJson;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingJson]);

  const update = (t: { headers: string[]; rows: string[][] }) => {
    setLocal(t);
    lastEmitted.current = JSON.stringify(t);
    onChange(t);
  };

  const addCol = () => update({
    headers: [...local.headers, `Sp. ${local.headers.length + 1}`],
    rows: local.rows.map(r => [...r, '']),
  });
  const addRow = () => update({
    headers: local.headers,
    rows: [...local.rows, local.headers.map(() => '')],
  });
  const delCol = (ci: number) => update({
    headers: local.headers.filter((_, i) => i !== ci),
    rows: local.rows.map(r => r.filter((_, i) => i !== ci)),
  });
  const delRow = (ri: number) => update({
    headers: local.headers,
    rows: local.rows.filter((_, i) => i !== ri),
  });
  const setHeader = (ci: number, val: string) => {
    const h = [...local.headers]; h[ci] = val;
    update({ ...local, headers: h });
  };
  const setCell = (ri: number, ci: number, val: string) => {
    const rows = local.rows.map(r => [...r]);
    rows[ri][ci] = val;
    update({ ...local, rows });
  };

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <button onClick={addCol} style={{ background: '#dbeafe', color: '#1e40af', border: 'none', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>+ Spalte</button>
        <button onClick={addRow} style={{ background: '#dcfce7', color: '#166534', border: 'none', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>+ Zeile</button>
        {(local.rows.length > 0 || local.headers.length > 0) && (
          <span style={{ fontSize: 10, color: '#9ca3af' }}>{local.rows.length} Zeilen × {local.headers.length} Sp.</span>
        )}
      </div>
      {local.headers.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
            <thead>
              <tr>
                {local.headers.map((h, ci) => (
                  <th key={ci} style={{ border: '1px solid #d1d5db', padding: '2px 4px', background: '#f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <input value={h} onChange={e => setHeader(ci, e.target.value)}
                        style={{ border: 'none', background: 'transparent', fontSize: 11, fontWeight: 600, minWidth: 40, width: '100%', outline: 'none' }} />
                      <button onClick={() => delCol(ci)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 10, padding: 0, lineHeight: 1, flexShrink: 0 }}>✕</button>
                    </div>
                  </th>
                ))}
                <th style={{ width: 16, background: 'transparent', border: 'none' }} />
              </tr>
            </thead>
            <tbody>
              {local.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{ border: '1px solid #e5e7eb', padding: '2px 4px' }}>
                      <input value={cell} onChange={e => setCell(ri, ci, e.target.value)}
                        style={{ border: 'none', background: 'transparent', fontSize: 11, minWidth: 40, width: '100%', outline: 'none' }} />
                    </td>
                  ))}
                  <td style={{ border: 'none', padding: '0 2px', verticalAlign: 'middle' }}>
                    <button onClick={() => delRow(ri)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 10, padding: 0, lineHeight: 1 }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

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
  const [chapterForm, setChapterForm] = useState<{ id: string; number: string; title: string; parent_id: string | null } | null | 'new'>(null);
  const [hideEmpty, setHideEmpty] = useState(false);
  const [copied, setCopied] = useState<Editing | null>(null);
  const editingRef = useRef<Editing | null>(null);
  const savedSnapshotRef = useRef('');
  const savingRef = useRef(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const batchImportRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [importDialog, setImportDialog] = useState<{ open: boolean; file?: File; normId: string; chapterId: string }>({ open: false, normId: normId, chapterId: '' });

  useEffect(() => { editingRef.current = editing; }, [editing]);
  useEffect(() => { savingRef.current = saving; }, [saving]);

  useEffect(() => {
    api.getTables(normId)
      .then((metas: any[]) => setDbTables(metas.map((t: any) => ({ id: t.id, title: t.title, chapter_id: t.chapter_id ?? null, type: t.type ?? 'table' }))))
      .catch(() => {});
  }, [normId]);

  const reload = async () => {
    const [vsResult, chsResult] = await Promise.allSettled([
      api.getVerifications(normId),
      api.getChapters(normId),
    ]);
    const verificationsOk = vsResult.status === 'fulfilled' && Array.isArray(vsResult.value);
    const chaptersOk = chsResult.status === 'fulfilled' && Array.isArray(chsResult.value);
    const safeVerifications: Verification[] = verificationsOk ? vsResult.value : [];
    const safeChapters: Chapter[] = chaptersOk ? chsResult.value : [];
    setVerifications(safeVerifications);
    setChapters(safeChapters);
    const parentOf = new Map<string, string>();
    safeChapters.forEach(c => { if (c.parent_id) parentOf.set(c.id, c.parent_id); });
    const toOpen = new Set<string>();
    safeVerifications.forEach((v: Verification) => {
      let cur: string | undefined = v.chapter_id;
      while (cur) {
        toOpen.add(cur);
        cur = parentOf.get(cur);
      }
    });
    setExpanded(toOpen);
    if (!verificationsOk || !chaptersOk) {
      console.warn('Lokale JSON-Daten konnten nicht vollständig geladen werden', { vsResult, chsResult });
      setMsg('⚠ Lokale JSON-Daten konnten nicht vollständig geladen werden');
    } else {
      setMsg('');
    }
  };

  useEffect(() => {
    setSelected(null); setEditing(null); setChapters([]); setVerifications([]);
    savedSnapshotRef.current = '';
    reload();
  }, [normId]);

  const toggleExpand = (id: string) => setExpanded(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const newInChapter = (chapter_id: string) => {
    setSelected(null);
    setEditing({ id: '', originalId: '', chapter_id, title: 'Neuer Nachweis', graph: emptyGraph(), notes: { text: '', table: { headers: [], rows: [] } } });
    savedSnapshotRef.current = '';
    setMsg('');
    setExpanded(prev => new Set(prev).add(chapter_id));
  };
  const newVerification = () => {
    setSelected(null);
    setEditing({ id: '', originalId: '', chapter_id: chapters[0]?.id || '', title: 'Neuer Nachweis', graph: emptyGraph(), notes: { text: '', table: { headers: [], rows: [] } } });
    savedSnapshotRef.current = '';
    setMsg('');
  };

  const openImportDialog = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportDialog({ open: true, file, normId: normId, chapterId: chapters[0]?.id || '' });
    e.target.value = '';
  };

  const doImport = async () => {
    if (!importDialog.file || !importDialog.normId || !importDialog.chapterId) {
      setMsg('⚠ Datei, Norm und Kapitel erforderlich');
      return;
    }
    try {
      const text = await importDialog.file.text();
      const data = JSON.parse(text);
      let verifications = Array.isArray(data) ? data : [data];
      // Norm und Kapitel-ID auf alle Nachweise überschreiben
      verifications = verifications.map((v: any) => ({ ...v, norm_id: importDialog.normId, chapter_id: importDialog.chapterId }));
      const imported = [];
      for (const verification of verifications) {
        try {
          const result = await api.importVerification({ payload: verification, norm_id: importDialog.normId, chapter_id: importDialog.chapterId });
          imported.push({ ok: true, id: result.id || result.verification?.id });
        } catch (error: any) {
          imported.push({ ok: false, error: String(error?.message || error) });
        }
      }
      {
        const ok = imported.filter((r: any) => r.ok).length;
        const err = imported.filter((r: any) => r.error).length;
        const firstOkId = imported.find((r: any) => r.ok)?.id;
        setMsg(`✓ ${ok} importiert${err ? `, ${err} Fehler` : ''}`);
        setImportDialog({ open: false, normId, chapterId: '' });
        // Reload und dann Auto-select
        const fresh = await api.getVerifications(normId);
        const fresh_chapters = await api.getChapters(normId);
        setVerifications(fresh);
        setChapters(fresh_chapters);
        const toOpen = new Set<string>();
        const parentOf = new Map<string, string>();
        fresh_chapters.forEach((c: Chapter) => { if (c.parent_id) parentOf.set(c.id, c.parent_id); });
        fresh.forEach((v: Verification) => {
          let cur: string | undefined = v.chapter_id;
          while (cur) {
            toOpen.add(cur);
            cur = parentOf.get(cur);
          }
        });
        setExpanded(toOpen);
        // Auto-select
        if (firstOkId) {
          const imported = fresh.find((v: Verification) => v.id === firstOkId);
          if (imported) setTimeout(() => selectVerification(imported), 100);
        }
      }
    } catch (ex) {
      setMsg(`⚠ Fehler beim Lesen/Parsen: ${String(ex)}`);
    }
  };

  const selectVerification = (v: Verification) => {
    const nextEditing = { id: v.id, originalId: v.id, chapter_id: v.chapter_id, title: v.title, graph: getGraph(v), notes: parseNotes(v.notes || '') };
    setSelected(v);
    setEditing(nextEditing);
    savedSnapshotRef.current = editingSnapshot(nextEditing);
    setMsg('');
  };

  const saveEditing = useCallback(async (editingToSave: Editing | null, auto = false) => {
    if (!editingToSave || savingRef.current) return;
    const snapshot = editingSnapshot(editingToSave);
    if (auto && snapshot === savedSnapshotRef.current) {
      // Aber: Speichern erzwingen alle 2 Sekunden (wegen Positions-Updates)
      if (Date.now() - (window as any).__lastAutoSave < 2000) return;
    }
    (window as any).__lastAutoSave = Date.now();
    setSaving(true);
    try {
      const graph_json = JSON.stringify(editingToSave.graph);
      // Anzeige-Formel = erste calc/stdcalc-Formel (Fallback für Listen)
      const firstCalc = editingToSave.graph.nodes.find(n => n.type === 'calc' || n.type === 'stdcalc');
      const formula_latex = firstCalc ? (firstCalc.data as any).latex || '' : '';
      let id = editingToSave.id;
      const originalId = editingToSave.originalId || editingToSave.id;
      if (!originalId) {
        const r = await api.createVerification({ id, norm_id: normId, chapter_id: editingToSave.chapter_id, title: editingToSave.title, formula_latex, formula_description: '', compute_expr: '', graph_json, notes: serializeNotes(editingToSave.notes) });
        id = r.id;
      } else {
        const r = await api.updateVerification(originalId, { id, title: editingToSave.title, chapter_id: editingToSave.chapter_id, formula_latex, formula_description: '', compute_expr: '', graph_json, notes: serializeNotes(editingToSave.notes) });
        id = r.id || id;
      }
      const fresh = await api.getVerifications(normId);
      setVerifications(fresh);
      const updated = fresh.find((x: Verification) => x.id === id);
      if (updated) {
        setSelected(updated);
        if (!originalId) {
          // Neue Verifikation: ID vom Server übernehmen, Rest aus aktuellem State
          const nextEditing = { ...editingRef.current!, id: updated.id, originalId: updated.id };
          setEditing(nextEditing);
          savedSnapshotRef.current = editingSnapshot(nextEditing);
        } else if (auto) {
          // Auto-Save: Editor-State NICHT überschreiben (User tippt gerade)
          if (editingRef.current) {
            const nextEditing = { ...editingRef.current, id: updated.id, originalId: updated.id };
            setEditing(nextEditing);
            savedSnapshotRef.current = editingSnapshot(nextEditing);
          }
        } else {
          // Manuelles Speichern: vollständig vom Server neu laden
          const nextEditing = { id: updated.id, originalId: updated.id, chapter_id: updated.chapter_id, title: updated.title, graph: getGraph(updated), notes: parseNotes(updated.notes || '') };
          setEditing(nextEditing);
          savedSnapshotRef.current = editingSnapshot(nextEditing);
        }
      } else {
        savedSnapshotRef.current = snapshot;
      }
      setMsg(auto ? '✓ Automatisch gespeichert' : '✓ Gespeichert');
    } catch (err: any) {
      setMsg(auto ? `⚠ Auto-Speichern fehlgeschlagen: ${err?.message || err}` : `⚠ Fehler beim Speichern: ${err?.message || err}`);
    }
    setSaving(false);
  }, [normId]);

  const save = () => saveEditing(editingRef.current, false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      saveEditing(editingRef.current, true);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [saveEditing]);

  // Direct Auto-Save wenn Graph sich ändert (für Positions-Speicherung)
  const graphStrRef = useRef('');
  useEffect(() => {
    if (!editing) return;
    const graphStr = JSON.stringify(editing.graph);
    if (graphStr === graphStrRef.current) return;
    graphStrRef.current = graphStr;
    const timer = setTimeout(() => {
      saveEditing(editing, true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [editing, saveEditing]);

  const deleteV = async (id: string) => {
    if (!confirm('Nachweis löschen?')) return;
    await api.deleteVerification(id);
    const fresh = await api.getVerifications(normId);
    setVerifications(fresh);
    savedSnapshotRef.current = '';
    setSelected(null); setEditing(null);
  };

  const copyCurrent = () => {
    const current = editingRef.current;
    if (!current) return;
    setCopied({
      id: '',
      originalId: '',
      chapter_id: current.chapter_id,
      title: `${current.title} Kopie`,
      graph: JSON.parse(JSON.stringify(current.graph)),
      notes: JSON.parse(JSON.stringify(current.notes)),
    });
    setMsg(`✓ Kopiert: ${current.title}`);
  };

  const pasteIntoChapter = async (chapterId: string) => {
    if (!copied) return;
    try {
      const graph_json = JSON.stringify(copied.graph);
      const firstCalc = copied.graph.nodes.find(n => n.type === 'calc' || n.type === 'stdcalc');
      const formula_latex = firstCalc ? (firstCalc.data as any).latex || '' : '';
      const created = await api.createVerification({
        norm_id: normId,
        chapter_id: chapterId,
        title: copied.title,
        formula_latex,
        formula_description: '',
        compute_expr: '',
        graph_json,
        notes: serializeNotes(copied.notes),
      });
      const fresh = await api.getVerifications(normId);
      setVerifications(fresh);
      const pasted = fresh.find((v: Verification) => v.id === created.id);
      if (pasted) {
        setExpanded(prev => new Set(prev).add(chapterId));
        selectVerification(pasted);
      }
      setMsg(`✓ Eingefügt: ${pasted?.title || copied.title}`);
    } catch (err: any) {
      setMsg(`⚠ Einfügen fehlgeschlagen: ${err?.message || err}`);
    }
  };

  const exportCurrentJson = async () => {
    const current = editingRef.current;
    const id = current?.originalId || current?.id;
    if (!id) {
      setMsg('⚠ Bitte zuerst speichern, dann exportieren');
      return;
    }
    try {
      const payload = await api.exportVerification(id);
      const fileName = `${payload?.verification?.id || id}.json`;
      const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMsg(`✓ Exportiert: ${fileName}`);
    } catch (err: any) {
      setMsg(`⚠ Export fehlgeschlagen: ${err?.message || err}`);
    }
  };

  const importJsonFile = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const result = await api.importVerification({ payload, norm_id: normId });
      const fresh = await api.getVerifications(normId);
      setVerifications(fresh);
      const imported = fresh.find((v: Verification) => v.id === result.id);
      if (imported) selectVerification(imported);
      setMsg(`✓ JSON importiert: ${imported?.title || result.id}`);
    } catch (err: any) {
      setMsg(`⚠ JSON-Import fehlgeschlagen: ${err?.message || err}`);
    } finally {
      if (importInputRef.current) importInputRef.current.value = '';
    }
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
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <button onClick={() => setHideEmpty(v => !v)} title={hideEmpty ? 'Alle Kapitel anzeigen' : 'Leere Kapitel ausblenden'}
              style={{ background: hideEmpty ? '#dbeafe' : '#f1f5f9', color: hideEmpty ? '#1e40af' : '#6b7280', border: `1px solid ${hideEmpty ? '#93c5fd' : '#d1d5db'}`, borderRadius: 5, padding: '4px 7px', cursor: 'pointer', fontSize: 13, lineHeight: 1 }}>
              {hideEmpty ? '👁' : '👁'}
            </button>
            <button onClick={() => setChapterForm('new')} style={{ background: '#f1f5f9', color: '#374151', border: '1px solid #d1d5db', borderRadius: 5, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>+ Kapitel</button>
            <button onClick={newVerification} title="Neuen Nachweis erstellen" style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>+ Nachweis</button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={e => importJsonFile(e.target.files?.[0] || null)}
            />
            <input
              ref={batchImportRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={openImportDialog}
            />
            <button
              onClick={() => importInputRef.current?.click()}
              title="1 Nachweis aus JSON"
              style={{ background: '#f1f5f9', color: '#374151', border: '1px solid #d1d5db', borderRadius: 5, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}
            >
              JSON
            </button>
            <button
              onClick={() => batchImportRef.current?.click()}
              title="Mehrere Nachweise aus JSON (Array)"
              style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b', borderRadius: 5, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}
            >
              📁 Batch
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {tree.length === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#9ca3af' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
              <div style={{ fontSize: 12, marginBottom: 10 }}>Noch keine Kapitel</div>
              <button onClick={() => setChapterForm('new')} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12 }}>+ Erstes Kapitel erstellen</button>
            </div>
          )}
          {tree.map(node => (
            <ChapterTreeNode key={node.id} node={node} depth={0} selectedId={selected?.id || null} expanded={expanded} hideEmpty={hideEmpty} canPaste={!!copied} onToggle={toggleExpand} onSelect={selectVerification} onNewIn={newInChapter}
              onEditChapter={c => setChapterForm({ id: c.id, number: c.number, title: c.title, parent_id: c.parent_id })}
              onNewSubChapter={parentId => setChapterForm({ id: '', number: '', title: '', parent_id: parentId })}
              onPasteIn={pasteIntoChapter}
            />
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
            <div style={{ width: 260 }}>
              <div style={labelStyle}>ID</div>
              <input value={editing.id} onChange={e => setEditing({ ...editing, id: e.target.value })}
                placeholder="leer = automatisch"
                style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '5px 10px', fontSize: 13, width: '100%', boxSizing: 'border-box', fontFamily: 'monospace' }} />
            </div>
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
            <button onClick={copyCurrent} style={{ alignSelf: 'flex-end', background: '#f1f5f9', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>Kopieren</button>
            <button onClick={exportCurrentJson} style={{ alignSelf: 'flex-end', background: '#f1f5f9', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>Export JSON</button>
            {editing.id && <button onClick={() => deleteV(editing.originalId || editing.id)} style={{ alignSelf: 'flex-end', background: '#fee2e2', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', color: '#b91c1c', fontSize: 12 }}>🗑</button>}
            <button onClick={save} disabled={saving} style={{ alignSelf: 'flex-end', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              {saving ? 'Speichern…' : '💾 Speichern'}
            </button>
          </div>
          {/* Canvas */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <GraphEditor key={editing.id || 'new'} graph={editing.graph} dbTables={dbTables.filter(t => !t.chapter_id || t.chapter_id === editing.chapter_id)} onChange={g => setEditing(prev => prev ? { ...prev, graph: g } : prev)} />
          </div>
          {/* Notizen-Panel */}
          <div style={{ borderTop: '1px solid #e5e7eb', background: '#fafafa', flexShrink: 0 }}>
            <details>
              <summary style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#6b7280', cursor: 'pointer', userSelect: 'none', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>📝</span>
                <span>Notizen & Kontroll-Kommentar</span>
                {editing.notes.text && <span style={{ fontSize: 10, background: '#dbeafe', color: '#1d4ed8', borderRadius: 10, padding: '1px 6px', marginLeft: 4 }}>●</span>}
              </summary>
              <div style={{ padding: '0 14px 12px' }}>
                <NotesTextarea
                  text={editing.notes.text}
                  onChange={t => setEditing(prev => prev ? { ...prev, notes: { ...prev.notes, text: t } } : prev)}
                />
              </div>
            </details>
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

      {/* Kapitel-Formular-Modal */}
      {chapterForm !== null && (
        <ChapterFormModal
          normId={normId}
          chapters={chapters}
          editing={chapterForm === 'new' ? { id: '', number: '', title: '', parent_id: null } : chapterForm}
          onClose={() => setChapterForm(null)}
          onSaved={() => { reload(); setChapterForm(null); }}
        />
      )}

      {/* JSON-Import-Dialog */}
      {importDialog.open && (
        <div onClick={() => setImportDialog({ open: false, normId, chapterId: '' })} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 10, padding: 24, maxWidth: 500, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#1e40af' }}>JSON Nachweise importieren</h3>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>Datei</div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) setImportDialog(prev => ({ ...prev, file: f })); }}
              />
              {importDialog.file && <div style={{ fontSize: 11, color: '#059669', marginTop: 4 }}>✓ {importDialog.file.name}</div>}
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>Kapitel</div>
              <select
                value={importDialog.chapterId}
                onChange={e => setImportDialog(prev => ({ ...prev, chapterId: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
              >
                <option value="">— Wählen —</option>
                {chapters.map(c => <option key={c.id} value={c.id}>{c.number} {c.title}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>Norm</div>
                <select
                  value={importDialog.normId}
                  onChange={e => setImportDialog(prev => ({ ...prev, normId: e.target.value, chapterId: '' }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
                >
                  <option value="">— Wählen —</option>
                  <option value="sia265">SIA 265:2021 – Holzbau</option>
                  <option value="sia261">SIA 261:2020 – Einwirkungen</option>
                </select>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>Kapitel</div>
                <select
                  value={importDialog.chapterId}
                  onChange={e => setImportDialog(prev => ({ ...prev, chapterId: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
                >
                  <option value="">— Wählen —</option>
                  {chapters.filter(c => c.norm_id === importDialog.normId).map(c => <option key={c.id} value={c.id}>{c.number} {c.title}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setImportDialog({ open: false, normId, chapterId: '' })}
                  style={{ padding: '6px 14px', border: '1px solid #d1d5db', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                >
                  Abbrechen
                </button>
                <button
                  onClick={doImport}
                  disabled={!importDialog.file || !importDialog.normId || !importDialog.chapterId}
                  style={{ padding: '6px 16px', background: !importDialog.file || !importDialog.normId || !importDialog.chapterId ? '#d1d5db' : '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: !importDialog.file || !importDialog.normId || !importDialog.chapterId ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}
                >
                  📁 Importieren
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
