import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import MathDisplay from './MathDisplay';
import { nameToLatex } from '../utils/formatName';
import { Variable } from '../types';

// SIA 261 Verifikations-IDs die Lasten (kN/m²) berechnen statt η
const SIA261_VALUE_IDS = ['schnee_dach', 'wind_staudruck', 'wind_druck_aussen', 'wind_kraft', 'nutzlast_flaeche', 'erddruck_aktiv'];

function VariableRow({ variable, verificationId, even }: { variable: Variable; verificationId: string; even: boolean }) {
  const { updateVariableValue } = useStore();

  return (
    <tr style={{ borderBottom: '1px solid #f1f5f9', background: even ? '#fff' : '#fafafa' }}>
      <td style={{ padding: '6px 8px', fontSize: 13, width: '55%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <MathDisplay latex={nameToLatex(variable.name)} />
          <span style={{ color: '#9ca3af', fontSize: 11 }}>[{variable.unit}]</span>
        </div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{variable.description}</div>
      </td>
      <td style={{ padding: '6px 8px', width: '45%' }}>
        {variable.type === 'dropdown' && variable.options ? (
          <select
            value={String(variable.value)}
            onChange={e => updateVariableValue(verificationId, variable.id, Number(e.target.value))}
            style={{
              border: '1px solid #d1d5db',
              borderRadius: 4,
              padding: '3px 6px',
              fontSize: 12,
              width: '100%',
              background: '#fff',
            }}
          >
            {variable.options.map(opt => (
              <option key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="number"
              value={String(variable.value ?? '')}
              onChange={e => updateVariableValue(verificationId, variable.id, Number(e.target.value))}
              style={{
                border: '1px solid #d1d5db',
                borderRadius: 4,
                padding: '3px 8px',
                fontSize: 13,
                width: '100%',
                textAlign: 'right',
                fontFamily: 'monospace',
              }}
            />
            <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>{variable.unit}</span>
          </div>
        )}
      </td>
    </tr>
  );
}

export default function VerificationPanel() {
  const { verifications, activeVerificationId, updateComment, addVerificationToPrint, printVerificationIds } = useStore();
  const verification = verifications.find(v => v.id === activeVerificationId);

  if (!verification) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#9ca3af',
        fontSize: 14,
        padding: 32,
        textAlign: 'center',
      }}>
        <div>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📐</div>
          <div>Wählen Sie einen Nachweis aus dem Inhaltsverzeichnis aus<br />oder klicken Sie auf ein Kapitel.</div>
        </div>
      </div>
    );
  }

  const inPrint = printVerificationIds.includes(verification.id);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16, color: '#1e40af', fontWeight: 600 }}>
          {verification.title}
        </h2>
        <button
          onClick={() => addVerificationToPrint(verification.id)}
          disabled={inPrint}
          style={{
            background: inPrint ? '#d1fae5' : '#2563eb',
            color: inPrint ? '#065f46' : '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 12,
            cursor: inPrint ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {inPrint ? '✓ Im Ausdruck' : '+ Zum Ausdruck'}
        </button>
      </div>

      {/* Formula Display */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        overflowX: 'auto',
      }}>
        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8, fontWeight: 500 }}>
          FORMEL
        </div>
        <MathDisplay latex={verification.formula.latex} display={true} />
      </div>

      {/* Variables */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, marginBottom: 8 }}>
          VARIABLEN
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '6px 8px', fontSize: 11, textAlign: 'left', color: '#6b7280', fontWeight: 500 }}>
                Variable
              </th>
              <th style={{ padding: '6px 8px', fontSize: 11, textAlign: 'left', color: '#6b7280', fontWeight: 500 }}>
                Wert
              </th>
            </tr>
          </thead>
          <tbody>
            {verification.variables.map((v, i) => (
              <VariableRow key={v.id} variable={v} verificationId={verification.id} even={i % 2 === 0} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Result */}
      {verification.result !== undefined && (() => {
        const isSIA261Value = SIA261_VALUE_IDS.includes(verification.id);

        if (isSIA261Value) {
          // SIA 261: zeige berechneten Wert (Einwirkung), kein η
          const val = verification.result;
          const units: Record<string, string> = {
            schnee_dach: 'kN/m²', wind_staudruck: 'kN/m²', wind_druck_aussen: 'kN/m²',
            wind_kraft: 'kN', nutzlast_flaeche: 'kN', erddruck_aktiv: 'kN/m²',
          };
          return (
            <div style={{
              padding: 12, borderRadius: 8, marginBottom: 16,
              background: '#dbeafe', border: '1px solid #93c5fd',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 24 }}>📊</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1e40af' }}>
                  Ergebnis = {Math.abs(val) < 1000 ? val.toFixed(3) : val.toFixed(1)} {units[verification.id] || ''}
                </div>
                <div style={{ fontSize: 12, color: '#3b82f6', marginTop: 2 }}>
                  Charakteristischer Wert nach SIA 261
                </div>
              </div>
            </div>
          );
        }

        // SIA 265: zeige η mit Nachweis erfüllt/nicht erfüllt
        return (
          <div style={{
            padding: 12, borderRadius: 8, marginBottom: 16,
            background: verification.passed ? '#d1fae5' : '#fee2e2',
            border: `1px solid ${verification.passed ? '#6ee7b7' : '#fca5a5'}`,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 24 }}>{verification.passed ? '✅' : '❌'}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: verification.passed ? '#065f46' : '#991b1b' }}>
                η = {verification.result.toFixed(3)} {verification.passed ? '≤ 1.0 → Nachweis erfüllt' : '> 1.0 → Nachweis nicht erfüllt!'}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                Ausnutzung: {(verification.result * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        );
      })()}

      {/* Comment */}
      <div>
        <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, marginBottom: 4 }}>
          KOMMENTAR
        </div>
        <textarea
          value={verification.comment}
          onChange={e => updateComment(verification.id, e.target.value)}
          placeholder="Kommentar zu diesem Nachweis..."
          style={{
            width: '100%',
            minHeight: 80,
            border: '1px solid #d1d5db',
            borderRadius: 6,
            padding: 8,
            fontSize: 13,
            fontFamily: 'inherit',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  );
}
