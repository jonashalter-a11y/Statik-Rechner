import { GraphNode } from '../../types/graph';
import {
  BlockEvalRuntime, ChartSeriesData, deUmlaut, evalBestEffortCondition, evalBestEffortFormula,
  evalCondExpr, evalFormula, extractMissingSymbols, indexLoopLatexName, interpolateChart,
  interpolateChartInverse, latexCondToJs, latexToJs, normalizeMaterialKey, parseNum, setSymbol,
  substituteLatexValues, substituteValues,
} from '../../utils/evalGraphShared';

export function evaluateCalc(node: GraphNode, runtime: BlockEvalRuntime) {
  const d: any = node.data;
  const { graph, inputs, tables, materialProps, context, results, symbols, strSymbols, incomingFrom, getSelectionValue } = runtime;
  const expr = d.latex ? latexToJs(d.latex) : (d.expr || '');
            const missingSymbols = extractMissingSymbols(expr, symbols);
            const v = evalFormula(expr, symbols);
            const substituted = substituteValues(expr, symbols);
            const substitutedLatex = d.latex ? substituteLatexValues(d.latex, symbols) : '';
            results[node.id] = { value: v ?? NaN, substituted, substitutedLatex, missingSymbols };
            if (d.name && v != null) setSymbol(symbols, d.name, v);
}
