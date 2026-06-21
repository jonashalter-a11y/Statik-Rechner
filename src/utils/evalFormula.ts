// Evaluiert einen Berechnungsausdruck mit den gegebenen Variablen-Werten.
// Der Ausdruck ist JavaScript und darf Math.* verwenden.
//
// Beispiel: evalFormula("(M_d * 1e6 / Wy) / (k_mod * f_m_k / gamma_M)", { M_d: 10, Wy: 1.15e6, k_mod: 0.8, f_m_k: 24, gamma_M: 1.3 })
//
// Sicherheitsanmerkung: compute_expr kommt aus lokalen JSON-Daten oder aus dem Admin-UI.
// In einer Produktionsumgebung sollte man hier eine sandboxed Expression-Engine verwenden.

export function evalFormula(expr: string, vars: Record<string, number>): number | null {
  if (!expr || !expr.trim()) return null;

  try {
    // Ersetze LaTeX-Konstanten mit ihren mathematischen Werten
    let processedExpr = expr
      .replace(/\\pi\b/g, String(Math.PI))
      .replace(/\bpi\b/g, String(Math.PI))
      .replace(/\\e\b/g, String(Math.E))
      .replace(/\be\b/g, String(Math.E));

    const names = Object.keys(vars).concat(['Math']);
    const values = [...Object.values(vars), Math] as any[];
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const fn = new Function(...names, `"use strict"; return (${processedExpr});`);
    const result = fn(...values);
    if (typeof result !== 'number' || !isFinite(result)) return null;
    return result;
  } catch (e) {
    console.warn('Formula evaluation error:', e, 'expr:', expr);
    return null;
  }
}

// Wertet einen Ausdruck mit ±-Operator aus und liefert BEIDE Vorzeichen-Fälle.
// `±` (oder LaTeX `\pm`) im Ausdruck → value = Plus-Fall, valueAlt = Minus-Fall.
// Ohne ± verhält es sich wie evalFormula (valueAlt = null, hasPM = false).
export function evalFormulaPM(
  expr: string,
  vars: Record<string, number>
): { value: number | null; valueAlt: number | null; hasPM: boolean } {
  const hasPM = /±|\\pm\b/.test(expr || '');
  if (!hasPM) return { value: evalFormula(expr, vars), valueAlt: null, hasPM: false };
  const plusExpr = expr.replace(/\\pm\b/g, '±').replace(/±/g, '+');
  const minusExpr = expr.replace(/\\pm\b/g, '±').replace(/±/g, '-');
  return { value: evalFormula(plusExpr, vars), valueAlt: evalFormula(minusExpr, vars), hasPM: true };
}

// Für Bedingungsausdrücke: akzeptiert String- und Zahlenvariablen, gibt boolean zurück.
// Erlaubt kombinierte Ausdrücke wie: GK === 'III' && z < 5
export function evalCondExpr(expr: string, vars: Record<string, string | number>): boolean {
  if (!expr?.trim()) return false;
  try {
    const names = Object.keys(vars).concat(['Math']);
    const values = [...Object.values(vars), Math] as any[];
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const fn = new Function(...names, `"use strict"; return !!(${expr});`);
    return !!fn(...values);
  } catch {
    return false;
  }
}
