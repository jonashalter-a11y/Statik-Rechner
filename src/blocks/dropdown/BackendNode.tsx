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

// ── 🟧 Dropdown ──────────────────────────────────────────────────────────────
export function DropdownNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as DropdownData;
  const { updateNodeData, dbTables, loadTableFull } = useGraphCtx();
  const set = (p: Partial<DropdownData>) => updateNodeData(id, p);
  const [headers, setHeaders] = useState<string[]>([]);
  useEffect(() => {
    if ((d.mode === 'table' || d.mode === 'table_column') && d.table_ref) loadTableFull(d.table_ref).then(t => setHeaders(t?.headers || []));
  }, [d.mode, d.table_ref]);
  const addOpt = () => set({ options: [...(d.options || []), { label: '', value: '' }] });
  const updOpt = (i: number, k: 'label' | 'value', v: string) => { const o = [...(d.options || [])]; o[i] = { ...o[i], [k]: v }; set({ options: o }); };
  const delOpt = (i: number) => set({ options: (d.options || []).filter((_, j) => j !== i) });
  return (
    <Shell id={id} type="dropdown" selected={selected}>
      <div style={lbl}>Bezeichnung</div>
      <F value={d.label} placeholder="Geländekategorie" onChange={e => set({ label: e.target.value })} />
      <div style={lbl}>Variablen-Name (für Berechnung / Bedingungen)</div>
      <F value={d.name || ''} placeholder="GK" onChange={e => set({ name: e.target.value })} />
      {d.name && <div style={{ fontSize: 10, marginTop: 1, color: '#92400e' }}><MathDisplay latex={formulaName(d.name)} /></div>}
      <div style={lbl}>Einheit</div>
      <UnitField value={d.unit || ''} onChange={unit => set({ unit })} placeholder="-" />
      <div style={lbl}>Art</div>
      <select className="nodrag" value={d.mode} onChange={e => set({ mode: e.target.value as any })} style={inp}>
        <option value="custom">Selbst erstellen</option>
        <option value="table">Ganze Tabelle</option>
        <option value="table_column">Tabellen-Spalte</option>
      </select>
      {(d.mode === 'table' || d.mode === 'table_column') && (
        <>
          <div style={lbl}>Tabelle</div>
          <select className="nodrag" value={d.table_ref || ''} onChange={e => set({ table_ref: e.target.value, label_col: 0 })} style={inp}>
            <option value="">— wählen —</option>
            {dbTables.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          {headers.length > 0 && (
            <>
              <div style={lbl}>Anzeige-Spalte</div>
              <select className="nodrag" value={d.label_col ?? 0} onChange={e => set({ label_col: Number(e.target.value) })} style={inp}>
                {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
              </select>
            </>
          )}
        </>
      )}
      {d.mode === 'custom' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={lbl}>Optionen</div>
            <button className="nodrag" onClick={addOpt} style={{ fontSize: 10, border: 'none', background: '#fed7aa', borderRadius: 4, padding: '1px 6px', cursor: 'pointer' }}>+</button>
          </div>
          {(d.options || []).map((o, i) => (
            <div key={i} style={{ display: 'flex', gap: 3, marginBottom: 2, alignItems: 'center' }}>
              <F value={o.label} placeholder="Label" onChange={e => updOpt(i, 'label', e.target.value)} style={{ flex: 2 }} />
              <F value={o.value} placeholder="Wert" onChange={e => updOpt(i, 'value', e.target.value)} style={{ flex: 1 }} />
              <button className="nodrag" onClick={() => delOpt(i)} style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 12, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}>✕</button>
            </div>
          ))}
        </>
      )}
    </Shell>
  );
}
