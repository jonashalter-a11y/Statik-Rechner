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
