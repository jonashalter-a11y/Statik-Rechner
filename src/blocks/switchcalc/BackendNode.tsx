import React, { useRef } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from '@xyflow/react';
import MathDisplay from '../../components/MathDisplay';
import { nameToLatex } from '../../utils/formatName';
import { latexToJs } from '../../utils/latexToJs';
import { useGraphCtx } from '../../components/admin/graph/graphContext';
import {
  F, LatexArea, NameChips, Shell, UnitField, formulaName, formulaPrefix,
  inp, lbl, updateLatexNamePrefix,
} from '../../components/admin/graph/BlockNodeShared';
import { SwitchCalcData, SwitchCalcOption } from './defaults';

export function SwitchCalcNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as SwitchCalcData;
  const { updateNodeData } = useGraphCtx();
  const set = (p: Partial<SwitchCalcData>) => updateNodeData(id, p);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const setName = (name: string) => {
    const currentOption = d.options.find(o => o.id === d.selectedOptionId);
    if (!currentOption) return;
    const latex = updateLatexNamePrefix(currentOption.latex || '', d.name || '', name);
    const expr = latexToJs(latex);
    set({ name });
    updateOption(d.selectedOptionId, { latex, expr });
  };

  const updateOption = (optionId: string, updates: Partial<SwitchCalcOption>) => {
    const updated = d.options.map(o =>
      o.id === optionId ? { ...o, ...updates } : o
    );
    set({ options: updated });
  };

  const setLatex = (latex: string) => {
    const expr = latexToJs(latex);
    updateOption(d.selectedOptionId, { latex, expr });
  };

  const insertFormulaName = (name: string) => {
    const token = formulaName(name);
    const currentOption = d.options.find(o => o.id === d.selectedOptionId);
    if (!currentOption) return;
    const base = currentOption.latex || formulaPrefix(d.name);
    const input = textareaRef.current;
    const start = input?.selectionStart ?? base.length;
    const end = input?.selectionEnd ?? start;
    const next = base.slice(0, start) + token + base.slice(end);
    setLatex(next);
    window.setTimeout(() => {
      textareaRef.current?.focus();
      const pos = start + token.length;
      textareaRef.current?.setSelectionRange(pos, pos);
    }, 0);
  };

  const currentOption = d.options.find(o => o.id === d.selectedOptionId) || d.options[0];

  const addOption = () => {
    const newId = `opt${Date.now()}`;
    set({
      options: [...d.options, { id: newId, label: 'Neue Option', latex: '', expr: '' }],
    });
  };

  const removeOption = (optionId: string) => {
    if (d.options.length <= 1) return;
    const remaining = d.options.filter(o => o.id !== optionId);
    set({
      options: remaining,
      selectedOptionId: remaining[0]?.id || 'opt1',
    });
  };

  const renameOption = (optionId: string, label: string) => {
    updateOption(optionId, { label });
  };

  return (
    <Shell id={id} type="switchcalc" selected={selected}>
      <div style={lbl}>Ergebnis-Name (LaTeX)</div>
      <F value={d.name} placeholder="c_h" onChange={e => setName(e.target.value)} />
      <div style={{ fontSize: 10, marginTop: 1 }}>
        <MathDisplay latex={d.name ? nameToLatex(d.name) : '?'} />
      </div>

      <div style={lbl}>Bezeichnung</div>
      <F value={d.label} placeholder="Böengeschwindigkeitsdruck" onChange={e => set({ label: e.target.value })} />

      <div style={lbl}>Dropdown-Label</div>
      <F value={d.dropdownLabel} placeholder="Methode" onChange={e => set({ dropdownLabel: e.target.value })} />

      <div style={lbl}>Optionen</div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
        {d.options.map(opt => (
          <div key={opt.id} style={{ display: 'flex', gap: 2 }}>
            <button
              onClick={() => set({ selectedOptionId: opt.id })}
              style={{
                padding: '4px 8px',
                background: d.selectedOptionId === opt.id ? '#ea580c' : '#e5e7eb',
                color: d.selectedOptionId === opt.id ? '#fff' : '#000',
                border: 'none',
                borderRadius: 3,
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              {opt.label}
            </button>
            <input
              type="text"
              value={opt.label}
              onChange={e => renameOption(opt.id, e.target.value)}
              placeholder="Label"
              style={{ padding: '4px', width: 80, fontSize: 12 }}
            />
            <button
              onClick={() => removeOption(opt.id)}
              disabled={d.options.length <= 1}
              style={{
                padding: '4px 8px',
                background: '#fee2e2',
                color: '#dc2626',
                border: 'none',
                borderRadius: 3,
                cursor: d.options.length > 1 ? 'pointer' : 'not-allowed',
                fontSize: 12,
              }}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={addOption}
          style={{
            padding: '4px 8px',
            background: '#d1fae5',
            color: '#059669',
            border: 'none',
            borderRadius: 3,
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          + Option
        </button>
      </div>

      <div style={{ ...inp, background: '#f3f4f6', padding: 6, borderRadius: 4, marginBottom: 8 }}>
        <strong style={{ fontSize: 12 }}>Option: {currentOption.label}</strong>
      </div>

      <div style={lbl}>Formel (LaTeX)</div>
      <LatexArea
        elRef={textareaRef}
        value={currentOption.latex}
        placeholder={d.name ? `${formulaName(d.name)} = ...` : 'c_h = ...'}
        onChange={setLatex}
        style={{ ...inp, minHeight: 48, fontFamily: 'monospace', resize: 'vertical' }}
      />
      {currentOption.latex && (
        <div style={{ background: '#fff', borderRadius: 3, padding: 3, marginTop: 2, overflowX: 'auto', fontSize: 10 }}>
          <MathDisplay latex={currentOption.latex} display />
        </div>
      )}
      <NameChips targetId={id} onInsert={insertFormulaName} />

      <div style={lbl}>Einheit</div>
      <UnitField value={d.unit} onChange={unit => set({ unit })} placeholder="-" />
    </Shell>
  );
}
