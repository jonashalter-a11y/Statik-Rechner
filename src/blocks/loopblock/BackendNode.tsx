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

// ── ⟳ Schleifenblock ────────────────────────────────────────────────────────
export function LoopBlockNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as LoopBlockData;
  const { updateNodeData } = useGraphCtx();
  const set = (p: Partial<LoopBlockData>) => updateNodeData(id, p);
  const uid = () => Math.random().toString(36).slice(2, 8);
  const [dragOptIndex, setDragOptIndex] = useState<number | null>(null);
  const [dragOptHoverIndex, setDragOptHoverIndex] = useState<number | null>(null);
  const dragOptFromRef = useRef<number | null>(null);

  // Vars
  const addVar = () => set({ vars: [...(d.vars || []), { id: uid(), name: '', label: '', unit: '', default_value: '0' }] });
  const setVar = (i: number, p: Partial<GroupCalcVar>) => { const a = [...(d.vars || [])]; a[i] = { ...a[i], ...p }; set({ vars: a }); };
  const delVar = (i: number) => set({ vars: (d.vars || []).filter((_, j) => j !== i) });
  const nextVarScope = (scope?: GroupCalcVar['scope']): GroupCalcVar['scope'] => scope === 'global' ? 'layer' : scope === 'last' ? 'global' : 'last';
  const nextOutScope = (scope?: GroupCalcOutput['scope']): GroupCalcOutput['scope'] => scope === 'last' ? 'layer' : 'last';
  const scopeButtonStyle = (scope?: 'layer' | 'last' | 'global') => {
    if (scope === 'global') return { background: '#fef3c7', borderColor: '#f59e0b', color: '#92400e' };
    if (scope === 'last') return { background: '#eff6ff', borderColor: '#93c5fd', color: '#1d4ed8' };
    return { background: '#f0fdf4', borderColor: '#86efac', color: '#166534' };
  };
  const scopeLabel = (scope?: 'layer' | 'last' | 'global') => scope === 'global' ? '🌐 Global' : scope === 'last' ? '🔚 letzte' : '🔁 /Schicht';
  const optionsToText = (options?: { label: string; value: string }[]) =>
    (options || []).map(o => `${o.label}=${o.value}`).join('\n');
  const textToOptions = (text: string) =>
    text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const [label, ...rest] = line.split('=');
        const value = rest.length ? rest.join('=').trim() : label.trim();
        return { label: label.trim(), value };
      });
  // Outputs
  const addOut = () => set({ outputs: [...(d.outputs || []), { id: uid(), name: '', label: '', unit: '' }] });
  const setOut = (i: number, p: Partial<GroupCalcOutput>) => { const a = [...(d.outputs || [])]; a[i] = { ...a[i], ...p }; set({ outputs: a }); };
  const delOut = (i: number) => set({ outputs: (d.outputs || []).filter((_, j) => j !== i) });
  // Options
  const addOpt = () => set({ options: [...(d.options || []), { id: uid(), label: '', category: (d.option_categories || [])[0] || '', formulas: {} }] });
  const setOptLabel = (i: number, label: string) => { const a = [...(d.options || [])]; a[i] = { ...a[i], label }; set({ options: a }); };
  const setOptCategory = (i: number, category: string) => { const a = [...(d.options || [])]; a[i] = { ...a[i], category }; set({ options: a }); };
  const setOptFormula = (i: number, outId: string, formula: string) => {
    const a = [...(d.options || [])]; a[i] = { ...a[i], formulas: { ...a[i].formulas, [outId]: formula } }; set({ options: a });
  };
  const addOptCalc = (i: number) => {
    const a = [...(d.options || [])];
    a[i] = { ...a[i], calcs: [...(a[i].calcs || []), { id: uid(), name: '', label: '', unit: '', formula: '' }] };
    set({ options: a });
  };
  const setOptCalc = (i: number, ci: number, patch: Partial<NonNullable<GroupCalcOption['calcs']>[number]>) => {
    const a = [...(d.options || [])];
    const calcs = [...(a[i].calcs || [])];
    calcs[ci] = { ...calcs[ci], ...patch };
    a[i] = { ...a[i], calcs };
    set({ options: a });
  };
  const delOptCalc = (i: number, ci: number) => {
    const a = [...(d.options || [])];
    a[i] = { ...a[i], calcs: (a[i].calcs || []).filter((_, j) => j !== ci) };
    set({ options: a });
  };
  const addOptCase = (i: number, outId: string) => {
    const a = [...(d.options || [])];
    const cases = a[i].formulaCases || {};
    a[i] = {
      ...a[i],
      formulaCases: {
        ...cases,
        [outId]: [...(cases[outId] || []), { id: uid(), cond_expr: '', formula: '' }],
      },
    };
    set({ options: a });
  };
  const setOptCase = (i: number, outId: string, caseIdx: number, patch: Partial<NonNullable<GroupCalcOption['formulaCases']>[string][number]>) => {
    const a = [...(d.options || [])];
    const formulaCases = { ...(a[i].formulaCases || {}) };
    const cases = [...(formulaCases[outId] || [])];
    cases[caseIdx] = { ...cases[caseIdx], ...patch };
    formulaCases[outId] = cases;
    a[i] = { ...a[i], formulaCases };
    set({ options: a });
  };
  const delOptCase = (i: number, outId: string, caseIdx: number) => {
    const a = [...(d.options || [])];
    const formulaCases = { ...(a[i].formulaCases || {}) };
    formulaCases[outId] = (formulaCases[outId] || []).filter((_, j) => j !== caseIdx);
    a[i] = { ...a[i], formulaCases };
    set({ options: a });
  };
  const delOpt = (i: number) => set({ options: (d.options || []).filter((_, j) => j !== i) });
  const moveOpt = (i: number, dir: -1 | 1) => {
    const a = [...(d.options || [])];
    const j = i + dir;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    set({ options: a });
  };
  const moveOptTo = (from: number, to: number) => {
    if (from === to) return;
    const a = [...(d.options || [])];
    if (from < 0 || to < 0 || from >= a.length || to >= a.length) return;
    const [item] = a.splice(from, 1);
    a.splice(to, 0, item);
    set({ options: a });
  };
  const startOptDrag = (event: React.PointerEvent<HTMLButtonElement>, from: number) => {
    if (options.length < 2) return;
    event.preventDefault();
    event.stopPropagation();
    dragOptFromRef.current = from;
    setDragOptIndex(from);
    setDragOptHoverIndex(from);
    document.body.style.cursor = 'grabbing';

    let hover = from;
    const onPointerMove = (moveEvent: PointerEvent) => {
      const el = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY) as HTMLElement | null;
      const target = el?.closest('[data-loop-option-index]') as HTMLElement | null;
      const next = target ? Number(target.dataset.loopOptionIndex) : NaN;
      if (!Number.isFinite(next)) return;
      hover = next;
      setDragOptHoverIndex(next);
    };
    const onPointerUp = () => {
      const source = dragOptFromRef.current;
      if (source !== null && Number.isFinite(hover)) moveOptTo(source, hover);
      dragOptFromRef.current = null;
      setDragOptIndex(null);
      setDragOptHoverIndex(null);
      document.body.style.cursor = '';
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };
  // Frei definierbare Material-Kategorien für das Dropdown je Material.
  const addCategory = () => set({ option_categories: [...(d.option_categories || []), `Kategorie ${(d.option_categories || []).length + 1}`] });
  const setCategory = (i: number, value: string) => {
    const categories = [...(d.option_categories || [])];
    const oldValue = categories[i];
    categories[i] = value;
    set({
      option_categories: categories,
      options: (d.options || []).map(opt => (opt.category === oldValue ? { ...opt, category: value } : opt)),
    });
  };
  const delCategory = (i: number) => {
    const categories = d.option_categories || [];
    const deleted = categories[i];
    set({
      option_categories: categories.filter((_, j) => j !== i),
      options: (d.options || []).map(opt => (opt.category === deleted ? { ...opt, category: '' } : opt)),
    });
  };
  // Aggregations
  const addAggr = () => set({ aggregations: [...(d.aggregations || []), { output_id: '', method: 'sum', name: '', label: '', unit: '' }] });
  const setAggr = (i: number, p: Partial<LoopBlockAggr>) => { const a = [...(d.aggregations || [])]; a[i] = { ...a[i], ...p }; set({ aggregations: a }); };
  const delAggr = (i: number) => set({ aggregations: (d.aggregations || []).filter((_, j) => j !== i) });

  const outputs = d.outputs || [];
  const options = d.options || [];
  const categories = d.option_categories || [];

  return (
    <Shell id={id} type="loopblock" selected={selected}>
      <div style={lbl}>Block-Titel</div>
      <F value={d.label || ''} placeholder="Beplankungsnachweis Schichten" onChange={e => set({ label: e.target.value })} />
      <div style={{ display: 'flex', gap: 4 }}>
        <div style={{ flex: 1 }}>
          <div style={lbl}>Anzahl-Bezeichnung</div>
          <F value={d.count_label || ''} placeholder="Anzahl Schichten n" onChange={e => set({ count_label: e.target.value })} />
        </div>
        <div style={{ flex: 0 }}>
          <div style={lbl}>Max</div>
          <F value={String(d.max_count || 10)} placeholder="10" style={{ width: 40 }} onChange={e => set({ max_count: Number(e.target.value) || 10 })} />
        </div>
      </div>
      <div style={lbl}>Dropdown-Bezeichnung</div>
      <F value={d.dropdown_label || ''} placeholder="Material / Schicht" onChange={e => set({ dropdown_label: e.target.value })} />

      {/* Material-Kategorien */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <div style={lbl}>Material-Kategorien</div>
        <button className="nodrag" onClick={addCategory} style={{ fontSize: 10, border: 'none', background: '#fed7aa', borderRadius: 4, padding: '1px 6px', cursor: 'pointer' }}>+</button>
      </div>
      {categories.map((cat, i) => (
        <div key={`category_${i}`} style={{ display: 'flex', gap: 2, alignItems: 'center', marginBottom: 2 }}>
          <F value={cat} placeholder="Hohlraum" onChange={e => setCategory(i, e.target.value)} style={{ flex: 1 }} />
          <button className="nodrag" onClick={() => delCategory(i)} style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 11, padding: '0 2px' }}>✕</button>
        </div>
      ))}

      {/* Variablen */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <div style={lbl}>Variablen pro Schicht</div>
        <button className="nodrag" onClick={addVar} style={{ fontSize: 10, border: 'none', background: '#fed7aa', borderRadius: 4, padding: '1px 6px', cursor: 'pointer' }}>+</button>
      </div>
      <div style={{ fontSize: 8, color: '#9ca3af', marginBottom: 2 }}>Name · Bezeichnung · Einheit · Standard · Scope</div>
      {(d.vars || []).map((v, i) => (
        <div key={v.id} style={{ marginBottom: 3 }}>
          <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <F value={v.name} placeholder="d" onChange={e => setVar(i, { name: e.target.value })} style={{ flex: 1 }} />
            <F value={v.label} placeholder="Dicke" onChange={e => setVar(i, { label: e.target.value })} style={{ flex: 2 }} />
            <F value={v.unit} placeholder="mm" onChange={e => setVar(i, { unit: e.target.value })} style={{ flex: 0.8 }} />
            {v.inputKind === 'dropdown' ? (
              <select className="nodrag" value={v.default_value} onChange={e => setVar(i, { default_value: e.target.value })} style={{ ...inp, flex: 0.8 }}>
                {(v.options || []).map(o => <option key={`${o.label}_${o.value}`} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <F value={v.default_value} placeholder="15" onChange={e => setVar(i, { default_value: e.target.value })} style={{ flex: 0.8 }} />
            )}
            <select
              className="nodrag"
              value={v.inputKind || 'number'}
              onChange={e => {
                const inputKind = e.target.value as GroupCalcVar['inputKind'];
                setVar(i, inputKind === 'dropdown'
                  ? { inputKind, options: v.options?.length ? v.options : [{ label: 'Decke', value: '0' }, { label: 'Wand', value: '1' }], default_value: v.default_value || '1' }
                  : { inputKind });
              }}
              style={{ ...inp, flex: '0 0 74px' }}
            >
              <option value="number">Zahl</option>
              <option value="dropdown">Dropdown</option>
            </select>
            <button
              className="nodrag"
              title="Scope umschalten: pro Schicht → nur letzte → Global"
              onClick={() => setVar(i, { scope: nextVarScope(v.scope) })}
              style={{ flex: '0 0 auto', fontSize: 9, border: '1px solid', borderRadius: 3, padding: '1px 4px', cursor: 'pointer', ...scopeButtonStyle(v.scope), whiteSpace: 'nowrap' }}
            >{scopeLabel(v.scope)}</button>
            <button className="nodrag" onClick={() => delVar(i)} style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 11, padding: '0 2px' }}>✕</button>
          </div>
          {v.inputKind === 'dropdown' && (
            <textarea
              className="nodrag"
              value={optionsToText(v.options)}
              onChange={e => setVar(i, { options: textToOptions(e.target.value) })}
              placeholder={'Decke=0\nWand=1'}
              style={{ ...inp, width: '100%', minHeight: 38, marginTop: 2, fontSize: 10, resize: 'vertical' }}
            />
          )}
        </div>
      ))}
      {(d.vars || []).length > 0 && <div style={{ fontSize: 7, color: '#9ca3af', marginBottom: 2 }}>Name · Bezeichnung · Einheit · Standard</div>}

      {/* Ausgaben */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <div style={lbl}>Ausgaben pro Schicht</div>
        <button className="nodrag" onClick={addOut} style={{ fontSize: 10, border: 'none', background: '#fed7aa', borderRadius: 4, padding: '1px 6px', cursor: 'pointer' }}>+</button>
      </div>
      {outputs.map((o, i) => (
        <div key={o.id} style={{ display: 'flex', gap: 2, alignItems: 'center', marginBottom: 2 }}>
          <F value={o.name} placeholder="t_{prot,0,i}" onChange={e => setOut(i, { name: e.target.value })} style={{ flex: 2 }} />
          <F value={o.label} placeholder="Schutzzeit" onChange={e => setOut(i, { label: e.target.value })} style={{ flex: 2 }} />
          <F value={o.unit} placeholder="min" onChange={e => setOut(i, { unit: e.target.value })} style={{ flex: 0.8 }} />
          <button
            className="nodrag"
            title="Scope umschalten: pro Schicht → nur letzte"
            onClick={() => setOut(i, { scope: nextOutScope(o.scope) })}
            style={{ flex: '0 0 auto', fontSize: 9, border: '1px solid', borderRadius: 3, padding: '1px 4px', cursor: 'pointer', ...scopeButtonStyle(o.scope), whiteSpace: 'nowrap' }}
          >{scopeLabel(o.scope)}</button>
          <button className="nodrag" onClick={() => delOut(i)} style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 11, padding: '0 2px' }}>✕</button>
        </div>
      ))}

      {/* Materialien */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <div style={lbl}>Materialien</div>
        <button className="nodrag" onClick={addOpt} style={{ fontSize: 10, border: 'none', background: '#fed7aa', borderRadius: 4, padding: '1px 6px', cursor: 'pointer' }}>+</button>
      </div>
      {options.map((opt, oi) => (
        <div
          key={opt.id}
          data-loop-option-index={oi}
          style={{
            background: '#fff7f0',
            border: dragOptHoverIndex === oi && dragOptIndex !== null && dragOptIndex !== oi ? '2px solid #ea580c' : '1px solid #fb923c',
            borderRadius: 4,
            padding: dragOptHoverIndex === oi && dragOptIndex !== null && dragOptIndex !== oi ? '3px 4px' : '4px 5px',
            marginBottom: 4,
            opacity: dragOptIndex === oi ? 0.55 : 1,
          }}
        >
          <div style={{ display: 'flex', gap: 2, alignItems: 'center', marginBottom: 3 }}>
            <button
              className="nodrag"
              onPointerDown={e => startOptDrag(e, oi)}
              title="Material ziehen und neu sortieren"
              style={{
                flex: '0 0 22px',
                height: 23,
                border: '1px solid #fed7aa',
                background: '#fff',
                color: '#c2410c',
                borderRadius: 4,
                cursor: dragOptIndex === oi ? 'grabbing' : 'grab',
                fontSize: 12,
                lineHeight: 1,
                padding: 0,
              }}
            >↕</button>
            <F value={opt.label} placeholder="Mineralwolle ≥ 26 kg/m³" onChange={e => setOptLabel(oi, e.target.value)} style={{ flex: 1 }} />
            <select
              className="nodrag"
              value={opt.category || ''}
              onChange={e => setOptCategory(oi, e.target.value)}
              title="Material-Kategorie"
              style={{ ...inp, flex: '0 0 110px', fontSize: 9, height: 23 }}
            >
              <option value="">Typ</option>
              {categories.map((cat, i) => (
                <option key={`category_option_${i}`} value={cat}>{cat}</option>
              ))}
            </select>
            <button
              className="nodrag"
              disabled={oi === 0}
              onClick={() => moveOpt(oi, -1)}
              title="Material nach oben schieben"
              style={{
                border: '1px solid #fed7aa',
                background: oi === 0 ? '#f3f4f6' : '#fff',
                color: oi === 0 ? '#cbd5e1' : '#c2410c',
                borderRadius: 4,
                cursor: oi === 0 ? 'not-allowed' : 'pointer',
                fontSize: 9,
                padding: '2px 5px',
                whiteSpace: 'nowrap',
              }}
            >Hoch</button>
            <button
              className="nodrag"
              disabled={oi === options.length - 1}
              onClick={() => moveOpt(oi, 1)}
              title="Material nach unten schieben"
              style={{
                border: '1px solid #fed7aa',
                background: oi === options.length - 1 ? '#f3f4f6' : '#fff',
                color: oi === options.length - 1 ? '#cbd5e1' : '#c2410c',
                borderRadius: 4,
                cursor: oi === options.length - 1 ? 'not-allowed' : 'pointer',
                fontSize: 9,
                padding: '2px 5px',
                whiteSpace: 'nowrap',
              }}
            >Runter</button>
            <button className="nodrag" onClick={() => delOpt(oi)} style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 11, padding: '0 2px' }}>✕</button>
          </div>
          <div style={{ fontSize: 7.5, color: '#9ca3af', marginBottom: 3 }}>
            Verfügbare Symbole: i, n, Eingaben, vorherige Summen als sum_OUTPUT_prev (z.B. sum_tprot_prev), letztes Ergebnis als prev_OUTPUT.
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '3px 0' }}>
            <div style={{ fontSize: 8, color: '#c2410c', fontWeight: 700 }}>Zusatzrechnungen je Schicht</div>
            <button className="nodrag" onClick={() => addOptCalc(oi)} style={{ fontSize: 9, border: 'none', background: '#fed7aa', borderRadius: 3, padding: '1px 5px', cursor: 'pointer' }}>+</button>
          </div>
          {(opt.calcs || []).map((calc, ci) => (
            <div key={calc.id} style={{ background: '#fff', border: '1px solid #fed7aa', borderRadius: 3, padding: 4, marginBottom: 4 }}>
              <div style={{ display: 'flex', gap: 2, alignItems: 'center', marginBottom: 2 }}>
                <F value={calc.name} placeholder="k_{pos,exp,i}" onChange={e => setOptCalc(oi, ci, { name: e.target.value })} style={{ flex: 1.4 }} />
                <F value={calc.label} placeholder="Positionsbeiwert" onChange={e => setOptCalc(oi, ci, { label: e.target.value })} style={{ flex: 1.6 }} />
                <F value={calc.unit} placeholder="-" onChange={e => setOptCalc(oi, ci, { unit: e.target.value })} style={{ flex: 0.6 }} />
                <button className="nodrag" onClick={() => delOptCalc(oi, ci)} style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 11, padding: '0 2px' }}>✕</button>
              </div>
              <LatexArea
                value={calc.cond_expr || ''}
                onChange={v => setOptCalc(oi, ci, { cond_expr: v })}
                placeholder="Bedingung optional, z.B. sum_tprot_prev <= tprot / 2"
                style={{ ...inp, fontFamily: 'monospace', fontSize: 8.5, minHeight: 24, marginBottom: 2 }}
              />
              <LatexArea
                value={calc.formula || ''}
                onChange={v => setOptCalc(oi, ci, { formula: v })}
                placeholder="Formel, z.B. 1 - 0.6 * sum_tprot_prev / tprot"
                style={{ ...inp, fontFamily: 'monospace', fontSize: 8.5, minHeight: 28, background: '#ffffbf' }}
              />
            </div>
          ))}
          {outputs.map(o => (
            <div key={o.id} style={{ marginBottom: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <div style={{ fontSize: 7.5, color: '#c2410c', fontWeight: 600, marginBottom: 1 }}>{o.name || o.label || o.id}</div>
                <button className="nodrag" onClick={() => addOptCase(oi, o.id)} style={{ fontSize: 8.5, border: 'none', background: '#fed7aa', borderRadius: 3, padding: '1px 5px', cursor: 'pointer' }}>+ Bedingung</button>
              </div>
              <LatexArea
                value={opt.formulas?.[o.id] ?? ''}
                onChange={v => setOptFormula(oi, o.id, v)}
                placeholder="Standard-Formel (Fallback, wenn keine Bedingung passt)"
                style={{ ...inp, fontFamily: 'monospace', fontSize: 8.5, minHeight: 28 }}
              />
              {(opt.formulaCases?.[o.id] || []).map((c, ci) => (
                <div key={c.id} style={{ background: '#fff', border: '1px solid #fed7aa', borderRadius: 3, padding: 3, marginTop: 2 }}>
                  <div style={{ display: 'flex', gap: 2, alignItems: 'center', marginBottom: 2 }}>
                    <LatexArea
                      value={c.cond_expr || ''}
                      onChange={v => setOptCase(oi, o.id, ci, { cond_expr: v })}
                      placeholder="Bedingung leer = sonst, z.B. sum_tprot_prev <= tprot / 2"
                      style={{ ...inp, flex: 1, fontFamily: 'monospace', fontSize: 8.5, minHeight: 24 }}
                    />
                    <button className="nodrag" onClick={() => delOptCase(oi, o.id, ci)} style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 11, padding: '0 2px' }}>✕</button>
                  </div>
                  <LatexArea
                    value={c.formula || ''}
                    onChange={v => setOptCase(oi, o.id, ci, { formula: v })}
                    placeholder="Formel für diesen Fall"
                    style={{ ...inp, fontFamily: 'monospace', fontSize: 8.5, minHeight: 28, background: '#ffffbf' }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}

      {/* Aggregationen */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <div style={lbl}>Aggregationen (Gesamtwerte)</div>
        <button className="nodrag" onClick={addAggr} style={{ fontSize: 10, border: 'none', background: '#fed7aa', borderRadius: 4, padding: '1px 6px', cursor: 'pointer' }}>+</button>
      </div>
      {(d.aggregations || []).map((ag, i) => (
        <div key={i} style={{ display: 'flex', gap: 2, alignItems: 'center', marginBottom: 2 }}>
          <select className="nodrag" value={ag.output_id} onChange={e => setAggr(i, { output_id: e.target.value })} style={{ ...inp, flex: 1.5 }}>
            <option value="">— Ausgabe —</option>
            {outputs.map(o => <option key={o.id} value={o.id}>{o.name || o.id}</option>)}
          </select>
          <select className="nodrag" value={ag.method} onChange={e => setAggr(i, { method: e.target.value as any })} style={{ ...inp, flex: 1 }}>
            <option value="sum">Σ Summe</option>
            <option value="last">Letzte</option>
            <option value="max">Max</option>
            <option value="min">Min</option>
            <option value="expr">Ausdruck</option>
          </select>
          <F value={ag.name} placeholder="t_{prot,0}" onChange={e => setAggr(i, { name: e.target.value })} style={{ flex: 1.5 }} />
          <F value={ag.unit} placeholder="min" onChange={e => setAggr(i, { unit: e.target.value })} style={{ flex: 0.8 }} />
          <button className="nodrag" onClick={() => delAggr(i)} style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 11, padding: '0 2px' }}>✕</button>
          {ag.method === 'expr' && (
            <F value={ag.expr || ''} placeholder="sum_tprot_before_last + last_tins" onChange={e => setAggr(i, { expr: e.target.value } as any)} style={{ flex: 2 }} />
          )}
        </div>
      ))}
      {(d.aggregations || []).length > 0 && <div style={{ fontSize: 7, color: '#9ca3af' }}>Ausgabe · Methode · Symbol · Einheit</div>}
    </Shell>
  );
}
