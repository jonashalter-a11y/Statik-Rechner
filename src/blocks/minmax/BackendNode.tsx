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
  inp, lbl, pasteImageFromClipboard, updateLatexNamePrefix, OverrideToggle,
} from '../../components/admin/graph/BlockNodeShared';

// ── ↕ Min / Max ──────────────────────────────────────────────────────────────
export function MinMaxNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as MinMaxData;
  const { updateNodeData } = useGraphCtx();
  const set = (p: Partial<MinMaxData>) => updateNodeData(id, { ...d, ...p });
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const setLatex = (latex: string) => set({ latex, expr: latexToJs(latex) });

  const setName = (name: string) => {
    const latex = updateLatexNamePrefix(d.latex || '', d.name || '', name);
    set({ name, latex, expr: latexToJs(latex) });
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
    <Shell id={id} type="minmax" selected={selected} headerRight={<OverrideToggle checked={!!d.allowOverride} onChange={v => set({ allowOverride: v })} />}>
      <div style={lbl}>Ergebnis-Name (LaTeX)</div>
      <F value={d.name} placeholder="f_{v,0,d}" onChange={e => setName(e.target.value)} />
      {d.name && <div style={{ fontSize: 10, marginTop: 1 }}><MathDisplay latex={nameToLatex(d.name)} /></div>}

      <div style={lbl}>Formel (LaTeX)</div>
      <LatexArea
        elRef={textareaRef as React.RefObject<HTMLTextAreaElement>}
        value={d.latex}
        placeholder={'f_{v,0,d} = \\min\\begin{cases}\n  k_{v1} \\cdot R_d / a_v \\\\\n  k_{v1} \\cdot k_{v2} \\cdot f_{v,d} \\cdot t\n\\end{cases}'}
        onChange={setLatex}
        style={{ ...inp, minHeight: 72, fontFamily: 'monospace', resize: 'vertical' }}
      />
      {d.latex && (
        <div style={{ background: '#fff', borderRadius: 3, padding: 3, marginTop: 2, overflowX: 'auto', fontSize: 10 }}>
          <MathDisplay latex={d.latex} display />
        </div>
      )}

      <div style={lbl}>Beschreibung</div>
      <F value={d.label} placeholder="Kurzbeschreibung" onChange={e => set({ label: e.target.value })} />

      <div style={lbl}>Einheit</div>
      <UnitField value={d.unit} onChange={unit => set({ unit })} placeholder="-" />

      <NameChips targetId={id} onInsert={insertFormulaName} />
    </Shell>
  );
}
