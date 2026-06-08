import React, { useEffect, useMemo, useState } from 'react';
import { Verification } from '../types';
import MathDisplay from './MathDisplay';
import { nameToLatex } from '../utils/formatName';
import { getGraph } from '../utils/legacyToGraph';
import { evalGraph, topoSort, collectTableRefs, DbTableData } from '../utils/evalGraph';
import { formatNumber } from '../utils/substituteFormula';
import { api } from '../api';
import { useStore } from '../store/useStore';

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

const lbl: React.CSSProperties = { fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 };
const card: React.CSSProperties = { border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 12, background: '#fff' };
const sel: React.CSSProperties = { border: '1px solid #d1d5db', borderRadius: 6, padding: '5px 8px', fontSize: 13, width: '100%', background: '#fff' };

export default function GraphVerificationView({ verification, readOnly = false, initialInputs }: { verification: Verification; readOnly?: boolean; initialInputs?: Record<string, string> }) {
  const woodType = useStore(s => s.woodType);
  const woodClassId = useStore(s => s.woodClassId);
  const apiWoodClasses = useStore(s => s.apiWoodClasses);
  const setGraphInputs = useStore(s => s.setGraphInputs);
  const graph = useMemo(() => getGraph(toLegacyShape(verification)), [verification.id, verification.graph_json]);
  const [tables, setTables] = useState<Record<string, DbTableData>>({});
  // Im Print-Modus: initialInputs als Startzustand; sonst leer (Defaults kommen via useEffect)
  const [inputs, setInputs] = useState<Record<string, string>>(initialInputs || {});
  const [imageModal, setImageModal] = useState<{ src: string; label?: string; source?: string } | null>(null);
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
      .then((t: any) => [id, { headers: t.headers || [], rows: t.rows || [] }] as const)
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
  const ordered = useMemo(() => topoSort(graph), [graph]);
  // Welche Bedingung führt via Condition-Kante zu welchem Node?
  const conditionAfterNode = useMemo(() => {
    const map = new Map<string, string>(); // targetNodeId → conditionNodeId
    for (const e of graph.edges) {
      if ((e.data?.kind ?? 'workflow') === 'condition') map.set(e.target, e.source);
    }
    return map;
  }, [graph]);

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

  const num = (x?: number) => (x == null || isNaN(x)) ? '—' : formatNumber(x);
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
    return (
      <div key={`cond_after_${condId}`} style={{ ...card, background: '#fefce8', borderColor: '#fde68a' }}>
        <div style={lbl}>🔶 {d.label || 'Bedingung'}</div>
        {(d.conditions || []).map((c: any) => (
          <div key={c.id} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0', color: r.activeConditionId === c.id ? '#15803d' : '#9ca3af' }}>
            <span>{r.activeConditionId === c.id ? '✓' : '○'}</span>
            <MathDisplay latex={c.latex || c.expr} />
          </div>
        ))}
      </div>
    );
  };

  const imageBlocks = ordered.filter(n => n.type === 'image' && (n.data as any).image);

  return (
    <div>
      {imageBlocks.map(n => {
        const d: any = n.data;
        return (
          <div key={n.id} style={{ ...card, padding: 0, overflow: 'hidden', cursor: 'pointer' }} onClick={() => setImageModal({ src: d.image, label: d.label, source: d.source })}>
            <img src={d.image} style={{ width: '100%', maxHeight: 320, objectFit: 'contain', display: 'block' }} />
            {(d.label || d.source) && (
              <div style={{ padding: '6px 12px', borderTop: '1px solid #f0f0f0' }}>
                {d.label && <div style={{ fontSize: 11, color: '#374151' }}>{d.label}</div>}
                {d.source && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>Quelle: {d.source}</div>}
              </div>
            )}
          </div>
        );
      })}
      {ordered.map(n => {
        const d: any = n.data;
        const r = ev.results[n.id] || {};
        if (r.skipped) return null;
        if (n.type === 'output' || n.type === 'woodclass' || n.type === 'image') return null;
        // Bedingungsblöcke werden inline nach ihrem Ziel-Block gerendert
        if (n.type === 'condition') return null;

        if (n.type === 'variable') {
          return (
            <div key={n.id} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <MathDisplay latex={d.name ? nameToLatex(d.name) : '?'} />
                <span style={{ color: '#6b7280', fontSize: 12 }}>{d.label}</span>
                {d.unit && <span style={{ color: '#9ca3af', fontSize: 12 }}>[{d.unit}]</span>}
                {d.inputKind === 'number_image' && d.image && (
                  <button onClick={() => setImageModal({ src: d.image, source: d.imageSource })} title="Bild anzeigen"
                    style={{ background: '#dbeafe', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', color: '#1d4ed8', fontWeight: 700, fontSize: 13, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    i
                  </button>
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
              {d.description && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{d.description}</div>}
            </div>
          );
        }

        if (n.type === 'dropdown') {
          const opts = d.mode === 'custom' ? (d.options || []).map((o: any) => o.label) : rowLabels(d.table_ref, d.label_col ?? 0);
          return (
            <div key={n.id} style={card}>
              <div style={lbl}>🟧 {d.label || 'Auswahl'}</div>
              <select style={sel} disabled={readOnly} value={inputs[n.id] ?? ''} onChange={e => setInput(n.id, e.target.value)}>
                {opts.map((o: string, i: number) => <option key={i} value={o}>{o}</option>)}
              </select>
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

        if (n.type === 'calc' || n.type === 'stdcalc') {
          const parentCondId = conditionAfterNode.get(n.id);
          return (
            <React.Fragment key={n.id}>
              <div style={{ ...card, background: '#fafafa' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <MathDisplay latex={d.name ? nameToLatex(d.name) : '?'} />
                  <span style={{ color: '#6b7280', fontSize: 12 }}>{d.label}</span>
                </div>
                {n.type === 'stdcalc' && (() => {
                  const srcEdge = graph.edges.find(e => e.target === n.id);
                  const tc = graph.nodes.find(x => x.type === 'tablecalc' && srcEdge && x.id === srcEdge.source) || graph.nodes.find(x => x.type === 'tablecalc');
                  const zones = (tc?.data as any)?.zones || [];
                  return (
                    <div style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: '#92400e' }}>Auswahl {d.picker_name}: </span>
                      <select style={{ ...sel, width: 'auto', display: 'inline-block' }} disabled={readOnly} value={inputs[n.id] ?? ''} onChange={e => setInput(n.id, e.target.value)}>
                        {zones.map((z: string, i: number) => <option key={i} value={z}>{z}</option>)}
                      </select>
                    </div>
                  );
                })()}
                {d.latex && <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 4, padding: '6px 10px', marginBottom: 4, overflowX: 'auto' }}><MathDisplay latex={d.latex} display /></div>}
                {r.substitutedLatex && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 4, padding: '6px 10px', marginBottom: 4, overflowX: 'auto' }}>
                    <MathDisplay latex={isFiniteNumber(r.value) ? `${r.substitutedLatex} = ${resultLatex(r.value, d.unit)}` : r.substitutedLatex} display />
                  </div>
                )}
                {(r.missingSymbols || []).length > 0 && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 4, padding: '6px 10px', marginBottom: 4, fontSize: 12 }}>
                    Fehlende Variable{(r.missingSymbols || []).length > 1 ? 'n' : ''}:{' '}
                    {(r.missingSymbols || []).map((name: string, i: number) => (
                      <React.Fragment key={name}>
                        {i > 0 && ', '}
                        <MathDisplay latex={displayName(name)} />
                      </React.Fragment>
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
          const rawCases: string[] = caseMatch
            ? caseMatch[1].split(/\\\\/).map((c: string) => c.trim()).filter(Boolean)
            : [];
          const nameLatex = d.name ? nameToLatex(d.name) : '?';
          const casesLatex = rawCases.join(' \\\\ ');
          const subLatex: string = (r as any).substitutedLatex || '';
          return (
            <React.Fragment key={n.id}>
              <div style={{ ...card, background: '#fafafa' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <MathDisplay latex={nameLatex} />
                  {d.label && <span style={{ color: '#6b7280', fontSize: 12 }}>{d.label}</span>}
                </div>
                {/* 1. Symbolische Formel (wie calc) */}
                {casesLatex && (
                  <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 4, padding: '6px 10px', marginBottom: 4, overflowX: 'auto' }}>
                    <MathDisplay latex={`${nameLatex} = ${modeStr} \\begin{cases} ${casesLatex} \\end{cases}`} display />
                  </div>
                )}
                {/* 2. Eingesetzte Formel + Ergebnis in gelber Box (wie calc) */}
                {subLatex && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 4, padding: '6px 10px', marginBottom: 4, overflowX: 'auto' }}>
                    <MathDisplay latex={isFiniteNumber(r.value) ? `${subLatex} = ${resultLatex(r.value, d.unit)}` : subLatex} display />
                  </div>
                )}
                {/* 3. Einzelne Fälle mit aktivem Fall hervorgehoben */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {rawCases.map((caseLatex: string, i: number) => {
                    const isActive = i === activeIdx;
                    const caseLatexSub = ((r as any).substitutedCases || [])[i] || caseLatex;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 4, background: isActive ? '#f3f4f6' : '#f9fafb', border: `1px solid ${isActive ? '#9ca3af' : '#e5e7eb'}` }}>
                        <span style={{ fontSize: 12, color: isActive ? '#374151' : '#d1d5db', flexShrink: 0 }}>{isActive ? '✓' : '○'}</span>
                        <div style={{ flex: 1, overflowX: 'auto' }}>
                          <MathDisplay latex={caseLatexSub} />
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
                <span style={{ fontSize: 22 }}>{unknown ? '⬜' : passed ? '✅' : '❌'}</span>
                <div style={{ flex: 1 }}>
                  {d.label && <div style={{ fontWeight: 700, fontSize: 13, color: textColor, marginBottom: 4 }}>{d.label}</div>}
                  {d.latex && (
                    <div style={{ background: '#fff', border: `1px solid ${borderColor}`, borderRadius: 6, padding: '6px 10px', overflowX: 'auto', marginBottom: 4 }}>
                      <MathDisplay latex={d.latex} display />
                    </div>
                  )}
                  {r.substitutedLatex && r.substitutedLatex !== d.latex && (
                    <div style={{ background: unknown ? '#f1f5f9' : passed ? '#ecfdf5' : '#fef2f2', border: `1px solid ${borderColor}`, borderRadius: 6, padding: '6px 10px', overflowX: 'auto', marginBottom: 4 }}>
                      <MathDisplay latex={d.unit ? `${r.substitutedLatex} \\; [${unitLatex(d.unit)}]` : r.substitutedLatex} display />
                    </div>
                  )}
                  <div style={{ fontWeight: 700, fontSize: 14, color: textColor }}>
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
    </div>
  );
}
