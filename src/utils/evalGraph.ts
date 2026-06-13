// ─── Graph-Auswertung ─────────────────────────────────────────────────────────
import { VerificationGraph, GraphNode } from '../types/graph';
import { BLOCK_EVALUATORS } from '../blocks/evaluators';
import { BlockEvalRuntime, DbTableData, EvalContext, EvalResult, NodeResult } from './evalGraphShared';

export type { ChartJsonData, ChartSeriesData, DbTableData, EvalContext, EvalResult, NodeResult } from './evalGraphShared';

// Topologische Sortierung über Workflow-Kanten (Kahn). Bei Zyklen: Rest in Originalreihenfolge.
export function topoSort(graph: VerificationGraph): GraphNode[] {
  const nodes = graph.nodes;
  const flowEdges = graph.edges.filter(e => ['workflow', 'condition'].includes(e.data?.kind ?? 'workflow'));
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  nodes.forEach(n => { indeg.set(n.id, 0); adj.set(n.id, []); });
  // ref-Blöcke: implizite Abhängigkeit von source_id wenn keine echte Kante existiert
  const hasIncoming = new Set(flowEdges.map(e => e.target));
  nodes.forEach(n => {
    if (n.type === 'ref' && !hasIncoming.has(n.id)) {
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
  // Eingabe-Blöcke immer zuerst: stellt sicher, dass symbols/strSymbols befüllt sind
  // bevor Berechnungsblöcke (calc, cases, …) ohne explizite Kanten ausgewertet werden.
  const INPUT_TYPES = new Set(['variable', 'dropdown', 'woodclass', 'tablevalue', 'chartlookup']);
  const zeroNodes = nodes.filter(n => (indeg.get(n.id) || 0) === 0);
  zeroNodes.sort((a, b) => (INPUT_TYPES.has(a.type) ? 0 : 1) - (INPUT_TYPES.has(b.type) ? 0 : 1));
  const queue = zeroNodes.map(n => n.id);
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
  const strSymbols: Record<string, string> = {};
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

  const runtime: BlockEvalRuntime = { graph, inputs, tables, materialProps, context, results, symbols, strSymbols, incomingFrom, getSelectionValue };

  for (const node of ordered) {
    try {
      const condEdges = incomingConditionEdges(node.id);
      if (condEdges.length > 0 && !condEdges.some(e => results[e.source]?.activeConditionId === (e.data?.conditionId || e.sourceHandle))) {
        results[node.id] = { skipped: true };
        continue;
      }
      const evaluator = BLOCK_EVALUATORS[node.type];
      if (evaluator) evaluator(node, runtime);
      else results[node.id] = {};
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
