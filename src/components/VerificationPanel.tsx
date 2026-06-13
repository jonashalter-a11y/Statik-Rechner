import React from 'react';
import { useStore } from '../store/useStore';
import GraphVerificationView from './GraphVerificationView';

export default function VerificationPanel() {
  const { verifications, activeVerificationId, updateComment, addVerificationToPrint, printItems, graphInputsByVerif, restoreNonce } = useStore() as any;
  const verification = verifications.find((v: any) => v.id === activeVerificationId);

  if (!verification) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 14, padding: 32, textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📐</div>
          <div>Wählen Sie einen Nachweis aus dem Inhaltsverzeichnis aus<br />oder klicken Sie auf ein Kapitel.</div>
        </div>
      </div>
    );
  }

  const printCount = printItems.filter((item: any) => item.snapshot.id === verification.id).length;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16, color: '#1e40af', fontWeight: 600 }}>{verification.title}</h2>
        <button
          onClick={() => addVerificationToPrint(verification.id)}
          style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          + Zum Ausdruck{printCount > 0 ? ` (${printCount}×)` : ''}
        </button>
      </div>

      <GraphVerificationView
        key={`${verification.id}-${restoreNonce}`}
        verification={verification}
        initialInputs={graphInputsByVerif[verification.id]}
      />

      {/* Kommentar */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, marginBottom: 4 }}>KOMMENTAR</div>
        <textarea
          value={verification.comment}
          onChange={e => updateComment(verification.id, e.target.value)}
          placeholder="Kommentar zu diesem Nachweis..."
          style={{ width: '100%', minHeight: 80, border: '1px solid #d1d5db', borderRadius: 6, padding: 8, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
        />
      </div>
    </div>
  );
}
