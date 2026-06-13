import { GraphNode } from '../../types/graph';
import {
  BlockEvalRuntime, ChartSeriesData, deUmlaut, evalBestEffortCondition, evalBestEffortFormula,
  evalCondExpr, evalFormula, extractMissingSymbols, indexLoopLatexName, interpolateChart,
  interpolateChartInverse, latexCondToJs, latexToJs, normalizeMaterialKey, parseNum, setSymbol,
  substituteLatexValues, substituteValues,
} from '../../utils/evalGraphShared';

export function evaluateCheck(node: GraphNode, runtime: BlockEvalRuntime) {
  const d: any = node.data;
  const { graph, inputs, tables, materialProps, context, results, symbols, strSymbols, incomingFrom, getSelectionValue } = runtime;
  const expr = latexCondToJs(d.latex || '') || d.expr || '';
            const v = evalFormula(expr, symbols);
            const passed = v != null && v !== 0;
            const substitutedLatex = d.latex ? substituteLatexValues(d.latex, symbols) : '';
            results[node.id] = { value: passed ? 1 : 0, passed, substitutedLatex };
}
