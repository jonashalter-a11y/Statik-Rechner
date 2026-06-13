import { GraphNode } from '../../types/graph';
import {
  BlockEvalRuntime, ChartSeriesData, deUmlaut, evalBestEffortCondition, evalBestEffortFormula,
  evalCondExpr, evalFormula, extractMissingSymbols, indexLoopLatexName, interpolateChart,
  interpolateChartInverse, latexCondToJs, latexToJs, normalizeMaterialKey, parseNum, setSymbol,
  substituteLatexValues, substituteValues,
} from '../../utils/evalGraphShared';

export function evaluateRef(node: GraphNode, runtime: BlockEvalRuntime) {
  const d: any = node.data;
  const { graph, inputs, tables, materialProps, context, results, symbols, strSymbols, incomingFrom, getSelectionValue } = runtime;
  // Gezogene Kante hat Vorrang über gespeicherte source_id
            const wiredId = incomingFrom(node.id, 'workflow')[0];
            const srcId = wiredId || (d as any).source_id;
            const srcResult = srcId ? results[srcId] : undefined;
            results[node.id] = srcResult ? { ...srcResult } : { value: NaN };
}
