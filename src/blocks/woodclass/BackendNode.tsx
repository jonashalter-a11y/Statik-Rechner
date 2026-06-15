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

// ── 🟨 Holzklasse ───────────────────────────────────────────────────────────
export function WoodClassNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as WoodClassData;
  const { updateNodeData } = useGraphCtx();
  const set = (p: Partial<WoodClassData>) => updateNodeData(id, p);
  return (
    <Shell id={id} type="woodclass" selected={selected}>
      <div style={{ fontSize: 9, color: '#92400e', marginBottom: 3 }}>
        nutzt im Frontend die aktuell gewählte Holzklasse
      </div>
      <div style={lbl}>Daten-Info</div>
      <F value={d.label} placeholder="Aktuelle Holzklasse" onChange={e => set({ label: e.target.value })} />
      <div style={{ fontSize: 9, color: '#6b7280', marginTop: 3, lineHeight: 1.3 }}>
        Mit 🟩 Tabellenwert verbinden. Name = Kennwert, z.B. f_m_k, E_0_mean.
      </div>
    </Shell>
  );
}
