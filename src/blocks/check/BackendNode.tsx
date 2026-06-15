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

// ── ✅ Nachweis-Prüfung ──────────────────────────────────────────────────────
export function CheckNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as CheckData;
  const { updateNodeData } = useGraphCtx();
  const set = (p: Partial<CheckData>) => updateNodeData(id, p);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const setLatex = (latex: string) => {
    const expr = latexCondToJs(latex);
    set({ latex, expr });
  };
  const insertFormulaToken = (token: string) => {
    const raw = token.startsWith('\\') ? token : formulaName(token);
    const base = d.latex || '';
    const input = inputRef.current;
    const start = input?.selectionStart ?? base.length;
    const end = input?.selectionEnd ?? start;
    const next = base.slice(0, start) + raw + base.slice(end);
    setLatex(next);
    window.setTimeout(() => {
      inputRef.current?.focus();
      const pos = start + raw.length;
      inputRef.current?.setSelectionRange(pos, pos);
    }, 0);
  };
  return (
    <Shell id={id} type="check" selected={selected} extraHandles={<span />}>
      <div style={{ fontSize: 9, color: '#065f46', marginBottom: 2 }}>
        Ungleichung eingeben → im Frontend grün/rot
      </div>
      <div style={lbl}>Bezeichnung</div>
      <F value={d.label} placeholder="Biegenachweis" onChange={e => set({ label: e.target.value })} />
      <div style={lbl}>Bedingung (LaTeX)</div>
      <F
        ref={inputRef}
        value={d.latex}
        placeholder="\sigma_{m,d} \leq f_{m,d,eff}"
        onChange={e => setLatex(e.target.value)}
        style={{ fontFamily: 'monospace' }}
      />
      <NameChips targetId={id} onInsert={insertFormulaToken} />
      {d.latex && (
        <div style={{ background: '#fff', borderRadius: 3, padding: 3, marginTop: 2, overflowX: 'auto', fontSize: 10 }}>
          <MathDisplay latex={d.latex} display />
        </div>
      )}
      {d.expr && (
        <div style={{ fontSize: 8, color: '#059669', fontFamily: 'monospace', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 3, padding: '2px 5px', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.expr}>
          ⚙ {d.expr}
        </div>
      )}
      <div style={lbl}>Einheit</div>
      <UnitField value={d.unit || ''} onChange={unit => set({ unit })} placeholder="N/mm^2" />
    </Shell>
  );
}
