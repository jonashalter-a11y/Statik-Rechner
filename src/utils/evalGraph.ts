// ─── Graph-Auswertung ─────────────────────────────────────────────────────────
// Wertet einen Nachweis-Graphen aus: topologische Reihenfolge über Workflow-Kanten,
// Symboltabelle (Variablenname → Zahl), pro Blocktyp eine Auswertung.
// Wiederverwendung: evalFormula, substituteValues, formatNumber.

import { VerificationGraph, GraphNode } from '../types/graph';
import { evalFormula } from './evalFormula';
import { latexToJs, latexCondToJs } from './latexToJs';
import { formatNumber, substituteValues } from './substituteFormula';
import { nameToLatex } from './formatName';

export interface DbTableData { headers: string[]; rows: string[][]; }
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

function setSymbol(symbols: Record<string, number>, name: string, value: number) {
  for (const alias of symbolAliases(name)) {
    const jsName = alias
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
    .flatMap(([name, value]) => symbolAliases(name).map(alias => [latexName(alias), value] as const))
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

// Topologische Sortierung über Workflow-Kanten (Kahn). Bei Zyklen: Rest in Originalreihenfolge.
export function topoSort(graph: VerificationGraph): GraphNode[] {
  const nodes = graph.nodes;
  const flowEdges = graph.edges.filter(e => ['workflow', 'condition'].includes(e.data?.kind ?? 'workflow'));
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  nodes.forEach(n => { indeg.set(n.id, 0); adj.set(n.id, []); });
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
  }
  return [...ids];
}
