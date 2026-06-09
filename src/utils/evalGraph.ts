// ─── Graph-Auswertung ─────────────────────────────────────────────────────────
// Wertet einen Nachweis-Graphen aus: topologische Reihenfolge über Workflow-Kanten,
// Symboltabelle (Variablenname → Zahl), pro Blocktyp eine Auswertung.
// Wiederverwendung: evalFormula, substituteValues, formatNumber.

import { VerificationGraph, GraphNode } from '../types/graph';
import { evalFormula } from './evalFormula';
import { latexToJs, latexCondToJs } from './latexToJs';
import { formatNumber, substituteValues } from './substituteFormula';
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
  passed?: boolean;               // check: Nachweis erfüllt (true) oder nicht (false)
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
function stripLatexText(s: string): string {
  return String(s || '').replace(/\\text\s*\{([^{}]*)\}/g, '$1');
}

function normalizeMaterialKey(name: string): string {
  return stripLatexText(name)
    .trim()
    .replace(/_\{([^{}]+)\}/g, (_m, sub: string) => '_' + sub.replace(/[,\s]+/g, '_'))
    .replace(/[{},\s]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function latexName(name: string): string {
  const trimmed = stripLatexText(name).trim();
  if (!trimmed) return '';
  return /_\{/.test(trimmed) ? trimmed : nameToLatex(trimmed);
}

function symbolAliases(name: string): string[] {
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
function deUmlaut(s: string): string {
  return s
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss');
}

function setSymbol(symbols: Record<string, number>, name: string, value: number) {
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceLatexSymbol(formula: string, symbol: string, value: number) {
  const val = formatNumber(value);
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

function substituteLatexValues(latex: string, symbols: Record<string, number>): string {
  if (!latex) return '';
  // Anzeige-Befehle vereinheitlichen, damit "\text{crit}" und "0{,}05"-Indizes
  // dieselben Symbolnamen treffen, die unten generiert werden.
  const normalized = stripLatexText(latex).replace(/\{,\}/g, ',');
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

function extractMissingSymbols(expr: string, symbols: Record<string, number>): string[] {
  if (!expr) return [];
  const cleaned = expr.replace(/Math\.[A-Za-z_$][\w$]*/g, '');
  const ids = cleaned.match(/[A-Za-z_$][\w$]*/g) || [];
  const ignored = new Set(['Math', 'NaN', 'Infinity', 'undefined', 'null', 'true', 'false']);
  return Array.from(new Set(ids.filter(id => !ignored.has(id) && !(id in symbols))));
}

// Lineare Interpolation in einer sortierten Kurve; NaN wenn ausserhalb des Bereichs
function interpolateChart(pts: [number, number][], x: number): number {
  if (!pts.length) return NaN;
  if (x < pts[0][0] || x > pts[pts.length - 1][0]) return NaN;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    if (x >= x0 && x <= x1) return x0 === x1 ? y0 : y0 + (y1 - y0) * (x - x0) / (x1 - x0);
  }
  return NaN;
}

// Umkehr-Interpolation: Y → X (erstes Segment das den Y-Wert enthält)
function interpolateChartInverse(pts: [number, number][], y: number): number {
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

// Topologische Sortierung über Workflow-Kanten (Kahn). Bei Zyklen: Rest in Originalreihenfolge.
export function topoSort(graph: VerificationGraph): GraphNode[] {
  const nodes = graph.nodes;
  const flowEdges = graph.edges.filter(e => ['workflow', 'condition'].includes(e.data?.kind ?? 'workflow'));
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  nodes.forEach(n => { indeg.set(n.id, 0); adj.set(n.id, []); });
  // ref-Blöcke hängen implizit von ihrem source_id ab (egal ob Kante existiert)
  nodes.forEach(n => {
    if (n.type === 'ref') {
      const srcId = (n.data as any).source_id;
      if (srcId && adj.has(srcId) && indeg.has(n.id)) {
        adj.get(srcId)!.push(n.id);
        indeg.set(n.id, (indeg.get(n.id) || 0) + 1);
      }
    }
  });
  flowEdges.forEach(e => {
    if (!adj.has(e.source) || !indeg.has(e.target)) return;
    adj.get(e.source)!.push(e.target);
    indeg.set(e.target, (indeg.get(e.target) || 0) + 1);
  });
  const queue = nodes.filter(n => (indeg.get(n.id) || 0) === 0).map(n => n.id);
  const order: string[] = [];
  const seen = new Set<string>();
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id); order.push(id);
    (adj.get(id) || []).forEach(t => {
      indeg.set(t, (indeg.get(t) || 0) - 1);
      if ((indeg.get(t) || 0) <= 0 && !seen.has(t)) queue.push(t);
    });
  }
  // verbleibende (Zyklus) anhängen
  nodes.forEach(n => { if (!seen.has(n.id)) order.push(n.id); });
  return order.map(id => nodes.find(n => n.id === id)!).filter(Boolean);
}

export function evalGraph(
  graph: VerificationGraph,
  inputs: Record<string, string | number>,
  tables: Record<string, DbTableData> = {},
  materialProps: Record<string, number> = {},
  context: EvalContext = {},
): EvalResult {
  const results: Record<string, NodeResult> = {};
  const symbols: Record<string, number> = {};
  const ordered = topoSort(graph);

  const incomingFrom = (targetId: string, kind: 'workflow' | 'condition' = 'workflow') =>
    graph.edges.filter(e => e.target === targetId && (e.data?.kind ?? 'workflow') === kind).map(e => e.source);
  const incomingConditionEdges = (targetId: string) =>
    graph.edges.filter(e => e.target === targetId && (e.data?.kind ?? 'workflow') === 'condition');
  const getSelectionValue = (source?: string): string => {
    if (!source || source === 'woodType') return context.woodType || '';
    if (source === 'woodClass') return context.woodClassId || '';
    const node = graph.nodes.find(n => n.id === source);
    if (!node) return '';
    if (node.type === 'dropdown' || node.type === 'variable' || node.type === 'stdcalc') return String(inputs[source] ?? '');
    if (node.type === 'woodclass') return context.woodClassId || '';
    return String(results[source]?.selected?.label ?? results[source]?.value ?? '');
  };

  for (const node of ordered) {
    const d: any = node.data;
    try {
      const condEdges = incomingConditionEdges(node.id);
      if (condEdges.length > 0 && !condEdges.some(e => results[e.source]?.activeConditionId === (e.data?.conditionId || e.sourceHandle))) {
        results[node.id] = { skipped: true };
        continue;
      }
      switch (node.type) {
        case 'variable': {
          const raw = inputs[node.id] ?? d.default_value ?? '';
          const val = parseNum(raw);
          results[node.id] = { value: val };
          if (d.name) setSymbol(symbols, d.name, val);
          break;
        }
        case 'dropdown': {
          const selLabel = inputs[node.id] != null ? String(inputs[node.id]) : '';
          let rowIndex = -1;
          const tbl = d.table_ref ? tables[d.table_ref] : undefined;
          if (tbl) {
            const labelCol = d.label_col ?? 0;
            rowIndex = tbl.rows.findIndex(r => String(r[labelCol]) === selLabel);
          }
          results[node.id] = { selected: { tableId: d.table_ref, rowIndex, label: selLabel } };
          // mode=custom: gewählter Wert direkt als Symbol (falls Name gesetzt)
          if (d.mode === 'custom' && d.name) {
            const opt = (d.options || []).find((o: any) => o.label === selLabel || o.value === selLabel);
            const v = parseNum(opt ? opt.value : selLabel);
            setSymbol(symbols, d.name, v);
            results[node.id].value = v;
          }
          break;
        }
        case 'woodclass': {
          results[node.id] = { selected: { label: d.label || 'Aktuelle Holzklasse' } };
          break;
        }
        case 'tablevalue': {
          const sourceId = d.source_dropdown || incomingFrom(node.id).find(id => ['dropdown', 'woodclass'].includes(String(graph.nodes.find(n => n.id === id)?.type)));
          const sourceType = graph.nodes.find(n => n.id === sourceId)?.type;
          const sel = sourceId ? results[sourceId]?.selected : undefined;
          let val = NaN;
          if (sourceType === 'woodclass') {
            const key = normalizeMaterialKey(d.name);
            val = parseNum(materialProps[d.name] ?? materialProps[key]);
          } else if (sel?.tableId && sel.rowIndex != null && sel.rowIndex >= 0) {
            const tbl = tables[sel.tableId];
            if (tbl) val = parseNum(tbl.rows[sel.rowIndex]?.[d.table_col]);
          }
          results[node.id] = { value: val };
          if (d.name) setSymbol(symbols, d.name, val);
          break;
        }
        case 'calc': {
          const expr = d.latex ? latexToJs(d.latex) : (d.expr || '');
          const missingSymbols = extractMissingSymbols(expr, symbols);
          const v = evalFormula(expr, symbols);
          const substituted = substituteValues(expr, symbols);
          const substitutedLatex = d.latex ? substituteLatexValues(d.latex, symbols) : '';
          results[node.id] = { value: v ?? NaN, substituted, substitutedLatex, missingSymbols };
          if (d.name && v != null) setSymbol(symbols, d.name, v);
          break;
        }
        case 'tablecalc': {
          const tbl = d.table_ref ? tables[d.table_ref] : undefined;
          const dropId = incomingFrom(node.id).find(id => graph.nodes.find(n => n.id === id)?.type === 'dropdown');
          const rowIndex = dropId ? results[dropId]?.selected?.rowIndex ?? 0 : 0;
          const table: Record<string, number> = {};
          if (tbl) {
            for (const zone of (d.zones || [])) {
              const col = tbl.headers.indexOf(zone);
              const cell = col >= 0 ? parseNum(tbl.rows[rowIndex >= 0 ? rowIndex : 0]?.[col]) : NaN;
              const v = evalFormula(d.expr || 'cell', { ...symbols, cell });
              table[zone] = v ?? NaN;
            }
          }
          results[node.id] = { table };
          break;
        }
        case 'stdcalc': {
          const srcId = d.source_tablecalc || incomingFrom(node.id).find(id => graph.nodes.find(n => n.id === id)?.type === 'tablecalc');
          const tableRes = srcId ? results[srcId]?.table : undefined;
          const selectedZone = inputs[node.id] != null ? String(inputs[node.id]) : '';
          const pickerVal = tableRes ? tableRes[selectedZone] : NaN;
          const localSym = { ...symbols, [d.picker_name || 'cell']: pickerVal };
          const expr = d.latex ? latexToJs(d.latex) : (d.expr || '');
          const missingSymbols = extractMissingSymbols(expr, localSym);
          const v = evalFormula(expr, localSym);
          const substituted = substituteValues(expr, localSym);
          const substitutedLatex = d.latex ? substituteLatexValues(d.latex, localSym) : '';
          results[node.id] = { value: v ?? NaN, substituted, substitutedLatex, missingSymbols };
          if (d.name && v != null) setSymbol(symbols, d.name, v);
          break;
        }
        case 'chartlookup': {
          const chartData = d.chart_ref ? tables[d.chart_ref]?.chart_json : undefined;
          const series = chartData?.series ?? [];
          const inRaw = d.x_name || '';
          const inKey = deUmlaut(inRaw)
            .replace(/\\/g, '')
            .replace(/_\{([^{}]+)\}/g, (_m: string, sub: string) => '_' + sub.replace(/[,\s.]+/g, '_'))
            .replace(/[{},\s.]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
          const inVal = symbols[inKey] ?? symbols[inRaw] ?? NaN;
          const inverse = (d.direction ?? 'x_to_y') === 'y_to_x';
          const interpolate = (pts: [number,number][]) =>
            isFinite(inVal) && pts.length ? (inverse ? interpolateChartInverse(pts, inVal) : interpolateChart(pts, inVal)) : NaN;

          if (d.all_series && series.length > 0) {
            const allValues: number[] = series.map((s: ChartSeriesData) => interpolate(s.data));
            results[node.id] = { value: allValues[0] ?? NaN, allSeriesValues: allValues, inputValue: inVal } as any;
            allValues.forEach((v, i) => {
              if (isFinite(v)) setSymbol(symbols, series[i].name, v);
            });
          } else {
            const pts = series[d.series_index ?? 0]?.data ?? [];
            const outVal = interpolate(pts);
            results[node.id] = { value: outVal, inputValue: inVal } as any;
            if (d.name && isFinite(outVal)) setSymbol(symbols, d.name, outVal);
          }
          break;
        }
        case 'condition': {
          let active = '';
          if ((d.mode || 'expr') === 'select') {
            const selected = getSelectionValue(d.source || 'woodType').trim().toLowerCase();
            for (const c of (d.conditions || [])) {
              const match = String(c.match || c.latex || '').trim().toLowerCase();
              if (match && selected === match) { active = c.id; break; }
            }
          } else {
            for (const c of (d.conditions || [])) {
              // c.expr kann fehlen wenn Graph vor dem Auto-Ableitungs-Feature gespeichert wurde
              const expr = c.expr || latexCondToJs(c.latex || '');
              const v = evalFormula(expr, symbols);
              if (v != null && v !== 0) { active = c.id; break; }
            }
          }
          results[node.id] = { activeConditionId: active };
          break;
        }
        case 'check': {
          const expr = d.expr || latexCondToJs(d.latex || '');
          const v = evalFormula(expr, symbols);
          const passed = v != null && v !== 0;
          const substitutedLatex = d.latex ? substituteLatexValues(d.latex, symbols) : '';
          results[node.id] = { value: passed ? 1 : 0, passed, substitutedLatex };
          break;
        }
        case 'minmax': {
          const expr = d.expr || latexToJs(d.latex || '');
          const v = evalFormula(expr, symbols);
          // Extrahiere Fälle aus \begin{cases}...\end{cases} für die Einzelanzeige
          const caseMatch = (d.latex || '').match(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/);
          const modeMatch = (d.latex || '').match(/\\(min|max)\b/);
          const rawCases = caseMatch ? caseMatch[1].split(/\\\\/).map((c: string) => c.trim()).filter(Boolean) : [];
          const caseValues = rawCases.map((c: string) => {
            const cv = evalFormula(latexToJs(c), symbols);
            return cv != null && isFinite(cv) ? cv : NaN;
          });
          const finiteVals = caseValues.filter(isFinite);
          let activeCaseIndex = -1;
          if (finiteVals.length > 0 && v != null && isFinite(v)) {
            activeCaseIndex = caseValues.findIndex((cv: number) => Math.abs(cv - v) < 1e-9);
          }
          const caseSubstituted = rawCases.map((c: string) => substituteLatexValues(c, symbols));
          const substitutedLatex = substituteLatexValues(d.latex || '', symbols);
          results[node.id] = { value: v ?? NaN, caseValues, activeCaseIndex, substitutedCases: caseSubstituted, modeStr: modeMatch ? modeMatch[1] : 'min', substitutedLatex } as any;
          if (d.name && v != null && isFinite(v)) setSymbol(symbols, d.name, v);
          break;
        }
        case 'ref': {
          const srcId = (d as any).source_id;
          const srcResult = srcId ? results[srcId] : undefined;
          results[node.id] = srcResult ? { ...srcResult } : { value: NaN };
          break;
        }
        case 'image':
        case 'output': {
          results[node.id] = {};
          break;
        }
        default:
          results[node.id] = {};
      }
    } catch (e: any) {
      results[node.id] = { error: String(e?.message || e) };
    }
  }

  return { results, symbols };
}

// Sammelt alle db_tables-IDs, die der Graph referenziert (zum Vorladen im Frontend).
export function collectTableRefs(graph: VerificationGraph): string[] {
  const ids = new Set<string>();
  for (const n of graph.nodes) {
    const d: any = n.data;
    if (d.table_ref) ids.add(d.table_ref);
    if (d.chart_ref) ids.add(d.chart_ref);
  }
  return [...ids];
}
