import { GraphNode } from '../../types/graph';
import {
  BlockEvalRuntime, ChartSeriesData, deUmlaut, evalBestEffortCondition, evalBestEffortFormula,
  evalCondExpr, evalFormula, extractMissingSymbols, indexLoopLatexName, interpolateChart,
  interpolateChartInverse, latexCondToJs, latexToJs, normalizeMaterialKey, parseNum, setSymbol,
  substituteLatexValues, substituteValues,
} from '../../utils/evalGraphShared';

export function evaluateTableCalc(node: GraphNode, runtime: BlockEvalRuntime) {
  const d: any = node.data;
  const { graph, inputs, tables, materialProps, context, results, symbols, strSymbols, incomingFrom, getSelectionValue } = runtime;
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
}
