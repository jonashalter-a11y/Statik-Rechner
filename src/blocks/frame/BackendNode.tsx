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

export function FrameNode({ id, data, selected }: NodeProps) {
  const { removeNode, updateNodeData } = useGraphCtx();
  const d = data as unknown as FrameData;
  const set = (p: Partial<FrameData>) => updateNodeData(id, p as any);
  const color = d.color || '#2563eb';
  return (
    <div style={{ width: '100%', height: '100%', background: `${color}0d`, border: `2px dashed ${color}`, borderRadius: 10, boxSizing: 'border-box', position: 'relative', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <NodeResizer isVisible={selected} minWidth={120} minHeight={60} color={color}
        lineStyle={{ borderWidth: 1.5, borderColor: color, opacity: 0.5 }}
        handleStyle={{ width: 7, height: 7, borderRadius: 2, background: color }} />
      {/* Label (immer sichtbar oben links) */}
      <div style={{ position: 'absolute', top: 5, left: 10, right: selected ? 130 : 10, fontSize: 10, color, fontWeight: 700, opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {d.label || ''}
      </div>
      {/* Toolbar (nur wenn selektiert) */}
      {selected && (
        <div className="nodrag" style={{ position: 'absolute', top: 4, right: 6, display: 'flex', alignItems: 'center', gap: 3 }}>
          {PRESET_COLORS.map(c => (
            <button key={c} type="button" onClick={() => set({ color: c })}
              style={{ width: 12, height: 12, background: c, border: color === c ? '2px solid #000' : '1px solid rgba(0,0,0,0.1)', borderRadius: 2, cursor: 'pointer', padding: 0, flexShrink: 0 }} />
          ))}
          <input defaultValue={d.label || ''} onChange={e => set({ label: e.target.value })}
            placeholder="Label…"
            style={{ border: `1px solid ${color}`, background: `${color}20`, borderRadius: 3, fontSize: 9, padding: '1px 5px', outline: 'none', width: 70, color: '#374151', marginLeft: 2 }} />
          <button type="button" onClick={() => removeNode(id)}
            style={{ background: color, border: 'none', color: '#fff', cursor: 'pointer', fontSize: 10, borderRadius: 3, padding: '1px 4px', lineHeight: 1.4 }}>✕</button>
        </div>
      )}
    </div>
  );
}
