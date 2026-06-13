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

// ── 🏗 Träger-Visualisierung ──────────────────────────────────────────────────
const SUPPORT_OPTS: { value: string; label: string }[] = [
  { value: 'pin',    label: '△ Gelenk (Pin)' },
  { value: 'roller', label: '○ Rolle (Roller)' },
  { value: 'fixed',  label: '▐ Einspannung (Fixed)' },
  { value: 'free',   label: '— Frei' },
];

export function BeamVisualNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as import('../../types/graph').BeamVisualData;
  const { updateNodeData } = useGraphCtx();
  const set = (p: Partial<import('../../types/graph').BeamVisualData>) => updateNodeData(id, p as any);
  const loads: import('../../types/graph').BeamLoad[] = d.loads || [];

  const addLoad = (kind: 'distributed' | 'point') => set({
    loads: [...loads, { id: 'l' + Date.now(), kind, var_name: '', label: '', direction: 'down', position: 0.5 }],
  });
  const updLoad = (li: number, k: string, v: unknown) => {
    const next = [...loads]; next[li] = { ...next[li], [k]: v }; set({ loads: next });
  };
  const removeLoad = (li: number) => set({ loads: loads.filter((_, i) => i !== li) });

  const inp: React.CSSProperties = { fontSize: 9, border: '1px solid #d1d5db', borderRadius: 2, padding: '2px 3px', background: '#fff', outline: 'none', minWidth: 0, width: '100%' };
  const sel2: React.CSSProperties = { ...inp, appearance: 'none', paddingRight: 12 };

  return (
    <Shell id={id} type="beamvisual" selected={selected}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 6 }}>
        <div>
          <div style={lbl}>Bezeichnung</div>
          <F value={d.label || ''} placeholder="Einfeldträger" onChange={e => set({ label: e.target.value })} />
        </div>
        <div>
          <div style={lbl}>Stützweite (Var-Name)</div>
          <F value={d.span_var || ''} placeholder="L" title="JS-Variablenname" onChange={e => set({ span_var: e.target.value })} />
        </div>
        <div>
          <div style={lbl}>Einheit Stützweite</div>
          <F value={d.span_unit || ''} placeholder="m" onChange={e => set({ span_unit: e.target.value })} />
        </div>
      </div>

      {/* Auflager */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 6 }}>
        <div>
          <div style={lbl}>Auflager links</div>
          <select className="nodrag" style={sel2} value={d.left_support || 'pin'} onChange={e => set({ left_support: e.target.value as any })}>
            {SUPPORT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <div style={lbl}>Auflager rechts</div>
          <select className="nodrag" style={sel2} value={d.right_support || 'roller'} onChange={e => set({ right_support: e.target.value as any })}>
            {SUPPORT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Lasten */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ ...lbl, marginBottom: 0 }}>Lasten</span>
          <div style={{ display: 'flex', gap: 3 }}>
            <button className="nodrag" onClick={() => addLoad('distributed')} style={{ fontSize: 8, background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 2, padding: '1px 4px', cursor: 'pointer', color: '#92400e' }}>+ Streckenlast</button>
            <button className="nodrag" onClick={() => addLoad('point')} style={{ fontSize: 8, background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: 2, padding: '1px 4px', cursor: 'pointer', color: '#5b21b6' }}>+ Einzellast</button>
          </div>
        </div>
        {loads.map((load, li) => (
          <div key={load.id} style={{ background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: 3, padding: '4px 6px', marginBottom: 3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <span style={{ fontSize: 8, color: '#6b7280', fontWeight: 600 }}>{load.kind === 'distributed' ? '≡ Streckenlast' : '↓ Einzellast'}</span>
              <button className="nodrag" onClick={() => removeLoad(li)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 11, padding: 0, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
              <div>
                <div style={lbl}>Var-Name</div>
                <F value={load.var_name} placeholder="q_k" onChange={e => updLoad(li, 'var_name', e.target.value)} />
              </div>
              <div>
                <div style={lbl}>Label (LaTeX)</div>
                <F value={load.label} placeholder="q_k" onChange={e => updLoad(li, 'label', e.target.value)} />
              </div>
              <div>
                <div style={lbl}>Richtung</div>
                <select className="nodrag" style={sel2} value={load.direction} onChange={e => updLoad(li, 'direction', e.target.value)}>
                  <option value="down">↓ nach unten</option>
                  <option value="up">↑ nach oben</option>
                </select>
              </div>
              {load.kind === 'point' && (
                <div>
                  <div style={lbl}>Position (0–1)</div>
                  <F type="number" min={0} max={1} step={0.05} value={String(load.position ?? 0.5)} onChange={e => updLoad(li, 'position', parseFloat(e.target.value))} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}
