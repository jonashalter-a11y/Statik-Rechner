import { BLOCK_EVALUATORS } from '../blocks/evaluators';
import { VerificationGraph } from '../types/graph';
import { collectGraphDependencies, collectTableRefs, DbTableData, topoSort } from './evalGraph';
import { extractMissingSymbols, latexCondToJs, latexToJs, setSymbol } from './evalGraphShared';

export type GraphValidationSeverity = 'error' | 'warning';

export interface GraphValidationIssue {
  severity: GraphValidationSeverity;
  nodeId?: string;
  message: string;
}

export interface GraphValidationResult {
  issues: GraphValidationIssue[];
  errors: GraphValidationIssue[];
  warnings: GraphValidationIssue[];
  isValid: boolean;
}

interface ValidateGraphOptions {
  tables?: Record<string, DbTableData>;
}

function labelNode(graph: VerificationGraph, nodeId?: string) {
  const node = nodeId ? graph.nodes.find(n => n.id === nodeId) : null;
  const data: any = node?.data || {};
  return data.label || data.name || node?.type || nodeId || 'Graph';
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function addSymbol(symbols: Record<string, number>, name?: unknown) {
  const key = String(name || '').trim();
  if (key) setSymbol(symbols, key, 1);
}

function checkExpressionSymbols(
  expr: string,
  symbols: Record<string, number>,
  add: (severity: GraphValidationSeverity, message: string, nodeId?: string) => void,
  nodeId: string,
  label: string,
) {
  const missing = extractMissingSymbols(expr, symbols);
  if (missing.length) {
    add('warning', `${label} nutzt fehlende Symbole: ${missing.join(', ')}.`, nodeId);
  }
}

function validateFormulaSymbols(
  graph: VerificationGraph,
  add: (severity: GraphValidationSeverity, message: string, nodeId?: string) => void,
) {
  const symbols: Record<string, number> = {};

  for (const node of topoSort(graph)) {
    const d: any = node.data || {};
    const localSymbols = { ...symbols };

    if (node.type === 'stdcalc' && d.picker_name) addSymbol(localSymbols, d.picker_name);
    if (node.type === 'tablecalc') addSymbol(localSymbols, 'cell');

    if (node.type === 'calc' || node.type === 'stdcalc' || node.type === 'check' || node.type === 'minmax') {
      const expr = String(d.expr || (d.latex ? latexToJs(d.latex) : '') || '').trim();
      if (expr) checkExpressionSymbols(expr, localSymbols, add, node.id, 'Formel');
    }

    if (node.type === 'condition') {
      for (const condition of asArray(d.conditions) as any[]) {
        const expr = String(latexCondToJs(condition?.latex || '') || condition?.expr || '').trim();
        if (expr) checkExpressionSymbols(expr, localSymbols, add, node.id, 'Bedingung');
      }
    }

    if (node.type === 'cases') {
      for (const entry of asArray(d.cases) as any[]) {
        const formulaExpr = String(entry?.formula_latex ? latexToJs(entry.formula_latex) : '').trim();
        if (formulaExpr) checkExpressionSymbols(formulaExpr, localSymbols, add, node.id, 'Fall-Formel');
        const condExpr = String(entry?.cond_expr || '').trim();
        if (condExpr && !/^(else|sonst|\(leer\s*[=:]\s*else\))$/i.test(condExpr)) {
          checkExpressionSymbols(condExpr, localSymbols, add, node.id, 'Fall-Bedingung');
        }
      }
    }

    if (node.type === 'matrix') {
      for (const row of asArray(d.rows) as any[]) {
        const cells = asArray(row?.cells);
        const latexCells = asArray(row?.cells_latex);
        cells.forEach((cell, i) => {
          const raw = String(cell || latexCells[i] || '').trim();
          const expr = raw.includes('\\') ? latexToJs(raw) : raw;
          if (expr) checkExpressionSymbols(expr, localSymbols, add, node.id, 'Matrix-Zelle');
        });
      }
    }

    if (node.type === 'variable' || node.type === 'dropdown' || node.type === 'tablevalue' || node.type === 'calc' || node.type === 'stdcalc' || node.type === 'minmax' || node.type === 'cases' || node.type === 'polargrid') {
      addSymbol(symbols, d.name);
    }
    if (node.type === 'chartlookup') {
      if (d.all_series) {
        // Kurvennamen sind erst mit geladener Tabelle bekannt; Laufzeitprüfung deckt das ab.
      } else {
        addSymbol(symbols, d.name);
      }
    }
    if (node.type === 'matrix') {
      for (const col of asArray(d.columns) as any[]) addSymbol(symbols, col?.name);
    }
    if (node.type === 'loopblock') {
      for (const ag of asArray(d.aggregations) as any[]) addSymbol(symbols, ag?.name);
    }
  }
}

function findCycles(graph: VerificationGraph): string[][] {
  const nodes = new Set(graph.nodes.map(n => n.id));
  const adj = new Map<string, string[]>();
  nodes.forEach(id => adj.set(id, []));
  collectGraphDependencies(graph).forEach(dep => {
    if (nodes.has(dep.source) && nodes.has(dep.target)) adj.get(dep.source)!.push(dep.target);
  });

  const cycles: string[][] = [];
  const state = new Map<string, 'visiting' | 'done'>();
  const stack: string[] = [];

  const visit = (id: string) => {
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'visiting') {
      const start = stack.indexOf(id);
      if (start >= 0) cycles.push([...stack.slice(start), id]);
      return;
    }
    state.set(id, 'visiting');
    stack.push(id);
    (adj.get(id) || []).forEach(visit);
    stack.pop();
    state.set(id, 'done');
  };

  nodes.forEach(visit);
  return cycles;
}

export function validateGraph(graph: VerificationGraph, options: ValidateGraphOptions = {}): GraphValidationResult {
  const issues: GraphValidationIssue[] = [];
  const nodeIds = new Set<string>();
  const add = (severity: GraphValidationSeverity, message: string, nodeId?: string) => {
    issues.push({ severity, message, nodeId });
  };

  for (const node of graph.nodes) {
    if (!node.id) {
      add('error', 'Ein Block hat keine ID.');
      continue;
    }
    if (nodeIds.has(node.id)) add('error', `Doppelte Block-ID "${node.id}".`, node.id);
    nodeIds.add(node.id);
    if (!BLOCK_EVALUATORS[node.type]) add('error', `Unbekannter Blocktyp "${node.type}".`, node.id);
    if (!node.data) add('error', 'Blockdaten fehlen.', node.id);
  }

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source)) add('error', `Kante verweist auf fehlende Quelle "${edge.source}".`);
    if (!nodeIds.has(edge.target)) add('error', `Kante verweist auf fehlendes Ziel "${edge.target}".`);
    if ((edge.data?.kind ?? 'workflow') === 'condition') {
      const sourceType = graph.nodes.find(n => n.id === edge.source)?.type;
      if (sourceType && sourceType !== 'condition') add('warning', 'Bedingungs-Kante startet nicht bei einem Condition-Block.', edge.source);
    }
  }

  for (const dep of collectGraphDependencies(graph)) {
    if (!nodeIds.has(dep.source)) add('error', `Block verweist auf fehlende Quelle "${dep.source}".`, dep.target);
    if (!nodeIds.has(dep.target)) add('error', `Abhängigkeit verweist auf fehlenden Zielblock "${dep.target}".`, dep.source);
  }

  const tableRefs = collectTableRefs(graph);
  for (const tableId of tableRefs) {
    if (options.tables && !options.tables[tableId]) add('error', `Tabelle "${tableId}" konnte nicht geladen werden.`);
  }

  for (const node of graph.nodes) {
    const d: any = node.data || {};
    if ((node.type === 'variable' && d.inputKind === 'table_column') || node.type === 'dropdown' || node.type === 'tablecalc') {
      if ((node.type !== 'dropdown' || d.mode !== 'custom') && !d.table_ref) {
        add('error', 'Tabellen-Referenz fehlt.', node.id);
      }
    }
    if (node.type === 'chartlookup' && !d.chart_ref) add('error', 'Diagramm-Referenz fehlt.', node.id);
    if (node.type === 'ref' && !d.source_id) add('error', 'Referenzquelle fehlt.', node.id);
    if (node.type === 'stdcalc' && !d.source_tablecalc) {
      const hasTableCalcInput = graph.edges.some(e => e.target === node.id && graph.nodes.find(n => n.id === e.source)?.type === 'tablecalc');
      if (!hasTableCalcInput) add('warning', 'Keine tablecalc-Quelle verbunden.', node.id);
    }
    if (node.type === 'condition' && !asArray(d.conditions).length) add('warning', 'Condition-Block hat keine Bedingungen.', node.id);
    if ((node.type === 'calc' || node.type === 'stdcalc' || node.type === 'check') && !String(d.expr || d.latex || '').trim()) {
      add('warning', 'Formel oder Ausdruck fehlt.', node.id);
    }
    if (node.type === 'output') {
      for (const blockId of asArray(d.blocks)) {
        if (!nodeIds.has(String(blockId))) add('warning', `Ausgabe verweist auf fehlenden Block "${blockId}".`, node.id);
      }
    }

    const tableId = d.table_ref || d.chart_ref;
    const table = tableId && options.tables ? options.tables[tableId] : null;
    if (table) {
      const col = d.table_col ?? d.label_col;
      if (col != null && table.rows.length > 0 && table.rows.every(row => row[Number(col)] == null)) {
        add('warning', `Spalte ${col} existiert in Tabelle "${tableId}" nicht.`, node.id);
      }
      if (!table.rows.length && node.type !== 'chartlookup') add('warning', `Tabelle "${tableId}" enthält keine Zeilen.`, node.id);
      if (node.type === 'chartlookup' && !table.chart_json?.series?.length) add('warning', `Diagramm "${tableId}" enthält keine Kurven.`, node.id);
    }
  }

  const symbolOwners = new Map<string, string>();
  for (const node of graph.nodes) {
    const name = String((node.data as any)?.name || '').trim();
    if (!name) continue;
    const previous = symbolOwners.get(name);
    if (previous) {
      add('warning', `Symbol "${name}" wird mehrfach gesetzt (${labelNode(graph, previous)} und ${labelNode(graph, node.id)}).`, node.id);
    } else {
      symbolOwners.set(name, node.id);
    }
  }

  validateFormulaSymbols(graph, add);

  for (const cycle of findCycles(graph)) {
    add('error', `Zyklische Abhängigkeit: ${cycle.join(' -> ')}.`);
  }

  for (const id of graph.display_order || []) {
    if (!nodeIds.has(id)) add('warning', `display_order enthält fehlenden Block "${id}".`);
  }
  for (const id of graph.hidden_nodes || []) {
    if (!nodeIds.has(id)) add('warning', `hidden_nodes enthält fehlenden Block "${id}".`);
  }

  const errors = issues.filter(issue => issue.severity === 'error');
  const warnings = issues.filter(issue => issue.severity === 'warning');
  return { issues, errors, warnings, isValid: errors.length === 0 };
}
