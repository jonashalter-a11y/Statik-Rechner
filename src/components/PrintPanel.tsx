import React, { Suspense, lazy, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import MathDisplay from './MathDisplay';
import { nameToLatex } from '../utils/formatName';
import { substituteValues, formatNumber } from '../utils/substituteFormula';
import { Verification } from '../types';

const GraphVerificationView = lazy(() => import('./GraphVerificationView'));

function PrintVerification({
  itemKey,
  snapshot: v,
  index,
  graphInputs,
}: {
  itemKey: string;
  snapshot: Verification;
  index: number;
  graphInputs: Record<string, string>;
}) {
  const { removeVerificationFromPrint, updatePrintItemInputs, restoreFromPrint } = useStore();
  const [restored, setRestored] = useState(false);

  const handleRestore = () => {
    restoreFromPrint(itemKey);
    setRestored(true);
    setTimeout(() => setRestored(false), 1800);
  };

  // Variablen-Werte sammeln (für Legacy-Formate ohne graph_json)
  const vars: Record<string, number> = {};
  v.variables.forEach(vr => { vars[vr.name] = Number(vr.value) || 0; });
  const computeExpr = (v as any).computeExpr || '';
  const substituted = substituteValues(computeExpr, vars);

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #d1d5db',
      borderRadius: 6,
      marginBottom: 16,
      pageBreakInside: 'avoid',
    }}>
      {/* Header */}
      <div style={{
        background: '#1e3a5f',
        color: '#fff',
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        borderTopLeftRadius: 5,
        borderTopRightRadius: 5,
      }}>
        <span style={{ fontWeight: 600, fontSize: 13, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {index}. {v.title}
        </span>

        {/* ↩ Ins Frontend Button */}
        <button
          className="no-print"
          onClick={handleRestore}
          title="Aktuelle Werte ins Frontend übernehmen und Nachweis öffnen"
          style={{
            background: restored ? '#065f46' : '#1d4ed8',
            border: 'none',
            borderRadius: 5,
            color: '#fff',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 600,
            padding: '3px 9px',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            whiteSpace: 'nowrap',
            transition: 'background 0.2s',
          }}
        >
          {restored ? '✓ Übernommen' : '↩ Ins Frontend'}
        </button>

        <button
          className="no-print"
          onClick={() => removeVerificationFromPrint(itemKey)}
          style={{ background: 'none', border: 'none', color: '#93c5fd', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px' }}
          title="Entfernen"
        >✕</button>
      </div>

      <div style={{ padding: 14 }}>
        {v.graph_json ? (
          <Suspense fallback={null}>
            <GraphVerificationView
              verification={v}
              initialInputs={graphInputs}
              onInputsChange={inputs => updatePrintItemInputs(itemKey, inputs)}
            />
          </Suspense>
        ) : (<>
          {/* 1. Symbolische Formel */}
          <div style={{ marginBottom: 12 }}>
            <div style={sectionLabel}>Formel</div>
            <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 4, padding: '10px 14px', overflowX: 'auto' }}>
              <MathDisplay latex={v.formula.latex} display={true} />
            </div>
          </div>

          {/* 2. Gegebene Werte */}
          <div style={{ marginBottom: 12 }}>
            <div style={sectionLabel}>Gegebene Werte</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={cellHeaderStyle}>Variable</th>
                  <th style={cellHeaderStyle}>Bezeichnung</th>
                  <th style={{ ...cellHeaderStyle, textAlign: 'right' }}>Wert</th>
                  <th style={cellHeaderStyle}>Einheit</th>
                </tr>
              </thead>
              <tbody>
                {v.variables.map((variable, i) => (
                  <tr key={variable.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ ...cellStyle, width: '15%' }}>
                      <MathDisplay latex={nameToLatex(variable.name)} />
                    </td>
                    <td style={{ ...cellStyle, color: '#6b7280' }}>{variable.description || variable.label}</td>
                    <td style={{ ...cellStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                      {formatNumber(Number(variable.value) || 0)}
                    </td>
                    <td style={{ ...cellStyle, color: '#6b7280', width: '15%' }}>{variable.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 3. Berechnung mit eingesetzten Werten */}
          {computeExpr && (
            <div style={{ marginBottom: 12 }}>
              <div style={sectionLabel}>Berechnung — Werte eingesetzt</div>
              <div style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: 4,
                padding: '10px 14px',
                fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                fontSize: 11,
                lineHeight: 1.6,
                overflowX: 'auto',
              }}>
                <div style={{ color: '#92400e', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>η =</span>{' '}
                  <span style={{ color: '#374151' }}>{computeExpr}</span>
                </div>
                <div style={{ color: '#92400e' }}>
                  <span style={{ fontWeight: 600 }}>η =</span>{' '}
                  <span style={{ color: '#111827' }}>{substituted}</span>
                </div>
              </div>
            </div>
          )}

          {/* 4. Ergebnis */}
          {v.result !== undefined && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 4,
              background: v.passed ? '#d1fae5' : '#fee2e2',
              border: `1px solid ${v.passed ? '#6ee7b7' : '#fca5a5'}`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <span style={{ fontSize: 20 }}>{v.passed ? '✓' : '✗'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: v.passed ? '#065f46' : '#991b1b' }}>
                  η = {v.result.toFixed(3)} {v.passed ? '≤ 1.0' : '> 1.0'}
                </div>
                <div style={{ fontSize: 11, color: v.passed ? '#047857' : '#b91c1c', marginTop: 2 }}>
                  Ausnutzung: {(v.result * 100).toFixed(1)}% — Nachweis {v.passed ? 'erfüllt' : 'nicht erfüllt'}
                </div>
              </div>
            </div>
          )}
        </>)}

        {/* Kommentar */}
        {v.comment && (
          <div style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: '1px dashed #e5e7eb',
            fontSize: 11,
            color: '#6b7280',
            fontStyle: 'italic',
            whiteSpace: 'pre-wrap',
          }}>
            <strong>Bemerkung:</strong> {v.comment}
          </div>
        )}
      </div>
    </div>
  );
}

const sectionLabel: React.CSSProperties = {
  fontSize: 10,
  color: '#6b7280',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 4,
};

const cellHeaderStyle: React.CSSProperties = {
  padding: '5px 8px',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: 10,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const cellStyle: React.CSSProperties = {
  padding: '5px 8px',
  fontSize: 11,
};

export default function PrintPanel() {
  const { printItems, woodClassId, exportPrintProtocol, importPrintProtocol, clearPrintProtocol } = useStore() as any;
  const printRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');

  const protocolFileName = () => `Ausdrucksprotokoll-${new Date().toISOString().slice(0, 10)}.json`;

  const downloadProtocol = () => {
    const payload = exportPrintProtocol();
    const blob = new Blob([JSON.stringify(payload, null, 2) + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = protocolFileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setMessage('Ausdrucksprotokoll exportiert');
    setTimeout(() => setMessage(''), 1800);
  };

  const importProtocolFile = async (file?: File | null) => {
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const result = importPrintProtocol(payload);
      if (!result.ok) throw new Error(result.error);
      setMessage(`${result.count} Nachweis${result.count === 1 ? '' : 'e'} importiert`);
      setTimeout(() => setMessage(''), 2200);
    } catch (err) {
      alert('Import fehlgeschlagen: ' + String((err as Error).message || err));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const exportPDF = async () => {
    if (!printRef.current) return;
    setExporting(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const A4_WIDTH_PX = 794;
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;left:-10000px;top:0;width:' + A4_WIDTH_PX + 'px;z-index:-1;';

      const clone = printRef.current.cloneNode(true) as HTMLElement;
      clone.style.cssText = 'width:' + A4_WIDTH_PX + 'px;max-width:none;margin:0;box-shadow:none;border-radius:0;padding:30px;background:#fff;';
      clone.querySelectorAll('.no-print').forEach(el => el.remove());

      container.appendChild(clone);
      document.body.appendChild(container);

      await new Promise(r => setTimeout(r, 300));

      const patchUnsupportedColors = (root: HTMLElement) => {
        const toRgb = (css: string): string => {
          try {
            const c = document.createElement('canvas');
            c.width = c.height = 1;
            const ctx = c.getContext('2d')!;
            ctx.fillStyle = css;
            ctx.fillRect(0, 0, 1, 1);
            const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
            return a === 0 ? 'transparent' : `rgba(${r},${g},${b},${+(a / 255).toFixed(3)})`;
          } catch { return css; }
        };
        const props = ['color', 'background-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'outline-color', 'fill', 'stroke'];
        const isUnsafe = (v: string) => /^(color|oklch|lab|lch|display-p3)\s*\(/.test(v);
        root.querySelectorAll<HTMLElement>('*').forEach(el => {
          const s = window.getComputedStyle(el);
          props.forEach(p => {
            const v = s.getPropertyValue(p);
            if (v && isUnsafe(v)) (el.style as any)[p.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = toRgb(v);
          });
        });
      };

      const canvas = await html2canvas(clone, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        onclone: (_doc, el) => patchUnsupportedColors(el),
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgHeightMm = (canvas.height * pdfWidth) / canvas.width;

      let positionMm = 0;
      let pageIndex = 0;
      while (positionMm < imgHeightMm) {
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -positionMm, pdfWidth, imgHeightMm);
        positionMm += pdfHeight;
        pageIndex++;
      }

      pdf.save(`SIA265-Berechnung-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error('PDF export failed:', e);
      alert('PDF-Export fehlgeschlagen: ' + (e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  if (printItems.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#9ca3af',
        padding: 24,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>📄</div>
        <div style={{ fontSize: 13 }}>
          Fügen Sie Nachweise zum Ausdruck hinzu<br />
          über die Schaltfläche «+ Zum Ausdruck»
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={e => importProtocolFile(e.target.files?.[0])}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            marginTop: 16,
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '8px 14px',
            fontSize: 12,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Ausdrucksprotokoll importieren
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div className="no-print" style={{
        padding: '8px 12px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        background: '#f8fafc',
      }}>
        <span style={{ fontSize: 12, color: '#6b7280', flex: 1 }}>
          {printItems.length} Nachweis{printItems.length > 1 ? 'e' : ''} in der Ablage
        </span>
        {message && (
          <span style={{ fontSize: 11, color: '#047857', fontWeight: 600, whiteSpace: 'nowrap' }}>{message}</span>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="no-print"
          style={{ display: 'none' }}
          onChange={e => importProtocolFile(e.target.files?.[0])}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            background: '#fff',
            color: '#1e40af',
            border: '1px solid #bfdbfe',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 12,
            cursor: 'pointer',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          JSON importieren
        </button>
        <button
          onClick={downloadProtocol}
          style={{
            background: '#fff',
            color: '#166534',
            border: '1px solid #bbf7d0',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 12,
            cursor: 'pointer',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          JSON exportieren
        </button>
        <button
          onClick={() => {
            if (window.confirm('Ausdrucksprotokoll wirklich leeren?')) clearPrintProtocol();
          }}
          style={{
            background: '#fff',
            color: '#991b1b',
            border: '1px solid #fecaca',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 12,
            cursor: 'pointer',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          Leeren
        </button>
        <button
          onClick={exportPDF}
          disabled={exporting}
          style={{
            background: exporting ? '#9ca3af' : '#dc2626',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '6px 14px',
            fontSize: 12,
            cursor: exporting ? 'wait' : 'pointer',
            fontWeight: 600,
          }}
        >
          {exporting ? '⏳ Erstelle…' : '📄 PDF herunterladen'}
        </button>
      </div>

      {/* Hinweis-Banner */}
      <div className="no-print" style={{
        padding: '6px 14px',
        background: '#eff6ff',
        borderBottom: '1px solid #bfdbfe',
        fontSize: 11,
        color: '#1d4ed8',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <span>💡</span>
        <span>Werte können direkt bearbeitet werden. Mit <strong>↩ Ins Frontend</strong> werden die geänderten Werte ins normale Frontend übernommen.</span>
      </div>

      {/* A4 area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        background: '#e5e7eb',
        padding: '16px 12px',
      }}>
        <div
          ref={printRef}
          id="print-document"
          style={{
            background: '#fff',
            padding: 20,
            maxWidth: 800,
            margin: '0 auto',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            borderRadius: 4,
          }}
        >
          {/* Document Header */}
          <div style={{
            borderBottom: '2px solid #1e3a5f',
            paddingBottom: 10,
            marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 18, color: '#1e3a5f' }}>
                  Statische Berechnung
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  nach SIA 265:2021 – Holzbau
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', textAlign: 'right' }}>
                <div>Datum: {new Date().toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                {woodClassId && <div>Holzklasse: <strong>{woodClassId}</strong></div>}
                <div>{printItems.length} Nachweis{printItems.length > 1 ? 'e' : ''}</div>
              </div>
            </div>
          </div>

          {printItems.map((item: any, i: number) => (
            <PrintVerification
              key={item.key}
              itemKey={item.key}
              snapshot={item.snapshot}
              index={i + 1}
              graphInputs={item.graphInputs}
            />
          ))}

          {/* Footer */}
          <div style={{
            marginTop: 16,
            paddingTop: 8,
            borderTop: '1px solid #e5e7eb',
            fontSize: 10,
            color: '#9ca3af',
            textAlign: 'center',
          }}>
            Erstellt mit SIA 265 Rechner — Berner Fachhochschule
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { background: #fff !important; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
