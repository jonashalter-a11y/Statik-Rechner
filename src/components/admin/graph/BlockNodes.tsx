import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, NodeProps, NodeResizer } from '@xyflow/react';
import MathDisplay from '../../MathDisplay';
import { nameToLatex } from '../../../utils/formatName';
import { latexToJs, latexCondToJs, latexHasIneq } from '../../../utils/latexToJs';
import { useGraphCtx, DbTableFull } from './graphContext';
import {
  VariableData, DropdownData, WoodClassData, TableValueData, CalcData,
  StdCalcData, TableCalcData, ConditionData, CheckData, MinMaxData, ImageBlockData, OutputData,
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
  check:      { bg: '#f0fdf4', border: '#059669', icon: '✅', label: 'Nachweis' },
  minmax:     { bg: '#fff1f2', border: '#be123c', icon: '↕', label: 'Min / Max' },
  image:      { bg: '#fdf4ff', border: '#a855f7', icon: '🖼', label: 'Bild' },
  output:     { bg: '#f9fafb', border: '#6b7280', icon: '⬜', label: 'PDF / Ausgabe' },
};

const inp: React.CSSProperties = {
  border: '1px solid #d1d5db', borderRadius: 3, padding: '1px 5px',
  fontSize: 9.5, lineHeight: 1.25, minHeight: 20, width: '100%', boxSizing: 'border-box',
};
const lbl: React.CSSProperties = { fontSize: 7.5, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 1, marginTop: 2 };

function Shell({ id, type, children, extraHandles, selected }: { id: string; type: string; children: React.ReactNode; extraHandles?: React.ReactNode; selected?: boolean }) {
  const { removeNode } = useGraphCtx();
  const t = THEME[type];
  return (
    <div style={{ background: t.bg, border: `2px solid ${t.border}`, borderRadius: 6, width: '100%', minWidth: 150, height: '100%', minHeight: 34, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      <NodeResizer
        isVisible={selected}
        minWidth={150}
        minHeight={34}
        color={t.border}
        lineStyle={{ borderWidth: 1.5, borderColor: t.border, opacity: 0.5 }}
        handleStyle={{ width: 7, height: 7, borderRadius: 2, background: t.border, borderColor: t.border }}
      />
      <Handle type="target" position={Position.Left} style={{ background: t.border, width: 7, height: 7 }} />
      <div style={{ background: t.border, color: '#fff', padding: '2px 6px', borderRadius: '3px 3px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 9.5, fontWeight: 700, lineHeight: 1.2, flexShrink: 0 }}>
        <span>{t.icon} {t.label}</span>
        <button className="nodrag" onClick={() => removeNode(id)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 11, lineHeight: 1 }}>✕</button>
      </div>
      <div style={{ padding: 4, flex: 1, overflow: 'auto' }}>{children}</div>
      {extraHandles ?? <Handle type="source" position={Position.Right} style={{ background: t.border, width: 7, height: 7 }} />}
    </div>
  );
}

// Uncontrolled input: kein Cursor-Springen beim Tippen in der Mitte
function F({ value, onChange, style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    const strVal = String(value ?? '');
    if (el.value !== strVal) el.value = strVal;
  }, [value]);
  return (
    <input
      ref={ref}
      className="nodrag"
      defaultValue={String(value ?? '')}
      onChange={onChange}
      {...props}
      style={{ ...inp, ...(style || {}) }}
    />
  );
}

// Uncontrolled textarea: React setzt den DOM-Wert nur wenn das Feld nicht fokussiert ist,
// damit der Cursor beim Tippen in der Mitte nicht springt.
function LatexArea({ value, onChange, placeholder, style, elRef }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  elRef?: React.RefObject<HTMLTextAreaElement>;
}) {
  const innerRef = useRef<HTMLTextAreaElement>(null);
  const ref = elRef || innerRef;
  useEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    if (el.value !== value) el.value = value;
  }, [value]);
  return (
    <textarea
      ref={ref}
      className="nodrag"
      defaultValue={value}
      placeholder={placeholder}
      style={style}
      onChange={e => onChange(e.target.value)}
    />
  );
}

async function pasteImageFromClipboard(onImage: (dataUrl: string) => void) {
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const imageType = item.types.find(t => t.startsWith('image/'));
      if (imageType) {
        const blob = await item.getType(imageType);
        const reader = new FileReader();
        reader.onload = ev => { if (ev.target?.result) onImage(ev.target.result as string); };
        reader.readAsDataURL(blob);
        return;
      }
    }
  } catch {
    // Berechtigung verweigert oder kein Bild in Zwischenablage
  }
}

function UnitField({ value, onChange, placeholder = 'kN/m^2' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  const { unitOptions } = useGraphCtx();
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuRect, setMenuRect] = useState<React.CSSProperties | null>(null);
  const options = value && !unitOptions.includes(value) ? [value, ...unitOptions] : unitOptions;
  const saveUnit = () => {
    const next = draft.trim();
    if (!next) return;
    onChange(next);
    setDraft('');
    setModalOpen(false);
  };
  const placeMenu = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuHeight = Math.min(220, Math.max(64, 28 + options.length * 25));
    const below = rect.bottom + 3;
    const top = below + menuHeight < window.innerHeight - 8
      ? below
      : Math.max(8, rect.top - menuHeight - 3);
    setMenuRect({
      position: 'fixed',
      left: rect.left,
      top,
      width: rect.width,
      maxHeight: 220,
      zIndex: 10020,
    });
  };

  useEffect(() => {
    if (!open) return;
    placeMenu();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onReposition = () => placeMenu();
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('scroll', onReposition, true);
    window.addEventListener('resize', onReposition);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('scroll', onReposition, true);
      window.removeEventListener('resize', onReposition);
    };
  }, [open, options.length]);

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={buttonRef}
        type="button"
        className="nodrag"
        onClick={() => {
          setOpen(v => !v);
          window.setTimeout(placeMenu, 0);
        }}
        style={{
          width: '100%', minHeight: 22, boxSizing: 'border-box',
          border: '1px solid #d1d5db', borderRadius: 3, background: '#fff',
          padding: '1px 20px 1px 6px', cursor: 'pointer', textAlign: 'left',
          position: 'relative', fontSize: 9.5, lineHeight: 1.2,
        }}
      >
        {value ? <MathDisplay latex={value} /> : <span style={{ color: '#9ca3af' }}>Einheit wählen</span>}
        <span style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-52%)', color: '#374151', fontSize: 13 }}>⌄</span>
      </button>
      {open && menuRect && createPortal(
        <div ref={menuRef} className="nodrag" style={{
          ...menuRect,
          background: '#fff', border: '1px solid #d1d5db', borderRadius: 6,
          boxShadow: '0 10px 26px rgba(15,23,42,0.18)', overflowY: 'auto',
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
                padding: '3px 7px', cursor: 'pointer', textAlign: 'left', fontSize: 9.5,
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
              padding: '4px 7px', cursor: 'pointer', textAlign: 'left',
              color: '#1e40af', fontWeight: 700, fontSize: 9.5,
            }}
          >
            + Neue Einheit...
          </button>
        </div>,
        document.body,
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
export function VariableNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as VariableData;
  const { updateNodeData, dbTables, loadTableFull } = useGraphCtx();
  const set = (p: Partial<VariableData>) => updateNodeData(id, p);
  const [headers, setHeaders] = useState<string[]>([]);
  useEffect(() => {
    if (d.inputKind === 'table_column' && d.table_ref) loadTableFull(d.table_ref).then(t => setHeaders(t?.headers || []));
  }, [d.inputKind, d.table_ref]);
  return (
    <Shell id={id} type="variable" selected={selected}>
      <div style={lbl}>Name (LaTeX)</div>
      <F value={d.name} placeholder="q_0" onChange={e => set({ name: e.target.value })} />
      <div style={{ fontSize: 10, marginTop: 1 }}><MathDisplay latex={d.name ? nameToLatex(d.name) : '?'} /></div>
      <div style={lbl}>Bezeichnung</div>
      <F value={d.label} placeholder="Referenz-Staudruck" onChange={e => set({ label: e.target.value })} />
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={lbl}>Einheit</div>
          <UnitField value={d.unit} onChange={unit => set({ unit })} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ ...lbl, display: 'flex', alignItems: 'center', gap: 4 }}>
            <label className="nodrag" style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                className="nodrag"
                checked={d.hasDefault !== false}
                onChange={e => set({ hasDefault: e.target.checked })}
                style={{ cursor: 'pointer', margin: 0 }}
              />
              Standard
            </label>
          </div>
          {d.hasDefault !== false && (
            <F value={d.default_value} placeholder="0" onChange={e => set({ default_value: e.target.value })} />
          )}
        </div>
      </div>
      <div style={lbl}>Eingabe-Art</div>
      <select className="nodrag" value={d.inputKind || 'number'} onChange={e => set({ inputKind: e.target.value as any })} style={inp}>
        <option value="number">Zahl</option>
        <option value="number_image">Zahl + Bild (Info-Button)</option>
        <option value="dropdown">Feste Optionen</option>
        <option value="table_column">Tabellen-Spalte</option>
      </select>
      {d.inputKind === 'number_image' && (
        <>
          <div style={lbl}>Bild für Info-Button</div>
          <div className="nodrag" tabIndex={0}
            onPaste={e => {
              const items = e.clipboardData?.items;
              if (!items) return;
              for (const item of Array.from(items)) {
                if (item.type.startsWith('image/')) {
                  const file = item.getAsFile();
                  if (!file) continue;
                  const reader = new FileReader();
                  reader.onload = ev => set({ image: ev.target?.result as string });
                  reader.readAsDataURL(file);
                  break;
                }
              }
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 4, outline: 'none' }}
          >
            <div style={{ display: 'flex', gap: 4 }}>
              <label className="nodrag" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: '#f1f5f9', border: '1px dashed #cbd5e1', borderRadius: 4, padding: '5px 8px', fontSize: 11 }}>
                📎 Datei…
                <input type="file" accept="image/*" className="nodrag" style={{ display: 'none' }} onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = ev => set({ image: ev.target?.result as string });
                  reader.readAsDataURL(file);
                }} />
              </label>
              <button type="button" className="nodrag"
                onClick={() => pasteImageFromClipboard(img => set({ image: img }))}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', border: '1px dashed #cbd5e1', borderRadius: 4, padding: '5px 8px', fontSize: 11, color: '#374151', cursor: 'pointer' }}>
                📋 Einfügen
              </button>
            </div>
            {d.image && (
              <div style={{ position: 'relative' }}>
                <img src={d.image} style={{ width: '100%', maxHeight: 100, objectFit: 'contain', borderRadius: 4, border: '1px solid #e5e7eb' }} />
                <button className="nodrag" onClick={() => set({ image: undefined })} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 3, color: '#fff', cursor: 'pointer', fontSize: 11, padding: '1px 5px' }}>✕</button>
              </div>
            )}
          </div>
          <div style={lbl}>Quelle</div>
          <F value={d.imageSource || ''} onChange={e => set({ imageSource: e.target.value })} placeholder="z.B. SIA 265:2021, Fig. 7" />
        </>
      )}
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
          <div style={lbl}>Variablen-Name (für Berechnung)</div>
          <F value={d.name || ''} placeholder="n_Wand" onChange={e => set({ name: e.target.value })} />
          {d.name && <div style={{ fontSize: 10, marginTop: 1, color: '#92400e' }}><MathDisplay latex={formulaName(d.name)} /></div>}
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

// ── 🟨 Holzklasse ───────────────────────────────────────────────────────────
export function WoodClassNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as WoodClassData;
  const { updateNodeData } = useGraphCtx();
  const set = (p: Partial<WoodClassData>) => updateNodeData(id, p);
  return (
    <Shell id={id} type="woodclass" selected={selected}>
      <div style={{ fontSize: 9, color: '#92400e', marginBottom: 3 }}>
        nutzt im Frontend die aktuell gewählte Holzklasse
      </div>
      <div style={lbl}>Backend-Info</div>
      <F value={d.label} placeholder="Aktuelle Holzklasse" onChange={e => set({ label: e.target.value })} />
      <div style={{ fontSize: 9, color: '#6b7280', marginTop: 3, lineHeight: 1.3 }}>
        Mit 🟩 Tabellenwert verbinden. Name = Kennwert, z.B. f_m_k, E_0_mean.
      </div>
    </Shell>
  );
}

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
      {others.map(n => {
        const latexToken = formulaName(n.name);
        return (
          <button key={n.id} className="nodrag" onClick={() => onInsert ? onInsert(n.name) : insertName(targetId, n.name)}
            title={n.label || n.name}
            style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: 3, padding: '1px 5px', cursor: 'pointer', lineHeight: 1.2 }}>
            <MathDisplay latex={latexToken} />
          </button>
        );
      })}
    </div>
  );
}

// ── 🟥 Rechnung ──────────────────────────────────────────────────────────────
export function CalcNode({ id, data, selected }: NodeProps) {
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
    <Shell id={id} type="calc" selected={selected}>
      <div style={lbl}>Ergebnis-Name (LaTeX)</div>
      <F value={d.name} placeholder="c_h" onChange={e => setName(e.target.value)} />
      <div style={{ fontSize: 10, marginTop: 1 }}><MathDisplay latex={d.name ? nameToLatex(d.name) : '?'} /></div>
      <div style={lbl}>Anzeige-Formel (LaTeX)</div>
      <LatexArea elRef={textareaRef} value={d.latex} placeholder={d.name ? `${formulaName(d.name)} = 1.6 \\cdot (...)` : 'c_h = 1.6 \\cdot (...)'} onChange={setLatex} style={{ ...inp, minHeight: 48, fontFamily: 'monospace', resize: 'vertical' }} />
      {d.latex && <div style={{ background: '#fff', borderRadius: 3, padding: 3, marginTop: 2, overflowX: 'auto', fontSize: 10 }}><MathDisplay latex={d.latex} display /></div>}
      <NameChips targetId={id} onInsert={insertFormulaName} />
      <div style={lbl}>Einheit</div>
      <UnitField value={d.unit} onChange={unit => set({ unit })} placeholder="-" />
    </Shell>
  );
}

// ── 🟫 Standard-Berechnung ───────────────────────────────────────────────────
export function StdCalcNode({ id, data, selected }: NodeProps) {
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
    <Shell id={id} type="stdcalc" selected={selected}>
      <div style={{ fontSize: 9, color: '#92400e', marginBottom: 2 }}>ein Wert wird im Frontend aus Tabellenberechnung gewählt</div>
      <div style={lbl}>Ergebnis-Name</div>
      <F value={d.name} placeholder="q_k" onChange={e => setName(e.target.value)} />
      <div style={lbl}>Auswahl-Variable (Frontend)</div>
      <F value={d.picker_name} placeholder="c_pe" onChange={e => set({ picker_name: e.target.value })} />
      <div style={lbl}>Anzeige-Formel (LaTeX)</div>
      <LatexArea elRef={textareaRef} value={d.latex} placeholder={d.name ? `${formulaName(d.name)} = (c_d \\cdot c_{pe} - c_{pi}) \\cdot q_p` : 'q_{k} = (c_d \\cdot c_{pe} - c_{pi}) \\cdot q_p'} onChange={setLatex} style={{ ...inp, minHeight: 48, fontFamily: 'monospace', resize: 'vertical' }} />
      {d.latex && <div style={{ background: '#fff', borderRadius: 3, padding: 3, marginTop: 2, overflowX: 'auto', fontSize: 10 }}><MathDisplay latex={d.latex} display /></div>}
      <NameChips targetId={id} onInsert={insertFormulaName} />
      <div style={lbl}>Einheit</div>
      <UnitField value={d.unit} onChange={unit => set({ unit })} />
    </Shell>
  );
}

// ── 🟦 Tabellenberechnung ────────────────────────────────────────────────────
export function TableCalcNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as TableCalcData;
  const { updateNodeData, dbTables } = useGraphCtx();
  const set = (p: Partial<TableCalcData>) => updateNodeData(id, p);
  return (
    <Shell id={id} type="tablecalc" selected={selected}>
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
      <LatexArea value={d.expr} placeholder="cell * q_p" onChange={v => set({ expr: v })} style={{ ...inp, minHeight: 30, fontFamily: 'monospace', background: '#fffbeb' }} />
      <NameChips targetId={id} />
      <div style={lbl}>Einheit</div>
      <UnitField value={d.unit} onChange={unit => set({ unit })} />
    </Shell>
  );
}

// ── 🔶 Bedingung ─────────────────────────────────────────────────────────────
export function ConditionNode({ id, data, selected }: NodeProps) {
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
    // Beim Ändern des LaTeX-Felds: JS-Ausdruck automatisch ableiten (falls Ungleichung)
    if (k === 'latex' && mode !== 'select') {
      const auto = latexCondToJs(v);
      if (auto) c[i] = { ...c[i], expr: auto };
    }
    set({ conditions: c });
  };
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
        <div key={c.id} style={{ borderTop: '1px dashed #e5e7eb', paddingTop: 2, marginTop: 2 }}>
          <div style={{ fontSize: 8, color: '#a16207' }}>Zweig {c.id} →</div>
          {mode === 'select' ? (
            <>
              <F value={c.latex} placeholder="Anzeige, z.B. Vollholz" onChange={e => upd(i, 'latex', e.target.value)} style={{ marginBottom: 2 }} />
              <F value={c.match || ''} placeholder="Wert, z.B. Vollholz" onChange={e => upd(i, 'match', e.target.value)} style={{ fontFamily: 'monospace', background: '#fffbeb' }} />
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

// ── ✅ Nachweis-Prüfung ──────────────────────────────────────────────────────
export function CheckNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as CheckData;
  const { updateNodeData } = useGraphCtx();
  const set = (p: Partial<CheckData>) => updateNodeData(id, p);
  const setLatex = (latex: string) => {
    const expr = latexCondToJs(latex);
    set({ latex, expr });
  };
  return (
    <Shell id={id} type="check" selected={selected} extraHandles={<span />}>
      <div style={{ fontSize: 9, color: '#065f46', marginBottom: 2 }}>
        Ungleichung eingeben → im Frontend grün/rot
      </div>
      <div style={lbl}>Bezeichnung</div>
      <F value={d.label} placeholder="Biegenachweis" onChange={e => set({ label: e.target.value })} />
      <div style={lbl}>Bedingung (LaTeX)</div>
      <F
        value={d.latex}
        placeholder="\sigma_{m,d} \leq f_{m,d,eff}"
        onChange={e => setLatex(e.target.value)}
        style={{ fontFamily: 'monospace' }}
      />
      {d.latex && (
        <div style={{ background: '#fff', borderRadius: 3, padding: 3, marginTop: 2, overflowX: 'auto', fontSize: 10 }}>
          <MathDisplay latex={d.latex} display />
        </div>
      )}
      {d.expr && (
        <div style={{ fontSize: 8, color: '#059669', fontFamily: 'monospace', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 3, padding: '2px 5px', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.expr}>
          ⚙ {d.expr}
        </div>
      )}
      <div style={lbl}>Einheit</div>
      <UnitField value={d.unit || ''} onChange={unit => set({ unit })} placeholder="N/mm^2" />
    </Shell>
  );
}

// ── ⬜ PDF / Ausgabe ─────────────────────────────────────────────────────────
export function OutputNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as OutputData;
  const { updateNodeData, allNames } = useGraphCtx();
  const set = (p: Partial<OutputData>) => updateNodeData(id, p);
  const blocks = d.blocks || [];
  const toggle = (nid: string) => set({ blocks: blocks.includes(nid) ? blocks.filter(b => b !== nid) : [...blocks, nid] });
  return (
    <Shell id={id} type="output" selected={selected} extraHandles={<span />}>
      <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 3 }}>Diese Blöcke ins PDF-Protokoll:</div>
      {allNames.filter(n => n.id !== id).map(n => (
        <label key={n.id} className="nodrag" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, cursor: 'pointer' }}>
          <input type="checkbox" className="nodrag" checked={blocks.includes(n.id)} onChange={() => toggle(n.id)} />
          {n.name || n.label}
        </label>
      ))}
    </Shell>
  );
}

// ── ↕ Min / Max ──────────────────────────────────────────────────────────────
export function MinMaxNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as MinMaxData;
  const { updateNodeData } = useGraphCtx();
  const set = (p: Partial<MinMaxData>) => updateNodeData(id, { ...d, ...p });
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
    <Shell id={id} type="minmax" selected={selected}>
      <div style={lbl}>Ergebnis-Name (LaTeX)</div>
      <F value={d.name} placeholder="f_{v,0,d}" onChange={e => setName(e.target.value)} />
      {d.name && <div style={{ fontSize: 10, marginTop: 1 }}><MathDisplay latex={nameToLatex(d.name)} /></div>}

      <div style={lbl}>Formel (LaTeX)</div>
      <LatexArea
        elRef={textareaRef as React.RefObject<HTMLTextAreaElement>}
        value={d.latex}
        placeholder={'f_{v,0,d} = \\min\\begin{cases}\n  k_{v1} \\cdot R_d / a_v \\\\\n  k_{v1} \\cdot k_{v2} \\cdot f_{v,d} \\cdot t\n\\end{cases}'}
        onChange={setLatex}
        style={{ ...inp, minHeight: 72, fontFamily: 'monospace', resize: 'vertical' }}
      />
      {d.latex && (
        <div style={{ background: '#fff', borderRadius: 3, padding: 3, marginTop: 2, overflowX: 'auto', fontSize: 10 }}>
          <MathDisplay latex={d.latex} display />
        </div>
      )}

      <div style={lbl}>Beschreibung</div>
      <F value={d.label} placeholder="Kurzbeschreibung" onChange={e => set({ label: e.target.value })} />

      <div style={lbl}>Einheit</div>
      <UnitField value={d.unit} onChange={unit => set({ unit })} placeholder="-" />

      <NameChips targetId={id} onInsert={insertFormulaName} />
    </Shell>
  );
}

export function ImageNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useGraphCtx();
  const d = data as unknown as ImageBlockData;
  const set = (patch: Partial<ImageBlockData>) => updateNodeData(id, { ...d, ...patch });
  const fileRef = React.useRef<HTMLInputElement>(null);

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = ev => set({ image: ev.target?.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <Shell id={id} type="image" selected={selected}>
      <div style={lbl}>Beschriftung</div>
      <F value={d.label} onChange={e => set({ label: e.target.value })} placeholder="z.B. Wandaufbau Schema" />
      <div style={lbl}>Quelle</div>
      <F value={d.source || ''} onChange={e => set({ source: e.target.value })} placeholder="z.B. SIA 265:2021, Fig. 7" />

      <div style={{ ...lbl, marginTop: 6 }}>Bild</div>
      <div
        className="nodrag"
        tabIndex={0}
        onPaste={e => {
          const items = e.clipboardData?.items;
          if (!items) return;
          for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
              const file = item.getAsFile();
              if (file) { readFile(file); break; }
            }
          }
        }}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file && file.type.startsWith('image/')) readFile(file);
        }}
        style={{ outline: 'none' }}
      >
        <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
          <label className="nodrag" style={{ background: '#f3e8ff', border: '1px solid #d8b4fe', borderRadius: 3, padding: '2px 6px', fontSize: 9, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            📎 Datei…
            <input ref={fileRef} type="file" accept="image/*" className="nodrag" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) readFile(f); }} />
          </label>
          <button type="button" className="nodrag"
            onClick={() => pasteImageFromClipboard(img => set({ image: img }))}
            style={{ background: '#f3e8ff', border: '1px solid #d8b4fe', borderRadius: 3, padding: '2px 6px', fontSize: 9, color: '#7e22ce', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            📋 Einfügen
          </button>
          <div style={{ background: '#f3e8ff', border: '1px solid #d8b4fe', borderRadius: 3, padding: '2px 6px', fontSize: 9, color: '#7e22ce', whiteSpace: 'nowrap' }}>⬇ Drop</div>
        </div>
        {d.image ? (
          <div style={{ position: 'relative' }}>
            <img src={d.image} style={{ width: '100%', maxHeight: 140, objectFit: 'contain', borderRadius: 4, border: '1px solid #e9d5ff', display: 'block' }} />
            <button className="nodrag" onClick={() => set({ image: undefined })}
              style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', color: '#fff', fontSize: 11, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
        ) : (
          <div style={{ border: '2px dashed #d8b4fe', borderRadius: 4, padding: '12px 8px', textAlign: 'center', fontSize: 9, color: '#a78bfa' }}>
            Bild hier ablegen oder einfügen
          </div>
        )}
      </div>
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
  check: CheckNode,
  minmax: MinMaxNode,
  image: ImageNode,
  output: OutputNode,
};
