// Ersetzt im Berechnungsausdruck die Variablennamen durch ihre Werte.
// Aus "(M_d * 1e6) / ((b * h * h) / 6)" mit M_d=10, b=120, h=240
// wird "(10 * 1e6) / ((120 * 240 * 240) / 6)"
//
// Wir achten darauf längere Namen zuerst zu ersetzen (z.B. f_m_k vor f_m).

export function substituteValues(expr: string, vars: Record<string, number>): string {
  if (!expr) return '';

  // Ersetze LaTeX-Konstanten zuerst
  let result = expr
    .replace(/\\pi\b/g, formatNumber(Math.PI))
    .replace(/\\e\b/g, formatNumber(Math.E));

  const names = Object.keys(vars).sort((a, b) => b.length - a.length);
  for (const n of names) {
    // Whole-word boundary regex: avoid matching part of another identifier
    const re = new RegExp(`(?<![\\w$])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w$])`, 'g');
    const valStr = formatNumber(vars[n]);
    result = result.replace(re, valStr);
  }
  return result;
}

export function formatNumber(n: number): string {
  if (n === undefined || n === null || isNaN(n)) return '?';
  if (Math.abs(n) >= 1e5 || (Math.abs(n) < 1e-3 && n !== 0)) {
    return n.toExponential(2);
  }
  // Round to up to 3 decimal places, remove trailing zeros
  const rounded = Math.round(n * 1000) / 1000;
  return String(rounded);
}

// Berechnet das Endergebnis sowie sinnvolle Zwischenwerte aus einer Verification.
export function computeWithSteps(computeExpr: string, vars: Record<string, number>): {
  result: number | null;
  substituted: string;
} {
  const substituted = substituteValues(computeExpr, vars);
  try {
    // Use Function() — same approach as evalFormula
    const fn = new Function(...Object.keys(vars), `"use strict"; return (${computeExpr});`);
    const result = fn(...Object.values(vars));
    return {
      result: typeof result === 'number' && isFinite(result) ? result : null,
      substituted,
    };
  } catch {
    return { result: null, substituted };
  }
}
