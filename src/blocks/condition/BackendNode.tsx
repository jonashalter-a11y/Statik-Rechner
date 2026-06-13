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

// ── 🔶 Bedingung ─────────────────────────────────────────────────────────────
export function ConditionNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as ConditionData;
  const { updateNodeData, graphNodes, dbTables, loadTableFull, allNodeData, sourceNodesMap } = useGraphCtx();
  const set = (p: Partial<ConditionData>) => updateNodeData(id, p);
  const conds = d.conditions || [];
  const mode = d.mode || 'expr';
  const selectableNodes = graphNodes.filter(n =>
    n.id !== id && (n.type === 'dropdown' || n.type === 'woodclass' || n.type === 'variable')
  );
  const add = () => set({ conditions: [...conds, { id: 'c' + Date.now(), latex: '', expr: '', match: '' }] });

  // Wenn ein Dropdown per Pfeil verbunden wird → automatisch Quelle setzen + Zweige befüllen
  useEffect(() => {
    const wiredDropdown = (sourceNodesMap[id] || []).find(n => n.type === 'dropdown');
    if (!wiredDropdown) return;
    if (d.source === wiredDropdown.id) return; // bereits gesetzt
    const nd = wiredDropdown.data as any;
    const doFill = async () => {
      type Entry = { key: string; label: string };
      let entries: Entry[] = [];
      if (nd.mode === 'table' && nd.table_ref) {
        const full = await loadTableFull(nd.table_ref);
        const labelCol: number = nd.label_col != null ? Number(nd.label_col) : 1;
        entries = (full?.rows || [])
          .map((r: string[]) => ({ key: String(r[0] || '').trim(), label: String(r[labelCol] ?? r[0] ?? '').trim() }))
          .filter(e => e.key);
      } else if (nd.options?.length) {
        entries = (nd.options as Array<{ value: string; label: string }>)
          .map(o => ({ key: String(o.value || o.label || '').trim(), label: String(o.label || o.value || '').trim() }))
          .filter(e => e.key);
      }
      set({
        mode: 'select',
        source: wiredDropdown.id,
        conditions: entries.map((e, i) => ({ id: 'c' + (i + 1), latex: e.label, expr: '', match: e.label })),
      });
    };
    doFill();
  }, [sourceNodesMap[id]?.map(n => n.id).join(',')]);

  // Beim ersten Rendern: fehlende exprs aus LaTeX ableiten
  useEffect(() => {
    if (mode === 'select') return;
    const needsUpdate = conds.some(c => !c.expr && latexHasIneq(c.latex || ''));
    if (!needsUpdate) return;
    const updated = conds.map(c => {
      if (c.expr || !latexHasIneq(c.latex || '')) return c;
      return { ...c, expr: latexCondToJs(c.latex) };
    });
    set({ conditions: updated });
  }, []);

  const upd = (i: number, k: 'latex' | 'expr' | 'match', v: string) => {
    const c = [...conds]; c[i] = { ...c[i], [k]: v };
    if (k === 'latex' && mode !== 'select') {
      const auto = latexCondToJs(v);
      if (auto) c[i] = { ...c[i], expr: auto };
    }
    set({ conditions: c });
  };

  // Auto-Fill Zweige aus Quelle
  const fillFromSource = async () => {
    const src = d.source || 'woodType';
    if (src === 'woodType') {
      const woodTable = dbTables.find(t => String(t.title || '').trim().toLowerCase() === 'holzart');
      if (!woodTable) return;
      const full = await loadTableFull(woodTable.id);
      const values = (full?.rows || []).map(row => String(row?.[0] || '').trim()).filter(Boolean);
      const unique = Array.from(new Set<string>(values));
      if (!unique.length) return;
      set({ mode: 'select', source: 'woodType', conditions: unique.map((v, i) => ({ id: 'c' + (i + 1), latex: v, expr: '', match: v })) });
      return;
    }
    // Beliebiges Dropdown: Optionen aus allNodeData lesen
    const nodeData = allNodeData[src];
    if (!nodeData) return;
    let values: string[] = [];
    type Entry = { key: string; label: string };
    let entries: Entry[] = [];
    if (nodeData.mode === 'table' && nodeData.table_ref) {
      const full = await loadTableFull(nodeData.table_ref);
      const labelCol: number = nodeData.label_col != null ? Number(nodeData.label_col) : 1;
      entries = (full?.rows || [])
        .map((row: string[]) => ({ key: String(row[0] || '').trim(), label: String(row[labelCol] ?? row[0] ?? '').trim() }))
        .filter(e => e.key);
    } else if (nodeData.options?.length) {
      entries = (nodeData.options as Array<{ value: string; label: string }>)
        .map(o => ({ key: String(o.value || o.label || '').trim(), label: String(o.label || o.value || '').trim() }))
        .filter(e => e.key);
    }
    if (!entries.length) return;
    set({ mode: 'select', source: src, conditions: entries.map((e, i) => ({ id: 'c' + (i + 1), latex: e.label, expr: '', match: e.label })) });
  };

  // Zeige lesbaren Namen der Quelle
  const sourceName = (() => {
    const src = d.source || 'woodType';
    if (src === 'woodType') return 'Holzart';
    if (src === 'woodClass') return 'Holzklasse';
    const n = selectableNodes.find(n => n.id === src);
    return n ? (n.label || n.name || src) : src;
  })();

  return (
    <Shell id={id} type="condition" selected={selected} extraHandles={
      <>
        {conds.map((c, i) => (
          <Handle key={c.id} id={c.id} type="source" position={Position.Right} style={{ top: 60 + i * 38, background: '#ca8a04', width: 7, height: 7 }} />
        ))}
      </>
    }>
      <div style={lbl}>Bezeichnung</div>
      <F value={d.label} placeholder="Verzweigung" onChange={e => set({ label: e.target.value })} />
      <div style={lbl}>Art</div>
      <select className="nodrag" value={mode} onChange={e => set({ mode: e.target.value as any })} style={inp}>
        <option value="expr">Formel / JS-Bedingung</option>
        <option value="select">Auswahl / Dropdown</option>
      </select>
      {mode === 'select' && (
        <>
          <div style={lbl}>Quelle — <span style={{ fontWeight: 700, color: '#92400e' }}>{sourceName}</span></div>
          <select className="nodrag" value={d.source || 'woodType'}
            onChange={e => set({ source: e.target.value, conditions: [] })} style={inp}>
            <option value="woodType">Holzart (Backend-Tabelle)</option>
            <option value="woodClass">Holzklasse</option>
            {selectableNodes.map(n => (
              <option key={n.id} value={n.id}>{n.label || n.name || n.id}</option>
            ))}
          </select>
        </>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={lbl}>{mode === 'select' ? 'Ausgänge' : 'Bedingungen'}</div>
        <div style={{ display: 'flex', gap: 3 }}>
          {mode === 'select' && (
            <button className="nodrag" onClick={fillFromSource} title="Zweige automatisch aus Dropdown-Optionen erstellen"
              style={{ fontSize: 10, border: 'none', background: '#dbeafe', color: '#1e40af', borderRadius: 4, padding: '1px 6px', cursor: 'pointer' }}>Auto</button>
          )}
          <button className="nodrag" onClick={add} style={{ fontSize: 10, border: 'none', background: '#fde68a', borderRadius: 4, padding: '1px 6px', cursor: 'pointer' }}>+</button>
        </div>
      </div>
      {conds.map((c, i) => (
        <div key={c.id} style={{ borderTop: '1px dashed #e5e7eb', paddingTop: 2, marginTop: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <div style={{ fontSize: 8, color: '#a16207' }}>Zweig {c.id} →</div>
            <button className="nodrag" onClick={() => set({ conditions: conds.filter((_, j) => j !== i) })}
              style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 11, padding: '0 2px', lineHeight: 1 }}>✕</button>
          </div>
          {mode === 'select' ? (
            <>
              <F value={c.latex} placeholder="Anzeige, z.B. II" onChange={e => upd(i, 'latex', e.target.value)} style={{ marginBottom: 2 }} />
              <div style={{ fontSize: 8, color: '#92400e', marginBottom: 1 }}>Vergleichswert</div>
              <F value={c.match || ''} placeholder="Wert (z.B. II)" onChange={e => upd(i, 'match', e.target.value)} style={{ fontFamily: 'monospace', fontSize: 10, background: '#fffbeb', color: '#78350f' }} />
            </>
          ) : (
            <>
              <F value={c.latex} placeholder="h/b > 1" onChange={e => upd(i, 'latex', e.target.value)} style={{ marginBottom: 2 }} />
              {latexHasIneq(c.latex) ? (
                <div style={{ fontSize: 9, color: '#92400e', fontFamily: 'monospace', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 3, padding: '2px 5px', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.expr}>
                  ⚙ {c.expr}
                </div>
              ) : (
                <F value={c.expr} placeholder="(h/b) > 1 ? 1 : 0" onChange={e => upd(i, 'expr', e.target.value)} style={{ fontFamily: 'monospace', background: '#fffbeb' }} />
              )}
            </>
          )}
        </div>
      ))}
    </Shell>
  );
}
