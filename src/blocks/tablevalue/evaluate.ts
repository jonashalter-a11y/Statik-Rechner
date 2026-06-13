import { GraphNode } from '../../types/graph';
import {
  BlockEvalRuntime, ChartSeriesData, deUmlaut, evalBestEffortCondition, evalBestEffortFormula,
  evalCondExpr, evalFormula, extractMissingSymbols, indexLoopLatexName, interpolateChart,
  interpolateChartInverse, latexCondToJs, latexToJs, normalizeMaterialKey, parseNum, setSymbol,
  substituteLatexValues, substituteValues,
} from '../../utils/evalGraphShared';

export function evaluateTableValue(node: GraphNode, runtime: BlockEvalRuntime) {
  const d: any = node.data;
  const { graph, inputs, tables, materialProps, context, results, symbols, strSymbols, incomingFrom, getSelectionValue } = runtime;
  const sourceId = d.source_dropdown || incomingFrom(node.id).find(id => ['dropdown', 'woodclass'].includes(String(graph.nodes.find(n => n.id === id)?.type)));
            const sourceType = graph.nodes.find(n => n.id === sourceId)?.type;
            const sel = sourceId ? results[sourceId]?.selected : undefined;
            let val = NaN;
            if (sourceType === 'woodclass') {
              const key = normalizeMaterialKey(d.name);
              val = parseNum(materialProps[d.name] ?? materialProps[key]);
            } else if (sel?.tableId && sel.rowIndex != null && sel.rowIndex >= 0) {
              const tbl = tables[sel.tableId];
              if (tbl) {
                const cellRaw = tbl.rows[sel.rowIndex]?.[d.table_col];
                const numVal = parseNum(cellRaw);
                if (isFinite(numVal)) {
                  val = numVal;
                } else if (typeof cellRaw === 'string' && cellRaw.trim()) {
                  // Cell contains a formula expression — evaluate with current symbols
                  try { val = evalFormula(latexToJs(cellRaw), symbols) ?? NaN; } catch { val = NaN; }
                }
              }
            }
            results[node.id] = { value: val };
            if (d.name) setSymbol(symbols, d.name, val);
}
