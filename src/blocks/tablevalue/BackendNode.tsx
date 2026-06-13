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

// ── 🟩 Tabellenwert ──────────────────────────────────────────────────────────
export function TableValueNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as TableValueData;
  const { updateNodeData, sourceNodesMap, loadTableFull } = useGraphCtx();
  const set = (p: Partial<TableValueData>) => updateNodeData(id, p);
  const [headers, setHeaders] = useState<string[]>([]);

  useEffect(() => {
    const sources = sourceNodesMap[id] || [];
    const dropSrc = sources.find(n => n.type === 'dropdown' || n.type === 'woodclass');
    const tableRef = dropSrc?.data?.table_ref;
    if (tableRef) {
      loadTableFull(tableRef).then(t => setHeaders(t?.headers || []));
    } else {
      setHeaders([]);
    }
  }, [sourceNodesMap, id, loadTableFull]);

  return (
    <Shell id={id} type="tablevalue" selected={selected}>
      <div style={{ fontSize: 9, color: '#15803d', marginBottom: 2 }}>nutzt Zeile des verbundenen Dropdowns</div>
      <div style={lbl}>Name (LaTeX)</div>
      <F value={d.name} placeholder="z_g" onChange={e => set({ name: e.target.value })} />
      <div style={{ fontSize: 10, marginTop: 1 }}><MathDisplay latex={d.name ? nameToLatex(d.name) : '?'} /></div>
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={lbl}>Einheit</div>
          <UnitField value={d.unit} onChange={unit => set({ unit })} placeholder="m" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={lbl}>Spalte</div>
          {headers.length > 0 ? (
            <select
              className="nodrag"
              value={d.table_col ?? 0}
              onChange={e => set({ table_col: Number(e.target.value) })}
              style={inp}
            >
              {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
            </select>
          ) : (
            <F type="number" value={String(d.table_col ?? 0)} onChange={e => set({ table_col: Number(e.target.value) })} />
          )}
        </div>
      </div>
    </Shell>
  );
}
