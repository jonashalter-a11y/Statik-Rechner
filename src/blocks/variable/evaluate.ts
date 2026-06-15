import { GraphNode } from '../../types/graph';
import {
  BlockEvalRuntime, ChartSeriesData, deUmlaut, evalBestEffortCondition, evalBestEffortFormula,
  evalCondExpr, evalFormula, extractMissingSymbols, indexLoopLatexName, interpolateChart,
  interpolateChartInverse, latexCondToJs, latexToJs, normalizeMaterialKey, parseNum, setSymbol,
  substituteLatexValues, substituteValues,
} from '../../utils/evalGraphShared';

export function evaluateVariable(node: GraphNode, runtime: BlockEvalRuntime) {
  const d: any = node.data;
  const { graph, inputs, tables, materialProps, context, results, symbols, strSymbols, incomingFrom, getSelectionValue } = runtime;
  const raw = inputs[node.id] ?? (d.hasDefault === false ? '' : d.default_value) ?? '';
            const val = parseNum(raw);
            results[node.id] = { value: val };
            if (d.name) setSymbol(symbols, d.name, val);
}
