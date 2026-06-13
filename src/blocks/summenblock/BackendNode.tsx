import React, { useRef } from 'react';
import { NodeProps } from '@xyflow/react';
import { useGraphCtx } from '../../components/admin/graph/graphContext';
import { Shell, F, LatexArea, lbl, inp, UnitField } from '../../components/admin/graph/BlockNodeShared';
import { latexToJs } from '../../utils/latexToJs';
import MathDisplay from '../../components/MathDisplay';
import { nameToLatex } from '../../utils/formatName';

export function SummenblockNode({ id, data, selected }: NodeProps) {
  const d = data as any;
  const { updateNodeData } = useGraphCtx();
  const set = (p: Partial<typeof d>) => updateNodeData(id, p);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const setExpr = (expr: string) => set({ expr });

  return (
    <Shell id={id} type="summenblock" selected={selected}>
      {/* Name */}
      <div style={lbl}>Ergebnis-Name (LaTeX)</div>
      <F
        value={d.name}
        placeholder="sum"
        onChange={e => set({ name: e.target.value })}
      />
      {d.name && (
        <div style={{ fontSize: 10, marginTop: 1, padding: 4, background: '#f8fafc', borderRadius: 3 }}>
          <MathDisplay latex={nameToLatex(d.name)} />
        </div>
      )}

      {/* Label */}
      <div style={lbl}>Bezeichnung</div>
      <F
        value={d.label}
        placeholder="z.B. Gesamtsumme"
        onChange={e => set({ label: e.target.value })}
      />

      {/* Einheit */}
      <div style={lbl}>Einheit</div>
      <UnitField
        value={d.unit}
        onChange={unit => set({ unit })}
        placeholder="kN/m²"
      />

      {/* Formel */}
      <div style={lbl}>Formel (JavaScript-Ausdruck)</div>
      <LatexArea
        elRef={textareaRef}
        value={d.expr}
        placeholder="z.B. a + b + c"
        onChange={setExpr}
        style={{ ...inp, minHeight: 60, fontFamily: 'monospace', resize: 'vertical' }}
      />
      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
        💡 Nutze Variablennamen aus vorherigen Blöcken: z.B. <code style={{ background: '#f1f5f9', padding: '2px 4px', borderRadius: 2 }}>q_k + q_d</code>
      </div>

      {/* Preview bei gültigem Ausdruck */}
      {d.expr && (
        <div style={{
          marginTop: 8,
          padding: 8,
          background: '#f0fdf4',
          border: '1px solid #86efac',
          borderRadius: 4,
          fontSize: 11,
          color: '#22c55e'
        }}>
          ✓ Ausdruck: <code style={{ fontFamily: 'monospace' }}>{d.expr}</code>
        </div>
      )}
    </Shell>
  );
}
