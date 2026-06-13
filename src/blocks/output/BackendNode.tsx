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

// ── ⬜ PDF / Ausgabe ─────────────────────────────────────────────────────────
export function OutputNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as OutputData;
  const { updateNodeData, allNames } = useGraphCtx();
  const set = (p: Partial<OutputData>) => updateNodeData(id, p);
  const blocks = d.blocks || [];
  const toggle = (nid: string) => set({ blocks: blocks.includes(nid) ? blocks.filter(b => b !== nid) : [...blocks, nid] });
  return (
    <Shell id={id} type="output" selected={selected} extraHandles={<span />}>
      <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 3 }}>Diese Blöcke ins PDF-Protokoll:</div>
      {allNames.filter(n => n.id !== id).map(n => (
        <label key={n.id} className="nodrag" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, cursor: 'pointer' }}>
          <input type="checkbox" className="nodrag" checked={blocks.includes(n.id)} onChange={() => toggle(n.id)} />
          {n.name || n.label}
        </label>
      ))}
    </Shell>
  );
}
