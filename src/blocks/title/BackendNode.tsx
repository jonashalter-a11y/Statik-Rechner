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

export function TitleNode({ id, data, selected }: NodeProps) {
  const { removeNode, updateNodeData } = useGraphCtx();
  const d = data as unknown as TitleData;
  const set = (p: Partial<TitleData>) => updateNodeData(id, p as any);
  const color = d.color || '#2563eb';
  return (
    <div style={{ background: `${color}18`, border: `2px solid ${color}`, borderRadius: 6, width: '100%', minWidth: 200, height: '100%', minHeight: 34, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      <NodeResizer isVisible={selected} minWidth={200} minHeight={34} color={color}
        lineStyle={{ borderWidth: 1.5, borderColor: color, opacity: 0.5 }}
        handleStyle={{ width: 7, height: 7, borderRadius: 2, background: color }} />
      <Handle type="target" position={Position.Left} style={{ background: color, width: 7, height: 7 }} />
      <div style={{ background: color, color: '#fff', padding: '2px 6px', borderRadius: '3px 3px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 9.5, fontWeight: 700, lineHeight: 1.2, flexShrink: 0 }}>
        <span>📌 Titel</span>
        <button className="nodrag" onClick={() => removeNode(id)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 11, lineHeight: 1 }}>✕</button>
      </div>
      <div style={{ padding: 4 }}>
        <F value={d.label || ''} placeholder="Abschnittsüberschrift..." onChange={e => set({ label: e.target.value })} style={{ fontWeight: 700, fontSize: 11 }} />
        <div style={{ marginTop: 4, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {PRESET_COLORS.map(c => (
            <button key={c} type="button" className="nodrag" onClick={() => set({ color: c })}
              style={{ width: 14, height: 14, background: c, border: color === c ? '2px solid #000' : '1px solid rgba(0,0,0,0.1)', borderRadius: 2, cursor: 'pointer', padding: 0, flexShrink: 0 }} />
          ))}
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: color, width: 7, height: 7 }} />
    </div>
  );
}
