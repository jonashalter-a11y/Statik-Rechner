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

// ── 🟥 Rechnung ──────────────────────────────────────────────────────────────
export function CalcNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as CalcData;
  const { updateNodeData } = useGraphCtx();
  const set = (p: Partial<CalcData>) => updateNodeData(id, p);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const setLatex = (latex: string) => set({ latex, expr: latexToJs(latex) });
  const setName = (name: string) => {
    const latex = updateLatexNamePrefix(d.latex || '', d.name || '', name);
    const expr = latexToJs(latex);
    set({ name, latex, expr });
  };
  const insertFormulaName = (name: string) => {
    const token = formulaName(name);
    const base = d.latex || formulaPrefix(d.name);
    const input = textareaRef.current;
    const start = input?.selectionStart ?? base.length;
    const end = input?.selectionEnd ?? start;
    const next = base.slice(0, start) + token + base.slice(end);
    setLatex(next);
    window.setTimeout(() => {
      textareaRef.current?.focus();
      const pos = start + token.length;
      textareaRef.current?.setSelectionRange(pos, pos);
    }, 0);
  };
  return (
    <Shell id={id} type="calc" selected={selected}>
      <div style={lbl}>Ergebnis-Name (LaTeX)</div>
      <F value={d.name} placeholder="c_h" onChange={e => setName(e.target.value)} />
      <div style={{ fontSize: 10, marginTop: 1 }}><MathDisplay latex={d.name ? nameToLatex(d.name) : '?'} /></div>
      <div style={lbl}>Bezeichnung</div>
      <F value={d.label} placeholder="Böengeschwindigkeitsdruck" onChange={e => set({ label: e.target.value })} />
      <div style={lbl}>Anzeige-Formel (LaTeX)</div>
      <LatexArea elRef={textareaRef} value={d.latex} placeholder={d.name ? `${formulaName(d.name)} = 1.6 \\cdot (...)` : 'c_h = 1.6 \\cdot (...)'} onChange={setLatex} style={{ ...inp, minHeight: 48, fontFamily: 'monospace', resize: 'vertical' }} />
      {d.latex && <div style={{ background: '#fff', borderRadius: 3, padding: 3, marginTop: 2, overflowX: 'auto', fontSize: 10 }}><MathDisplay latex={d.latex} display /></div>}
      <NameChips targetId={id} onInsert={insertFormulaName} />
      <div style={lbl}>Einheit</div>
      <UnitField value={d.unit} onChange={unit => set({ unit })} placeholder="-" />
    </Shell>
  );
}
