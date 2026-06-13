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
