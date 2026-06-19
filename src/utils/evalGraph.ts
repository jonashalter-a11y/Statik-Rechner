// ─── Graph-Auswertung ─────────────────────────────────────────────────────────
import { VerificationGraph, GraphNode } from '../types/graph';
import { BLOCK_EVALUATORS } from '../blocks/evaluators';
import { BlockEvalRuntime, DbTableData, deUmlaut, EvalContext, EvalResult, NodeResult, symbolAliases } from './evalGraphShared';

export type { ChartJsonData, ChartSeriesData, DbTableData, EvalContext, EvalResult, NodeResult } from './evalGraphShared';

export interface GraphDependency {
  source: string;
  target: string;
  reason: 'edge' | 'data' | 'formula';
}

function jsSymbolAliases(name: string): string[] {
  return symbolAliases(name)
    .map(alias => deUmlaut(alias)
      .replace(/\\/g, '')
      .replace(/([A-Za-z0-9_])'+/g, '$1')
      .replace(/_\{([^{}]+)\}/g, (_m, sub: string) => '_' + sub.replace(/[,\s.]+/g, '_'))
      .replace(/[{},\s.]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, ''))
    .filter(alias => /^[A-Za-z_$][\w$]*$/.test(alias));
}

function extractExprIdentifiers(expr: unknown): string[] {
  if (typeof expr !== 'string' || !expr.trim()) return [];
  const cleaned = expr
    .replace(/Math\.[A-Za-z_$][\w$]*/g, '')
    .replace(/\b(?:NaN|Infinity|undefined|null|true|false|Math|pi|e)\b/g, '');
  return Array.from(new Set(cleaned.match(/[A-Za-z_$][\w$]*/g) || []));
}

export function collectGraphDependencies(graph: VerificationGraph): GraphDependency[] {
  const nodes = graph.nodes;
  const nodeById = new Map(nodes.map(n => [n.id, n]));
  const flowEdges = graph.edges.filter(e => ['workflow', 'condition'].includes(e.data?.kind ?? 'workflow'));
  const dependencies: GraphDependency[] = [];
  const seen = new Set<string>();

  const addDependency = (sourceId?: unknown, targetId?: unknown, reason: GraphDependency['reason'] = 'data') => {
    const source = String(sourceId || '');
    const target = String(targetId || '');
    if (!source || !target || source === target) return;
    const key = `${source}->${target}`;
    if (seen.has(key)) return;
    seen.add(key);
    dependencies.push({ source, target, reason });
  };

  flowEdges.forEach(e => addDependency(e.source, e.target, 'edge'));

  const producerBySymbol = new Map<string, string>();
  nodes.forEach(n => {
    const name = String((n.data as any)?.name || '');
    if (!name) return;
    jsSymbolAliases(name).forEach(alias => {
      if (!producerBySymbol.has(alias)) producerBySymbol.set(alias, n.id);
    });
  });

  // Einige Blöcke speichern ihre Quelle zusätzlich in data.*. Diese Abhängigkeiten
  // müssen auch ohne sichtbare Kante stabil vor dem Zielblock ausgewertet werden.
  nodes.forEach(n => {
    const d: any = n.data || {};
    addDependency(d.source_id, n.id);
    addDependency(d.source_dropdown, n.id);
    addDependency(d.source_tablecalc, n.id);

    if ((n.type === 'condition' || n.type === 'cases') && d.source && !['woodType', 'woodClass'].includes(String(d.source))) {
      addDependency(d.source, n.id);
    }

    if (n.type === 'stdcalc' && !d.source_tablecalc) {
      const wiredSource = flowEdges.find(e => e.target === n.id && nodeById.get(e.source)?.type === 'tablecalc')?.source;
      if (wiredSource) addDependency(wiredSource, n.id);
    }

    extractExprIdentifiers(d.expr).forEach(symbol => {
      addDependency(producerBySymbol.get(symbol), n.id, 'formula');
    });
  });

  return dependencies;
}

// Topologische Sortierung über Workflow-Kanten (Kahn). Bei Zyklen: Rest in Originalreihenfolge.
export function topoSort(graph: VerificationGraph): GraphNode[] {
  const nodes = graph.nodes;
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  const nodeById = new Map(nodes.map(n => [n.id, n]));
  nodes.forEach(n => { indeg.set(n.id, 0); adj.set(n.id, []); });

  collectGraphDependencies(graph).forEach(({ source, target }) => {
    if (!adj.has(source) || !indeg.has(target)) return;
    adj.get(source)!.push(target);
    indeg.set(target, (indeg.get(target) || 0) + 1);
  });

  // Eingabe-Blöcke immer zuerst: stellt sicher, dass symbols/strSymbols befüllt sind
  // bevor Berechnungsblöcke (calc, cases, …) ohne explizite Kanten ausgewertet werden.
  const INPUT_TYPES = new Set(['variable', 'dropdown', 'woodclass', 'tablevalue', 'chartlookup', 'polargrid']);
  const nodeIndex = new Map(nodes.map((n, i) => [n.id, i]));
  const byStablePriority = (a: string, b: string) => {
    const na = nodeById.get(a);
    const nb = nodeById.get(b);
    const pa = na && INPUT_TYPES.has(na.type) ? 0 : 1;
    const pb = nb && INPUT_TYPES.has(nb.type) ? 0 : 1;
    return (pa - pb) || ((nodeIndex.get(a) ?? 0) - (nodeIndex.get(b) ?? 0));
  };
  const zeroNodes = nodes.filter(n => (indeg.get(n.id) || 0) === 0);
  zeroNodes.sort((a, b) => byStablePriority(a.id, b.id));
  const queue = zeroNodes.map(n => n.id);
  const order: string[] = [];
  const seen = new Set<string>();
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id); order.push(id);
    (adj.get(id) || []).forEach(t => {
      indeg.set(t, (indeg.get(t) || 0) - 1);
      if ((indeg.get(t) || 0) <= 0 && !seen.has(t)) {
        queue.push(t);
        queue.sort(byStablePriority);
      }
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
