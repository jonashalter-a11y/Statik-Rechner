// ─── Graph-Auswertung ─────────────────────────────────────────────────────────
// Wertet einen Nachweis-Graphen aus: topologische Reihenfolge über Workflow-Kanten,
// Symboltabelle (Variablenname → Zahl), pro Blocktyp eine Auswertung.
// Wiederverwendung: evalFormula, substituteValues, formatNumber.

import { VerificationGraph, GraphNode } from '../types/graph';
import { evalFormula } from './evalFormula';
import { latexToJs } from './latexToJs';
import { substituteValues } from './substituteFormula';

export interface DbTableData { headers: string[]; rows: string[][]; }
export interface NodeResult {
  value?: number;                 // numerisches Ergebnis (variable, tablevalue, calc, stdcalc)
  substituted?: string;           // "mit Werten" (calc/stdcalc)
  selected?: { tableId?: string; rowIndex?: number; label?: string }; // dropdown
  table?: Record<string, number>; // tablecalc (Zone → Wert)
  activeConditionId?: string;     // condition
  error?: string;
}
export interface EvalResult {
  results: Record<string, NodeResult>;
  symbols: Record<string, number>;
}

// Zahl aus String robust extrahieren ("−0.21", "±0.10", "+0.15/−0.21" → erste Zahl)
export function parseNum(s: unknown): number {
  if (typeof s === 'number') return s;
  if (s == null) return NaN;
  const t = String(s).replace(/[−–—]/g, '-').replace(/,/g, '.');
  const m = t.match(/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
}

// Topologische Sortierung über Workflow-Kanten (Kahn). Bei Zyklen: Rest in Originalreihenfolge.
export function topoSort(graph: VerificationGraph): GraphNode[] {
  const nodes = graph.nodes;
  const wf = graph.edges.filter(e => (e.data?.kind ?? 'workflow') === 'workflow');
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  nodes.forEach(n => { indeg.set(n.id, 0); adj.set(n.id, []); });
  wf.forEach(e => {
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
): EvalResult {
  const results: Record<string, NodeResult> = {};
  const symbols: Record<string, number> = {};
  const ordered = topoSort(graph);

  const incomingFrom = (targetId: string, kind: 'workflow' | 'condition' = 'workflow') =>
    graph.edges.filter(e => e.target === targetId && (e.data?.kind ?? 'workflow') === kind).map(e => e.source);

  for (const node of ordered) {
    const d: any = node.data;
    try {
      switch (node.type) {
        case 'variable': {
          const raw = inputs[node.id] ?? d.default_value ?? '';
          const val = parseNum(raw);
          results[node.id] = { value: val };
          if (d.name) symbols[d.name] = val;
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
            symbols[d.name] = v;
            results[node.id].value = v;
          }
          break;
        }
        case 'tablevalue': {
          const dropId = d.source_dropdown || incomingFrom(node.id).find(id => graph.nodes.find(n => n.id === id)?.type === 'dropdown');
          const sel = dropId ? results[dropId]?.selected : undefined;
          let val = NaN;
          if (sel?.tableId && sel.rowIndex != null && sel.rowIndex >= 0) {
            const tbl = tables[sel.tableId];
            if (tbl) val = parseNum(tbl.rows[sel.rowIndex]?.[d.table_col]);
          }
          results[node.id] = { value: val };
          if (d.name) symbols[d.name] = val;
          break;
        }
        case 'calc': {
          const expr = d.latex ? latexToJs(d.latex) : (d.expr || '');
          const v = evalFormula(expr, symbols);
          const substituted = substituteValues(expr, symbols);
          results[node.id] = { value: v ?? NaN, substituted };
          if (d.name && v != null) symbols[d.name] = v;
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
          const v = evalFormula(expr, localSym);
          const substituted = substituteValues(expr, localSym);
          results[node.id] = { value: v ?? NaN, substituted };
          if (d.name && v != null) symbols[d.name] = v;
          break;
        }
        case 'condition': {
          let active = '';
          for (const c of (d.conditions || [])) {
            const v = evalFormula(c.expr || '', symbols);
            if (v != null && v !== 0) { active = c.id; break; }
          }
          results[node.id] = { activeConditionId: active };
          break;
        }
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
