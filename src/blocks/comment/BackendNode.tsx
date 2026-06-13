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

export function CommentNode({ id, data, selected }: NodeProps) {
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
