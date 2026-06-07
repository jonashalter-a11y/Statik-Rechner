import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import MathDisplay from '../../MathDisplay';
import { nameToLatex } from '../../../utils/formatName';
import { latexToJs } from '../../../utils/latexToJs';
import { useGraphCtx, DbTableFull } from './graphContext';
import {
  VariableData, DropdownData, WoodClassData, TableValueData, CalcData,
  StdCalcData, TableCalcData, ConditionData, OutputData,
} from '../../../types/graph';

// ── Block-Stil je Typ ────────────────────────────────────────────────────────
const THEME: Record<string, { bg: string; border: string; icon: string; label: string }> = {
  variable:   { bg: '#f5f3ff', border: '#7c3aed', icon: '🟪', label: 'Variabel' },
  dropdown:   { bg: '#fff7ed', border: '#ea580c', icon: '🟧', label: 'Dropdown' },
  woodclass:  { bg: '#fefce8', border: '#ca8a04', icon: '🟨', label: 'Holzklasse' },
  tablevalue: { bg: '#f0fdf4', border: '#16a34a', icon: '🟩', label: 'Tabellenwert' },
  calc:       { bg: '#fef2f2', border: '#dc2626', icon: '🟥', label: 'Rechnung' },
  stdcalc:    { bg: '#f5f0e8', border: '#92400e', icon: '🟫', label: 'Std-Berechnung' },
  tablecalc:  { bg: '#eff6ff', border: '#2563eb', icon: '🟦', label: 'Tabellenberechnung' },
  condition:  { bg: '#fefce8', border: '#ca8a04', icon: '🔶', label: 'Bedingung' },
  output:     { bg: '#f9fafb', border: '#6b7280', icon: '⬜', label: 'PDF / Ausgabe' },
};

const inp: React.CSSProperties = {
  border: '1px solid #d1d5db', borderRadius: 4, padding: '3px 6px',
  fontSize: 11, width: '100%', boxSizing: 'border-box',
};
const lbl: React.CSSProperties = { fontSize: 9, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 1, marginTop: 4 };

function Shell({ id, type, children, extraHandles }: { id: string; type: string; children: React.ReactNode; extraHandles?: React.ReactNode }) {
  const { removeNode } = useGraphCtx();
  const t = THEME[type];
  return (
    <div style={{ background: t.bg, border: `2px solid ${t.border}`, borderRadius: 10, width: 230, fontFamily: '-apple-system, sans-serif', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
      <Handle type="target" position={Position.Left} style={{ background: t.border, width: 9, height: 9 }} />
      <div style={{ background: t.border, color: '#fff', padding: '4px 8px', borderRadius: '7px 7px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, fontWeight: 600 }}>
        <span>{t.icon} {t.label}</span>
        <button className="nodrag" onClick={() => removeNode(id)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12, lineHeight: 1 }}>✕</button>
      </div>
      <div style={{ padding: 8 }}>{children}</div>
      {extraHandles ?? <Handle type="source" position={Position.Right} style={{ background: t.border, width: 9, height: 9 }} />}
    </div>
  );
}

const F = (props: React.InputHTMLAttributes<HTMLInputElement>) => <input className="nodrag" {...props} style={{ ...inp, ...(props.style || {}) }} />;

function UnitField({ value, onChange, placeholder = 'kN/m^2' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  const { unitOptions } = useGraphCtx();
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const options = value && !unitOptions.includes(value) ? [value, ...unitOptions] : unitOptions;
  const saveUnit = () => {
    const next = draft.trim();
    if (!next) return;
    onChange(next);
    setDraft('');
    setModalOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        className="nodrag"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', minHeight: 34, boxSizing: 'border-box',
          border: '1px solid #d1d5db', borderRadius: 6, background: '#fff',
          padding: '5px 28px 5px 8px', cursor: 'pointer', textAlign: 'left',
          position: 'relative', fontSize: 13,
        }}
      >
        {value ? <MathDisplay latex={value} /> : <span style={{ color: '#9ca3af' }}>Einheit wählen</span>}
        <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-52%)', color: '#374151', fontSize: 15 }}>⌄</span>
      </button>
      {open && (
        <div className="nodrag" style={{
          position: 'absolute', left: 0, right: 0, top: 'calc(100% + 3px)', zIndex: 50,
          background: '#fff', border: '1px solid #d1d5db', borderRadius: 6,
          boxShadow: '0 8px 22px rgba(15,23,42,0.14)', overflow: 'hidden',
        }}>
          {options.length === 0 && (
            <div style={{ padding: '7px 8px', color: '#9ca3af', fontSize: 11 }}>Noch keine Einheiten</div>
          )}
          {options.map(unit => (
            <button
              key={unit}
              type="button"
              className="nodrag"
              onClick={() => { onChange(unit); setOpen(false); }}
              style={{
                display: 'block', width: '100%', border: 'none',
                borderBottom: '1px solid #f1f5f9', background: unit === value ? '#eff6ff' : '#fff',
                padding: '7px 8px', cursor: 'pointer', textAlign: 'left', fontSize: 13,
              }}
            >
              <MathDisplay latex={unit} />
            </button>
          ))}
          <button
            type="button"
            className="nodrag"
            onClick={() => {
              setOpen(false);
              setDraft('');
              setModalOpen(true);
            }}
            style={{
              display: 'block', width: '100%', border: 'none', background: '#f8fafc',
              padding: '7px 8px', cursor: 'pointer', textAlign: 'left',
              color: '#1e40af', fontWeight: 700, fontSize: 11,
            }}
          >
            + Neue Einheit...
          </button>
        </div>
      )}
      {modalOpen && (
        <div className="nodrag" style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(15, 23, 42, 0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: 360, background: '#fff', borderRadius: 8, boxShadow: '0 20px 50px rgba(15,23,42,0.25)', overflow: 'hidden', fontFamily: '-apple-system, sans-serif' }}>
            <div style={{ background: '#2563eb', color: '#fff', padding: '10px 14px', fontWeight: 700, fontSize: 15 }}>
              Neue Einheit
            </div>
            <div style={{ padding: 14 }}>
              <div style={lbl}>LaTeX-Code</div>
              <F
                autoFocus
                value={draft}
                placeholder={placeholder}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveUnit(); } }}
                style={{ fontFamily: 'monospace', fontSize: 14, padding: '7px 9px' }}
              />
              <div style={lbl}>Vorschau</div>
              <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 5, padding: 8, minHeight: 34 }}>
                {draft.trim() ? <MathDisplay latex={draft.trim()} /> : <span style={{ color: '#9ca3af' }}>Noch keine Einheit</span>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                <button
                  type="button"
                  className="nodrag"
                  onClick={() => setModalOpen(false)}
                  style={{ border: '1px solid #d1d5db', background: '#fff', borderRadius: 5, padding: '6px 12px', cursor: 'pointer' }}
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  className="nodrag"
                  onClick={saveUnit}
                  style={{ border: 'none', background: '#2563eb', color: '#fff', borderRadius: 5, padding: '6px 12px', cursor: 'pointer', fontWeight: 700 }}
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 🟪 Variabel ──────────────────────────────────────────────────────────────
export function VariableNode({ id, data }: NodeProps) {
  const d = data as unknown as VariableData;
  const { updateNodeData, dbTables, loadTableFull } = useGraphCtx();
  const set = (p: Partial<VariableData>) => updateNodeData(id, p);
  const [headers, setHeaders] = useState<string[]>([]);
  useEffect(() => {
    if (d.inputKind === 'table_column' && d.table_ref) loadTableFull(d.table_ref).then(t => setHeaders(t?.headers || []));
  }, [d.inputKind, d.table_ref]);
  return (
    <Shell id={id} type="variable">
      <div style={lbl}>Name (LaTeX)</div>
      <F value={d.name} placeholder="q_0" onChange={e => set({ name: e.target.value })} />
      <div style={{ fontSize: 11, marginTop: 2 }}><MathDisplay latex={d.name ? nameToLatex(d.name) : '?'} /></div>
      <div style={lbl}>Bezeichnung</div>
      <F value={d.label} placeholder="Referenz-Staudruck" onChange={e => set({ label: e.target.value })} />
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={lbl}>Einheit</div>
          <UnitField value={d.unit} onChange={unit => set({ unit })} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={lbl}>Standard</div>
          <F value={d.default_value} placeholder="0" onChange={e => set({ default_value: e.target.value })} />
        </div>
      </div>
      <div style={lbl}>Eingabe-Art</div>
      <select className="nodrag" value={d.inputKind || 'number'} onChange={e => set({ inputKind: e.target.value as any })} style={inp}>
        <option value="number">Zahl</option>
        <option value="dropdown">Feste Optionen</option>
        <option value="table_column">Tabellen-Spalte</option>
      </select>
      {d.inputKind === 'table_column' && (
        <>
          <div style={lbl}>Tabelle</div>
          <select className="nodrag" value={d.table_ref || ''} onChange={e => set({ table_ref: e.target.value, table_col: 0 })} style={inp}>
            <option value="">— wählen —</option>
            {dbTables.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          {headers.length > 0 && (
            <>
              <div style={lbl}>Spalte</div>
              <select className="nodrag" value={d.table_col ?? 0} onChange={e => set({ table_col: Number(e.target.value) })} style={inp}>
                {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
              </select>
            </>
          )}
        </>
      )}
    </Shell>
  );
}

// ── 🟧 Dropdown ──────────────────────────────────────────────────────────────
export function DropdownNode({ id, data }: NodeProps) {
  const d = data as unknown as DropdownData;
  const { updateNodeData, dbTables, loadTableFull } = useGraphCtx();
  const set = (p: Partial<DropdownData>) => updateNodeData(id, p);
  const [headers, setHeaders] = useState<string[]>([]);
  useEffect(() => {
    if ((d.mode === 'table' || d.mode === 'table_column') && d.table_ref) loadTableFull(d.table_ref).then(t => setHeaders(t?.headers || []));
  }, [d.mode, d.table_ref]);
  const addOpt = () => set({ options: [...(d.options || []), { label: '', value: '' }] });
  const updOpt = (i: number, k: 'label' | 'value', v: string) => { const o = [...(d.options || [])]; o[i] = { ...o[i], [k]: v }; set({ options: o }); };
  return (
    <Shell id={id} type="dropdown">
      <div style={lbl}>Bezeichnung</div>
      <F value={d.label} placeholder="Geländekategorie" onChange={e => set({ label: e.target.value })} />
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
          <div style={lbl}>Name (für Wert, optional)</div>
          <F value={d.name || ''} placeholder="GK" onChange={e => set({ name: e.target.value })} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={lbl}>Optionen</div>
            <button className="nodrag" onClick={addOpt} style={{ fontSize: 10, border: 'none', background: '#fed7aa', borderRadius: 4, padding: '1px 6px', cursor: 'pointer' }}>+</button>
          </div>
          {(d.options || []).map((o, i) => (
            <div key={i} style={{ display: 'flex', gap: 3, marginBottom: 2 }}>
              <F value={o.label} placeholder="Label" onChange={e => updOpt(i, 'label', e.target.value)} style={{ flex: 2 }} />
              <F value={o.value} placeholder="Wert" onChange={e => updOpt(i, 'value', e.target.value)} style={{ flex: 1 }} />
            </div>
          ))}
        </>
      )}
    </Shell>
  );
}

// ── 🟨 Holzklasse ───────────────────────────────────────────────────────────
export function WoodClassNode({ id, data }: NodeProps) {
  const d = data as unknown as WoodClassData;
  const { updateNodeData } = useGraphCtx();
  const set = (p: Partial<WoodClassData>) => updateNodeData(id, p);
  return (
    <Shell id={id} type="woodclass">
      <div style={{ fontSize: 10, color: '#92400e', marginBottom: 4 }}>
        nutzt im Frontend die aktuell gewählte Holzklasse
      </div>
      <div style={lbl}>Backend-Info</div>
      <F value={d.label} placeholder="Aktuelle Holzklasse" onChange={e => set({ label: e.target.value })} />
      <div style={{ fontSize: 10, color: '#6b7280', marginTop: 5, lineHeight: 1.35 }}>
        Mit 🟩 Tabellenwert verbinden. Der grüne Name muss dem Kennwert entsprechen, z.B. f_m_k, f_v_k oder E_0_mean.
      </div>
    </Shell>
  );
}

// ── 🟩 Tabellenwert ──────────────────────────────────────────────────────────
export function TableValueNode({ id, data }: NodeProps) {
  const d = data as unknown as TableValueData;
  const { updateNodeData } = useGraphCtx();
  const set = (p: Partial<TableValueData>) => updateNodeData(id, p);
  return (
    <Shell id={id} type="tablevalue">
      <div style={{ fontSize: 10, color: '#15803d', marginBottom: 2 }}>nutzt Zeile des verbundenen Dropdowns</div>
      <div style={lbl}>Name (LaTeX)</div>
      <F value={d.name} placeholder="z_g" onChange={e => set({ name: e.target.value })} />
      <div style={{ fontSize: 11, marginTop: 2 }}><MathDisplay latex={d.name ? nameToLatex(d.name) : '?'} /></div>
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={lbl}>Einheit</div>
          <UnitField value={d.unit} onChange={unit => set({ unit })} placeholder="m" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={lbl}>Spalten-Index</div>
          <F type="number" value={String(d.table_col ?? 0)} onChange={e => set({ table_col: Number(e.target.value) })} />
        </div>
      </div>
    </Shell>
  );
}

// ── Klickbare Variablen-Chips (für Rechnungen) ───────────────────────────────
function formulaPrefix(name: string) {
  const trimmed = name.trim();
  return trimmed ? `${formulaName(trimmed)} = ` : '';
}

function formulaName(name: string) {
  return /_\{/.test(name) ? name : nameToLatex(name);
}

function updateLatexNamePrefix(currentLatex: string, oldName: string, newName: string) {
  const nextPrefix = formulaPrefix(newName);
  const oldPrefix = formulaPrefix(oldName);
  if (!nextPrefix) return currentLatex;
  if (!currentLatex.trim()) return nextPrefix;
  if (oldPrefix && currentLatex.startsWith(oldPrefix)) return nextPrefix + currentLatex.slice(oldPrefix.length);
  return currentLatex;
}

function NameChips({ targetId, onInsert }: { targetId: string; onInsert?: (name: string) => void }) {
  const { allNames, insertName } = useGraphCtx();
  const others = allNames.filter(n => n.id !== targetId && n.name);
  if (!others.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 3 }}>
      {others.map(n => (
        <button key={n.id} className="nodrag" onClick={() => onInsert ? onInsert(n.name) : insertName(targetId, n.name)}
          title={n.label}
          style={{ fontSize: 10, border: '1px solid #cbd5e1', background: '#fff', borderRadius: 4, padding: '1px 5px', cursor: 'pointer' }}>
          {n.name}
        </button>
      ))}
    </div>
  );
}

// ── 🟥 Rechnung ──────────────────────────────────────────────────────────────
export function CalcNode({ id, data }: NodeProps) {
  const d = data as unknown as CalcData;
  const { updateNodeData } = useGraphCtx();
  const set = (p: Partial<CalcData>) => updateNodeData(id, p);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const setLatex = (latex: string) => set({ latex, expr: latexToJs(latex) });
  const setName = (name: string) => {
    const latex = updateLatexNamePrefix(d.latex || '', d.name || '', name);
    set({ name, latex, expr: latexToJs(latex) });
  };
  const insertFormulaName = (name: string) => {
    const token = formulaName(name);
    const base = d.latex || formulaPrefix(d.name);
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
  return (
    <Shell id={id} type="calc">
      <div style={lbl}>Ergebnis-Name (LaTeX)</div>
      <F value={d.name} placeholder="c_h" onChange={e => setName(e.target.value)} />
      <div style={{ fontSize: 11, marginTop: 2 }}><MathDisplay latex={d.name ? nameToLatex(d.name) : '?'} /></div>
      <div style={lbl}>Anzeige-Formel (LaTeX)</div>
      <textarea ref={textareaRef} className="nodrag" value={d.latex} placeholder={d.name ? `${formulaName(d.name)} = 1.6 \\cdot (...)` : 'c_h = 1.6 \\cdot (...)'} onChange={e => setLatex(e.target.value)} style={{ ...inp, minHeight: 32, fontFamily: 'monospace' }} />
      {d.latex && <div style={{ background: '#fff', borderRadius: 4, padding: 4, marginTop: 2, overflowX: 'auto' }}><MathDisplay latex={d.latex} display /></div>}
      <NameChips targetId={id} onInsert={insertFormulaName} />
      <div style={lbl}>Einheit</div>
      <UnitField value={d.unit} onChange={unit => set({ unit })} placeholder="-" />
    </Shell>
  );
}

// ── 🟫 Standard-Berechnung ───────────────────────────────────────────────────
export function StdCalcNode({ id, data }: NodeProps) {
  const d = data as unknown as StdCalcData;
  const { updateNodeData } = useGraphCtx();
  const set = (p: Partial<StdCalcData>) => updateNodeData(id, p);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const setLatex = (latex: string) => set({ latex, expr: latexToJs(latex) });
  const setName = (name: string) => {
    const latex = updateLatexNamePrefix(d.latex || '', d.name || '', name);
    set({ name, latex, expr: latexToJs(latex) });
  };
  const insertFormulaName = (name: string) => {
    const token = formulaName(name);
    const base = d.latex || formulaPrefix(d.name);
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
  return (
    <Shell id={id} type="stdcalc">
      <div style={{ fontSize: 10, color: '#92400e', marginBottom: 2 }}>ein Wert wird im Frontend aus Tabellenberechnung gewählt</div>
      <div style={lbl}>Ergebnis-Name</div>
      <F value={d.name} placeholder="q_k" onChange={e => setName(e.target.value)} />
      <div style={lbl}>Auswahl-Variable (Frontend)</div>
      <F value={d.picker_name} placeholder="c_pe" onChange={e => set({ picker_name: e.target.value })} />
      <div style={lbl}>Anzeige-Formel (LaTeX)</div>
      <textarea ref={textareaRef} className="nodrag" value={d.latex} placeholder={d.name ? `${formulaName(d.name)} = (c_d \\cdot c_{pe} - c_{pi}) \\cdot q_p` : 'q_{k} = (c_d \\cdot c_{pe} - c_{pi}) \\cdot q_p'} onChange={e => setLatex(e.target.value)} style={{ ...inp, minHeight: 30, fontFamily: 'monospace' }} />
      {d.latex && <div style={{ background: '#fff', borderRadius: 4, padding: 4, marginTop: 2, overflowX: 'auto' }}><MathDisplay latex={d.latex} display /></div>}
      <NameChips targetId={id} onInsert={insertFormulaName} />
      <div style={lbl}>Einheit</div>
      <UnitField value={d.unit} onChange={unit => set({ unit })} />
    </Shell>
  );
}

// ── 🟦 Tabellenberechnung ────────────────────────────────────────────────────
export function TableCalcNode({ id, data }: NodeProps) {
  const d = data as unknown as TableCalcData;
  const { updateNodeData, dbTables } = useGraphCtx();
  const set = (p: Partial<TableCalcData>) => updateNodeData(id, p);
  return (
    <Shell id={id} type="tablecalc">
      <div style={lbl}>Name</div>
      <F value={d.name} placeholder="q_k" onChange={e => set({ name: e.target.value })} />
      <div style={lbl}>Quell-Tabelle (Zonen-Beiwerte)</div>
      <select className="nodrag" value={d.table_ref || ''} onChange={e => set({ table_ref: e.target.value })} style={inp}>
        <option value="">— wählen —</option>
        {dbTables.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
      </select>
      <div style={lbl}>Zonen (Spaltennamen, kommagetrennt)</div>
      <F value={(d.zones || []).join(',')} placeholder="A,B,C,D,E,F,G,H" onChange={e => set({ zones: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
      <div style={lbl}>Berechnung je Zone (JS, cell=Zonenwert)</div>
      <textarea className="nodrag" value={d.expr} placeholder="cell * q_p" onChange={e => set({ expr: e.target.value })} style={{ ...inp, minHeight: 30, fontFamily: 'monospace', background: '#fffbeb' }} />
      <NameChips targetId={id} />
      <div style={lbl}>Einheit</div>
      <UnitField value={d.unit} onChange={unit => set({ unit })} />
    </Shell>
  );
}

// ── 🔶 Bedingung ─────────────────────────────────────────────────────────────
export function ConditionNode({ id, data }: NodeProps) {
  const d = data as unknown as ConditionData;
  const { updateNodeData, graphNodes, dbTables, loadTableFull } = useGraphCtx();
  const set = (p: Partial<ConditionData>) => updateNodeData(id, p);
  const conds = d.conditions || [];
  const mode = d.mode || 'expr';
  const selectableNodes = graphNodes.filter(n =>
    n.id !== id && (
      n.type === 'dropdown' ||
      n.type === 'woodclass' ||
      (n.type === 'variable')
    )
  );
  const add = () => set({ conditions: [...conds, { id: 'c' + (conds.length + 1), latex: '', expr: '', match: '' }] });
  const upd = (i: number, k: 'latex' | 'expr' | 'match', v: string) => { const c = [...conds]; c[i] = { ...c[i], [k]: v }; set({ conditions: c }); };
  const fillFromSource = async () => {
    if ((d.source || 'woodType') !== 'woodType') return;
    const woodTable = dbTables.find(t => String(t.title || '').trim().toLowerCase() === 'holzart');
    if (!woodTable) return;
    const full = await loadTableFull(woodTable.id);
    const values = (full?.rows || [])
      .map(row => String(row?.[0] || '').trim())
      .filter(Boolean);
    const unique = Array.from(new Set<string>(values));
    if (!unique.length) return;
    set({
      mode: 'select',
      source: 'woodType',
      conditions: unique.map((value, i) => ({
        id: 'c' + (i + 1),
        latex: value,
        expr: '',
        match: value,
      })),
    });
  };
  return (
    <Shell id={id} type="condition" extraHandles={
      <>
        {conds.map((c, i) => (
          <Handle key={c.id} id={c.id} type="source" position={Position.Right} style={{ top: 80 + i * 46, background: '#ca8a04', width: 9, height: 9 }} />
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
          <div style={lbl}>Quelle</div>
          <select className="nodrag" value={d.source || 'woodType'} onChange={e => set({ source: e.target.value })} style={inp}>
            <option value="woodType">Holzart (Backend-Tabelle/Header)</option>
            <option value="woodClass">Holzklasse aus Header</option>
            {selectableNodes.map(n => (
              <option key={n.id} value={n.id}>{n.label || n.name || n.id}</option>
            ))}
          </select>
        </>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={lbl}>{mode === 'select' ? 'Ausgänge' : 'Bedingungen'}</div>
        <div style={{ display: 'flex', gap: 3 }}>
          {mode === 'select' && (d.source || 'woodType') === 'woodType' && (
            <button className="nodrag" onClick={fillFromSource} title="Zweige aus Tabelle Holzart erstellen" style={{ fontSize: 10, border: 'none', background: '#dbeafe', color: '#1e40af', borderRadius: 4, padding: '1px 6px', cursor: 'pointer' }}>Auto</button>
          )}
          <button className="nodrag" onClick={add} style={{ fontSize: 10, border: 'none', background: '#fde68a', borderRadius: 4, padding: '1px 6px', cursor: 'pointer' }}>+</button>
        </div>
      </div>
      {conds.map((c, i) => (
        <div key={c.id} style={{ borderTop: '1px dashed #e5e7eb', paddingTop: 3, marginTop: 3 }}>
          <div style={{ fontSize: 9, color: '#a16207' }}>Zweig {c.id} →</div>
          {mode === 'select' ? (
            <>
              <F value={c.latex} placeholder="Anzeige, z.B. Vollholz" onChange={e => upd(i, 'latex', e.target.value)} style={{ marginBottom: 2 }} />
              <F value={c.match || ''} placeholder="Wert, z.B. Vollholz" onChange={e => upd(i, 'match', e.target.value)} style={{ fontFamily: 'monospace', background: '#fffbeb' }} />
            </>
          ) : (
            <>
              <F value={c.latex} placeholder="h/b > 1" onChange={e => upd(i, 'latex', e.target.value)} style={{ marginBottom: 2 }} />
              <F value={c.expr} placeholder="(h/b) > 1 ? 1 : 0" onChange={e => upd(i, 'expr', e.target.value)} style={{ fontFamily: 'monospace', background: '#fffbeb' }} />
            </>
          )}
        </div>
      ))}
    </Shell>
  );
}

// ── ⬜ PDF / Ausgabe ─────────────────────────────────────────────────────────
export function OutputNode({ id, data }: NodeProps) {
  const d = data as unknown as OutputData;
  const { updateNodeData, allNames } = useGraphCtx();
  const set = (p: Partial<OutputData>) => updateNodeData(id, p);
  const blocks = d.blocks || [];
  const toggle = (nid: string) => set({ blocks: blocks.includes(nid) ? blocks.filter(b => b !== nid) : [...blocks, nid] });
  return (
    <Shell id={id} type="output" extraHandles={<span />}>
      <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>Diese Blöcke ins PDF-Protokoll:</div>
      {allNames.filter(n => n.id !== id).map(n => (
        <label key={n.id} className="nodrag" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer' }}>
          <input type="checkbox" className="nodrag" checked={blocks.includes(n.id)} onChange={() => toggle(n.id)} />
          {n.name || n.label}
        </label>
      ))}
    </Shell>
  );
}

export const nodeTypes = {
  variable: VariableNode,
  dropdown: DropdownNode,
  woodclass: WoodClassNode,
  tablevalue: TableValueNode,
  calc: CalcNode,
  stdcalc: StdCalcNode,
  tablecalc: TableCalcNode,
  condition: ConditionNode,
  output: OutputNode,
};
