import React from 'react';
import { NodeProps } from '@xyflow/react';
import { useGraphCtx } from '../../components/admin/graph/graphContext';
import { Shell, F, lbl, NameChips } from '../../components/admin/graph/BlockNodeShared';
import { StiffnesscenterData } from '../../types/graph';

export function StiffnesscenterNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as StiffnesscenterData;
  const { updateNodeData } = useGraphCtx();
  const set = (p: Partial<StiffnesscenterData>) => updateNodeData(id, p as any);

  return (
    <Shell id={id} type="stiffnesscenter" selected={selected}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 4 }}>
        <div>
          <div style={lbl}>Ergebnis-Name</div>
          <F value={d.name || ''} placeholder="S" onChange={e => set({ name: e.target.value })} />
        </div>
        <div>
          <div style={lbl}>Bezeichnung</div>
          <F value={d.label || ''} placeholder="Steifigkeitszentrum" onChange={e => set({ label: e.target.value })} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 4 }}>
        <div>
          <div style={lbl}>Breite b_x [m]</div>
          <F type="number" step="0.1" value={d.b_x ?? ''} placeholder="10" onChange={e => set({ b_x: e.target.value })} />
        </div>
        <div>
          <div style={lbl}>Breite b_y [m]</div>
          <F type="number" step="0.1" value={d.b_y ?? ''} placeholder="8" onChange={e => set({ b_y: e.target.value })} />
        </div>
        <div>
          <div style={lbl}>Verfahren</div>
          <select
            className="nodrag"
            value={d.method || 'EKV'}
            onChange={e => set({ method: e.target.value as 'EKV' | 'ASV' })}
            style={{ fontSize: 9, border: '1px solid #d1d5db', borderRadius: 3, padding: '2px 3px', width: '100%' }}
          >
            <option value="EKV">EKV (Ersatzkraftverfahren)</option>
            <option value="ASV">ASV (Antwortspektrumverfahren)</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        <div style={{ flex: 1 }}>
          <div style={lbl}>Verfahren</div>
          <select
            className="nodrag"
            value={d.method || 'EKV'}
            onChange={e => set({ method: e.target.value as 'EKV' | 'ASV' })}
            style={{ fontSize: 9, border: '1px solid #d1d5db', borderRadius: 3, padding: '4px 6px', width: '100%' }}
          >
            <option value="EKV">EKV (Ersatzkraftverfahren)</option>
            <option value="ASV">ASV (Antwortspektrumverfahren)</option>
          </select>
        </div>
      </div>

      <div style={{ fontSize: 8, color: '#6b7280', padding: 6, background: '#f8fafc', borderRadius: 3, marginBottom: 4 }}>
        ℹ️ Wände und Steifigkeiten werden im <strong>Benutzer-Frontend</strong> definiert. Hier: Grundrissmaße und Verfahren einstellen.
      </div>

      <NameChips targetId={id} />
    </Shell>
  );
}
