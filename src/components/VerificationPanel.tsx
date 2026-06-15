import React, { Suspense, lazy, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

const GraphVerificationView = lazy(() => import('./GraphVerificationView'));

const scrollKey = (verificationId: string) => `sia-verification-scroll:${verificationId}`;

function hasWoodClassBlock(verification: any): boolean {
  if (!verification?.graph_json) return false;
  try {
    const graph = typeof verification.graph_json === 'string' ? JSON.parse(verification.graph_json) : verification.graph_json;
    const nodes = graph.nodes || [];
    return nodes.some((n: any) => n.type === 'woodclass' || n.type === 'tablevalue');
  } catch {
    return false;
  }
}

export default function VerificationPanel() {
  const { verifications, activeVerificationId, updateComment, addVerificationToPrint, printItems, graphInputsByVerif, restoreNonce, apiWoodTypes, apiWoodClasses, woodTypeByVerif, woodClassIdByVerif, setWoodTypeForVerif, setWoodClassIdForVerif } = useStore() as any;
  const verification = verifications.find((v: any) => v.id === activeVerificationId);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!verification) return;
    const el = scrollRef.current;
    if (!el) return;
    const saved = Number(localStorage.getItem(scrollKey(verification.id)) || '0');
    requestAnimationFrame(() => {
      el.scrollTop = Number.isFinite(saved) ? saved : 0;
    });
  }, [verification?.id, restoreNonce]);

  const handleScroll = () => {
    if (!verification || !scrollRef.current) return;
    localStorage.setItem(scrollKey(verification.id), String(scrollRef.current.scrollTop));
  };

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
  const hasWoodBlock = hasWoodClassBlock(verification);
  const currentWoodType = woodTypeByVerif[verification.id] || '';
  const currentWoodClassId = woodClassIdByVerif[verification.id] || '';
  const woodTypeOptions = apiWoodTypes?.map((t: any) => t.name) || [];
  const classesForWoodType = (woodTypeName: string) => {
    const woodTypeId = apiWoodTypes?.find((t: any) => t.name === woodTypeName)?.id;
    return woodTypeId ? (apiWoodClasses?.filter((c: any) => c.wood_type_id === woodTypeId) || []) : [];
  };
  const filteredWoodClasses = currentWoodType
    ? classesForWoodType(currentWoodType)
    : [];

  return (
    <div ref={scrollRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16, color: '#1e40af', fontWeight: 600 }}>{verification.title}</h2>
        <button
          onClick={() => addVerificationToPrint(verification.id)}
          style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          + Zum Ausdruck{printCount > 0 ? ` (${printCount}×)` : ''}
        </button>
      </div>

      {/* Holzart + Holzklasse — nur wenn der Nachweis einen woodclass/tablevalue Block hat */}
      {hasWoodBlock && woodTypeOptions.length > 0 && (
        <div style={{ marginBottom: 16, padding: 12, background: '#f3f4f6', borderRadius: 6 }}>
          <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, marginBottom: 8 }}>HOLZMATERIAL</div>

          {/* Holzart */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10, color: '#6b7280', fontWeight: 500, display: 'block', marginBottom: 3 }}>Holzart</label>
            <select
              value={currentWoodType}
              onChange={e => {
                const nextWoodType = e.target.value;
                if (!nextWoodType) {
                  setWoodTypeForVerif(verification.id, '');
                  setWoodClassIdForVerif(verification.id, '');
                  return;
                }
                const matchingClasses = classesForWoodType(nextWoodType);
                const preferredClass = matchingClasses.find((c: any) => c.name === 'C24' || c.name === 'GL24h') || matchingClasses[1] || matchingClasses[0];
                setWoodTypeForVerif(verification.id, nextWoodType);
                setWoodClassIdForVerif(verification.id, preferredClass?.id || '');
              }}
              style={{
                width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4,
                fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff',
              }}
            >
              <option value="">— Holzart wählen —</option>
              {woodTypeOptions.map((t: string) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Holzklasse */}
          {filteredWoodClasses.length > 0 && (
            <div>
              <label style={{ fontSize: 10, color: '#6b7280', fontWeight: 500, display: 'block', marginBottom: 3 }}>Holzklasse</label>
              <select
                value={currentWoodClassId}
                onChange={e => setWoodClassIdForVerif(verification.id, e.target.value)}
                style={{
                  width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4,
                  fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff',
                }}
              >
                <option value="">— Holzklasse wählen —</option>
                {filteredWoodClasses.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      <Suspense fallback={null}>
        <GraphVerificationView
          key={`${verification.id}-${restoreNonce}`}
          verification={verification}
          initialInputs={graphInputsByVerif[verification.id]}
        />
      </Suspense>

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
