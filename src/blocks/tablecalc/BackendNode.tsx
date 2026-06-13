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

// ── 🟦 Tabellenberechnung ────────────────────────────────────────────────────
export function TableCalcNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as TableCalcData;
  const { updateNodeData, dbTables } = useGraphCtx();
  const set = (p: Partial<TableCalcData>) => updateNodeData(id, p);
  return (
    <Shell id={id} type="tablecalc" selected={selected}>
      <div style={lbl}>Name</div>
      <F value={d.name} placeholder="q_k" onChange={e => set({ name: e.target.value })} />
      <div style={lbl}>Quell-Tabelle (Zonen-Beiwerte)</div>
      <select className="nodrag" value={d.table_ref || ''} onChange={e => set({ table_ref: e.target.value })} style={inp}>
        <option value="">— wählen —</option>
        {dbTables.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
      </select>
      <div style={lbl}>Zonen (Spaltennamen, kommagetrennt)</div>
      <F value={(d.zones || []).join(',')} placeholder="A,B,C,D,E,F,G,H" onChange={e => set({ zones: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
      <div style={lbl}>Berechnung je Zone (JS, cell=Zonenwert)</div>
      <LatexArea value={d.expr} placeholder="cell * q_p" onChange={v => set({ expr: v })} style={{ ...inp, minHeight: 30, fontFamily: 'monospace', background: '#fffbeb' }} />
      <NameChips targetId={id} />
      <div style={lbl}>Einheit</div>
      <UnitField value={d.unit} onChange={unit => set({ unit })} />
    </Shell>
  );
}
