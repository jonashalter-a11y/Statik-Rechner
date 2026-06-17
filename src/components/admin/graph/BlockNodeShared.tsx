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
export const THEME: Record<string, { bg: string; border: string; icon: string; label: string }> = {
  beamvisual: { bg: '#f0fdf4', border: '#15803d', icon: '🏗', label: 'Träger' },
  calc: { bg: '#fef2f2', border: '#dc2626', icon: '🟥', label: 'Rechnung' },
  cases: { bg: '#faf5ff', border: '#7c3aed', icon: '⑂', label: 'Fallunterscheidung' },
  chartlookup: { bg: '#ecfdf5', border: '#059669', icon: '📉', label: 'Diagramm-Wert' },
  check: { bg: '#f0fdf4', border: '#059669', icon: '✅', label: 'Nachweis' },
  comment: { bg: '#fffbeb', border: '#d97706', icon: '💬', label: 'Kommentar' },
  condition: { bg: '#fefce8', border: '#ca8a04', icon: '🔶', label: 'Bedingung' },
  dropdown: { bg: '#fff7ed', border: '#ea580c', icon: '🟧', label: 'Dropdown' },
  frame: { bg: '#f8fafc', border: '#94a3b8', icon: '🔲', label: 'Rahmen' },
  groupcalc: { bg: '#f0fdfa', border: '#0f766e', icon: '⚙', label: 'Gruppenberechnung' },
  image: { bg: '#fdf4ff', border: '#a855f7', icon: '🖼', label: 'Bild' },
  loopblock: { bg: '#fff7f0', border: '#c2410c', icon: '⟳', label: 'Schleifenblock' },
  matrix: { bg: '#ecfeff', border: '#0891b2', icon: '⊞', label: 'Materialtabelle' },
  minmax: { bg: '#fff1f2', border: '#be123c', icon: '↕', label: 'Min / Max' },
  output: { bg: '#f9fafb', border: '#6b7280', icon: '⬜', label: 'PDF / Ausgabe' },
  ref: { bg: '#e0f2fe', border: '#0369a1', icon: '🔗', label: 'Referenz' },
  section: { bg: '#fdf4ff', border: '#9333ea', icon: '⊕', label: 'Querschnitt' },
  stdcalc: { bg: '#f5f0e8', border: '#92400e', icon: '🟫', label: 'Std-Berechnung' },
  switchcalc: { bg: '#fef3f2', border: '#ea580c', icon: '🟧', label: 'Switch Rechnung' },
  tablecalc: { bg: '#eff6ff', border: '#2563eb', icon: '🟦', label: 'Tabellenberechnung' },
  tablevalue: { bg: '#f0fdf4', border: '#16a34a', icon: '🟩', label: 'Tabellenwert' },
  title: { bg: '#f0f9ff', border: '#0284c7', icon: '📌', label: 'Titel' },
  variable: { bg: '#f5f3ff', border: '#7c3aed', icon: '🟪', label: 'Variabel' },
  woodclass: { bg: '#fefce8', border: '#ca8a04', icon: '🟨', label: 'Holzklasse' },
};

export const PRESET_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#be185d', '#0f766e', '#374151'];

export const inp: React.CSSProperties = {
  border: '1px solid #d1d5db', borderRadius: 3, padding: '1px 5px',
  fontSize: 9.5, lineHeight: 1.25, minHeight: 20, width: '100%', boxSizing: 'border-box',
};
export const lbl: React.CSSProperties = { fontSize: 7.5, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 1, marginTop: 2 };

export function Shell({ id, type, children, extraHandles, selected }: { id: string; type: string; children: React.ReactNode; extraHandles?: React.ReactNode; selected?: boolean }) {
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
export const F = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function F({ value, onChange, style, ...props }, forwardedRef) {
  const ref = useRef<HTMLInputElement | null>(null);
  const setRefs = (el: HTMLInputElement | null) => {
    ref.current = el;
    if (typeof forwardedRef === 'function') forwardedRef(el);
    else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
  };
  return (
    <input
      ref={setRefs}
      className="nodrag"
      value={String(value ?? '')}
      onChange={onChange}
      {...props}
      style={{ ...inp, ...(style || {}) }}
    />
  );
});

// Uncontrolled textarea: React setzt den DOM-Wert nur wenn das Feld nicht fokussiert ist,
// damit der Cursor beim Tippen in der Mitte nicht springt.
export function LatexArea({ value, onChange, placeholder, style, elRef }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  elRef?: React.RefObject<HTMLTextAreaElement>;
}) {
  const innerRef = useRef<HTMLTextAreaElement>(null);
  const ref = elRef || innerRef;
  return (
    <textarea
      ref={ref}
      className="nodrag"
      value={value}
      placeholder={placeholder}
      style={style}
      onChange={e => onChange(e.target.value)}
    />
  );
}

export async function pasteImageFromClipboard(onImage: (dataUrl: string) => void) {
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

export function UnitField({ value, onChange, placeholder = 'kN/m^2' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
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


// ── Klickbare Variablen-Chips (für Rechnungen) ───────────────────────────────
export function formulaPrefix(name: string) {
  const trimmed = name.trim();
  return trimmed ? `${formulaName(trimmed)} = ` : '';
}

export function formulaName(name: string) {
  return /_\{/.test(name) ? name : nameToLatex(name);
}

export function updateLatexNamePrefix(currentLatex: string, oldName: string, newName: string) {
  const nextPrefix = formulaPrefix(newName);
  const oldPrefix = formulaPrefix(oldName);
  if (!nextPrefix) return currentLatex;
  if (!currentLatex.trim()) return nextPrefix;
  if (oldPrefix && currentLatex.startsWith(oldPrefix)) return nextPrefix + currentLatex.slice(oldPrefix.length);
  return currentLatex;
}

const FORMULA_OPERATORS = [
  { latex: '\\frac{}{}', label: '\\frac', icon: '÷' },
  { latex: '\\cdot ', label: '\\cdot', icon: '·' },
  { latex: '\\sqrt{}', label: '\\sqrt', icon: '√' },
  { latex: '\\leq ', label: '\\leq', icon: '≤' },
  { latex: '\\sum ', label: '\\sum', icon: 'Σ' },
  { latex: '\\geq ', label: '\\geq', icon: '≥' },
];

export function NameChips({ targetId, onInsert, operators = Boolean(onInsert) }: { targetId: string; onInsert?: (name: string) => void; operators?: boolean }) {
  const { allNames, insertName } = useGraphCtx();
  const others = allNames.filter(n => n.id !== targetId && n.name);
  if (!others.length && !operators) return null;
  return (
    <div style={{ marginTop: 3 }}>
      {others.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
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
      )}
      {operators && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 3 }}>
          {FORMULA_OPERATORS.map(op => (
            <button key={op.latex} className="nodrag" onClick={() => onInsert ? onInsert(op.latex) : insertName(targetId, op.latex)}
              title={op.label}
              style={{
                border: 'none',
                background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
                color: '#fff',
                borderRadius: 5,
                padding: '6px 10px',
                cursor: 'pointer',
                lineHeight: 1,
                fontSize: '18px',
                fontWeight: 500,
                fontFamily: 'monospace',
                minWidth: '36px',
                textAlign: 'center',
                transition: 'all 0.15s ease',
                boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1) translateY(-2px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 8px rgba(220, 38, 38, 0.35)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1) translateY(0)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 4px rgba(220, 38, 38, 0.2)';
              }}>
              {op.icon}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
