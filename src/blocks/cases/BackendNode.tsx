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

// ── ⑂ Fallunterscheidung ────────────────────────────────────────────────────
export function CasesNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as CasesData;
  const { updateNodeData, graphNodes, loadTableFull, sourceNodesMap } = useGraphCtx();
  const set = (p: Partial<CasesData>) => updateNodeData(id, p as any);
  const cases = d.cases || [];
  const mode = d.mode || 'expr';
  const isSelect = mode === 'select';

  const selectableNodes = graphNodes.filter(n =>
    n.id !== id && (n.type === 'dropdown' || n.type === 'variable')
  );

  // Wenn ein Dropdown per Pfeil verbunden wird → automatisch Quelle setzen + Fälle befüllen
  useEffect(() => {
    const wiredDropdown = (sourceNodesMap[id] || []).find(n => n.type === 'dropdown');
    if (!wiredDropdown) return;
    if (d.source === wiredDropdown.id) return;
    const nd = wiredDropdown.data as any;
    const doFill = async () => {
      type Entry = { key: string; label: string };
      let entries: Entry[] = [];
      if (nd.mode === 'table' && nd.table_ref) {
        const full = await loadTableFull(nd.table_ref);
        const labelCol: number = nd.label_col != null ? Number(nd.label_col) : 1;
        entries = (full?.rows || [])
          .map((r: string[]) => ({ key: String(r[0] || '').trim(), label: String(r[labelCol] ?? r[0] ?? '').trim() }))
          .filter(e => e.key);
      } else if (nd.options?.length) {
        entries = (nd.options as Array<{ value: string; label: string }>)
          .map(o => ({ key: String(o.value || o.label || '').trim(), label: String(o.label || o.value || '').trim() }))
          .filter(e => e.key);
      }
      set({
        mode: 'select',
        source: wiredDropdown.id,
        cases: entries.map((e, i) => ({ id: 'f' + (i + 1), formula_latex: e.label, cond_expr: '', match_value: e.label })),
      });
    };
    doFill();
  }, [sourceNodesMap[id]?.map(n => n.id).join(',')]);

  const addCase = () => set({ cases: [...cases, { id: 'f' + Date.now(), formula_latex: '', cond_expr: '', match_value: '' }] });
  const removeCase = (i: number) => set({ cases: cases.filter((_, j) => j !== i) });
  const updCase = (i: number, patch: Partial<typeof cases[0]>) => {
    const next = [...cases]; next[i] = { ...next[i], ...patch }; set({ cases: next });
  };

  const isElse = (c: typeof cases[0]) =>
    isSelect ? !(c.match_value || '').trim() : !(c.cond_expr || '').trim();

  return (
    <Shell id={id} type="cases" selected={selected}>
      <div style={lbl}>Ergebnis-Name (LaTeX)</div>
      <F value={d.name || ''} placeholder="c_h" onChange={e => set({ name: e.target.value })} />
      {d.name && <div style={{ fontSize: 10, marginTop: 1 }}><MathDisplay latex={nameToLatex(d.name)} /></div>}
      <div style={lbl}>Bezeichnung</div>
      <F value={d.label || ''} placeholder="Profilbeiwert" onChange={e => set({ label: e.target.value })} />
      <div style={lbl}>Einheit</div>
      <UnitField value={d.unit || ''} onChange={unit => set({ unit })} placeholder="-" />
      <div style={lbl}>Bedingungsart</div>
      <select className="nodrag" value={mode} onChange={e => set({ mode: e.target.value as any })} style={inp}>
        <option value="expr">JS-Ausdruck (z &lt; 5 &amp;&amp; GK === 'II')</option>
        <option value="select">Dropdown-Vergleich</option>
      </select>
      {isSelect && (
        <>
          <div style={lbl}>Quelle (Dropdown)</div>
          <select className="nodrag" value={d.source || ''}
            onChange={e => set({ source: e.target.value, cases: [] })} style={inp}>
            <option value="">— wählen —</option>
            {selectableNodes.map(n => (
              <option key={n.id} value={n.id}>{n.label || n.name || n.id}</option>
            ))}
          </select>
        </>
      )}
      <NameChips targetId={id} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <div style={lbl}>Fälle</div>
        <button className="nodrag" onClick={addCase}
          style={{ fontSize: 10, border: 'none', background: '#ede9fe', color: '#6d28d9', borderRadius: 4, padding: '1px 6px', cursor: 'pointer' }}>+</button>
      </div>
      {cases.map((c, i) => (
        <div key={c.id} style={{ border: '1px solid #ddd6fe', borderRadius: 4, padding: '4px 5px', marginTop: 4, background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <div style={{ fontSize: 8, color: '#6d28d9', fontWeight: 700 }}>
              Fall {i + 1}{isElse(c) ? ' — else' : ''}
            </div>
            <button className="nodrag" onClick={() => removeCase(i)}
              style={{ background: 'none', border: 'none', color: '#c4b5fd', cursor: 'pointer', fontSize: 11, padding: '0 2px', lineHeight: 1 }}>✕</button>
          </div>
          {isSelect ? (
            <>
              <div style={lbl}>Wert (leer = else)</div>
              <F value={c.match_value || ''} placeholder="II"
                onChange={e => updCase(i, { match_value: e.target.value })}
                style={{ fontFamily: 'monospace', fontSize: 10, background: (c.match_value || '').trim() ? '#fffbeb' : '#f5f3ff', borderColor: (c.match_value || '').trim() ? '#d1d5db' : '#c4b5fd' }} />
            </>
          ) : (
            <>
              <div style={lbl}>Bedingung (JS · leer = else)</div>
              <F value={c.cond_expr} placeholder="z < 5 && GK === 'II'"
                onChange={e => updCase(i, { cond_expr: e.target.value })}
                style={{ fontFamily: 'monospace', fontSize: 8.5, background: (c.cond_expr || '').trim() ? '#fffbeb' : '#f5f3ff', borderColor: (c.cond_expr || '').trim() ? '#d1d5db' : '#c4b5fd' }} />
            </>
          )}
          <div style={lbl}>Formel (LaTeX)</div>
          <LatexArea value={c.formula_latex}
            placeholder="1.6 \cdot \left[\left(\frac{5}{z_g}\right)^{\alpha_r} + 0{,}375\right]^2"
            onChange={v => updCase(i, { formula_latex: v })}
            style={{ ...inp, minHeight: 30, fontFamily: 'monospace', resize: 'vertical' }} />
          <NameChips
            targetId={id}
            onInsert={token => {
              const raw = token.startsWith('\\') ? token : formulaName(token);
              const base = c.formula_latex || '';
              updCase(i, { formula_latex: `${base}${base && !/\s$/.test(base) ? ' ' : ''}${raw}` });
            }}
          />
          {c.formula_latex && (
            <div style={{ background: '#faf5ff', borderRadius: 3, padding: '2px 4px', marginTop: 2, overflowX: 'auto', fontSize: 10 }}>
              <MathDisplay latex={c.formula_latex} display />
            </div>
          )}
        </div>
      ))}
    </Shell>
  );
}
