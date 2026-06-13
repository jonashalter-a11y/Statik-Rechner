import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, NodeProps, NodeResizer } from '@xyflow/react';
import MathDisplay from '../../MathDisplay';
import { nameToLatex } from '../../../utils/formatName';
import { latexToJs, latexCondToJs, latexHasIneq } from '../../../utils/latexToJs';
import { useGraphCtx, DbTableFull } from './graphContext';
import { api } from '../../../api';
import { useStore } from '../../../store/useStore';
import {
  VariableData, DropdownData, WoodClassData, TableValueData, CalcData,
  StdCalcData, TableCalcData, ChartLookupData, ConditionData, CheckData, MinMaxData, ImageBlockData,
  TitleData, FrameData, RefData, CasesData, MatrixData, CommentData, CommentExtra, OutputData,
  GroupCalcData, GroupCalcVar, GroupCalcOption, GroupCalcOutput,
  LoopBlockData, LoopBlockAggr,
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
  chartlookup: { bg: '#ecfdf5', border: '#059669', icon: '📉', label: 'Diagramm-Wert' },
  condition:  { bg: '#fefce8', border: '#ca8a04', icon: '🔶', label: 'Bedingung' },
  check:      { bg: '#f0fdf4', border: '#059669', icon: '✅', label: 'Nachweis' },
  minmax:     { bg: '#fff1f2', border: '#be123c', icon: '↕', label: 'Min / Max' },
  image:      { bg: '#fdf4ff', border: '#a855f7', icon: '🖼', label: 'Bild' },
  title:      { bg: '#f0f9ff', border: '#0284c7', icon: '📌', label: 'Titel' },
  frame:      { bg: '#f8fafc', border: '#94a3b8', icon: '🔲', label: 'Rahmen' },
  ref:        { bg: '#e0f2fe', border: '#0369a1', icon: '🔗', label: 'Referenz' },
  cases:      { bg: '#faf5ff', border: '#7c3aed', icon: '⑂',  label: 'Fallunterscheidung' },
  matrix:     { bg: '#ecfeff', border: '#0891b2', icon: '⊞',  label: 'Materialtabelle' },
  beamvisual: { bg: '#f0fdf4', border: '#15803d', icon: '🏗', label: 'Träger' },
  section:    { bg: '#fdf4ff', border: '#9333ea', icon: '⊕', label: 'Querschnitt' },
  comment:    { bg: '#fffbeb', border: '#d97706', icon: '💬', label: 'Kommentar' },
  groupcalc:  { bg: '#f0fdfa', border: '#0f766e', icon: '⚙', label: 'Gruppenberechnung' },
  loopblock:  { bg: '#fff7f0', border: '#c2410c', icon: '⟳', label: 'Schleifenblock' },
  output:     { bg: '#f9fafb', border: '#6b7280', icon: '⬜', label: 'PDF / Ausgabe' },
};

const PRESET_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#be185d', '#0f766e', '#374151'];

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
      <div
        className="nodrag nowheel nopan"
        onWheelCapture={e => e.stopPropagation()}
        style={{ padding: 4, flex: 1, overflow: 'auto', overscrollBehavior: 'contain' }}
      >
        {children}
      </div>
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
  const setGlobalUnits = useStore(s => s.setGlobalUnits);
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuRect, setMenuRect] = useState<React.CSSProperties | null>(null);
  const options = value && !unitOptions.includes(value) ? [value, ...unitOptions] : unitOptions;
  const saveUnit = async () => {
    const next = draft.trim();
    if (!next) return;
    setSaving(true);
    try {
      await api.createUnit({ latex: next, sort_order: 0 });
      const updated = await api.getUnits();
      setGlobalUnits((updated as any[]).map((u: any) => u.latex));
    } catch { /* Einheit existiert schon – ignorieren */ }
    onChange(next);
    setDraft('');
    setModalOpen(false);
    setSaving(false);
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
                  disabled={saving || !draft.trim()}
                  style={{ border: 'none', background: '#2563eb', color: '#fff', borderRadius: 5, padding: '6px 12px', cursor: 'pointer', fontWeight: 700, opacity: saving || !draft.trim() ? 0.6 : 1 }}
                >
                  {saving ? '…' : 'Speichern'}
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
        <option value="number_comment">Wert + Kommentar</option>
        <option value="number_link">Variabel + Link</option>
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
      {d.inputKind === 'number_comment' && (
        <>
          <div style={lbl}>Kommentar (erscheint hervorgehoben über dem Eingabefeld)</div>
          <textarea
            className="nodrag"
            value={d.comment || ''}
            onChange={e => set({ comment: e.target.value })}
            placeholder="z.B. Für Wände immer 1.0, bei Decken 0.66"
            rows={3}
            style={{ ...inp, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.4 }}
          />
        </>
      )}
      {d.inputKind === 'number_link' && (
        <>
          <div style={lbl}>URL (wird im Frontend als Button geöffnet)</div>
          <F value={d.url || ''} placeholder="https://..." onChange={e => set({ url: e.target.value })} />
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
      <div style={lbl}>Bezeichnung</div>
      <F value={d.label} placeholder="Böengeschwindigkeitsdruck" onChange={e => set({ label: e.target.value })} />
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

// ── 📉 Diagramm-Wert ─────────────────────────────────────────────────────────
export function ChartLookupNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as ChartLookupData;
  const { updateNodeData, dbTables, loadTableFull } = useGraphCtx();
  const set = (p: Partial<ChartLookupData>) => updateNodeData(id, p);
  const [seriesNames, setSeriesNames] = useState<string[]>([]);

  useEffect(() => {
    if (!d.chart_ref) { setSeriesNames([]); return; }
    loadTableFull(d.chart_ref).then(t => {
      const names = (t?.chart_json?.series ?? []).map((s: any) => s.name);
      setSeriesNames(names);
      // automatisch "Alle Kurven" aktivieren wenn Diagramm mehrere Serien hat
      if (names.length > 1 && d.all_series === undefined) {
        set({ all_series: true });
      }
    });
  }, [d.chart_ref, loadTableFull]);

  return (
    <Shell id={id} type="chartlookup" selected={selected}>
      <div style={{ display: 'flex', gap: 0, marginBottom: 4, border: '1px solid #a7f3d0', borderRadius: 4, overflow: 'hidden', width: 'fit-content' }}>
        {(['x_to_y', 'y_to_x'] as const).map(dir => (
          <button key={dir} className="nodrag" onClick={() => set({ direction: dir })}
            style={{ padding: '2px 8px', border: 'none', cursor: 'pointer', fontSize: 9, fontWeight: 600,
              background: (d.direction ?? 'x_to_y') === dir ? '#059669' : '#f0fdf4',
              color: (d.direction ?? 'x_to_y') === dir ? '#fff' : '#6b7280' }}>
            {dir === 'x_to_y' ? 'X → Y' : 'Y → X'}
          </button>
        ))}
      </div>
      <div style={lbl}>Diagramm</div>
      <select className="nodrag" value={d.chart_ref || ''} onChange={e => set({ chart_ref: e.target.value, series_index: 0 })} style={inp}>
        <option value="">– wählen –</option>
        {dbTables.filter(t => t.type === 'chart').map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
      </select>
      {seriesNames.length > 1 && (
        <div style={{ display: 'flex', gap: 0, marginBottom: 2, border: '1px solid #a7f3d0', borderRadius: 4, overflow: 'hidden', width: 'fit-content' }}>
          {[false, true].map(all => (
            <button key={String(all)} className="nodrag" onClick={() => set({ all_series: all })}
              style={{ padding: '2px 8px', border: 'none', cursor: 'pointer', fontSize: 9, fontWeight: 600,
                background: !!(d.all_series) === all ? '#059669' : '#f0fdf4',
                color: !!(d.all_series) === all ? '#fff' : '#6b7280' }}>
              {all ? 'Alle Kurven' : 'Einzelne Kurve'}
            </button>
          ))}
        </div>
      )}
      {seriesNames.length > 1 && !d.all_series && (
        <>
          <div style={lbl}>Kurve</div>
          <select className="nodrag" value={d.series_index ?? 0} onChange={e => set({ series_index: Number(e.target.value) })} style={inp}>
            {seriesNames.map((n, i) => <option key={i} value={i}>{n}</option>)}
          </select>
        </>
      )}
      {d.all_series && seriesNames.length > 0 && (
        <div style={{ fontSize: 9, color: '#047857', background: '#d1fae5', borderRadius: 3, padding: '2px 5px', marginBottom: 2 }}>
          → {seriesNames.join(', ')}
        </div>
      )}
      <div style={lbl}>{(d.direction ?? 'x_to_y') === 'x_to_y' ? 'X-Variablenname' : 'Y-Variablenname'} (LaTeX)</div>
      <F value={d.x_name || ''} placeholder="z.B. alpha" onChange={e => set({ x_name: e.target.value })} />
      {d.x_name && <div style={{ fontSize: 10, marginTop: 1 }}><MathDisplay latex={nameToLatex(d.x_name)} /></div>}
      <div style={lbl}>Bezeichnung</div>
      <F value={d.label || ''} placeholder="z.B. Dachformbeiwert" onChange={e => set({ label: e.target.value })} />
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={lbl}>Ergebnis-Name (LaTeX)</div>
          <F value={d.name || ''} placeholder="z.B. mu_1" onChange={e => set({ name: e.target.value })} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={lbl}>Einheit</div>
          <UnitField value={d.unit || ''} onChange={unit => set({ unit })} placeholder="–" />
        </div>
      </div>
    </Shell>
  );
}

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
      <div style={lbl}>Titel</div>
      <F value={(d as any).title || ''} onChange={e => set({ title: e.target.value } as any)} placeholder="z.B. Figur 3 · Dachformen" />
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

function TitleNode({ id, data, selected }: NodeProps) {
  const { removeNode, updateNodeData } = useGraphCtx();
  const d = data as unknown as TitleData;
  const set = (p: Partial<TitleData>) => updateNodeData(id, p as any);
  const color = d.color || '#2563eb';
  return (
    <div style={{ background: `${color}18`, border: `2px solid ${color}`, borderRadius: 6, width: '100%', minWidth: 200, height: '100%', minHeight: 34, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      <NodeResizer isVisible={selected} minWidth={200} minHeight={34} color={color}
        lineStyle={{ borderWidth: 1.5, borderColor: color, opacity: 0.5 }}
        handleStyle={{ width: 7, height: 7, borderRadius: 2, background: color }} />
      <Handle type="target" position={Position.Left} style={{ background: color, width: 7, height: 7 }} />
      <div style={{ background: color, color: '#fff', padding: '2px 6px', borderRadius: '3px 3px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 9.5, fontWeight: 700, lineHeight: 1.2, flexShrink: 0 }}>
        <span>📌 Titel</span>
        <button className="nodrag" onClick={() => removeNode(id)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 11, lineHeight: 1 }}>✕</button>
      </div>
      <div style={{ padding: 4 }}>
        <F value={d.label || ''} placeholder="Abschnittsüberschrift..." onChange={e => set({ label: e.target.value })} style={{ fontWeight: 700, fontSize: 11 }} />
        <div style={{ marginTop: 4, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {PRESET_COLORS.map(c => (
            <button key={c} type="button" className="nodrag" onClick={() => set({ color: c })}
              style={{ width: 14, height: 14, background: c, border: color === c ? '2px solid #000' : '1px solid rgba(0,0,0,0.1)', borderRadius: 2, cursor: 'pointer', padding: 0, flexShrink: 0 }} />
          ))}
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: color, width: 7, height: 7 }} />
    </div>
  );
}

function FrameNode({ id, data, selected }: NodeProps) {
  const { removeNode, updateNodeData } = useGraphCtx();
  const d = data as unknown as FrameData;
  const set = (p: Partial<FrameData>) => updateNodeData(id, p as any);
  const color = d.color || '#2563eb';
  return (
    <div style={{ width: '100%', height: '100%', background: `${color}0d`, border: `2px dashed ${color}`, borderRadius: 10, boxSizing: 'border-box', position: 'relative', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <NodeResizer isVisible={selected} minWidth={120} minHeight={60} color={color}
        lineStyle={{ borderWidth: 1.5, borderColor: color, opacity: 0.5 }}
        handleStyle={{ width: 7, height: 7, borderRadius: 2, background: color }} />
      {/* Label (immer sichtbar oben links) */}
      <div style={{ position: 'absolute', top: 5, left: 10, right: selected ? 130 : 10, fontSize: 10, color, fontWeight: 700, opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {d.label || ''}
      </div>
      {/* Toolbar (nur wenn selektiert) */}
      {selected && (
        <div className="nodrag" style={{ position: 'absolute', top: 4, right: 6, display: 'flex', alignItems: 'center', gap: 3 }}>
          {PRESET_COLORS.map(c => (
            <button key={c} type="button" onClick={() => set({ color: c })}
              style={{ width: 12, height: 12, background: c, border: color === c ? '2px solid #000' : '1px solid rgba(0,0,0,0.1)', borderRadius: 2, cursor: 'pointer', padding: 0, flexShrink: 0 }} />
          ))}
          <input defaultValue={d.label || ''} onChange={e => set({ label: e.target.value })}
            placeholder="Label…"
            style={{ border: `1px solid ${color}`, background: `${color}20`, borderRadius: 3, fontSize: 9, padding: '1px 5px', outline: 'none', width: 70, color: '#374151', marginLeft: 2 }} />
          <button type="button" onClick={() => removeNode(id)}
            style={{ background: color, border: 'none', color: '#fff', cursor: 'pointer', fontSize: 10, borderRadius: 3, padding: '1px 4px', lineHeight: 1.4 }}>✕</button>
        </div>
      )}
    </div>
  );
}

function RefNode({ id, data, selected }: NodeProps) {
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

// ── ⑂ Fallunterscheidung ────────────────────────────────────────────────────
function CasesNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as CasesData;
  const { updateNodeData, graphNodes, loadTableFull, sourceNodesMap } = useGraphCtx();
  const set = (p: Partial<CasesData>) => updateNodeData(id, p as any);
  const cases = d.cases || [];
  const mode = d.mode || 'expr';
  const isSelect = mode === 'select';

  const selectableNodes = graphNodes.filter(n =>
    n.id !== id && (n.type === 'dropdown' || n.type === 'variable')
  );

  // Wenn ein Dropdown per Pfeil verbunden wird → automatisch Quelle setzen + Fälle befüllen
  useEffect(() => {
    const wiredDropdown = (sourceNodesMap[id] || []).find(n => n.type === 'dropdown');
    if (!wiredDropdown) return;
    if (d.source === wiredDropdown.id) return;
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
        cases: entries.map((e, i) => ({ id: 'f' + (i + 1), formula_latex: e.label, cond_expr: '', match_value: e.label })),
      });
    };
    doFill();
  }, [sourceNodesMap[id]?.map(n => n.id).join(',')]);

  const addCase = () => set({ cases: [...cases, { id: 'f' + Date.now(), formula_latex: '', cond_expr: '', match_value: '' }] });
  const removeCase = (i: number) => set({ cases: cases.filter((_, j) => j !== i) });
  const updCase = (i: number, patch: Partial<typeof cases[0]>) => {
    const next = [...cases]; next[i] = { ...next[i], ...patch }; set({ cases: next });
  };

  const isElse = (c: typeof cases[0]) =>
    isSelect ? !(c.match_value || '').trim() : !(c.cond_expr || '').trim();

  return (
    <Shell id={id} type="cases" selected={selected}>
      <div style={lbl}>Ergebnis-Name (LaTeX)</div>
      <F value={d.name || ''} placeholder="c_h" onChange={e => set({ name: e.target.value })} />
      {d.name && <div style={{ fontSize: 10, marginTop: 1 }}><MathDisplay latex={nameToLatex(d.name)} /></div>}
      <div style={lbl}>Bezeichnung</div>
      <F value={d.label || ''} placeholder="Profilbeiwert" onChange={e => set({ label: e.target.value })} />
      <div style={lbl}>Einheit</div>
      <UnitField value={d.unit || ''} onChange={unit => set({ unit })} placeholder="-" />
      <div style={lbl}>Bedingungsart</div>
      <select className="nodrag" value={mode} onChange={e => set({ mode: e.target.value as any })} style={inp}>
        <option value="expr">JS-Ausdruck (z &lt; 5 &amp;&amp; GK === 'II')</option>
        <option value="select">Dropdown-Vergleich</option>
      </select>
      {isSelect && (
        <>
          <div style={lbl}>Quelle (Dropdown)</div>
          <select className="nodrag" value={d.source || ''}
            onChange={e => set({ source: e.target.value, cases: [] })} style={inp}>
            <option value="">— wählen —</option>
            {selectableNodes.map(n => (
              <option key={n.id} value={n.id}>{n.label || n.name || n.id}</option>
            ))}
          </select>
        </>
      )}
      <NameChips targetId={id} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <div style={lbl}>Fälle</div>
        <button className="nodrag" onClick={addCase}
          style={{ fontSize: 10, border: 'none', background: '#ede9fe', color: '#6d28d9', borderRadius: 4, padding: '1px 6px', cursor: 'pointer' }}>+</button>
      </div>
      {cases.map((c, i) => (
        <div key={c.id} style={{ border: '1px solid #ddd6fe', borderRadius: 4, padding: '4px 5px', marginTop: 4, background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <div style={{ fontSize: 8, color: '#6d28d9', fontWeight: 700 }}>
              Fall {i + 1}{isElse(c) ? ' — else' : ''}
            </div>
            <button className="nodrag" onClick={() => removeCase(i)}
              style={{ background: 'none', border: 'none', color: '#c4b5fd', cursor: 'pointer', fontSize: 11, padding: '0 2px', lineHeight: 1 }}>✕</button>
          </div>
          {isSelect ? (
            <>
              <div style={lbl}>Wert (leer = else)</div>
              <F value={c.match_value || ''} placeholder="II"
                onChange={e => updCase(i, { match_value: e.target.value })}
                style={{ fontFamily: 'monospace', fontSize: 10, background: (c.match_value || '').trim() ? '#fffbeb' : '#f5f3ff', borderColor: (c.match_value || '').trim() ? '#d1d5db' : '#c4b5fd' }} />
            </>
          ) : (
            <>
              <div style={lbl}>Bedingung (JS · leer = else)</div>
              <F value={c.cond_expr} placeholder="z < 5 && GK === 'II'"
                onChange={e => updCase(i, { cond_expr: e.target.value })}
                style={{ fontFamily: 'monospace', fontSize: 8.5, background: (c.cond_expr || '').trim() ? '#fffbeb' : '#f5f3ff', borderColor: (c.cond_expr || '').trim() ? '#d1d5db' : '#c4b5fd' }} />
            </>
          )}
          <div style={lbl}>Formel (LaTeX)</div>
          <LatexArea value={c.formula_latex}
            placeholder="1.6 \cdot \left[\left(\frac{5}{z_g}\right)^{\alpha_r} + 0{,}375\right]^2"
            onChange={v => updCase(i, { formula_latex: v })}
            style={{ ...inp, minHeight: 30, fontFamily: 'monospace', resize: 'vertical' }} />
          {c.formula_latex && (
            <div style={{ background: '#faf5ff', borderRadius: 3, padding: '2px 4px', marginTop: 2, overflowX: 'auto', fontSize: 10 }}>
              <MathDisplay latex={c.formula_latex} display />
            </div>
          )}
        </div>
      ))}
    </Shell>
  );
}

// ── ⊞ Materialtabelle ────────────────────────────────────────────────────────
function MatrixNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as MatrixData;
  const { updateNodeData } = useGraphCtx();
  const set = (p: Partial<MatrixData>) => updateNodeData(id, p as any);
  const cols = d.columns || [];
  const rows = d.rows || [];
  const [showPreview, setShowPreview] = useState(false);

  // Migration: altes cells[] hatte LaTeX → in cells_latex verschieben, cells leeren
  useEffect(() => {
    const needsMigration = rows.some(r =>
      !r.cells_latex && r.cells?.some(c => c && (c.includes('\\') || c.includes('^') || c.includes('_')))
    );
    if (!needsMigration) return;
    set({
      rows: rows.map(r => ({
        ...r,
        cells_latex: r.cells_latex ?? r.cells.map(c =>
          (c && (c.includes('\\') || c.includes('^') || c.includes('_'))) ? c : ''
        ),
        cells: r.cells.map(c =>
          (c && (c.includes('\\') || c.includes('^') || c.includes('_'))) ? '' : c
        ),
      })),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addCol = () => set({ columns: [...cols, { id: 'c' + Date.now(), name: '', header: '', unit: '' }] });
  const removeCol = (ci: number) => set({
    columns: cols.filter((_, i) => i !== ci),
    rows: rows.map(r => ({
      ...r,
      cells: (r.cells || []).filter((_, i) => i !== ci),
      cells_latex: (r.cells_latex || []).filter((_, i) => i !== ci),
    })),
  });
  const moveCol = (ci: number, dir: -1 | 1) => {
    const ni = ci + dir;
    if (ni < 0 || ni >= cols.length) return;
    const nextCols = [...cols];
    [nextCols[ci], nextCols[ni]] = [nextCols[ni], nextCols[ci]];
    const nextRows = rows.map(r => {
      const cells = [...(r.cells || [])];
      const cells_latex = [...(r.cells_latex || [])];
      [cells[ci], cells[ni]] = [cells[ni], cells[ci]];
      [cells_latex[ci], cells_latex[ni]] = [cells_latex[ni], cells_latex[ci]];
      return { ...r, cells, cells_latex };
    });
    set({ columns: nextCols, rows: nextRows });
  };
  const updCol = (ci: number, k: string, v: string) => {
    const next = [...cols]; next[ci] = { ...next[ci], [k]: v }; set({ columns: next });
  };
  const addRow = () => set({ rows: [...rows, { id: 'r' + Date.now(), label: '', cells: cols.map(() => ''), cells_latex: cols.map(() => '') }] });
  const removeRow = (ri: number) => set({ rows: rows.filter((_, i) => i !== ri) });
  const moveRow = (ri: number, dir: -1 | 1) => {
    const ni = ri + dir;
    if (ni < 0 || ni >= rows.length) return;
    const next = [...rows];
    [next[ri], next[ni]] = [next[ni], next[ri]];
    set({ rows: next });
  };
  const updRowLabel = (ri: number, v: string) => {
    const next = [...rows]; next[ri] = { ...next[ri], label: v }; set({ rows: next });
  };
  const updCell = (ri: number, ci: number, v: string) => {
    const next = [...rows];
    const cells = [...(next[ri].cells || [])];
    cells[ci] = v;
    next[ri] = { ...next[ri], cells }; set({ rows: next });
  };
  const updCellLatex = (ri: number, ci: number, v: string) => {
    const next = [...rows];
    const cells_latex = [...(next[ri].cells_latex || [])];
    cells_latex[ci] = v;
    next[ri] = { ...next[ri], cells_latex }; set({ rows: next });
  };

  // LaTeX-Vorschau aufbauen (KaTeX: \begin{array}, kein \begin{tabular})
  // Nutzt cells_latex (Anzeigeformel); falls leer, cells als Fallback
  const latexPreview = (() => {
    if (cols.length === 0 && rows.length === 0) return '';
    const txt = (s: string) => `\\text{${s.replace(/[&%$#_{}~^]/g, '\\$&')}}`;
    const colSpec = ['l', ...cols.map(() => 'l')].join('|');
    const hdr = [txt(d.row_label || 'Material'), ...cols.map(c => c.header || txt(c.name || '?'))].join(' & ');
    const bodyRows = rows.map(r =>
      [txt(r.label || '?'), ...cols.map((_, ci) => {
        const cell = (r.cells_latex?.[ci] || r.cells?.[ci] || '').trim();
        return cell ? (cell.includes('\\') || cell.includes('^') || cell.includes('_') ? cell : txt(cell)) : txt('—');
      })].join(' & ')
    );
    const lines = [
      `\\begin{array}{|${colSpec}|}`,
      '\\hline',
      hdr + ' \\\\',
      '\\hline',
      ...bodyRows.map(r => r + ' \\\\'),
      '\\hline',
      '\\end{array}',
    ];
    return lines.join('\n');
  })();

  const minp: React.CSSProperties = { fontSize: 9, border: '1px solid #bae6fd', borderRadius: 2, padding: '2px 3px', background: '#fff', outline: 'none', minWidth: 0 };
  const th: React.CSSProperties = { background: '#e0f2fe', color: '#0369a1', fontSize: 9, fontWeight: 700, padding: '3px 4px', border: '1px solid #7dd3fc', textAlign: 'center', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { padding: '2px 3px', border: '1px solid #bae6fd', verticalAlign: 'top' };

  return (
    <Shell id={id} type="matrix" selected={selected}>
      {/* Meta */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 4 }}>
        <div>
          <div style={lbl}>Bezeichnung</div>
          <F value={d.label || ''} placeholder="Beplankung" onChange={e => set({ label: e.target.value })} />
        </div>
        <div>
          <div style={lbl}>Dropdown-Label</div>
          <F value={d.row_label || ''} placeholder="Material" onChange={e => set({ row_label: e.target.value })} />
        </div>
      </div>

      {/* Haupt-Grid */}
      <div style={{ overflowX: 'auto', marginBottom: 4 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            {/* Zeile 1: Spaltennamen (Var-Name + Header) */}
            <tr>
              <th style={{ ...th, background: '#0891b2', color: '#fff', minWidth: 80 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                  <span>{d.row_label || 'Material'}</span>
                  <button className="nodrag" onClick={addRow} style={{ fontSize: 9, background: '#fff', color: '#0891b2', border: 'none', borderRadius: 2, padding: '0 3px', cursor: 'pointer', lineHeight: 1.4 }}>+ Zeile</button>
                </div>
              </th>
              {cols.map((col, ci) => (
                <th key={col.id} style={{ ...th, minWidth: 90 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      {/* Spalte links/rechts verschieben */}
                      <button className="nodrag" onClick={() => moveCol(ci, -1)} disabled={ci === 0}
                        title="Spalte nach links" style={{ background: 'none', border: 'none', color: ci === 0 ? '#cbd5e1' : '#0369a1', cursor: ci === 0 ? 'default' : 'pointer', fontSize: 10, padding: 0, lineHeight: 1, flexShrink: 0 }}>◀</button>
                      <F style={{ ...minp, flex: 1 }} value={col.name} placeholder="var_name" title="JS-Variablenname" onChange={e => updCol(ci, 'name', e.target.value)} />
                      <button className="nodrag" onClick={() => moveCol(ci, 1)} disabled={ci === cols.length - 1}
                        title="Spalte nach rechts" style={{ background: 'none', border: 'none', color: ci === cols.length - 1 ? '#cbd5e1' : '#0369a1', cursor: ci === cols.length - 1 ? 'default' : 'pointer', fontSize: 10, padding: 0, lineHeight: 1, flexShrink: 0 }}>▶</button>
                      <button className="nodrag" onClick={() => removeCol(ci)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 11, padding: 0, lineHeight: 1, flexShrink: 0 }}>×</button>
                    </div>
                    <F style={{ ...minp, width: '100%' }} value={col.header} placeholder="LaTeX-Header" title="Anzeige-Header (LaTeX)" onChange={e => updCol(ci, 'header', e.target.value)} />
                    <F style={{ ...minp, width: 40 }} value={col.unit} placeholder="Einheit" title="Einheit" onChange={e => updCol(ci, 'unit', e.target.value)} />
                  </div>
                </th>
              ))}
              <th style={{ ...th, minWidth: 22 }}>
                <button className="nodrag" onClick={addCol} style={{ fontSize: 10, background: '#0891b2', color: '#fff', border: 'none', borderRadius: 2, padding: '1px 4px', cursor: 'pointer' }}>+</button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={row.id}>
                <td style={{ ...td, background: '#f0f9ff' }}>
                  <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
                      <button className="nodrag" onClick={() => moveRow(ri, -1)} disabled={ri === 0}
                        title="Zeile nach oben" style={{ background: 'none', border: 'none', color: ri === 0 ? '#cbd5e1' : '#0369a1', cursor: ri === 0 ? 'default' : 'pointer', fontSize: 9, padding: 0, lineHeight: 1 }}>▲</button>
                      <button className="nodrag" onClick={() => moveRow(ri, 1)} disabled={ri === rows.length - 1}
                        title="Zeile nach unten" style={{ background: 'none', border: 'none', color: ri === rows.length - 1 ? '#cbd5e1' : '#0369a1', cursor: ri === rows.length - 1 ? 'default' : 'pointer', fontSize: 9, padding: 0, lineHeight: 1 }}>▼</button>
                    </div>
                    <F style={{ ...minp, flex: 1 }} value={row.label} placeholder="Material…" onChange={e => updRowLabel(ri, e.target.value)} />
                    <button className="nodrag" onClick={() => removeRow(ri)} style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 11, padding: 0, lineHeight: 1, flexShrink: 0 }}>×</button>
                  </div>
                </td>
                {cols.map((col, ci) => (
                  <td key={col.id} style={{ ...td, background: '#fffbeb' }}>
                    <div style={{ fontSize: 7, color: '#6b7280', marginBottom: 1 }}>LaTeX (Anzeige)</div>
                    <LatexArea
                      value={row.cells_latex?.[ci] || ''}
                      placeholder={`LaTeX${col.header ? ' für ' + col.header : ''}\nz.B. 30 \\cdot \\frac{d}{20}`}
                      onChange={v => updCellLatex(ri, ci, v)}
                      style={{ ...minp, width: '100%', fontFamily: 'monospace', fontSize: 8, resize: 'vertical', marginBottom: 3 }}
                    />
                    <div style={{ fontSize: 7, color: '#6b7280', marginBottom: 1 }}>JS (Berechnung)</div>
                    <LatexArea
                      value={row.cells?.[ci] || ''}
                      placeholder={`JS${col.name ? ' für ' + col.name : ''}\nz.B. 30 * Math.pow(d/20, 1.1)`}
                      onChange={v => updCell(ri, ci, v)}
                      style={{ ...minp, width: '100%', fontFamily: 'monospace', fontSize: 8, resize: 'vertical', background: '#f0fdf4' }}
                    />
                  </td>
                ))}
                <td style={td} />
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={cols.length + 2} style={{ ...td, textAlign: 'center', color: '#9ca3af', fontSize: 10, padding: 8 }}>+ Zeile hinzufügen</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* JS aus LaTeX generieren */}
      <button className="nodrag" onClick={() => {
        set({
          rows: rows.map(r => ({
            ...r,
            cells: r.cells.map((c, ci) => c || latexToJs((r.cells_latex?.[ci] ?? '').trim())),
          })),
        });
      }} style={{ fontSize: 9, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 3, padding: '2px 8px', cursor: 'pointer', color: '#15803d', width: '100%', marginBottom: 4 }}>
        ⚙ JS aus LaTeX generieren (leere JS-Felder füllen)
      </button>

      {/* LaTeX-Vorschau Toggle */}
      <button className="nodrag" onClick={() => setShowPreview(v => !v)}
        style={{ fontSize: 9, background: showPreview ? '#e0f2fe' : '#f8fafc', border: '1px solid #bae6fd', borderRadius: 3, padding: '2px 8px', cursor: 'pointer', color: '#0369a1', width: '100%', marginBottom: showPreview ? 4 : 0 }}>
        {showPreview ? '▲ LaTeX-Vorschau' : '▼ LaTeX-Vorschau'}
      </button>
      {showPreview && latexPreview && (
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 4, padding: '6px 8px', overflowX: 'auto' }}>
          <MathDisplay latex={latexPreview} display />
        </div>
      )}
    </Shell>
  );
}

// ── 🏗 Träger-Visualisierung ──────────────────────────────────────────────────
const SUPPORT_OPTS: { value: string; label: string }[] = [
  { value: 'pin',    label: '△ Gelenk (Pin)' },
  { value: 'roller', label: '○ Rolle (Roller)' },
  { value: 'fixed',  label: '▐ Einspannung (Fixed)' },
  { value: 'free',   label: '— Frei' },
];

function BeamVisualNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as import('../../../types/graph').BeamVisualData;
  const { updateNodeData } = useGraphCtx();
  const set = (p: Partial<import('../../../types/graph').BeamVisualData>) => updateNodeData(id, p as any);
  const loads: import('../../../types/graph').BeamLoad[] = d.loads || [];

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

function CommentNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as CommentData;
  const { updateNodeData, dbTables } = useGraphCtx();
  const set = (p: Partial<CommentData>) => updateNodeData(id, { ...d, ...p } as any);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = ev => set({ image: ev.target?.result as string });
    reader.readAsDataURL(file);
  };

  const EXTRA_LABELS: Record<CommentExtra, string> = {
    none: '— kein Extra',
    link: '🔗 Link',
    image: '🖼 Foto / Bild',
    chart: '📊 Diagramm (DB)',
    table: '📋 Tabelle / CSV (DB)',
  };

  return (
    <Shell id={id} type="comment" selected={selected}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div style={{ padding: '4px 6px' }}>
        <div style={lbl}>Kommentartext</div>
        <LatexArea
          value={d.text || ''}
          onChange={v => set({ text: v })}
          placeholder="Erläuterungstext…"
          style={{ ...inp, resize: 'vertical', fontFamily: 'inherit', minHeight: 52 }}
        />

        <div style={lbl}>Extra-Inhalt</div>
        <select
          className="nodrag"
          value={d.extra || 'none'}
          onChange={e => set({ extra: e.target.value as CommentExtra })}
          style={{ ...inp, cursor: 'pointer' }}
        >
          {(Object.keys(EXTRA_LABELS) as CommentExtra[]).map(k => (
            <option key={k} value={k}>{EXTRA_LABELS[k]}</option>
          ))}
        </select>

        {/* Link */}
        {d.extra === 'link' && (
          <>
            <div style={lbl}>URL</div>
            <F value={d.link_url || ''} onChange={e => set({ link_url: e.target.value })} placeholder="https://…" />
            <div style={lbl}>Link-Text</div>
            <F value={d.link_label || ''} onChange={e => set({ link_label: e.target.value })} placeholder="Anzeigetext" />
          </>
        )}

        {/* Bild */}
        {d.extra === 'image' && (
          <>
            <div style={{ display: 'flex', gap: 4, marginTop: 4, marginBottom: 4 }}>
              <label className="nodrag" style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 3, padding: '2px 6px', fontSize: 9, cursor: 'pointer' }}>
                📎 Datei
                <input ref={fileRef} type="file" accept="image/*" className="nodrag" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) readFile(f); }} />
              </label>
              <button className="nodrag" type="button"
                onClick={() => pasteImageFromClipboard(img => set({ image: img }))}
                style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 3, padding: '2px 6px', fontSize: 9, cursor: 'pointer' }}>
                📋 Einfügen
              </button>
            </div>
            {d.image
              ? <div style={{ position: 'relative' }}>
                  <img src={d.image} style={{ width: '100%', maxHeight: 100, objectFit: 'contain', borderRadius: 3, border: '1px solid #fcd34d' }} />
                  <button className="nodrag" onClick={() => set({ image: undefined })}
                    style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 16, height: 16, color: '#fff', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
              : <div style={{ border: '2px dashed #fcd34d', borderRadius: 3, padding: '8px', textAlign: 'center', fontSize: 9, color: '#d97706' }}>Bild ablegen / einfügen</div>
            }
            <div style={lbl}>Bildunterschrift</div>
            <F value={d.image_caption || ''} onChange={e => set({ image_caption: e.target.value })} placeholder="Beschriftung" />
            <div style={lbl}>Quelle</div>
            <F value={d.image_source || ''} onChange={e => set({ image_source: e.target.value })} placeholder="z.B. SIA 265, Fig. 3" />
          </>
        )}

        {/* Chart / Tabelle aus DB */}
        {(d.extra === 'chart' || d.extra === 'table') && (
          <>
            <div style={lbl}>{d.extra === 'chart' ? 'Diagramm' : 'Tabelle'} aus DB</div>
            <select
              className="nodrag"
              value={d.table_ref || ''}
              onChange={e => set({ table_ref: e.target.value })}
              style={{ ...inp, cursor: 'pointer' }}
            >
              <option value="">— Tabelle wählen —</option>
              {dbTables
                .filter(t => d.extra === 'chart' ? t.type === 'chart' : t.type !== 'chart')
                .map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </>
        )}
      </div>
    </Shell>
  );
}

function SectionNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as import('../../../types/graph').SectionData;
  const { updateNodeData } = useGraphCtx();
  return (
    <Shell id={id} type="section" selected={selected}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div style={{ padding: '4px 6px' }}>
        <div style={lbl}>Querschnitt-Label</div>
        <F value={d.label} onChange={e => updateNodeData(id, { ...d, label: e.target.value })} />
        <div style={{ fontSize: 8, color: '#6b7280', marginTop: 4 }}>
          Formen und Positionen werden im Frontend definiert
        </div>
      </div>
    </Shell>
  );
}

// ── ⚙ Gruppenberechnung ─────────────────────────────────────────────────────
function GroupCalcNode({ id, data, selected }: NodeProps) {
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
    <Shell id={id} type="groupcalc" selected={selected}>
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
            </div>
          ))}
          {outputs.length === 0 && <div style={{ fontSize: 8, color: '#9ca3af' }}>Erst Ausgaben definieren</div>}
        </div>
      ))}
    </Shell>
  );
}

// ── ⟳ Schleifenblock ────────────────────────────────────────────────────────
function LoopBlockNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as LoopBlockData;
  const { updateNodeData } = useGraphCtx();
  const set = (p: Partial<LoopBlockData>) => updateNodeData(id, { ...d, ...p });
  const uid = () => Math.random().toString(36).slice(2, 8);

  // Vars
  const addVar = () => set({ vars: [...(d.vars || []), { id: uid(), name: '', label: '', unit: '', default_value: '0' }] });
  const setVar = (i: number, p: Partial<GroupCalcVar>) => { const a = [...(d.vars || [])]; a[i] = { ...a[i], ...p }; set({ vars: a }); };
  const delVar = (i: number) => set({ vars: (d.vars || []).filter((_, j) => j !== i) });
  // Outputs
  const addOut = () => set({ outputs: [...(d.outputs || []), { id: uid(), name: '', label: '', unit: '' }] });
  const setOut = (i: number, p: Partial<GroupCalcOutput>) => { const a = [...(d.outputs || [])]; a[i] = { ...a[i], ...p }; set({ outputs: a }); };
  const delOut = (i: number) => set({ outputs: (d.outputs || []).filter((_, j) => j !== i) });
  // Options
  const addOpt = () => set({ options: [...(d.options || []), { id: uid(), label: '', formulas: {} }] });
  const setOptLabel = (i: number, label: string) => { const a = [...(d.options || [])]; a[i] = { ...a[i], label }; set({ options: a }); };
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
  // Aggregations
  const addAggr = () => set({ aggregations: [...(d.aggregations || []), { output_id: '', method: 'sum', name: '', label: '', unit: '' }] });
  const setAggr = (i: number, p: Partial<LoopBlockAggr>) => { const a = [...(d.aggregations || [])]; a[i] = { ...a[i], ...p }; set({ aggregations: a }); };
  const delAggr = (i: number) => set({ aggregations: (d.aggregations || []).filter((_, j) => j !== i) });

  const outputs = d.outputs || [];
  const options = d.options || [];

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

      {/* Variablen */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <div style={lbl}>Variablen pro Schicht</div>
        <button className="nodrag" onClick={addVar} style={{ fontSize: 10, border: 'none', background: '#fed7aa', borderRadius: 4, padding: '1px 6px', cursor: 'pointer' }}>+</button>
      </div>
      <div style={{ fontSize: 8, color: '#9ca3af', marginBottom: 2 }}>Name · Bezeichnung · Einheit · Standard · Scope</div>
      {(d.vars || []).map((v, i) => (
        <div key={v.id} style={{ display: 'flex', gap: 2, alignItems: 'center', marginBottom: 2 }}>
          <F value={v.name} placeholder="d" onChange={e => setVar(i, { name: e.target.value })} style={{ flex: 1 }} />
          <F value={v.label} placeholder="Dicke" onChange={e => setVar(i, { label: e.target.value })} style={{ flex: 2 }} />
          <F value={v.unit} placeholder="mm" onChange={e => setVar(i, { unit: e.target.value })} style={{ flex: 0.8 }} />
          <F value={v.default_value} placeholder="15" onChange={e => setVar(i, { default_value: e.target.value })} style={{ flex: 0.8 }} />
          <button
            className="nodrag"
            title={v.scope === 'global' ? 'Global (einmal für alle Schichten) — klicken für per-Schicht' : 'Pro Schicht — klicken für Global'}
            onClick={() => setVar(i, { scope: v.scope === 'global' ? 'layer' : 'global' })}
            style={{ flex: '0 0 auto', fontSize: 9, border: '1px solid', borderRadius: 3, padding: '1px 4px', cursor: 'pointer', background: v.scope === 'global' ? '#fef3c7' : '#f0fdf4', borderColor: v.scope === 'global' ? '#f59e0b' : '#86efac', color: v.scope === 'global' ? '#92400e' : '#166534', whiteSpace: 'nowrap' }}
          >{v.scope === 'global' ? '🌐 Global' : '🔁 /Schicht'}</button>
          <button className="nodrag" onClick={() => delVar(i)} style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 11, padding: '0 2px' }}>✕</button>
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
          <button className="nodrag" onClick={() => delOut(i)} style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 11, padding: '0 2px' }}>✕</button>
        </div>
      ))}

      {/* Materialien */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <div style={lbl}>Materialien</div>
        <button className="nodrag" onClick={addOpt} style={{ fontSize: 10, border: 'none', background: '#fed7aa', borderRadius: 4, padding: '1px 6px', cursor: 'pointer' }}>+</button>
      </div>
      {options.map((opt, oi) => (
        <div key={opt.id} style={{ background: '#fff7f0', border: '1px solid #fb923c', borderRadius: 4, padding: '4px 5px', marginBottom: 4 }}>
          <div style={{ display: 'flex', gap: 2, alignItems: 'center', marginBottom: 3 }}>
            <F value={opt.label} placeholder="Mineralwolle ≥ 26 kg/m³" onChange={e => setOptLabel(oi, e.target.value)} style={{ flex: 1 }} />
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
          </select>
          <F value={ag.name} placeholder="t_{prot,0}" onChange={e => setAggr(i, { name: e.target.value })} style={{ flex: 1.5 }} />
          <F value={ag.unit} placeholder="min" onChange={e => setAggr(i, { unit: e.target.value })} style={{ flex: 0.8 }} />
          <button className="nodrag" onClick={() => delAggr(i)} style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 11, padding: '0 2px' }}>✕</button>
        </div>
      ))}
      {(d.aggregations || []).length > 0 && <div style={{ fontSize: 7, color: '#9ca3af' }}>Ausgabe · Methode · Symbol · Einheit</div>}
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
  chartlookup: ChartLookupNode,
  condition: ConditionNode,
  check: CheckNode,
  minmax: MinMaxNode,
  image: ImageNode,
  title: TitleNode,
  frame: FrameNode,
  ref: RefNode,
  cases: CasesNode,
  matrix: MatrixNode,
  beamvisual: BeamVisualNode,
  section: SectionNode,
  comment: CommentNode,
  groupcalc: GroupCalcNode,
  loopblock: LoopBlockNode,
  output: OutputNode,
};
