// Evaluiert einen Berechnungsausdruck mit den gegebenen Variablen-Werten.
// Der Ausdruck ist JavaScript und darf Math.* verwenden.
//
// Beispiel: evalFormula("(M_d * 1e6 / Wy) / (k_mod * f_m_k / gamma_M)", { M_d: 10, Wy: 1.15e6, k_mod: 0.8, f_m_k: 24, gamma_M: 1.3 })
//
// Sicherheitsanmerkung: compute_expr kommt aus der DB und wird im Admin-UI vom User selbst eingegeben.
// In einer Produktionsumgebung sollte man hier eine sandboxed Expression-Engine verwenden.

export function evalFormula(expr: string, vars: Record<string, number>): number | null {
  if (!expr || !expr.trim()) return null;

  try {
    const names = Object.keys(vars);
    const values = Object.values(vars);
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const fn = new Function(...names, `"use strict"; return (${expr});`);
    const result = fn(...values);
    if (typeof result !== 'number' || !isFinite(result)) return null;
    return result;
  } catch (e) {
    console.warn('Formula evaluation error:', e, 'expr:', expr);
    return null;
  }
}

// Für Bedingungsausdrücke: akzeptiert String- und Zahlenvariablen, gibt boolean zurück.
// Erlaubt kombinierte Ausdrücke wie: GK === 'III' && z < 5
export function evalCondExpr(expr: string, vars: Record<string, string | number>): boolean {
  if (!expr?.trim()) return false;
  try {
    const names = Object.keys(vars);
    const values = Object.values(vars);
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const fn = new Function(...names, `"use strict"; return !!(${expr});`);
    return !!fn(...values);
  } catch {
    return false;
  }
}
