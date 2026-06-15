// ─── Graph-Auswertung ─────────────────────────────────────────────────────────
// Wertet einen Nachweis-Graphen aus: topologische Reihenfolge über Workflow-Kanten,
// Symboltabelle (Variablenname → Zahl), pro Blocktyp eine Auswertung.
// Wiederverwendung: evalFormula, substituteValues, formatNumber.

import { VerificationGraph, GraphNode } from '../types/graph';
import { evalFormula, evalCondExpr } from './evalFormula';
export { evalFormula, evalCondExpr } from './evalFormula';
import { latexToJs, latexCondToJs } from './latexToJs';
export { latexToJs, latexCondToJs } from './latexToJs';
import { substituteValues } from './substituteFormula';
export { substituteValues } from './substituteFormula';
import { nameToLatex } from './formatName';

export interface ChartSeriesData { name: string; data: [number, number][]; }
export interface ChartJsonData { series: ChartSeriesData[]; xAxis?: { label?: string; unit?: string }; yAxis?: { label?: string; unit?: string }; }
export interface DbTableData { headers: string[]; rows: string[][]; chart_json?: ChartJsonData | null; }
export interface NodeResult {
  value?: number;                 // numerisches Ergebnis (variable, tablevalue, calc, stdcalc)
  substituted?: string;           // "mit Werten" (calc/stdcalc)
  substitutedLatex?: string;      // Anzeige-Formel mit eingesetzten Werten
  missingSymbols?: string[];      // Variablen, die in der Formel vorkommen, aber nicht definiert sind
  selected?: { tableId?: string; rowIndex?: number; label?: string }; // dropdown
  table?: Record<string, number>; // tablecalc (Zone → Wert)
  activeConditionId?: string;     // condition
  caseValues?: number[];          // minmax: Wert je Ausdruck
  activeCaseIndex?: number;       // minmax: Index des gewählten Ausdrucks
  matrixVals?: Record<string, number>;   // matrix: berechnete Spaltenwerte
  matrixLatex?: Record<string, string>;  // matrix: LaTeX-Formel pro Spalte (mit eingesetzten Werten)
  selectedLabel?: string;         // matrix: gewählte Zeile
  passed?: boolean;               // check: Nachweis erfüllt (true) oder nicht (false)
  eta?: number;                   // check: automatische Ausnutzung links/rechts
  skipped?: boolean;              // inaktiver Bedingungszweig
  error?: string;
}
export interface EvalResult {
  results: Record<string, NodeResult>;
  symbols: Record<string, number>;
}
export interface EvalContext {
  woodType?: string;
  woodClassId?: string;
}

// Zahl aus String robust extrahieren ("−0.21", "±0.10", "+0.15/−0.21" → erste Zahl)
export function parseNum(s: unknown): number {
  if (typeof s === 'number') return s;
  if (s == null) return NaN;
  const t = String(s).replace(/[−–—]/g, '-').replace(/,/g, '.');
  const m = t.match(/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
}

// \text{...} ist ein reiner Anzeige-Befehl; für die Namens-/Symbol-Logik zählt nur sein Inhalt,
// damit z.B. "\sigma_{m,\text{crit}}" überall zum selben Symbol wie "\sigma_{m,crit}" wird.
export function stripLatexText(s: string): string {
  return String(s || '').replace(/\\text\s*\{([^{}]*)\}/g, '$1');
}

export function normalizeMaterialKey(name: string): string {
  return stripLatexText(name)
    .trim()
    .replace(/\\(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|lambda|mu|nu|xi|pi|rho|sigma|tau|phi|chi|psi|omega)\b/g, '$1')
    .replace(/_\{([^{}]+)\}/g, (_m, sub: string) => '_' + sub.replace(/[,\s]+/g, '_'))
    .replace(/[{},\s]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export function latexName(name: string): string {
  const trimmed = stripLatexText(name).trim();
  if (!trimmed) return '';
  return /_\{/.test(trimmed) ? trimmed : nameToLatex(trimmed);
}

export function symbolAliases(name: string): string[] {
  const raw = stripLatexText(name).trim();
  const normalized = normalizeMaterialKey(raw);
  const latex = latexName(raw);
  const latexNormalized = normalizeMaterialKey(latex);
  const aliases = [
    raw,
    normalized,
    latex,
    latexNormalized,
    raw.replace(/\\/g, ''),
    normalized.replace(/\\/g, ''),
    latex.replace(/\\/g, ''),
    latexNormalized.replace(/\\/g, ''),
  ].filter(Boolean);
  return Array.from(new Set(aliases));
}

// Ersetzt deutsche Umlaute durch ASCII-Äquivalente damit Variablennamen
// wie h_Meereshöhe zu gültigen JS-Bezeichnern werden.
export function deUmlaut(s: string): string {
  return s
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss');
}

export function setSymbol(symbols: Record<string, number>, name: string, value: number) {
  for (const alias of symbolAliases(name)) {
    const jsName = deUmlaut(alias)
      .replace(/\\/g, '')
      .replace(/([A-Za-z0-9_])'+/g, '$1') // q' → q (Prime)
      .replace(/_\{([^{}]+)\}/g, (_m, sub: string) => '_' + sub.replace(/[,\s.]+/g, '_'))
      .replace(/[{},\s.]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    if (/^[A-Za-z_$][\w$]*$/.test(jsName)) {
      symbols[jsName] = value;
      // k_v_1 → k_v1: merge letter-subscript + digit-subscript so both spellings work
      const compact = jsName.replace(/_([A-Za-z]+)_(\d+)(?=_|$)/g, '_$1$2');
      if (compact !== jsName && /^[A-Za-z_$][\w$]*$/.test(compact)) symbols[compact] = value;
    }
  }
}

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Formatiert Zahlen für LaTeX-Anzeige: kein "1.04e+9", sondern "1.04\cdot10^{9}"
export function formatLatexNumber(n: number): string {
  if (!isFinite(n)) return String(n);
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 1e6 || (abs < 1e-3 && abs > 0)) {
    const exp = Math.floor(Math.log10(abs));
    const m = Math.round((n / Math.pow(10, exp)) * 100) / 100;
    return `${m}\\cdot10^{${exp}}`;
  }
  return String(Math.round(n * 1000) / 1000);
}

export function replaceLatexSymbol(formula: string, symbol: string, value: number) {
  const val = formatLatexNumber(value);
  if (!symbol) return formula;

  // Single-letter variables such as a, b and h must not be replaced inside
  // LaTeX commands or longer names (\sigma, \frac, mean, ...).
  if (/^[A-Za-z]$/.test(symbol)) {
    return formula.replace(new RegExp(`(?<![\\\\A-Za-z])${escapeRegExp(symbol)}(?![A-Za-z])`, 'g'), val);
  }

  // Names with subscripts are matched as complete LaTeX symbols.
  if (symbol.includes('_{')) {
    return formula.replace(new RegExp(escapeRegExp(symbol), 'g'), val);
  }

  return formula.replace(new RegExp(`(?<![\\\\A-Za-z0-9_])${escapeRegExp(symbol)}(?![A-Za-z0-9_])`, 'g'), val);
}

export function substituteLatexValues(latex: string, symbols: Record<string, number>): string {
  if (!latex) return '';
  // Anzeige-Befehle vereinheitlichen, damit "\text{crit}" und "0{,}05"-Indizes
  // dieselben Symbolnamen treffen, die unten generiert werden.
  let normalized = stripLatexText(latex).replace(/\{,\}/g, ',');

  // Ersetze LaTeX-Konstanten
  normalized = normalized
    .replace(/\\pi\b/g, formatLatexNumber(Math.PI))
    .replace(/\bpi\b/g, formatLatexNumber(Math.PI))
    .replace(/\\e\b/g, formatLatexNumber(Math.E))
    .replace(/\be\b/g, formatLatexNumber(Math.E));

  const entries = Object.entries(symbols)
    .filter(([, value]) => typeof value === 'number' && isFinite(value))
    .flatMap(([name, value]) => {
      const latexAliases = symbolAliases(name).map(a => latexName(a)).filter(Boolean);
      // Auch Kurzform ohne Klammern ergänzen: h_{0} → h_0, f_{m,k} → f_m_k
      // damit Formeln die _0 statt _{0} schreiben ebenfalls substituiert werden.
      const shortForms = latexAliases
        .filter(a => a.includes('_{'))
        .map(a => a.replace(/_\{([^{}]+)\}/g, '_$1'))
        .filter(Boolean);
      return [...new Set([...latexAliases, ...shortForms])].map(a => [a, value] as const);
    })
    .filter(([alias]) => alias)
    .sort((a, b) => b[0].length - a[0].length);
  let result = normalized;
  const seen = new Set<string>();
  for (const [alias, value] of entries) {
    if (seen.has(alias)) continue;
    seen.add(alias);
    result = replaceLatexSymbol(result, alias, value);
  }
  return result;
}

export function evalBestEffortFormula(formula: string, vars: Record<string, number>): number {
  if (!formula?.trim()) return NaN;
  let val = NaN;
  try { val = evalFormula(latexToJs(formula), vars) ?? NaN; } catch { val = NaN; }
  if (!isFinite(val)) {
    try { val = evalFormula(formula, vars) ?? NaN; } catch { val = NaN; }
  }
  return val;
}

export function evalBestEffortCondition(expr: string, vars: Record<string, number>): boolean {
  if (!expr?.trim()) return true;
  try {
    const js = latexCondToJs(expr);
    if (js) return Boolean(evalFormula(js, vars));
  } catch { /* try JS below */ }
  return evalCondExpr(expr, vars);
}

export function indexLoopLatexName(name: string, index: number | 'n') {
  if (!name) return '';
  return name
    .replace(/_\{([^{}]*)\}/g, (_m, sub: string) => `_{${sub.replace(/(^|,)i(?=,|$)/g, `$1${index}`)}}`)
    .replace(/_i\b/g, `_${index}`);
}

export function extractMissingSymbols(expr: string, symbols: Record<string, number>): string[] {
  if (!expr) return [];
  // Entferne LaTeX-Konstanten und Math-Funktionen
  let cleaned = expr
    .replace(/\\pi\b/g, '')
    .replace(/\bpi\b/g, '')
    .replace(/\\e\b/g, '')
    .replace(/\be\b/g, '')
    .replace(/Math\.[A-Za-z_$][\w$]*/g, '');
  const ids = cleaned.match(/[A-Za-z_$][\w$]*/g) || [];
  const ignored = new Set(['Math', 'NaN', 'Infinity', 'undefined', 'null', 'true', 'false', 'pi', 'e']);
  return Array.from(new Set(ids.filter(id => !ignored.has(id) && !(id in symbols))));
}

// Lineare Interpolation in einer sortierten Kurve; NaN wenn ausserhalb des Bereichs
export function interpolateChart(pts: [number, number][], x: number): number {
  if (!pts.length) return NaN;
  if (x < pts[0][0] || x > pts[pts.length - 1][0]) return NaN;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    if (x >= x0 && x <= x1) return x0 === x1 ? y0 : y0 + (y1 - y0) * (x - x0) / (x1 - x0);
  }
  return NaN;
}

// Umkehr-Interpolation: Y → X (erstes Segment das den Y-Wert enthält)
export function interpolateChartInverse(pts: [number, number][], y: number): number {
  if (!pts.length) return NaN;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const yMin = Math.min(y0, y1), yMax = Math.max(y0, y1);
    if (y >= yMin && y <= yMax) {
      if (Math.abs(y1 - y0) < 1e-12) return x0;
      return x0 + (x1 - x0) * (y - y0) / (y1 - y0);
    }
  }
  // Klemmen
  if (y <= pts[0][1]) return pts[0][0];
  return pts[pts.length - 1][0];
}

export interface BlockEvalRuntime {
  graph: VerificationGraph;
  inputs: Record<string, string | number>;
  tables: Record<string, DbTableData>;
  materialProps: Record<string, number>;
  context: EvalContext;
  results: Record<string, NodeResult>;
  symbols: Record<string, number>;
  strSymbols: Record<string, string>;
  incomingFrom: (targetId: string, kind?: 'workflow' | 'condition') => string[];
  getSelectionValue: (source?: string) => string;
}
