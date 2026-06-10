import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Verification } from '../types';
import MathDisplay from './MathDisplay';
import { nameToLatex } from '../utils/formatName';
import { getGraph } from '../utils/legacyToGraph';
import { evalGraph, topoSort, collectTableRefs, DbTableData } from '../utils/evalGraph';
import { formatNumber } from '../utils/substituteFormula';
import { evalCondExpr } from '../utils/evalFormula';
import { latexCondToJs } from '../utils/latexToJs';
import { api } from '../api';
import { useStore } from '../store/useStore';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';

const CHART_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2'];

function interpolateY(data: [number, number][], x: number): number | undefined {
  if (!data.length) return undefined;
  for (let i = 0; i < data.length - 1; i++) {
    const [x0, y0] = data[i], [x1, y1] = data[i + 1];
    if (x >= x0 && x <= x1) return x0 === x1 ? y0 : y0 + (y1 - y0) * (x - x0) / (x1 - x0);
  }
  if (x === data[data.length - 1][0]) return data[data.length - 1][1];
  return undefined;
}

function ChartLookupModal({ chartJson, xAxisLabel, yAxisLabel, xUnit, currentX, direction, onClose }: {
  chartJson: any; xAxisLabel: string; yAxisLabel: string; xUnit: string;
  currentX: number; direction: 'x_to_y' | 'y_to_x'; onClose: () => void;
}) {
  const [hoverX, setHoverX] = useState<number | null>(null);
  const activeX = hoverX ?? currentX;
  const series: { name: string; data: [number, number][] }[] = chartJson?.series ?? [];

  const origX = Array.from(new Set(series.flatMap(s => s.data.map(d => d[0])))).sort((a, b) => a - b);
  const xMin = origX[0] ?? 0, xMax = origX[origX.length - 1] ?? 1;
  const range = xMax - xMin;
  const step = range <= 200 ? 1 : Math.ceil(range / 200);
  const denseX: number[] = [];
  for (let x = xMin; x <= xMax + 1e-9; x = Math.round((x + step) * 1e9) / 1e9) denseX.push(x);
  const allX = Array.from(new Set([...denseX, ...origX])).sort((a, b) => a - b);
  const chartData = allX.map(x => {
    const pt: Record<string, number> = { x };
    series.forEach((s, i) => { const y = interpolateY(s.data, x); if (y !== undefined) pt[`s${i}`] = Math.round(y * 10000) / 10000; });
    return pt;
  });

  const xLabel = xUnit ? `${xAxisLabel} [${xUnit}]` : xAxisLabel;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 720, maxWidth: '95vw', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>📉 Diagramm</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af' }}>×</button>
        </div>

        {/* Aktuelle Werte */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12, padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #a7f3d0' }}>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            {direction === 'x_to_y' ? xAxisLabel : yAxisLabel}: <strong style={{ color: '#047857' }}>{isFinite(activeX) ? Math.round(activeX * 1000) / 1000 : '–'}</strong>
            {xUnit && <span style={{ marginLeft: 3, color: '#9ca3af' }}>{xUnit}</span>}
          </div>
          {series.map((s, i) => {
            const y = isFinite(activeX) ? interpolateY(s.data, activeX) : undefined;
            return (
              <div key={i} style={{ fontSize: 12, color: '#6b7280' }}>
                <span style={{ color: CHART_COLORS[i % CHART_COLORS.length], fontWeight: 600 }}>{s.name}</span>
                {': '}
                <strong>{y !== undefined ? Math.round(y * 10000) / 10000 : '–'}</strong>
              </div>
            );
          })}
        </div>

        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 40, left: 16 }}
            onMouseMove={(e: any) => { if (e?.activeLabel != null) setHoverX(Number(e.activeLabel)); }}
            onMouseLeave={() => setHoverX(null)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="x" tick={{ fontSize: 11 }}
              label={{ value: xLabel, position: 'insideBottom', offset: -28, fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={48}
              label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', offset: 12, fontSize: 11 }} />
            <Tooltip contentStyle={{ fontSize: 11 }}
              formatter={(v: any, name: any) => [v, name]}
              labelFormatter={(x: any) => `${xAxisLabel}: ${x}${xUnit ? ` ${xUnit}` : ''}`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {isFinite(activeX) && (
              <ReferenceLine x={activeX} stroke={hoverX !== null ? '#6b7280' : '#059669'}
                strokeWidth={hoverX !== null ? 1 : 2} strokeDasharray={hoverX !== null ? '4 3' : undefined}
                label={{ value: String(Math.round(activeX * 100) / 100), position: 'top', fontSize: 10, fill: hoverX !== null ? '#6b7280' : '#047857' }} />
            )}
            {series.map((s, i) => (
              <Line key={i} type="linear" dataKey={`s${i}`} name={s.name}
                stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Store-Verification → vom Legacy-Adapter erwartete Form
function toLegacyShape(v: Verification) {
  return {
    id: v.id, title: v.title,
    formula_latex: v.formula?.latex || '',
    formula_description: v.formula?.description || '',
    compute_expr: v.computeExpr || '',
    graph_json: v.graph_json || null,
    variables: (v.variables || []).map((x: any) => ({
      name: x.name, label: x.label, unit: x.unit, type: x.type,
      default_value: String(x.value ?? ''),
      options: (x.options || []).map((o: any) => ({ label: o.label, value: String(o.value) })),
      table_ref: x.table_ref ?? null,
      table_col: x.table_col ?? null,
    })),
  };
}

const lbl: React.CSSProperties = { fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 };
const card: React.CSSProperties = { border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 10px', marginBottom: 6, background: '#fff' };
const sel: React.CSSProperties = { border: '1px solid #d1d5db', borderRadius: 5, padding: '4px 8px', fontSize: 13, width: '100%', background: '#fff' };

export default function GraphVerificationView({ verification, readOnly = false, initialInputs }: { verification: Verification; readOnly?: boolean; initialInputs?: Record<string, string> }) {
  const woodType = useStore(s => s.woodType);
  const woodClassId = useStore(s => s.woodClassId);
  const apiWoodClasses = useStore(s => s.apiWoodClasses);
  const setGraphInputs = useStore(s => s.setGraphInputs);
  const graph = useMemo(() => getGraph(toLegacyShape(verification)), [verification.id, verification.graph_json]);
  const [tables, setTables] = useState<Record<string, DbTableData>>({});
  // Im Print-Modus: initialInputs als Startzustand; sonst leer (Defaults kommen via useEffect)
  const [inputs, setInputs] = useState<Record<string, string>>(initialInputs || {});
  const [decimals, setDecimals] = useState(3);
  const [imageModal, setImageModal] = useState<{ src: string; label?: string; source?: string } | null>(null);
  const [chartModal, setChartModal] = useState<string | null>(null); // Node-ID
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const toggleSection = (id: string) => setCollapsedSections(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const materialProps = useMemo(() => {
    const woodClass = apiWoodClasses.find(c => c.id === woodClassId);
    return Object.fromEntries((woodClass?.properties || []).map(p => [p.key, p.value]));
  }, [apiWoodClasses, woodClassId]);

  // Referenzierte DB-Tabellen vorladen
  useEffect(() => {
    let alive = true;
    const refs = collectTableRefs(graph);
    if (!refs.length) { setTables({}); return; }
    Promise.all(refs.map(id => api.getDbTableFull(id)
      .then((t: any) => [id, { headers: t.headers || [], rows: t.rows || [], chart_json: t.chart_json ?? null }] as const)
      .catch(() => null)))
      .then(pairs => { if (!alive) return; const m: Record<string, DbTableData> = {}; pairs.forEach(p => { if (p) m[p[0]] = p[1]; }); setTables(m); });
    return () => { alive = false; };
  }, [graph]);

  // Default-Eingaben setzen (nur für Felder, die noch nicht belegt sind)
  useEffect(() => {
    if (readOnly) return; // Im Print-Modus: initialInputs sind bereits gesetzt, keine Defaults nötig
    setInputs(prev => {
      const next = { ...prev };
      for (const n of graph.nodes) {
        if (next[n.id] != null) continue;
        const d: any = n.data;
        if (n.type === 'variable') {
          if (d.inputKind === 'dropdown') next[n.id] = String(d.options?.[0]?.value ?? d.default_value ?? '');
          else if (d.inputKind === 'table_column') {
            const t = d.table_ref ? tables[d.table_ref] : null;
            next[n.id] = t ? String(t.rows?.[0]?.[d.table_col] ?? d.default_value ?? '') : String(d.default_value ?? '');
          } else next[n.id] = d.hasDefault === false ? '' : String(d.default_value ?? '');
        } else if (n.type === 'dropdown') {
          if (d.mode === 'custom') next[n.id] = String(d.options?.[0]?.label ?? '');
          else { const t = d.table_ref ? tables[d.table_ref] : null; next[n.id] = t ? String(t.rows?.[0]?.[d.label_col ?? 0] ?? '') : ''; }
        } else if (n.type === 'stdcalc') {
          const srcEdge = graph.edges.find(e => e.target === n.id);
          const tc = graph.nodes.find(x => x.type === 'tablecalc' && srcEdge && x.id === srcEdge.source)
            || graph.nodes.find(x => x.type === 'tablecalc');
          next[n.id] = (tc?.data as any)?.zones?.[0] ?? '';
        }
      }
      // Store aktualisieren damit addVerificationToPrint den korrekten Snapshot bekommt
      setGraphInputs(verification.id, next);
      return next;
    });
  }, [graph, tables]);

  const setInput = (id: string, val: string) => setInputs(prev => {
    const next = { ...prev, [id]: val };
    if (!readOnly) setGraphInputs(verification.id, next);
    return next;
  });
  const ev = useMemo(() => evalGraph(graph, inputs, tables, materialProps, { woodType, woodClassId }), [graph, inputs, tables, materialProps, woodType, woodClassId]);
  const ordered = useMemo(() => {
    const sorted = topoSort(graph);
    const order = graph.display_order;
    if (!order?.length) return sorted;
    const idToNode = new Map(sorted.map(n => [n.id, n]));
    const result: typeof sorted = [];
    for (const id of order) { const n = idToNode.get(id); if (n) result.push(n); }
    const inOrder = new Set(order);
    for (const n of sorted) { if (!inOrder.has(n.id)) result.push(n); }
    return result;
  }, [graph]);
  // Welche Bedingung führt via Condition-Kante zu welchem Node?
  const conditionAfterNode = useMemo(() => {
    const map = new Map<string, string>(); // targetNodeId → conditionNodeId
    for (const e of graph.edges) {
      if ((e.data?.kind ?? 'workflow') === 'condition') map.set(e.target, e.source);
    }
    return map;
  }, [graph]);

  // Welche Knoten sind über aktive Bedingungszweige erreichbar?
  const activeNodeIds = useMemo(() => {
    const active = new Set<string>();
    const visit = (nodeId: string) => {
      if (active.has(nodeId)) return;
      active.add(nodeId);
      for (const e of graph.edges) {
        if (e.source !== nodeId) continue;
        const kind = e.data?.kind ?? 'workflow';
        if (kind === 'workflow') {
          visit(e.target);
        } else if (kind === 'condition') {
          const condResult = ev.results[nodeId];
          const condId = e.data?.conditionId || e.sourceHandle;
          if (!condId || condResult?.activeConditionId === condId) {
            visit(e.target);
          }
        }
      }
    };
    const hasIncoming = new Set(graph.edges.map(e => e.target));
    for (const n of graph.nodes) {
      if (!hasIncoming.has(n.id)) visit(n.id);
    }
    return active;
  }, [graph, ev.results]);

  // Tabellen-Spalten-Optionen (für variable inputKind=table_column)
  const colOptions = (tableId?: string, col?: number) => {
    const t = tableId ? tables[tableId] : null;
    if (!t) return [] as string[];
    const seen = new Set<string>();
    const out: string[] = [];
    t.rows.forEach(r => { const c = String(r[col ?? 0] ?? ''); if (c && !seen.has(c)) { seen.add(c); out.push(c); } });
    return out;
  };
  const rowLabels = (tableId?: string, col?: number) => {
    const t = tableId ? tables[tableId] : null;
    if (!t) return [] as string[];
    return t.rows.map(r => String(r[col ?? 0] ?? ''));
  };

  const num = (x?: number) => {
    if (x == null || isNaN(x)) return '—';
    if (Math.abs(x) >= 1e5 || (Math.abs(x) < 1e-3 && x !== 0)) return x.toExponential(2);
    return String(Math.round(x * Math.pow(10, decimals)) / Math.pow(10, decimals));
  };
  const isFiniteNumber = (x?: number) => typeof x === 'number' && isFinite(x);
  const displayName = (name?: string) => {
    const trimmed = String(name || '').trim();
    if (!trimmed) return 'Ergebnis';
    return /_\{/.test(trimmed) ? trimmed : nameToLatex(trimmed);
  };
  const unitLatex = (unit?: string) => {
    const trimmed = String(unit || '').trim();
    if (!trimmed) return '';
    if (trimmed.includes('\\') || trimmed.includes('{')) return trimmed;
    const part = (value: string) => {
      const match = value.trim().match(/^([A-Za-z]+)(\^.+)?$/);
      if (!match) return value.trim();
      return `\\mathrm{${match[1]}}${match[2] || ''}`;
    };
    const pieces = trimmed.split('/');
    if (pieces.length === 2) return `${part(pieces[0])}/${part(pieces[1])}`;
    return part(trimmed);
  };
  const resultLatex = (value?: number, unit?: string) => {
    if (!isFiniteNumber(value)) return '';
    const unitPart = unit ? `\\;${unitLatex(unit)}` : '';
    return `\\underline{\\underline{${num(value)}${unitPart}}}`;
  };

  // Ergebnis = letzter calc/stdcalc in Reihenfolge
  const resultNode = [...ordered].reverse().find(n => (n.type === 'calc' || n.type === 'stdcalc' || n.type === 'minmax') && !ev.results[n.id]?.skipped);
  const resultVal = resultNode ? ev.results[resultNode.id]?.value : undefined;
  const resultName = resultNode ? String((resultNode.data as any).name || '') : '';
  const isEta = /^\\?eta(?:_|$)/.test(resultName.trim()) || resultName.trim() === '\\eta';

  const renderCondition = (condId: string) => {
    const cn = graph.nodes.find(n => n.id === condId);
    if (!cn) return null;
    const d: any = cn.data;
    const r = ev.results[condId] || {};

    // Wenn der Block skipped/unausgewertet: selbst auswerten mit bekannten Werten
    let activeCondId = r.activeConditionId as string | undefined;
    if (!activeCondId) {
      const localSymbols: Record<string, number | string> = {};
      for (const n of graph.nodes) {
        const nd: any = n.data;
        const val = ev.results[n.id]?.value;
        if (nd.name && val != null && isFinite(val as number)) localSymbols[nd.name] = val as number;
        if (n.type === 'dropdown' && nd.name && inputs[n.id] != null) localSymbols[nd.name] = inputs[n.id];
      }
      for (const c of (d.conditions || [])) {
        const expr = latexCondToJs(c.latex || '') || c.expr || '';
        if (expr && evalCondExpr(expr, localSymbols)) { activeCondId = c.id; break; }
      }
    }

    return (
      <div key={`cond_after_${condId}`} style={{ ...card, background: '#fefce8', borderColor: '#fde68a' }}>
        <div style={lbl}>🔶 {d.label || 'Bedingung'}</div>
        {(d.conditions || []).map((c: any) => (
          <div key={c.id} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0', color: activeCondId === c.id ? '#15803d' : '#9ca3af' }}>
            <span>{activeCondId === c.id ? '✓' : '○'}</span>
            <MathDisplay latex={c.latex || c.expr} />
          </div>
        ))}
      </div>
    );
  };

  // Aufeinanderfolgende Variablen zu Gruppen zusammenfassen (2-Spalten-Raster)
  // Titel-Blöcke bilden einklappbare Abschnitte; Bild-Blöcke erscheinen an ihrer Workflow-Position
  type Sec =
    | { type: 'vars'; nodes: typeof ordered }
    | { type: 'single'; node: (typeof ordered)[0] }
    | { type: 'title'; node: (typeof ordered)[0] };
  const sections: Sec[] = [];
  for (const n of ordered) {
    const r = ev.results[n.id] || {};
    if (n.type === 'frame') continue;
    const isHidden = (graph.hidden_nodes ?? []).includes(n.id);
    if (isHidden || r.skipped || !activeNodeIds.has(n.id) || n.type === 'output' || n.type === 'woodclass' || n.type === 'condition') continue;
    if (n.type === 'title') {
      sections.push({ type: 'title', node: n });
      continue;
    }
    if (n.type === 'variable' || n.type === 'dropdown' || n.type === 'ref') {
      const last = sections[sections.length - 1];
      if (last?.type === 'vars') last.nodes.push(n);
      else sections.push({ type: 'vars', nodes: [n] });
    } else {
      sections.push({ type: 'single', node: n });
    }
  }

  // Berechne welche sections-Einträge durch einen eingeklappten Titel verdeckt sind
  const hiddenBySectionCollapse = useMemo(() => {
    const hidden = new Set<number>();
    let activeCollapsedIdx: number | null = null;
    sections.forEach((sec, i) => {
      if (sec.type === 'title') {
        activeCollapsedIdx = collapsedSections.has(sec.node.id) ? i : null;
      } else if (activeCollapsedIdx !== null) {
        hidden.add(i);
      }
    });
    return hidden;
  }, [sections, collapsedSections]);

  return (
    <div>
      {!readOnly && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Kommastellen:</span>
          {[1, 2, 3, 4].map(d => (
            <button key={d} onClick={() => setDecimals(d)} style={{
              padding: '2px 9px', fontSize: 12, borderRadius: 4, cursor: 'pointer',
              border: `1px solid ${decimals === d ? '#2563eb' : '#d1d5db'}`,
              background: decimals === d ? '#eff6ff' : '#fff',
              color: decimals === d ? '#1d4ed8' : '#374151',
              fontWeight: decimals === d ? 700 : 400,
            }}>{d}</button>
          ))}
        </div>
      )}
      {sections.map((sec, si) => {
        if (hiddenBySectionCollapse.has(si)) return null;
        if (sec.type === 'title') {
          const d: any = sec.node.data;
          const color: string = d.color || '#2563eb';
          const isCollapsed = collapsedSections.has(sec.node.id);
          return (
            <div key={sec.node.id} onClick={() => toggleSection(sec.node.id)}
              style={{ ...card, background: `${color}12`, borderColor: color, borderWidth: 2, cursor: 'pointer', marginTop: 10, marginBottom: 4, userSelect: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 3, height: 16, background: color, borderRadius: 2, flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: '#1f2937', flex: 1 }}>{d.label || 'Abschnitt'}</span>
                <span style={{ fontSize: 11, color, fontWeight: 700 }}>{isCollapsed ? '▶' : '▼'}</span>
              </div>
            </div>
          );
        }
        if (sec.type === 'vars') {
          return (
            <div key={`vars_${si}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
              {sec.nodes.map(n => {
                const d: any = n.data;

                // Dropdown-Block (type='dropdown') → halb-breit in der Grid
                if (n.type === 'dropdown') {
                  const opts = d.mode === 'custom' ? (d.options || []).map((o: any) => o.label) : rowLabels(d.table_ref, d.label_col ?? 0);
                  const dropVal = ev.results[n.id]?.value;
                  const hasValue = d.mode === 'custom' && d.name && dropVal != null && isFiniteNumber(dropVal);
                  return (
                    <div key={n.id} style={{ ...card, marginBottom: 0 }}>
                      <div style={lbl}>{d.label || 'Auswahl'}</div>
                      <select style={sel} disabled={readOnly} value={inputs[n.id] ?? ''} onChange={e => setInput(n.id, e.target.value)}>
                        {opts.map((o: string, i: number) => <option key={i} value={o}>{o}</option>)}
                      </select>
                      {hasValue && (
                        <div style={{ marginTop: 4, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 8px', overflowX: 'auto' }}>
                          <MathDisplay latex={`${displayName(d.name)} = ${num(dropVal)}${d.unit ? `\\;${unitLatex(d.unit)}` : ''}`} />
                        </div>
                      )}
                    </div>
                  );
                }

                // Referenz-Block → zeigt den Wert des referenzierten Blocks (read-only, halb-breit)
                if (n.type === 'ref') {
                  // Gezogene Kante hat Vorrang über gespeicherte source_id (analog evalGraph)
                  const wiredSrcId = graph.edges.find(e => e.target === n.id && (e.data?.kind ?? 'workflow') === 'workflow')?.source;
                  const effectiveSrcId = wiredSrcId || (d as any).source_id;
                  const srcNode = graph.nodes.find(nn => nn.id === effectiveSrcId);
                  const srcD: any = srcNode?.data;
                  const refVal = ev.results[effectiveSrcId]?.value;
                  return (
                    <div key={n.id} style={{ ...card, marginBottom: 0, background: '#f0f9ff', borderColor: '#bae6fd' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                        {srcD?.name && <MathDisplay latex={nameToLatex(srcD.name)} />}
                        {srcD?.label && <span style={{ color: '#6b7280', fontSize: 11 }}>{srcD.label}</span>}
                        {srcD?.unit && <span style={{ color: '#9ca3af', fontSize: 11 }}><MathDisplay latex={`[${unitLatex(srcD.unit)}]`} /></span>}
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: isFiniteNumber(refVal) ? '#0369a1' : '#9ca3af', textAlign: 'right' }}>
                        {num(refVal)}
                      </div>
                    </div>
                  );
                }

                // Variable-Block → volle Breite bei Kommentar, Dropdown-Input, Tabellenspalte oder Link
                const fullWidth = (d.inputKind === 'number_comment' && d.comment) || d.inputKind === 'dropdown' || d.inputKind === 'table_column' || d.inputKind === 'number_link';
                return (
                  <div key={n.id} style={{ ...card, marginBottom: 0, ...(fullWidth ? { gridColumn: '1 / -1' } : {}) }}>
                    {d.inputKind === 'number_comment' && d.comment && (
                      <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: 4, padding: '5px 8px', marginBottom: 6, fontSize: 11, color: '#713f12', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {d.comment}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                      <MathDisplay latex={d.name ? nameToLatex(d.name) : '?'} />
                      {d.label && <span style={{ color: '#6b7280', fontSize: 11 }}>{d.label}</span>}
                      {d.unit && <span style={{ color: '#9ca3af', fontSize: 11 }}><MathDisplay latex={`[${unitLatex(d.unit)}]`} /></span>}
                      {d.inputKind === 'number_image' && d.image && (
                        <button onClick={() => setImageModal({ src: d.image, source: d.imageSource })} title="Bild anzeigen"
                          style={{ background: '#dbeafe', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', color: '#1d4ed8', fontWeight: 700, fontSize: 12, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          i
                        </button>
                      )}
                      {d.inputKind === 'number_link' && d.url && (
                        <a href={d.url} target="_blank" rel="noopener noreferrer" title={d.url}
                          style={{ background: '#e0f2fe', border: '1px solid #7dd3fc', borderRadius: 4, padding: '2px 7px', cursor: 'pointer', color: '#0369a1', fontSize: 11, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                          🔗 Link
                        </a>
                      )}
                    </div>
                    {d.inputKind === 'dropdown' ? (
                      <select style={sel} disabled={readOnly} value={inputs[n.id] ?? ''} onChange={e => setInput(n.id, e.target.value)}>
                        {(d.options || []).map((o: any, i: number) => <option key={i} value={String(o.value)}>{o.label}</option>)}
                      </select>
                    ) : d.inputKind === 'table_column' ? (
                      <select style={sel} disabled={readOnly} value={inputs[n.id] ?? ''} onChange={e => setInput(n.id, e.target.value)}>
                        {colOptions(d.table_ref, d.table_col).map((c, i) => <option key={i} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <input type="number" disabled={readOnly} style={{ ...sel, textAlign: 'right', fontFamily: 'monospace' }} value={inputs[n.id] ?? ''} onChange={e => setInput(n.id, e.target.value)} />
                    )}
                  </div>
                );
              })}
            </div>
          );
        }

        const n = sec.node;
        const d: any = n.data;
        const r = ev.results[n.id] || {};

        if (n.type === 'image') {
          return (
            <div key={n.id} style={{ ...card, padding: 0, overflow: 'hidden' }}>
              {d.title && (
                <div style={{ padding: '7px 12px 4px', fontWeight: 600, fontSize: 12, color: '#374151', borderBottom: d.image ? '1px solid #f0f0f0' : undefined }}>
                  {d.title}
                </div>
              )}
              {d.image && (
                <div style={{ position: 'relative' }}>
                  <img src={d.image} style={{ width: '100%', maxHeight: 320, objectFit: 'contain', display: 'block', cursor: 'pointer' }}
                    onClick={() => setImageModal({ src: d.image, label: d.label, source: d.source })} />
                  <button onClick={() => setImageModal({ src: d.image, label: d.label, source: d.source })}
                    title="Bild vergrössern"
                    style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    🔍
                  </button>
                </div>
              )}
              {(d.label || d.source) && (
                <div style={{ padding: '5px 12px 7px', borderTop: d.image ? '1px solid #f0f0f0' : undefined }}>
                  {d.label && <div style={{ fontSize: 11, color: '#374151' }}>{d.label}</div>}
                  {d.source && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>Quelle: {d.source}</div>}
                </div>
              )}
            </div>
          );
        }

        if (n.type === 'dropdown') {
          const opts = d.mode === 'custom' ? (d.options || []).map((o: any) => o.label) : rowLabels(d.table_ref, d.label_col ?? 0);
          const dropVal = ev.results[n.id]?.value;
          const hasValue = d.mode === 'custom' && d.name && dropVal != null && isFiniteNumber(dropVal);
          return (
            <div key={n.id} style={card}>
              <div style={lbl}>🟧 {d.label || 'Auswahl'}</div>
              <select style={sel} disabled={readOnly} value={inputs[n.id] ?? ''} onChange={e => setInput(n.id, e.target.value)}>
                {opts.map((o: string, i: number) => <option key={i} value={o}>{o}</option>)}
              </select>
              {hasValue && (
                <div style={{ marginTop: 5, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 8px', overflowX: 'auto' }}>
                  <MathDisplay latex={`${displayName(d.name)} = ${num(dropVal)}${d.unit ? `\\;${unitLatex(d.unit)}` : ''}`} />
                </div>
              )}
            </div>
          );
        }

        if (n.type === 'tablevalue') {
          return (
            <div key={n.id} style={{ ...card, background: '#f0fdf4', borderColor: '#bbf7d0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MathDisplay latex={d.name ? nameToLatex(d.name) : '?'} />
                <span style={{ color: '#6b7280', fontSize: 12 }}>=</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{num(r.value)}</span>
                {d.unit && <span style={{ color: '#9ca3af', fontSize: 12 }}>{d.unit}</span>}
              </div>
            </div>
          );
        }

        if (n.type === 'chartlookup') {
          const dir: 'x_to_y' | 'y_to_x' = (d as any).direction ?? 'x_to_y';
          const allVals: number[] | undefined = (r as any).allSeriesValues;
          const seriesNames = tables[(d as any).chart_ref]?.chart_json?.series?.map((s: any) => s.name) ?? [];
          const chartJson = tables[(d as any).chart_ref]?.chart_json;
          const currentX: number = (r as any).inputValue ?? NaN;
          return (
            <div key={n.id} style={{ ...card, background: '#ecfdf5', borderColor: '#a7f3d0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  {d.label && <div style={{ color: '#6b7280', fontSize: 11, marginBottom: 4 }}>{d.label}</div>}
                  {allVals ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                      {allVals.map((v, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <MathDisplay latex={nameToLatex(seriesNames[i] ?? `${d.name}_${i + 1}`)} />
                          <span style={{ color: '#6b7280', fontSize: 12 }}>=</span>
                          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: isNaN(v) ? '#9ca3af' : 'inherit' }}>{num(v)}</span>
                          {d.unit && !isNaN(v) && <span style={{ color: '#9ca3af', fontSize: 12 }}>{d.unit}</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <MathDisplay latex={d.name ? nameToLatex(d.name) : '?'} />
                      <span style={{ color: '#6b7280', fontSize: 12 }}>=</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{num(r.value)}</span>
                      {d.unit && <span style={{ color: '#9ca3af', fontSize: 12 }}>{d.unit}</span>}
                    </div>
                  )}
                </div>
                {chartJson && !readOnly && (
                  <button onClick={() => setChartModal(n.id)}
                    title="Diagramm anzeigen"
                    style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 13, color: '#047857', flexShrink: 0 }}>
                    📉
                  </button>
                )}
              </div>
            </div>
          );
        }

        if (n.type === 'calc' || n.type === 'stdcalc') {
          const parentCondId = conditionAfterNode.get(n.id);
          return (
            <React.Fragment key={n.id}>
              <div style={{ ...card, background: '#fafafa' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <MathDisplay latex={d.name ? nameToLatex(d.name) : '?'} />
                  <span style={{ color: '#6b7280', fontSize: 12 }}>{d.label}</span>
                </div>
                {n.type === 'stdcalc' && (() => {
                  const srcEdge = graph.edges.find(e => e.target === n.id);
                  const tc = graph.nodes.find(x => x.type === 'tablecalc' && srcEdge && x.id === srcEdge.source) || graph.nodes.find(x => x.type === 'tablecalc');
                  const zones = (tc?.data as any)?.zones || [];
                  return (
                    <div style={{ marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: '#92400e' }}>Auswahl {d.picker_name}: </span>
                      <select style={{ ...sel, width: 'auto', display: 'inline-block' }} disabled={readOnly} value={inputs[n.id] ?? ''} onChange={e => setInput(n.id, e.target.value)}>
                        {zones.map((z: string, i: number) => <option key={i} value={z}>{z}</option>)}
                      </select>
                    </div>
                  );
                })()}
                {d.latex && (() => {
                  // Formel beginnt mit "=" → linke Seite (Name) voranstellen
                  const tpl = d.latex.trimStart().startsWith('=') && d.name
                    ? `${nameToLatex(d.name)} ${d.latex.trimStart()}`
                    : d.latex;
                  return (
                    <div className="formula-block" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 4, padding: '5px 8px', marginBottom: 4, overflowX: 'auto' }}>
                      <MathDisplay latex={tpl} display />
                    </div>
                  );
                })()}
                {r.substitutedLatex && (
                  <div className="formula-block" style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 4, padding: '5px 8px', marginBottom: 4, overflowX: 'auto' }}>
                    {(() => {
                      const sub = r.substitutedLatex.trimStart().startsWith('=') && d.name
                        ? `${nameToLatex(d.name)} ${r.substitutedLatex.trimStart()}`
                        : r.substitutedLatex;
                      return <MathDisplay latex={isFiniteNumber(r.value) ? `${sub} = ${resultLatex(r.value, d.unit)}` : sub} display />;
                    })()}
                  </div>
                )}
                {(r.missingSymbols || []).length > 0 && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 4, padding: '5px 8px', marginBottom: 4, fontSize: 12 }}>
                    Fehlende: {(r.missingSymbols || []).map((name: string, i: number) => (
                      <React.Fragment key={name}>{i > 0 && ', '}<MathDisplay latex={displayName(name)} /></React.Fragment>
                    ))}
                  </div>
                )}
              </div>
              {parentCondId && renderCondition(parentCondId)}
            </React.Fragment>
          );
        }

        if (n.type === 'minmax') {
          const parentCondId = conditionAfterNode.get(n.id);
          const caseVals: number[] = (r as any).caseValues || [];
          const activeIdx: number = (r as any).activeCaseIndex ?? -1;
          const modeMatch = (d.latex || '').match(/\\(min|max)\b/);
          const modeStr = modeMatch ? `\\${modeMatch[1]}` : '\\min';
          const caseMatch = (d.latex || '').match(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/);
          const rawCases: string[] = caseMatch ? caseMatch[1].split(/\\\\/).map((c: string) => c.trim()).filter(Boolean) : [];
          const nameLatex = d.name ? nameToLatex(d.name) : '?';
          const subLatex: string = (r as any).substitutedLatex || '';
          return (
            <React.Fragment key={n.id}>
              <div style={{ ...card, background: '#fafafa' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <MathDisplay latex={nameLatex} />
                  {d.label && <span style={{ color: '#6b7280', fontSize: 12 }}>{d.label}</span>}
                </div>
                {rawCases.length > 0 && (
                  <div className="formula-block" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 4, padding: '5px 8px', marginBottom: 4, overflowX: 'auto' }}>
                    <MathDisplay latex={`${nameLatex} = ${modeStr} \\begin{cases} ${rawCases.join(' \\\\ ')} \\end{cases}`} display />
                  </div>
                )}
                {subLatex && (
                  <div className="formula-block" style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 4, padding: '5px 8px', marginBottom: 4, overflowX: 'auto' }}>
                    <MathDisplay latex={isFiniteNumber(r.value) ? `${subLatex} = ${resultLatex(r.value, d.unit)}` : subLatex} display />
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {rawCases.map((caseLatex: string, i: number) => {
                    const isActive = i === activeIdx;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 7px', borderRadius: 4, background: isActive ? '#f3f4f6' : '#f9fafb', border: `1px solid ${isActive ? '#9ca3af' : '#e5e7eb'}` }}>
                        <span style={{ fontSize: 11, color: isActive ? '#374151' : '#d1d5db', flexShrink: 0 }}>{isActive ? '✓' : '○'}</span>
                        <div style={{ flex: 1, overflowX: 'auto' }}>
                          <MathDisplay latex={((r as any).substitutedCases || [])[i] || caseLatex} />
                        </div>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: isActive ? 700 : 400, color: isActive ? '#111827' : '#6b7280', flexShrink: 0 }}>
                          {isFinite(caseVals[i]) ? num(caseVals[i]) : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {parentCondId && renderCondition(parentCondId)}
            </React.Fragment>
          );
        }

        if (n.type === 'cases') {
          const caseVals: number[] = (r as any).caseValues || [];
          const activeIdx: number = (r as any).activeCaseIndex ?? -1;
          const caseDefs: Array<{ formula_latex: string; cond_expr: string }> = d.cases || [];
          const subLatex: string = r.substitutedLatex || '';
          const nameLatex = d.name ? nameToLatex(d.name) : '?';
          const parentCondId = conditionAfterNode.get(n.id);
          const activeTemplate = activeIdx >= 0 ? (caseDefs[activeIdx]?.formula_latex || '') : '';
          return (
            <React.Fragment key={n.id}>
              <div style={{ ...card, background: '#fafafa' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <MathDisplay latex={nameLatex} />
                  {d.label && <span style={{ color: '#6b7280', fontSize: 12 }}>{d.label}</span>}
                  {d.unit && <span style={{ color: '#9ca3af', fontSize: 11 }}><MathDisplay latex={`[${unitLatex(d.unit)}]`} /></span>}
                </div>
                {/* Template-Formel des aktiven Falls (weiss, wie bei calc-Blöcken) */}
                {activeTemplate && (
                  <div className="formula-block" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 4, padding: '5px 8px', marginBottom: 4, overflowX: 'auto' }}>
                    <MathDisplay latex={activeTemplate} display />
                  </div>
                )}
                {/* Eingesetzte Werte (gelb) */}
                {subLatex && (
                  <div className="formula-block" style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 4, padding: '5px 8px', marginBottom: 4, overflowX: 'auto' }}>
                    <MathDisplay latex={isFiniteNumber(r.value) ? `${subLatex} = ${resultLatex(r.value, d.unit)}` : subLatex} display />
                  </div>
                )}
                {/* Alle Fälle */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {caseDefs.map((c: any, i: number) => {
                    const isActive = i === activeIdx;
                    const isSelectMode = d.mode === 'select';
                    const condLabel = isSelectMode
                      ? ((c.match_value || '').trim() || 'sonst')
                      : (() => { const _ce = (c.cond_expr || '').trim(); return (!_ce || /^\(leer\s*[=:]\s*else\)$/i.test(_ce) || /^else$/i.test(_ce) || /^sonst$/i.test(_ce)) ? 'sonst' : _ce; })();
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 4, background: isActive ? '#f5f3ff' : '#f9fafb', border: `1px solid ${isActive ? '#c4b5fd' : '#e5e7eb'}` }}>
                        <span style={{ fontSize: 13, color: isActive ? '#7c3aed' : '#d1d5db', flexShrink: 0, lineHeight: 1 }}>{isActive ? '✓' : '○'}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ overflowX: 'auto' }}><MathDisplay latex={c.formula_latex} /></div>
                          <div style={{ fontSize: 9.5, color: '#9ca3af', marginTop: 1, fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {condLabel}
                          </div>
                        </div>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: isActive ? 700 : 400, color: isActive ? '#6d28d9' : '#9ca3af', flexShrink: 0 }}>
                          {isFinite(caseVals[i]) ? num(caseVals[i]) : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {parentCondId && renderCondition(parentCondId)}
            </React.Fragment>
          );
        }

        if (n.type === 'tablecalc') {
          const tableRes = r.table || {};
          return (
            <div key={n.id} style={{ ...card, background: '#eff6ff', borderColor: '#bfdbfe' }}>
              <div style={lbl}>🟦 {d.label || d.name} [{d.unit}]</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead><tr>{Object.keys(tableRes).map(z => <th key={z} style={{ border: '1px solid #cbd5e1', padding: '3px 8px', background: '#dbeafe' }}>{z}</th>)}</tr></thead>
                  <tbody><tr>{Object.values(tableRes).map((val, i) => <td key={i} style={{ border: '1px solid #e2e8f0', padding: '3px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{num(val as number)}</td>)}</tr></tbody>
                </table>
              </div>
            </div>
          );
        }

        if (n.type === 'check') {
          const passed = r.passed;
          const unknown = passed === undefined;
          const bg = unknown ? '#f9fafb' : passed ? '#d1fae5' : '#fee2e2';
          const borderColor = unknown ? '#d1d5db' : passed ? '#6ee7b7' : '#fca5a5';
          const textColor = unknown ? '#6b7280' : passed ? '#065f46' : '#991b1b';
          return (
            <div key={n.id} style={{ ...card, background: bg, borderColor, borderWidth: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>{unknown ? '⬜' : passed ? '✅' : '❌'}</span>
                <div style={{ flex: 1 }}>
                  {d.label && <div style={{ fontWeight: 700, fontSize: 13, color: textColor, marginBottom: 4 }}>{d.label}</div>}
                  {d.latex && (
                    <div style={{ background: '#fff', border: `1px solid ${borderColor}`, borderRadius: 5, padding: '5px 8px', overflowX: 'auto', marginBottom: 4 }}>
                      <MathDisplay latex={d.latex} display />
                    </div>
                  )}
                  {r.substitutedLatex && r.substitutedLatex !== d.latex && (
                    <div style={{ background: unknown ? '#f1f5f9' : passed ? '#ecfdf5' : '#fef2f2', border: `1px solid ${borderColor}`, borderRadius: 5, padding: '5px 8px', overflowX: 'auto', marginBottom: 4 }}>
                      <MathDisplay latex={d.unit ? `${r.substitutedLatex} \\; [${unitLatex(d.unit)}]` : r.substitutedLatex} display />
                    </div>
                  )}
                  <div style={{ fontWeight: 700, fontSize: 13, color: textColor }}>
                    {unknown ? 'Berechnung läuft…' : passed ? 'Nachweis erfüllt' : 'Nachweis nicht erfüllt'}
                  </div>
                </div>
              </div>
            </div>
          );
        }
        return null;
      })}

      {/* Bild-Modal (Info-Button) */}
      {imageModal && (
        <div onClick={() => setImageModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
            <button onClick={() => setImageModal(null)} style={{ position: 'absolute', top: 6, right: 8, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#374151', lineHeight: 1, zIndex: 1 }}>×</button>
            <img src={imageModal.src} style={{ maxWidth: '85vw', maxHeight: '80vh', objectFit: 'contain', display: 'block' }} />
            {(imageModal.label || imageModal.source) && (
              <div style={{ padding: '8px 14px', borderTop: '1px solid #e5e7eb', background: '#f8fafc' }}>
                {imageModal.label && <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 2 }}>{imageModal.label}</div>}
                {imageModal.source && <div style={{ fontSize: 11, color: '#6b7280' }}>Quelle: {imageModal.source}</div>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ergebnis-Box */}
      {resultNode && isEta && (
        <div style={{
          padding: 12, borderRadius: 8, marginTop: 4,
          background: resultVal != null && resultVal <= 1 ? '#d1fae5' : '#fee2e2',
          border: `1px solid ${resultVal != null && resultVal <= 1 ? '#6ee7b7' : '#fca5a5'}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 24 }}>{resultVal != null && resultVal <= 1 ? '✅' : '❌'}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: resultVal != null && resultVal <= 1 ? '#065f46' : '#991b1b' }}>
              {`η = ${num(resultVal)} ${resultVal != null && resultVal <= 1 ? '≤ 1.0 → erfüllt' : '> 1.0 → nicht erfüllt'}`}
            </div>
            {resultVal != null && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Ausnutzung: {(resultVal * 100).toFixed(1)}%</div>}
          </div>
        </div>
      )}

      {/* Diagramm-Modal */}
      {chartModal && (() => {
        const node = graph.nodes.find(n => n.id === chartModal);
        if (!node) return null;
        const nd = node.data as any;
        const cj = tables[nd.chart_ref]?.chart_json;
        if (!cj) return null;
        const inputVal: number = (ev.results[chartModal] as any)?.inputValue ?? NaN;
        return (
          <ChartLookupModal
            chartJson={cj}
            xAxisLabel={cj.xAxis?.label ?? 'x'}
            yAxisLabel={cj.yAxis?.label ?? 'y'}
            xUnit={cj.xAxis?.unit ?? ''}
            currentX={inputVal}
            direction={nd.direction ?? 'x_to_y'}
            onClose={() => setChartModal(null)}
          />
        );
      })()}
    </div>
  );
}
