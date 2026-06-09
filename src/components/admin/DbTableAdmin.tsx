import React, { useEffect, useRef, useState, useContext } from 'react';
import {
  LineChart, BarChart, ScatterChart,
  Line, Bar, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { api } from '../../api';
import { NormContext } from './AdminPage';
import BuildingShape from '../BuildingShape';
import MathDisplay from '../MathDisplay';
import { useStore } from '../../store/useStore';

// ── Typen ──────────────────────────────────────────────────────────────────────
export interface ChartSeries { name: string; color?: string; data: [number, number][]; }
export interface ChartJson {
  chartType: 'line' | 'bar' | 'scatter';
  xAxis: { label: string; unit?: string };
  yAxis: { label: string; unit?: string };
  series: ChartSeries[];
}

interface TableMeta { id: string; norm_id: string; chapter_id: string | null; title: string; description: string; type?: 'table' | 'chart'; }
interface TableFull extends TableMeta { headers: string[]; rows: string[][]; chart_json?: ChartJson | null; }
interface Chapter { id: string; number: string; title: string; parent_id: string | null; }
interface ChapterNode extends Chapter { children: ChapterNode[]; tables: TableMeta[]; totalCount: number; }

const L: React.CSSProperties = { fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 };
const INP: React.CSSProperties = { border: '1px solid #d1d5db', borderRadius: 4, padding: '5px 8px', fontSize: 12, width: '100%', boxSizing: 'border-box' };

const CHART_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2'];

function emptyChartJson(): ChartJson {
  return { chartType: 'line', xAxis: { label: 'x', unit: '' }, yAxis: { label: 'y', unit: '' }, series: [{ name: 'Kurve 1', color: CHART_COLORS[0], data: [[0, 0]] }] };
}

// ── Hilfsfunktionen ────────────────────────────────────────────────────────────
function buildTree(chapters: Chapter[], tables: TableMeta[]): ChapterNode[] {
  const map = new Map<string, ChapterNode>();
  chapters.forEach(c => map.set(c.id, { ...c, children: [], tables: [], totalCount: 0 }));
  tables.forEach(t => { if (t.chapter_id) { const node = map.get(t.chapter_id); if (node) node.tables.push(t); } });
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
  return { id: '', norm_id: normId, chapter_id: chapterId, title: 'Neue Tabelle', description: '', type: 'table', headers: ['Spalte 1', 'Spalte 2'], rows: [['', '']], chart_json: null };
}

function parseCsv(text: string): string[][] {
  const sep = text.indexOf(';') >= 0 ? ';' : ',';
  return text.split(/\r?\n/).filter(l => l.trim()).map(line => {
    const cells: string[] = [];
    let cur = ''; let inQ = false;
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

// ── Kapitelbaum-Knoten ─────────────────────────────────────────────────────────
function ChapterTreeNode({ node, depth, selectedTableId, selectedChapterId, expanded, dragOverId, showCsv, showJson, hideEmpty, onToggle, onSelectTable, onSelectChapter, onNewIn, onCsvIn, onJsonIn, onDragOverChapter, onDragLeave, onDropOnChapter }: {
  node: ChapterNode; depth: number; selectedTableId: string | null; selectedChapterId: string | null;
  expanded: Set<string>; dragOverId: string | null; showCsv: boolean; showJson: boolean; hideEmpty: boolean;
  onToggle: (id: string) => void; onSelectTable: (t: TableMeta) => void; onSelectChapter: (id: string) => void;
  onNewIn: (chapterId: string) => void; onCsvIn: (chapterId: string) => void; onJsonIn: (chapterId: string) => void;
  onDragOverChapter: (id: string) => void; onDragLeave: () => void; onDropOnChapter: (chapterId: string, tableId: string) => void;
}) {
  if (hideEmpty && node.totalCount === 0) return null;
  const isOpen = expanded.has(node.id);
  const isOver = dragOverId === node.id;
  const isChapterSelected = selectedChapterId === node.id;
  const sharedProps = { selectedTableId, selectedChapterId, dragOverId, showCsv, showJson, hideEmpty, onToggle, onSelectTable, onSelectChapter, onNewIn, onCsvIn, onJsonIn, onDragOverChapter, onDragLeave, onDropOnChapter };
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
        {showCsv  && <button onClick={e => { e.stopPropagation(); onCsvIn(node.id); }}  title="CSV importieren"  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 11, padding: '0 2px', lineHeight: 1 }}>CSV</button>}
        {showJson && <button onClick={e => { e.stopPropagation(); onJsonIn(node.id); }} title="JSON importieren" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 11, padding: '0 2px', lineHeight: 1 }}>JSON</button>}
        <button onClick={e => { e.stopPropagation(); onNewIn(node.id); }} title="Neues Element in diesem Kapitel" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 14, padding: 0, lineHeight: 1 }}>+</button>
      </div>
      {isOpen && node.children.map(child => <ChapterTreeNode key={child.id} node={child} depth={depth + 1} expanded={expanded} {...sharedProps} />)}
      {isOpen && node.tables.map(t => (
        <div key={t.id} onClick={() => onSelectTable(t)}
          style={{ marginLeft: (depth + 1) * 10 + 8, padding: '4px 8px', fontSize: 12, cursor: 'pointer', background: selectedTableId === t.id ? '#dbeafe' : 'transparent', borderLeft: selectedTableId === t.id ? '3px solid #2563eb' : '3px solid transparent', borderRadius: 4 }}>
          <div style={{ color: selectedTableId === t.id ? '#1e40af' : '#374151', fontWeight: 500 }}>
            {t.type === 'chart' ? '📈' : '📊'} {t.title}
          </div>
          {t.description && <div style={{ fontSize: 10, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description.replace(/^shape:[^|]*\|?/, '')}</div>}
        </div>
      ))}
    </div>
  );
}

// ── CSV-Import-Modal ───────────────────────────────────────────────────────────
function CsvImportModal({ normId, chapterId, chapters, onClose, onImported }: { normId: string; chapterId: string; chapters: Chapter[]; onClose: () => void; onImported: () => void; }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const chapter = chapters.find(c => c.id === chapterId);

  const parsePreview = (text: string) => {
    const rows = parseCsv(text);
    if (rows.length < 1) { setPreview(null); return; }
    const [headerRow, ...dataRows] = rows;
    setPreview({ headers: headerRow, rows: dataRows });
  };
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { const text = (ev.target?.result as string) || ''; setCsvText(text); parsePreview(text); };
    reader.readAsText(file, 'UTF-8');
  };
  const doImport = async () => {
    if (!preview || !title.trim()) { setErr('Titel und CSV erforderlich'); return; }
    setSaving(true); setErr('');
    try {
      await (api as any).createDbTable({ norm_id: normId, chapter_id: chapterId, title: title.trim(), description, type: 'table', headers: preview.headers, rows: preview.rows });
      onImported(); onClose();
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
          <div><div style={L}>Tabellenname *</div><input value={title} onChange={e => setTitle(e.target.value)} placeholder="z.B. Tab. 31" style={INP} /></div>
          <div><div style={L}>Beschreibung</div><input value={description} onChange={e => setDescription(e.target.value)} placeholder="Kurze Beschreibung" style={INP} /></div>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={L}>CSV-Datei (erste Zeile = Spaltenköpfe)</div>
            <button onClick={() => fileRef.current?.click()} style={{ background: '#f1f5f9', border: '1px solid #d1d5db', borderRadius: 4, padding: '2px 10px', cursor: 'pointer', fontSize: 11 }}>Datei wählen</button>
            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{ display: 'none' }} />
          </div>
          <textarea value={csvText} onChange={e => { setCsvText(e.target.value); parsePreview(e.target.value); }}
            placeholder={"Höhe [m];Staudruck [kN/m²];Faktor\n10;0.65;1.0\n20;0.80;1.2"}
            style={{ width: '100%', height: 90, border: '1px solid #d1d5db', borderRadius: 4, padding: '6px 8px', fontSize: 11, fontFamily: 'monospace', resize: 'vertical' }} />
        </div>
        {preview && (
          <div style={{ overflowX: 'auto', maxHeight: 180, border: '1px solid #e5e7eb', borderRadius: 6 }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
              <thead><tr style={{ background: '#f1f5f9' }}>{preview.headers.map((h, i) => <th key={i} style={{ padding: '4px 8px', border: '1px solid #e5e7eb', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
              <tbody>{preview.rows.map((row, ri) => <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : '#f8fafc' }}>{row.map((cell, ci) => <td key={ci} style={{ padding: '3px 8px', border: '1px solid #f0f0f0' }}>{cell}</td>)}</tr>)}</tbody>
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

// ── JSON-Import-Modal (Diagramme) ──────────────────────────────────────────────
function JsonImportModal({ normId, chapterId, chapters, onClose, onImported }: { normId: string; chapterId: string; chapters: Chapter[]; onClose: () => void; onImported: () => void; }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [preview, setPreview] = useState<ChartJson | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const chapter = chapters.find(c => c.id === chapterId);

  const parsePreview = (text: string) => {
    if (!text.trim()) { setPreview(null); setErr(''); return; }
    try {
      const parsed = normalizeChartJson(JSON.parse(text));
      setPreview(parsed); setErr('');
    } catch (e: any) { setPreview(null); setErr(String(e.message || e)); }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { const text = (ev.target?.result as string) || ''; setJsonText(text); parsePreview(text); };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const doImport = async () => {
    if (!preview || !title.trim()) { setErr('Titel und JSON erforderlich'); return; }
    setSaving(true); setErr('');
    try {
      const res = await fetch('/api/db-tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ norm_id: normId, chapter_id: chapterId, title: title.trim(), description, type: 'chart', headers: [], rows: [], chart_json: preview }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      onImported(); onClose();
    } catch (e: any) {
      setErr(String(e.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 10, padding: 24, width: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>📈 Diagramm importieren</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Kapitel: {chapter?.number} {chapter?.title}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af' }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><div style={L}>Diagrammname *</div><input value={title} onChange={e => setTitle(e.target.value)} placeholder="z.B. Abb. 12" style={INP} /></div>
          <div><div style={L}>Beschreibung</div><input value={description} onChange={e => setDescription(e.target.value)} placeholder="Kurze Beschreibung" style={INP} /></div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={L}>JSON einfügen oder Datei laden</div>
            <button onClick={() => fileRef.current?.click()} style={{ background: '#f1f5f9', border: '1px solid #d1d5db', borderRadius: 4, padding: '2px 10px', cursor: 'pointer', fontSize: 11 }}>JSON-Datei wählen</button>
            <input ref={fileRef} type="file" accept=".json" onChange={handleFile} style={{ display: 'none' }} />
          </div>
          <textarea value={jsonText} onChange={e => { setJsonText(e.target.value); parsePreview(e.target.value); }}
            placeholder={'{ "chart": { "x_axis": { "label": "alpha in °" }, "y_axis": { "label": "mu" }, "curves": { "mu_1": { "points": [{"alpha":0,"mu":0.82}] } } } }'}
            style={{ width: '100%', height: 120, border: '1px solid #d1d5db', borderRadius: 4, padding: '6px 8px', fontSize: 11, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }} />
        </div>

        {err && <div style={{ fontSize: 12, color: '#b91c1c' }}>⚠ {err}</div>}

        {preview && (
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <div style={{ fontSize: 11, color: '#15803d', marginBottom: 6 }}>
              ✓ Erkannt: {preview.chartType} · {preview.series.length} Kurve(n) · X: {preview.xAxis.label} · Y: {preview.yAxis.label}
            </div>
            <ChartPreview chart={preview} />
          </div>
        )}

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

// ── Chart-Vorschau ─────────────────────────────────────────────────────────────
function ChartPreview({ chart }: { chart: ChartJson }) {
  const { chartType, xAxis, yAxis, series } = chart;

  const xLabel = xAxis.unit ? `${xAxis.label} [${xAxis.unit}]` : xAxis.label;
  const yLabel = yAxis.unit ? `${yAxis.label} [${yAxis.unit}]` : yAxis.label;
  const margin = { top: 10, right: 24, bottom: 50, left: 16 };
  const axisStyle = { fontSize: 11 };
  const xAxisProps = {
    dataKey: 'x', tick: axisStyle,
    label: { value: xLabel, position: 'insideBottom' as const, offset: -30, fontSize: 11 },
  };
  const yAxisProps = {
    tick: axisStyle,
    label: { value: yLabel, angle: -90, position: 'insideLeft' as const, offset: 12, fontSize: 11 },
    width: 48,
  };
  const tooltipStyle = { fontSize: 11, borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' };

  // Lineare Interpolation: Y-Wert einer Kurve an beliebigem X (nur innerhalb der Kurve)
  const interpolateY = (data: [number, number][], x: number): number | undefined => {
    if (data.length === 0) return undefined;
    for (let i = 0; i < data.length - 1; i++) {
      const [x0, y0] = data[i], [x1, y1] = data[i + 1];
      if (x >= x0 && x <= x1) return x0 === x1 ? y0 : y0 + (y1 - y0) * (x - x0) / (x1 - x0);
    }
    if (x === data[data.length - 1][0]) return data[data.length - 1][1];
    return undefined;
  };

  // Für Line/Bar: dichte X-Punkte erzeugen (jeder ganzzahlige Schritt im Bereich)
  // → Tooltip fährt flüssig durch, nicht nur an Originalstützpunkten
  const origX = Array.from(new Set(series.flatMap(s => s.data.map(d => d[0])))).sort((a, b) => a - b);
  const xMin = origX[0] ?? 0;
  const xMax = origX[origX.length - 1] ?? 1;
  const range = xMax - xMin;
  // Schrittweite: 1 wenn Range ≤ 200, sonst so dass max 200 Punkte entstehen
  const step = range <= 200 ? 1 : Math.ceil(range / 200);
  const denseX: number[] = [];
  for (let x = xMin; x <= xMax + 1e-9; x = Math.round((x + step) * 1e9) / 1e9) denseX.push(x);
  // Originalpunkte immer dabei (für Exaktheit an Knicken)
  const allX = Array.from(new Set([...denseX, ...origX])).sort((a, b) => a - b);
  const chartData = allX.map(x => {
    const point: Record<string, number> = { x };
    series.forEach((s, i) => {
      const y = interpolateY(s.data, x);
      if (y !== undefined) point[`s${i}`] = Math.round(y * 10000) / 10000;
    });
    return point;
  });

  const tooltipFormatter = (value: any, name: any) => [`${value}`, name];
  const labelFormatter = (x: any) => `${xAxis.label}: ${x}${xAxis.unit ? ` ${xAxis.unit}` : ''}`;

  if (chartType === 'scatter') {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart margin={margin}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" dataKey="x" name={xAxis.label} tick={axisStyle} label={{ value: xLabel, position: 'insideBottom', offset: -18, fontSize: 11 }} />
          <YAxis type="number" dataKey="y" name={yAxis.label} tick={axisStyle} label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 12, fontSize: 11 }} width={48} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={tooltipStyle}
            formatter={(v: any, n: any) => [`${v}${yAxis.unit ? ` ${yAxis.unit}` : ''}`, n]}
            labelFormatter={() => ''} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {series.map((s, i) => (
            <Scatter key={i} name={s.name} data={s.data.map(([x, y]) => ({ x, y }))} fill={s.color || CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={margin}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis {...xAxisProps} />
          <YAxis {...yAxisProps} />
          <Tooltip contentStyle={tooltipStyle} formatter={tooltipFormatter} labelFormatter={labelFormatter} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {series.map((s, i) => <Bar key={i} dataKey={`s${i}`} name={s.name} fill={s.color || CHART_COLORS[i % CHART_COLORS.length]} />)}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // Line (default)
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={chartData} margin={margin}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis {...xAxisProps} />
        <YAxis {...yAxisProps} />
        <Tooltip contentStyle={tooltipStyle} formatter={tooltipFormatter} labelFormatter={labelFormatter} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {series.map((s, i) => (
          <Line key={i} type="linear" dataKey={`s${i}`} name={s.name}
            stroke={s.color || CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2} dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// Konvertiert verschiedene JSON-Formate in unser ChartJson
function normalizeChartJson(raw: any): ChartJson {
  // Bereits unser Format
  if (raw.chartType && raw.xAxis && raw.yAxis && Array.isArray(raw.series)) {
    return raw as ChartJson;
  }

  if (raw.chart || raw.curves || raw.x_axis) {
    const c = raw.chart ?? raw;
    const xVar   = c.x_axis?.variable ?? c.x_axis?.label ?? 'x';
    const xUnit  = c.x_axis?.unit ?? '';
    const yVar   = c.y_axis?.variable ?? c.y_axis?.label ?? 'y';
    const yUnit  = c.y_axis?.unit ?? '';
    const series: ChartSeries[] = [];
    const curves = c.curves ?? {};

    if (Array.isArray(curves)) {
      // Neues Format: curves als Array mit { label, points: [{x,y}] }
      curves.forEach((curve: any, i: number) => {
        const pts = curve.points ?? [];
        if (pts.length === 0) return;
        series.push({
          name: curve.label ?? curve.name ?? `Kurve ${i + 1}`,
          color: CHART_COLORS[i % CHART_COLORS.length],
          data: pts.map((p: any) => [Number(p.x) ?? 0, Number(p.y) ?? 0] as [number, number]),
        });
      });
    } else {
      // Altes Format: curves als Objekt mit variablenbasierten Keys
      Object.entries(curves).forEach(([name, curve]: [string, any], i) => {
        const pts: Array<{ [k: string]: number }> = curve.points ?? [];
        if (pts.length === 0) return;
        const keys = Object.keys(pts[0]);
        const xKey = keys[0] ?? 'x';
        const yKey = keys[1] ?? 'y';
        series.push({
          name,
          color: CHART_COLORS[i % CHART_COLORS.length],
          data: pts.map(p => [Number(p[xKey]) || 0, Number(p[yKey]) || 0] as [number, number]),
        });
      });
    }

    if (series.length === 0) throw new Error('Keine Kurven gefunden');
    return {
      chartType: 'line',
      xAxis: { label: xVar, unit: xUnit },
      yAxis: { label: yVar, unit: yUnit },
      series,
    };
  }

  throw new Error('Unbekanntes Format — erwartet: { chartType, xAxis, yAxis, series } oder { chart: { x_axis, y_axis, curves } }');
}

// ── Diagramm-Editor ────────────────────────────────────────────────────────────
function ChartEditor({ chart, onChange }: { chart: ChartJson; onChange: (c: ChartJson) => void }) {
  const set = (patch: Partial<ChartJson>) => onChange({ ...chart, ...patch });
  const setAxis = (axis: 'xAxis' | 'yAxis', patch: Partial<ChartJson['xAxis']>) => set({ [axis]: { ...chart[axis], ...patch } });

  const setSeries = (i: number, patch: Partial<ChartSeries>) => {
    const s = [...chart.series]; s[i] = { ...s[i], ...patch }; set({ series: s });
  };
  const addSeries = () => set({ series: [...chart.series, { name: `Kurve ${chart.series.length + 1}`, color: CHART_COLORS[chart.series.length % CHART_COLORS.length], data: [[0, 0]] }] });
  const delSeries = (i: number) => set({ series: chart.series.filter((_, j) => j !== i) });

  const setPoint = (si: number, pi: number, axis: 0 | 1, val: string) => {
    const s = [...chart.series];
    const d = [...s[si].data] as [number, number][];
    d[pi] = [axis === 0 ? parseFloat(val) || 0 : d[pi][0], axis === 1 ? parseFloat(val) || 0 : d[pi][1]] as [number, number];
    s[si] = { ...s[si], data: d };
    set({ series: s });
  };
  const addPoint = (si: number) => {
    const s = [...chart.series];
    const last = s[si].data[s[si].data.length - 1] || [0, 0];
    s[si] = { ...s[si], data: [...s[si].data, [last[0] + 1, last[1]] as [number, number]] };
    set({ series: s });
  };
  const delPoint = (si: number, pi: number) => {
    const s = [...chart.series];
    s[si] = { ...s[si], data: s[si].data.filter((_, j) => j !== pi) };
    set({ series: s });
  };

  // JSON-Import
  const [showJson, setShowJson] = React.useState(false);
  const [jsonText, setJsonText] = React.useState('');
  const [jsonErr, setJsonErr] = React.useState('');
  const jsonFileRef = useRef<HTMLInputElement>(null);

  const applyJson = () => {
    try {
      const raw = JSON.parse(jsonText);
      onChange(normalizeChartJson(raw));
      setJsonErr('');
      setShowJson(false);
    } catch (e: any) {
      setJsonErr(String(e.message || e));
    }
  };

  const loadJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setJsonText((ev.target?.result as string) || ''); setJsonErr(''); };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* JSON-Import */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: '#f8fafc', cursor: 'pointer' }}
          onClick={() => { setShowJson(v => !v); if (!showJson) setJsonText(JSON.stringify(chart, null, 2)); }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{'{ }'} JSON importieren / exportieren</span>
          <span style={{ fontSize: 10, color: '#9ca3af' }}>{showJson ? '▲' : '▼'}</span>
        </div>
        {showJson && (
          <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <textarea value={jsonText} onChange={e => { setJsonText(e.target.value); setJsonErr(''); }}
              placeholder={'{\n  "chartType": "line",\n  "xAxis": { "label": "x", "unit": "" },\n  "yAxis": { "label": "y", "unit": "" },\n  "series": [{ "name": "Kurve 1", "data": [[0,0],[1,1]] }]\n}'}
              style={{ width: '100%', height: 160, border: '1px solid #d1d5db', borderRadius: 4, padding: '6px 8px', fontSize: 11, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }} />
            {jsonErr && <div style={{ color: '#b91c1c', fontSize: 11 }}>⚠ {jsonErr}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={applyJson} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 5, padding: '5px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                Übernehmen
              </button>
              <button onClick={() => jsonFileRef.current?.click()} style={{ background: '#f1f5f9', border: '1px solid #d1d5db', borderRadius: 5, padding: '5px 12px', cursor: 'pointer', fontSize: 12 }}>
                JSON-Datei laden
              </button>
              <input ref={jsonFileRef} type="file" accept=".json" onChange={loadJsonFile} style={{ display: 'none' }} />
              <button onClick={() => { setJsonText(JSON.stringify(chart, null, 2)); setJsonErr(''); }}
                style={{ background: '#f1f5f9', border: '1px solid #d1d5db', borderRadius: 5, padding: '5px 12px', cursor: 'pointer', fontSize: 12 }}>
                Aktuelles JSON anzeigen
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Diagramm-Typ + Achsen */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <div>
          <div style={L}>Diagramm-Typ</div>
          <select value={chart.chartType} onChange={e => set({ chartType: e.target.value as any })} style={INP}>
            <option value="line">Liniendiagramm</option>
            <option value="bar">Balkendiagramm</option>
            <option value="scatter">Streudiagramm</option>
          </select>
        </div>
        <div>
          <div style={L}>X-Achse Bezeichnung</div>
          <input value={chart.xAxis.label} onChange={e => setAxis('xAxis', { label: e.target.value })} style={INP} placeholder="z.B. Höhe" />
        </div>
        <div>
          <div style={L}>X-Einheit</div>
          <input value={chart.xAxis.unit || ''} onChange={e => setAxis('xAxis', { unit: e.target.value })} style={INP} placeholder="z.B. m" />
        </div>
        <div />
        <div>
          <div style={L}>Y-Achse Bezeichnung</div>
          <input value={chart.yAxis.label} onChange={e => setAxis('yAxis', { label: e.target.value })} style={INP} placeholder="z.B. Staudruck" />
        </div>
        <div>
          <div style={L}>Y-Einheit</div>
          <input value={chart.yAxis.unit || ''} onChange={e => setAxis('yAxis', { unit: e.target.value })} style={INP} placeholder="z.B. kN/m²" />
        </div>
      </div>

      {/* Kurven */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ ...L, marginBottom: 0 }}>Kurven / Datenserien</div>
          <button onClick={addSeries} style={{ background: '#dbeafe', border: 'none', borderRadius: 4, padding: '3px 10px', cursor: 'pointer', fontSize: 11, color: '#1e40af' }}>+ Kurve</button>
        </div>
        {chart.series.map((s, si) => (
          <div key={si} style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 10, marginBottom: 8, background: '#fafafa' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <input type="color" value={s.color || CHART_COLORS[si % CHART_COLORS.length]} onChange={e => setSeries(si, { color: e.target.value })}
                style={{ width: 28, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer', padding: 0 }} />
              <input value={s.name} onChange={e => setSeries(si, { name: e.target.value })} style={{ ...INP, flex: 1 }} placeholder="Kurvenname" />
              {chart.series.length > 1 && (
                <button onClick={() => delSeries(si)} style={{ background: '#fee2e2', border: 'none', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', color: '#b91c1c', fontSize: 11 }}>✕</button>
              )}
            </div>

            {/* Datenpunkte-Tabelle */}
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ padding: '3px 6px', border: '1px solid #e5e7eb', color: '#9ca3af', width: 26, fontSize: 10 }}>#</th>
                  <th style={{ padding: '3px 6px', border: '1px solid #e5e7eb', fontWeight: 600 }}>
                    {chart.xAxis.label}{chart.xAxis.unit ? ` [${chart.xAxis.unit}]` : ''}
                  </th>
                  <th style={{ padding: '3px 6px', border: '1px solid #e5e7eb', fontWeight: 600 }}>
                    {chart.yAxis.label}{chart.yAxis.unit ? ` [${chart.yAxis.unit}]` : ''}
                  </th>
                  <th style={{ width: 26, border: '1px solid #e5e7eb' }} />
                </tr>
              </thead>
              <tbody>
                {s.data.map((pt, pi) => (
                  <tr key={pi} style={{ background: pi % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={{ padding: '2px 6px', border: '1px solid #f0f0f0', color: '#9ca3af', textAlign: 'center' }}>{pi + 1}</td>
                    <td style={{ padding: '2px 3px', border: '1px solid #f0f0f0' }}>
                      <input type="number" value={pt[0]} onChange={e => setPoint(si, pi, 0, e.target.value)}
                        style={{ border: 'none', background: 'transparent', fontSize: 11, width: '100%', outline: 'none', padding: '2px 4px', textAlign: 'right', fontFamily: 'monospace' }} />
                    </td>
                    <td style={{ padding: '2px 3px', border: '1px solid #f0f0f0' }}>
                      <input type="number" value={pt[1]} onChange={e => setPoint(si, pi, 1, e.target.value)}
                        style={{ border: 'none', background: 'transparent', fontSize: 11, width: '100%', outline: 'none', padding: '2px 4px', textAlign: 'right', fontFamily: 'monospace' }} />
                    </td>
                    <td style={{ border: '1px solid #f0f0f0', textAlign: 'center' }}>
                      <button onClick={() => delPoint(si, pi)} style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 12 }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => addPoint(si)} style={{ marginTop: 4, background: '#dcfce7', border: 'none', borderRadius: 4, padding: '3px 10px', cursor: 'pointer', fontSize: 11, color: '#15803d' }}>+ Punkt</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Haupt-Komponente ───────────────────────────────────────────────────────────
export default function DbTableAdmin({ mode = 'table' }: { mode?: 'table' | 'chart' }) {
  const { normId, normLabel } = useContext(NormContext);
  const globalUnits = useStore(s => s.globalUnits);
  const [allTables, setAllTables] = useState<TableMeta[]>([]);
  const [chapters, setChapters]   = useState<Chapter[]>([]);
  const [selected, setSelected]   = useState<string | null>(null);
  const [editing, setEditing]     = useState<TableFull | null>(null);
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState('');
  const [expanded, setExpanded]   = useState<Set<string>>(new Set());
  const [csvChapter, setCsvChapter] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [dragTableId, setDragTableId] = useState<string | null>(null);
  const [dragOverChapterId, setDragOverChapterId] = useState<string | null>(null);
  const [jsonChapter, setJsonChapter] = useState<string | null>(null);
  const [hideEmpty, setHideEmpty] = useState(false);

  // Gefiltert nach mode
  const tables    = allTables.filter(t => (t.type ?? 'table') === mode);
  const unassigned = tables.filter(t => !t.chapter_id);

  const load = async () => {
    const [tbls, chs] = await Promise.all([
      (api as any).getDbTables(normId) as Promise<TableMeta[]>,
      fetch(`/api/chapters?norm=${normId}`).then(r => r.json()) as Promise<Chapter[]>,
    ]);
    setAllTables(tbls);
    setChapters(chs);
  };

  useEffect(() => { load(); setEditing(null); setSelected(null); setSelectedChapterId(null); }, [normId, mode]);

  const selectTable = async (t: TableMeta) => {
    const full = await (api as any).getDbTableFull(t.id);
    setSelected(t.id);
    setEditing(JSON.parse(JSON.stringify(full)));
    setMsg('');
  };

  const selectChapter = (id: string) => { setSelectedChapterId(id); setEditing(null); setSelected(null); setMsg(''); };
  const newInChapter = (chapterId: string) => {
    const t = emptyTable(normId, chapterId);
    t.type = mode;
    if (mode === 'chart') t.chart_json = emptyChartJson();
    setSelected(null); setEditing(t); setMsg(''); setExpanded(prev => new Set(prev).add(chapterId));
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const payload = { ...editing };
      if (!editing.id) {
        const { id } = await (api as any).createDbTable(payload) as { id: string };
        setSelected(id);
        setEditing({ ...editing, id });
      } else {
        await (api as any).updateDbTable(editing.id, payload);
      }
      await load();
      setMsg('✓ Gespeichert');
    } catch { setMsg('⚠ Fehler'); }
    setSaving(false);
  };

  const del = async (id: string) => {
    if (!confirm('Löschen?')) return;
    await (api as any).deleteDbTable(id);
    setEditing(null); setSelected(null); await load();
  };

  const dropOnChapter = async (chapterId: string, tableId: string) => {
    setDragOverChapterId(null);
    const id = tableId || dragTableId;
    if (!id) return;
    const full = await (api as any).getDbTableFull(id);
    await (api as any).updateDbTable(id, { ...full, chapter_id: chapterId });
    setDragTableId(null);
    setExpanded(prev => new Set(prev).add(chapterId));
    await load();
  };

  const toggle = (id: string) => setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  // Tabellen-Bearbeitungs-Helpers
  const addCol = () => editing && setEditing({ ...editing, headers: [...editing.headers, `Sp. ${editing.headers.length + 1}`], rows: editing.rows.map(r => [...r, '']) });
  const remCol = (ci: number) => editing && setEditing({ ...editing, headers: editing.headers.filter((_, i) => i !== ci), rows: editing.rows.map(r => r.filter((_, i) => i !== ci)) });
  const addRow = () => editing && setEditing({ ...editing, rows: [...editing.rows, editing.headers.map(() => '')] });
  const remRow = (ri: number) => editing && setEditing({ ...editing, rows: editing.rows.filter((_, i) => i !== ri) });
  const setH    = (ci: number, v: string) => { if (!editing) return; const h = [...editing.headers]; h[ci] = v; setEditing({ ...editing, headers: h }); };
  const setCell = (ri: number, ci: number, v: string) => editing && setEditing({ ...editing, rows: editing.rows.map((r, i) => i === ri ? r.map((c, j) => j === ci ? v : c) : r) });

  const tree = buildTree(chapters, tables);
  const flatChapters = chapters.map(c => ({ ...c, display: `${c.number} ${c.title}` }));

  const isChart = editing?.type === 'chart';
  const currentChart = editing?.chart_json || emptyChartJson();

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

      {/* ── Links: Kapitelbaum ── */}
      <div style={{ width: 270, borderRight: '1px solid #e5e7eb', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{mode === 'chart' ? 'Diagramme' : 'Normtabellen'}</div>
            <div style={{ fontSize: 10, color: '#6b7280' }}>{normLabel}</div>
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            <button onClick={() => setHideEmpty(v => !v)} title={hideEmpty ? 'Alle Kapitel anzeigen' : 'Leere Kapitel ausblenden'}
              style={{ background: hideEmpty ? '#dbeafe' : '#f1f5f9', color: hideEmpty ? '#1e40af' : '#6b7280', border: `1px solid ${hideEmpty ? '#93c5fd' : '#d1d5db'}`, borderRadius: 5, padding: '4px 7px', cursor: 'pointer', fontSize: 13, lineHeight: 1 }}>
              👁
            </button>
            <button onClick={() => {
              const t = emptyTable(normId, null);
              t.type = mode;
              if (mode === 'chart') t.chart_json = emptyChartJson();
              setSelected(null); setEditing(t); setMsg('');
            }} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>+ Neu</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 4px' }} onDragOver={e => e.preventDefault()}>
          {tree.map(node => (
            <ChapterTreeNode key={node.id} node={node} depth={0} selectedTableId={selected} selectedChapterId={selectedChapterId} expanded={expanded} dragOverId={dragOverChapterId}
              showCsv={mode === 'table'} showJson={mode === 'chart'} hideEmpty={hideEmpty}
              onToggle={toggle} onSelectTable={selectTable} onSelectChapter={selectChapter} onNewIn={newInChapter}
              onCsvIn={mode === 'table' ? id => setCsvChapter(id) : () => {}}
              onJsonIn={mode === 'chart' ? id => setJsonChapter(id) : () => {}}
              onDragOverChapter={setDragOverChapterId} onDragLeave={() => setDragOverChapterId(null)} onDropOnChapter={dropOnChapter} />
          ))}

          {unassigned.length > 0 && (
            <div style={{ marginTop: 8, borderTop: '1px solid #f0f0f0', paddingTop: 6 }}>
              <div style={{ padding: '3px 6px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Nicht zugewiesen ({unassigned.length})
              </div>
              {unassigned.map(t => (
                <div key={t.id} draggable
                  onDragStart={e => { e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed = 'move'; setDragTableId(t.id); }}
                  onDragEnd={() => { setDragTableId(null); setDragOverChapterId(null); }}
                  onClick={() => selectTable(t)}
                  style={{ padding: '4px 14px', fontSize: 12, cursor: 'grab', background: selected === t.id ? '#dbeafe' : dragTableId === t.id ? '#fef9c3' : 'transparent', borderLeft: selected === t.id ? '3px solid #2563eb' : '3px solid transparent', opacity: dragTableId === t.id ? 0.6 : 1 }}>
                  <div style={{ color: '#374151', fontWeight: 500 }}>⠿ {t.type === 'chart' ? '📈' : '📊'} {t.title}</div>
                </div>
              ))}
              <div style={{ padding: '3px 10px', fontSize: 10, color: '#d1d5db', fontStyle: 'italic' }}>↑ ins Kapitel ziehen</div>
            </div>
          )}
        </div>

        <div style={{ padding: '5px 12px', borderTop: '1px solid #e5e7eb', fontSize: 10, color: '#9ca3af', background: '#fafafa' }}>
          {tables.length} Einträge · {normLabel}
        </div>
      </div>

      {/* ── Rechts: Editor ── */}
      {editing ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 16, flex: 1 }}>{editing.id ? 'Bearbeiten' : 'Neu'}</h2>
            {msg && <span style={{ fontSize: 12, color: msg.startsWith('✓') ? '#15803d' : '#b91c1c' }}>{msg}</span>}
            {editing.id && <button onClick={() => del(editing.id)} style={{ background: '#fee2e2', border: 'none', borderRadius: 5, padding: '5px 10px', cursor: 'pointer', color: '#b91c1c', fontSize: 12 }}>🗑</button>}
            <button onClick={save} disabled={saving} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              {saving ? '…' : '💾 Speichern'}
            </button>
          </div>

          {/* Tab-Switch: nur sichtbar wenn kein fester mode */}
          {!mode && (
            <div style={{ display: 'flex', gap: 0, marginBottom: 16, border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden', width: 'fit-content' }}>
              {(['table', 'chart'] as const).map(t => (
                <button key={t} onClick={() => setEditing({ ...editing, type: t, chart_json: t === 'chart' ? (editing.chart_json || emptyChartJson()) : editing.chart_json })}
                  style={{ padding: '7px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: editing.type === t ? '#2563eb' : '#f8fafc', color: editing.type === t ? '#fff' : '#374151' }}>
                  {t === 'table' ? '📊 Tabelle' : '📈 Diagramm'}
                </button>
              ))}
            </div>
          )}

          {/* Meta */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: 10, marginBottom: 14 }}>
            <div>
              <div style={L}>Titel</div>
              <input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} style={INP} />
            </div>
            <div>
              <div style={L}>Beschreibung</div>
              <input value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} placeholder="Kurze Beschreibung" style={INP} />
            </div>
            <div>
              <div style={L}>Kapitel</div>
              <select value={editing.chapter_id || ''} onChange={async e => {
                const newChapterId = e.target.value || null;
                const updated = { ...editing, chapter_id: newChapterId };
                setEditing(updated);
                if (updated.id) { await (api as any).updateDbTable(updated.id, updated); await load(); setMsg('✓ Kapitel gespeichert'); if (newChapterId) setExpanded(prev => new Set(prev).add(newChapterId)); }
              }} style={INP}>
                <option value="">– Nicht zugewiesen –</option>
                {flatChapters.map(c => <option key={c.id} value={c.id}>{c.display}</option>)}
              </select>
            </div>
          </div>

          {/* ── Tabellen-Editor ── */}
          {!isChart && (
            <>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <button onClick={addCol} style={{ background: '#dbeafe', border: 'none', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', color: '#1e40af', fontSize: 12 }}>+ Spalte</button>
                <button onClick={addRow} style={{ background: '#dcfce7', border: 'none', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', color: '#15803d', fontSize: 12 }}>+ Zeile</button>
                <span style={{ fontSize: 11, color: '#9ca3af', alignSelf: 'center' }}>{editing.rows.length} Zeilen × {editing.headers.length} Sp.</span>
              </div>
              <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ padding: '4px 6px', border: '1px solid #e5e7eb', color: '#9ca3af', fontSize: 10, width: 30 }}>#</th>
                      {editing.headers.map((h, ci) => (
                        <th key={ci} style={{ padding: '2px 4px', border: '1px solid #e5e7eb', minWidth: 110 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <input value={h} onChange={e => setH(ci, e.target.value)} style={{ border: 'none', background: 'transparent', fontWeight: 600, fontSize: 12, width: '100%', outline: 'none', padding: '2px' }} />
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
                                <select value={cell} onChange={e => setCell(ri, ci, e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: 12, width: '100%', outline: 'none', padding: '2px 4px', cursor: 'pointer' }}>
                                  <option value="">— wählen —</option>
                                  {globalUnits.map((u, i) => <option key={i} value={u}>{u}</option>)}
                                  {cell && !globalUnits.includes(cell) && <option value={cell}>{cell}</option>}
                                </select>
                              ) : (
                                <input value={cell} onChange={e => setCell(ri, ci, e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: 12, width: '100%', outline: 'none', padding: '2px 4px' }} />
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
              {/* Tabellen-Vorschau */}
              <div style={{ marginTop: 16, background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Vorschau</div>
                {(() => { const match = (editing.description || '').match(/^shape:([^|]+)/); return match && match[1] !== 'none' ? <BuildingShape shapeKey={match[1]} /> : null; })()}
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{editing.title}</div>
                {editing.description && <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>{(editing.description || '').replace(/^shape:[^|]*\|?/, '')}</div>}
                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11 }}>
                  <thead><tr style={{ background: '#e2e8f0' }}>{editing.headers.map((h, i) => <th key={i} style={{ padding: '4px 8px', textAlign: 'left', border: '1px solid #cbd5e1', fontWeight: 600 }}>{h}</th>)}</tr></thead>
                  <tbody>{editing.rows.map((row, ri) => <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : '#f8fafc' }}>{row.map((cell, ci) => <td key={ci} style={{ padding: '4px 8px', border: '1px solid #e5e7eb' }}>{cell}</td>)}</tr>)}</tbody>
                </table>
              </div>
            </>
          )}

          {/* ── Diagramm-Editor ── */}
          {isChart && (
            <>
              <ChartEditor chart={currentChart} onChange={c => setEditing({ ...editing, chart_json: c })} />
              {/* Diagramm-Vorschau */}
              <div style={{ marginTop: 20, background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Vorschau</div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>{editing.title}</div>
                {editing.description && <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 12 }}>{editing.description}</div>}
                <ChartPreview chart={currentChart} />
              </div>
            </>
          )}
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
              {mode === 'table'
                ? <button onClick={() => setCsvChapter(selectedChapterId)} style={{ background: '#f1f5f9', border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>📥 CSV Import</button>
                : <button onClick={() => setJsonChapter(selectedChapterId)} style={{ background: '#f1f5f9', border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>📥 JSON Import</button>
              }
              <button onClick={() => newInChapter(selectedChapterId)} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>+ Neu</button>
            </div>
            {chapTables.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
                <div>Noch keine Einträge in diesem Kapitel</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                {chapTables.map(t => (
                  <div key={t.id} onClick={() => selectTable(t)} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 14px', cursor: 'pointer', background: '#fff' }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.10)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#1e40af', marginBottom: 4 }}>{t.type === 'chart' ? '📈' : '📊'} {t.title}</div>
                    {t.description && <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>{t.description.replace(/^shape:[^|]*\|?/, '')}</div>}
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
            + Neu für {normLabel}
          </button>
        </div>
      )}

      {csvChapter && (
        <CsvImportModal normId={normId} chapterId={csvChapter} chapters={chapters} onClose={() => setCsvChapter(null)} onImported={load} />
      )}
      {jsonChapter && (
        <JsonImportModal normId={normId} chapterId={jsonChapter} chapters={chapters} onClose={() => setJsonChapter(null)} onImported={load} />
      )}
    </div>
  );
}
