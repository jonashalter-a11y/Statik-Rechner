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

export function RefNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as RefData;
  const { updateNodeData, graphNodes, sourceNodesMap } = useGraphCtx();
  const set = (p: Partial<RefData>) => updateNodeData(id, p as any);

  // Auto-Wire: wenn eine Kante zu diesem Block gezogen wurde, diesen Knoten verwenden
  const wiredSources = (sourceNodesMap[id] || []).filter(n => !['frame', 'title', 'image', 'output'].includes(n.type));
  const autoSrc = wiredSources[0];

  // Auto-Wire hat Vorrang; sonst gespeicherter source_id
  const activeSrcId = autoSrc?.id || d.source_id;
  const src = graphNodes.find(n => n.id === activeSrcId);
  const available = graphNodes.filter(n => n.id !== id && !['frame', 'title', 'image', 'output', 'ref'].includes(n.type));

  return (
    <Shell id={id} type="ref" selected={selected}>
      {autoSrc ? (
        <div style={{ fontSize: 9, color: '#0369a1', padding: '3px 0', lineHeight: 1.4 }}>
          <span style={{ fontWeight: 700 }}>{THEME[autoSrc.type]?.icon ?? '🔗'} </span>
          {autoSrc.data?.label || autoSrc.data?.name || autoSrc.id}
          <div style={{ fontSize: 8, color: '#64748b', marginTop: 1 }}>Automatisch verbunden (Kante)</div>
        </div>
      ) : (
        <>
          <div style={lbl}>Verweist auf</div>
          <select className="nodrag" style={{ ...inp, background: '#fff' }}
            value={d.source_id || ''}
            onChange={e => set({ source_id: e.target.value })}>
            <option value="">— Knoten wählen —</option>
            {available.map(n => (
              <option key={n.id} value={n.id}>
                {n.name ? `${n.label || n.name} (${n.name})` : n.label || n.id}
              </option>
            ))}
          </select>
          {src && (
            <div style={{ fontSize: 8.5, color: '#0369a1', marginTop: 3, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {THEME[src.type]?.icon ?? ''} {src.label || src.name}
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
