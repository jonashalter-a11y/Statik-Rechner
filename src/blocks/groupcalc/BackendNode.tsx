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

// ── ⚙ Gruppenberechnung ─────────────────────────────────────────────────────
export function GroupCalcNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as GroupCalcData;
  const { updateNodeData } = useGraphCtx();
  const set = (p: Partial<GroupCalcData>) => updateNodeData(id, { ...d, ...p });

  const uid = () => Math.random().toString(36).slice(2, 8);

  // Vars
  const addVar = () => set({ vars: [...(d.vars || []), { id: uid(), name: '', label: '', unit: '', default_value: '0' }] });
  const setVar = (i: number, p: Partial<GroupCalcVar>) => {
    const arr = [...(d.vars || [])]; arr[i] = { ...arr[i], ...p }; set({ vars: arr });
  };
  const delVar = (i: number) => set({ vars: (d.vars || []).filter((_, j) => j !== i) });

  // Outputs
  const addOut = () => set({ outputs: [...(d.outputs || []), { id: uid(), name: '', label: '', unit: '' }] });
  const setOut = (i: number, p: Partial<GroupCalcOutput>) => {
    const arr = [...(d.outputs || [])]; arr[i] = { ...arr[i], ...p }; set({ outputs: arr });
  };
  const delOut = (i: number) => set({ outputs: (d.outputs || []).filter((_, j) => j !== i) });

  // Options
  const addOpt = () => set({ options: [...(d.options || []), { id: uid(), label: '', formulas: {} }] });
  const setOptLabel = (i: number, label: string) => {
    const arr = [...(d.options || [])]; arr[i] = { ...arr[i], label }; set({ options: arr });
  };
  const setOptFormula = (i: number, outId: string, formula: string) => {
    const arr = [...(d.options || [])];
    arr[i] = { ...arr[i], formulas: { ...arr[i].formulas, [outId]: formula } };
    set({ options: arr });
  };
  const delOpt = (i: number) => set({ options: (d.options || []).filter((_, j) => j !== i) });

  const outputs = d.outputs || [];
  const options = d.options || [];

  return (
    <Shell id={id} type="groupcalc" selected={selected} headerRight={<OverrideToggle checked={!!d.allowOverride} onChange={v => set({ allowOverride: v })} />}>
      <div style={lbl}>Block-Titel</div>
      <F value={d.label || ''} placeholder="Beplankungsnachweis" onChange={e => set({ label: e.target.value })} />
      <div style={lbl}>Dropdown-Bezeichnung</div>
      <F value={d.dropdown_label || ''} placeholder="Material / Schicht" onChange={e => set({ dropdown_label: e.target.value })} />

      {/* Eingabe-Variablen */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <div style={lbl}>Eingabe-Variablen</div>
        <button className="nodrag" onClick={addVar} style={{ fontSize: 10, border: 'none', background: '#ccfbf1', borderRadius: 4, padding: '1px 6px', cursor: 'pointer' }}>+</button>
      </div>
      {(d.vars || []).map((v, i) => (
        <div key={v.id} style={{ background: '#f0fdfa', borderRadius: 3, padding: '3px 4px', marginBottom: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <F value={v.name} placeholder="d_i" onChange={e => setVar(i, { name: e.target.value })} style={{ flex: 1.5 }} />
            <F value={v.label} placeholder="Schichtdicke" onChange={e => setVar(i, { label: e.target.value })} style={{ flex: 2 }} />
            <F value={v.unit} placeholder="mm" onChange={e => setVar(i, { unit: e.target.value })} style={{ flex: 1 }} />
            <F value={v.default_value} placeholder="0" onChange={e => setVar(i, { default_value: e.target.value })} style={{ flex: 1 }} />
            <button className="nodrag" onClick={() => delVar(i)} style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 11, padding: '0 2px' }}>✕</button>
          </div>
        </div>
      ))}
      {(d.vars || []).length > 0 && <div style={{ fontSize: 7, color: '#9ca3af', marginBottom: 2 }}>Name · Bezeichnung · Einheit · Standard</div>}

      {/* Ausgaben */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <div style={lbl}>Ausgaben</div>
        <button className="nodrag" onClick={addOut} style={{ fontSize: 10, border: 'none', background: '#ccfbf1', borderRadius: 4, padding: '1px 6px', cursor: 'pointer' }}>+</button>
      </div>
      {outputs.map((o, i) => (
        <div key={o.id} style={{ display: 'flex', gap: 2, alignItems: 'center', marginBottom: 2 }}>
          <F value={o.name} placeholder="t_{prot,0,i}" onChange={e => setOut(i, { name: e.target.value })} style={{ flex: 2 }} />
          <F value={o.label} placeholder="Brandschutzzeit" onChange={e => setOut(i, { label: e.target.value })} style={{ flex: 2 }} />
          <F value={o.unit} placeholder="min" onChange={e => setOut(i, { unit: e.target.value })} style={{ flex: 1 }} />
          <button className="nodrag" onClick={() => delOut(i)} style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 11, padding: '0 2px' }}>✕</button>
        </div>
      ))}
      {outputs.length > 0 && <div style={{ fontSize: 7, color: '#9ca3af', marginBottom: 4 }}>LaTeX-Name · Bezeichnung · Einheit</div>}

      {/* Optionen / Materialien */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <div style={lbl}>Materialien / Optionen</div>
        <button className="nodrag" onClick={addOpt} style={{ fontSize: 10, border: 'none', background: '#ccfbf1', borderRadius: 4, padding: '1px 6px', cursor: 'pointer' }}>+</button>
      </div>
      {options.map((opt, oi) => (
        <div key={opt.id} style={{ background: '#f0fdfa', border: '1px solid #5eead4', borderRadius: 4, padding: '4px 5px', marginBottom: 4 }}>
          <div style={{ display: 'flex', gap: 2, alignItems: 'center', marginBottom: 3 }}>
            <F value={opt.label} placeholder="Mineralwolle ≥ 26 kg/m³" onChange={e => setOptLabel(oi, e.target.value)} style={{ flex: 1 }} />
            <button className="nodrag" onClick={() => delOpt(oi)} style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 11, padding: '0 2px' }}>✕</button>
          </div>
          {outputs.map(o => (
            <div key={o.id} style={{ marginBottom: 2 }}>
              <div style={{ fontSize: 7.5, color: '#0f766e', fontWeight: 600, marginBottom: 1 }}>{o.name || o.label || o.id}</div>
              <LatexArea
                value={opt.formulas?.[o.id] ?? ''}
                onChange={v => setOptFormula(oi, o.id, v)}
                placeholder="0.3 \cdot d_i^{0.75 \cdot \log(\rho_i) - \rho_i/400}"
                style={{ ...inp, fontFamily: 'monospace', fontSize: 8.5, minHeight: 32 }}
              />
              <NameChips
                targetId={id}
                onInsert={token => {
                  const raw = token.startsWith('\\') ? token : formulaName(token);
                  const base = opt.formulas?.[o.id] ?? '';
                  setOptFormula(oi, o.id, `${base}${base && !/\s$/.test(base) ? ' ' : ''}${raw}`);
                }}
              />
            </div>
          ))}
          {outputs.length === 0 && <div style={{ fontSize: 8, color: '#9ca3af' }}>Erst Ausgaben definieren</div>}
        </div>
      ))}
    </Shell>
  );
}
