import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from '@xyflow/react';
import MathDisplay from '../../components/MathDisplay';
import { nameToLatex } from '../../utils/formatName';
import { latexToJs, latexCondToJs, latexHasIneq } from '../../utils/latexToJs';
import { useGraphCtx, DbTableFull } from '../../components/admin/graph/graphContext';
import { api } from '../../api';
import { useStore } from '../../store/useStore';
import {
  VariableData, DropdownData, WoodClassData, TableValueData, CalcData,
  StdCalcData, TableCalcData, ChartLookupData, ConditionData, CheckData, MinMaxData, ImageBlockData,
  TitleData, FrameData, RefData, CasesData, MatrixData, CommentData, CommentExtra, OutputData,
  GroupCalcData, GroupCalcVar, GroupCalcOption, GroupCalcOutput,
  LoopBlockData, LoopBlockAggr,
} from '../../types/graph';
import {
  F, LatexArea, NameChips, PRESET_COLORS, Shell, THEME, UnitField, formulaName, formulaPrefix,
  inp, lbl, pasteImageFromClipboard, updateLatexNamePrefix,
} from '../../components/admin/graph/BlockNodeShared';

// ── ⊞ Materialtabelle ────────────────────────────────────────────────────────
export function MatrixNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as MatrixData;
  const { updateNodeData } = useGraphCtx();
  const set = (p: Partial<MatrixData>) => updateNodeData(id, p as any);
  const cols = d.columns || [];
  const rows = d.rows || [];
  const [showPreview, setShowPreview] = useState(false);

  // Migration: altes cells[] hatte LaTeX → in cells_latex verschieben, cells leeren
  useEffect(() => {
    const needsMigration = rows.some(r =>
      !r.cells_latex && r.cells?.some(c => c && (c.includes('\\') || c.includes('^') || c.includes('_')))
    );
    if (!needsMigration) return;
    set({
      rows: rows.map(r => ({
        ...r,
        cells_latex: r.cells_latex ?? r.cells.map(c =>
          (c && (c.includes('\\') || c.includes('^') || c.includes('_'))) ? c : ''
        ),
        cells: r.cells.map(c =>
          (c && (c.includes('\\') || c.includes('^') || c.includes('_'))) ? '' : c
        ),
      })),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addCol = () => set({ columns: [...cols, { id: 'c' + Date.now(), name: '', header: '', unit: '' }] });
  const removeCol = (ci: number) => set({
    columns: cols.filter((_, i) => i !== ci),
    rows: rows.map(r => ({
      ...r,
      cells: (r.cells || []).filter((_, i) => i !== ci),
      cells_latex: (r.cells_latex || []).filter((_, i) => i !== ci),
    })),
  });
  const moveCol = (ci: number, dir: -1 | 1) => {
    const ni = ci + dir;
    if (ni < 0 || ni >= cols.length) return;
    const nextCols = [...cols];
    [nextCols[ci], nextCols[ni]] = [nextCols[ni], nextCols[ci]];
    const nextRows = rows.map(r => {
      const cells = [...(r.cells || [])];
      const cells_latex = [...(r.cells_latex || [])];
      [cells[ci], cells[ni]] = [cells[ni], cells[ci]];
      [cells_latex[ci], cells_latex[ni]] = [cells_latex[ni], cells_latex[ci]];
      return { ...r, cells, cells_latex };
    });
    set({ columns: nextCols, rows: nextRows });
  };
  const updCol = (ci: number, k: string, v: string) => {
    const next = [...cols]; next[ci] = { ...next[ci], [k]: v }; set({ columns: next });
  };
  const addRow = () => set({ rows: [...rows, { id: 'r' + Date.now(), label: '', cells: cols.map(() => ''), cells_latex: cols.map(() => '') }] });
  const removeRow = (ri: number) => set({ rows: rows.filter((_, i) => i !== ri) });
  const moveRow = (ri: number, dir: -1 | 1) => {
    const ni = ri + dir;
    if (ni < 0 || ni >= rows.length) return;
    const next = [...rows];
    [next[ri], next[ni]] = [next[ni], next[ri]];
    set({ rows: next });
  };
  const updRowLabel = (ri: number, v: string) => {
    const next = [...rows]; next[ri] = { ...next[ri], label: v }; set({ rows: next });
  };
  const updCell = (ri: number, ci: number, v: string) => {
    const next = [...rows];
    const cells = [...(next[ri].cells || [])];
    cells[ci] = v;
    next[ri] = { ...next[ri], cells }; set({ rows: next });
  };
  const updCellLatex = (ri: number, ci: number, v: string) => {
    const next = [...rows];
    const cells_latex = [...(next[ri].cells_latex || [])];
    cells_latex[ci] = v;
    next[ri] = { ...next[ri], cells_latex }; set({ rows: next });
  };

  // LaTeX-Vorschau aufbauen (KaTeX: \begin{array}, kein \begin{tabular})
  // Nutzt cells_latex (Anzeigeformel); falls leer, cells als Fallback
  const latexPreview = (() => {
    if (cols.length === 0 && rows.length === 0) return '';
    const txt = (s: string) => `\\text{${s.replace(/[&%$#_{}~^]/g, '\\$&')}}`;
    const colSpec = ['l', ...cols.map(() => 'l')].join('|');
    const hdr = [txt(d.row_label || 'Material'), ...cols.map(c => c.header || txt(c.name || '?'))].join(' & ');
    const bodyRows = rows.map(r =>
      [txt(r.label || '?'), ...cols.map((_, ci) => {
        const cell = (r.cells_latex?.[ci] || r.cells?.[ci] || '').trim();
        return cell ? (cell.includes('\\') || cell.includes('^') || cell.includes('_') ? cell : txt(cell)) : txt('—');
      })].join(' & ')
    );
    const lines = [
      `\\begin{array}{|${colSpec}|}`,
      '\\hline',
      hdr + ' \\\\',
      '\\hline',
      ...bodyRows.map(r => r + ' \\\\'),
      '\\hline',
      '\\end{array}',
    ];
    return lines.join('\n');
  })();

  const minp: React.CSSProperties = { fontSize: 9, border: '1px solid #bae6fd', borderRadius: 2, padding: '2px 3px', background: '#fff', outline: 'none', minWidth: 0 };
  const th: React.CSSProperties = { background: '#e0f2fe', color: '#0369a1', fontSize: 9, fontWeight: 700, padding: '3px 4px', border: '1px solid #7dd3fc', textAlign: 'center', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { padding: '2px 3px', border: '1px solid #bae6fd', verticalAlign: 'top' };

  return (
    <Shell id={id} type="matrix" selected={selected}>
      {/* Meta */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 4 }}>
        <div>
          <div style={lbl}>Bezeichnung</div>
          <F value={d.label || ''} placeholder="Beplankung" onChange={e => set({ label: e.target.value })} />
        </div>
        <div>
          <div style={lbl}>Dropdown-Label</div>
          <F value={d.row_label || ''} placeholder="Material" onChange={e => set({ row_label: e.target.value })} />
        </div>
      </div>

      {/* Haupt-Grid */}
      <div style={{ overflowX: 'auto', marginBottom: 4 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            {/* Zeile 1: Spaltennamen (Var-Name + Header) */}
            <tr>
              <th style={{ ...th, background: '#0891b2', color: '#fff', minWidth: 80 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                  <span>{d.row_label || 'Material'}</span>
                  <button className="nodrag" onClick={addRow} style={{ fontSize: 9, background: '#fff', color: '#0891b2', border: 'none', borderRadius: 2, padding: '0 3px', cursor: 'pointer', lineHeight: 1.4 }}>+ Zeile</button>
                </div>
              </th>
              {cols.map((col, ci) => (
                <th key={col.id} style={{ ...th, minWidth: 90 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      {/* Spalte links/rechts verschieben */}
                      <button className="nodrag" onClick={() => moveCol(ci, -1)} disabled={ci === 0}
                        title="Spalte nach links" style={{ background: 'none', border: 'none', color: ci === 0 ? '#cbd5e1' : '#0369a1', cursor: ci === 0 ? 'default' : 'pointer', fontSize: 10, padding: 0, lineHeight: 1, flexShrink: 0 }}>◀</button>
                      <F style={{ ...minp, flex: 1 }} value={col.name} placeholder="var_name" title="JS-Variablenname" onChange={e => updCol(ci, 'name', e.target.value)} />
                      <button className="nodrag" onClick={() => moveCol(ci, 1)} disabled={ci === cols.length - 1}
                        title="Spalte nach rechts" style={{ background: 'none', border: 'none', color: ci === cols.length - 1 ? '#cbd5e1' : '#0369a1', cursor: ci === cols.length - 1 ? 'default' : 'pointer', fontSize: 10, padding: 0, lineHeight: 1, flexShrink: 0 }}>▶</button>
                      <button className="nodrag" onClick={() => removeCol(ci)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 11, padding: 0, lineHeight: 1, flexShrink: 0 }}>×</button>
                    </div>
                    <F style={{ ...minp, width: '100%' }} value={col.header} placeholder="LaTeX-Header" title="Anzeige-Header (LaTeX)" onChange={e => updCol(ci, 'header', e.target.value)} />
                    <F style={{ ...minp, width: 40 }} value={col.unit} placeholder="Einheit" title="Einheit" onChange={e => updCol(ci, 'unit', e.target.value)} />
                  </div>
                </th>
              ))}
              <th style={{ ...th, minWidth: 22 }}>
                <button className="nodrag" onClick={addCol} style={{ fontSize: 10, background: '#0891b2', color: '#fff', border: 'none', borderRadius: 2, padding: '1px 4px', cursor: 'pointer' }}>+</button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={row.id}>
                <td style={{ ...td, background: '#f0f9ff' }}>
                  <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
                      <button className="nodrag" onClick={() => moveRow(ri, -1)} disabled={ri === 0}
                        title="Zeile nach oben" style={{ background: 'none', border: 'none', color: ri === 0 ? '#cbd5e1' : '#0369a1', cursor: ri === 0 ? 'default' : 'pointer', fontSize: 9, padding: 0, lineHeight: 1 }}>▲</button>
                      <button className="nodrag" onClick={() => moveRow(ri, 1)} disabled={ri === rows.length - 1}
                        title="Zeile nach unten" style={{ background: 'none', border: 'none', color: ri === rows.length - 1 ? '#cbd5e1' : '#0369a1', cursor: ri === rows.length - 1 ? 'default' : 'pointer', fontSize: 9, padding: 0, lineHeight: 1 }}>▼</button>
                    </div>
                    <F style={{ ...minp, flex: 1 }} value={row.label} placeholder="Material…" onChange={e => updRowLabel(ri, e.target.value)} />
                    <button className="nodrag" onClick={() => removeRow(ri)} style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 11, padding: 0, lineHeight: 1, flexShrink: 0 }}>×</button>
                  </div>
                </td>
                {cols.map((col, ci) => (
                  <td key={col.id} style={{ ...td, background: '#fffbeb' }}>
                    <div style={{ fontSize: 7, color: '#6b7280', marginBottom: 1 }}>LaTeX (Anzeige)</div>
                    <LatexArea
                      value={row.cells_latex?.[ci] || ''}
                      placeholder={`LaTeX${col.header ? ' für ' + col.header : ''}\nz.B. 30 \\cdot \\frac{d}{20}`}
                      onChange={v => updCellLatex(ri, ci, v)}
                      style={{ ...minp, width: '100%', fontFamily: 'monospace', fontSize: 8, resize: 'vertical', marginBottom: 3 }}
                    />
                    <NameChips
                      targetId={id}
                      onInsert={token => {
                        const raw = token.startsWith('\\') ? token : formulaName(token);
                        const base = row.cells_latex?.[ci] || '';
                        updCellLatex(ri, ci, `${base}${base && !/\s$/.test(base) ? ' ' : ''}${raw}`);
                      }}
                    />
                    <div style={{ fontSize: 7, color: '#6b7280', marginBottom: 1 }}>JS (Berechnung)</div>
                    <LatexArea
                      value={row.cells?.[ci] || ''}
                      placeholder={`JS${col.name ? ' für ' + col.name : ''}\nz.B. 30 * Math.pow(d/20, 1.1)`}
                      onChange={v => updCell(ri, ci, v)}
                      style={{ ...minp, width: '100%', fontFamily: 'monospace', fontSize: 8, resize: 'vertical', background: '#f0fdf4' }}
                    />
                  </td>
                ))}
                <td style={td} />
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={cols.length + 2} style={{ ...td, textAlign: 'center', color: '#9ca3af', fontSize: 10, padding: 8 }}>+ Zeile hinzufügen</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* JS aus LaTeX generieren */}
      <button className="nodrag" onClick={() => {
        set({
          rows: rows.map(r => ({
            ...r,
            cells: r.cells.map((c, ci) => c || latexToJs((r.cells_latex?.[ci] ?? '').trim())),
          })),
        });
      }} style={{ fontSize: 9, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 3, padding: '2px 8px', cursor: 'pointer', color: '#15803d', width: '100%', marginBottom: 4 }}>
        ⚙ JS aus LaTeX generieren (leere JS-Felder füllen)
      </button>

      {/* LaTeX-Vorschau Toggle */}
      <button className="nodrag" onClick={() => setShowPreview(v => !v)}
        style={{ fontSize: 9, background: showPreview ? '#e0f2fe' : '#f8fafc', border: '1px solid #bae6fd', borderRadius: 3, padding: '2px 8px', cursor: 'pointer', color: '#0369a1', width: '100%', marginBottom: showPreview ? 4 : 0 }}>
        {showPreview ? '▲ LaTeX-Vorschau' : '▼ LaTeX-Vorschau'}
      </button>
      {showPreview && latexPreview && (
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 4, padding: '6px 8px', overflowX: 'auto' }}>
          <MathDisplay latex={latexPreview} display />
        </div>
      )}
    </Shell>
  );
}
