import React from 'react';
import { NodeProps } from '@xyflow/react';
import { useGraphCtx } from '../../components/admin/graph/graphContext';
import { F, Shell, UnitField, lbl } from '../../components/admin/graph/BlockNodeShared';
import MathDisplay from '../../components/MathDisplay';
import { nameToLatex } from '../../utils/formatName';
import { PolargridData } from '../../types/graph';

export function PolargridNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as PolargridData;
  const { updateNodeData } = useGraphCtx();
  const set = (p: Partial<PolargridData>) => updateNodeData(id, p as any);

  const field = (
    key: keyof PolargridData,
    label: string,
    placeholder = '',
    type: 'text' | 'number' = 'text',
    step?: string,
  ) => (
    <div>
      <div style={lbl}>{label}</div>
      <F
        type={type}
        step={step}
        value={String(d[key] ?? '')}
        placeholder={placeholder}
        onChange={e => set({ [key]: e.target.value } as Partial<PolargridData>)}
      />
    </div>
  );

  return (
    <Shell id={id} type="polargrid" selected={selected}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 4 }}>
        {field('name', 'Ergebnis-Name', 'I_p')}
        <div>
          <div style={lbl}>Einheit Ergebnis</div>
          <UnitField value={d.unit || ''} onChange={unit => set({ unit })} placeholder="mm^4" />
        </div>
      </div>

      {d.name && (
        <div style={{ fontSize: 10, marginBottom: 5, padding: 4, background: '#fff', borderRadius: 3 }}>
          <MathDisplay latex={nameToLatex(d.name)} />
        </div>
      )}

      <div style={lbl}>Bezeichnung</div>
      <F value={d.label || ''} placeholder="Polares Flaechentraegheitsmoment" onChange={e => set({ label: e.target.value })} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 4 }}>
        {field('coord_unit', 'Koordinaten-Einheit', 'mm')}
        {field('point_area', 'Punktflaeche A_p', '1', 'number', '0.1')}
        {field('point_area_unit', 'Einheit A_p', 'mm^2')}
        {field('max_points', 'Max. Punkte', '200', 'number', '1')}
      </div>

      <div style={{ marginTop: 6, fontSize: 9, fontWeight: 700, color: '#0f766e' }}>Standard-Raster</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
        {field('x_step', 'x Schritt', '50', 'number', '1')}
        {field('z_step', 'z Schritt', '50', 'number', '1')}
      </div>
    </Shell>
  );
}
