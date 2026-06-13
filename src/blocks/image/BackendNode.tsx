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
