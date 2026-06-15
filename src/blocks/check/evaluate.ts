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
            let eta = NaN;
            const latex = String(d.latex || '').replace(/\\left|\\right/g, '').trim();
            const match = latex.match(/([\s\S]+?)(\\leqslant|\\leq|\\le|<=|\\geqslant|\\geq|\\ge|>=)([\s\S]+)/);
            if (match) {
              const lhs = evalFormula(latexToJs(match[1]), symbols);
              const rhs = evalFormula(latexToJs(match[3]), symbols);
              if (lhs != null && rhs != null && isFinite(lhs) && isFinite(rhs) && rhs !== 0 && lhs !== 0) {
                eta = /ge|>=/.test(match[2]) ? rhs / lhs : lhs / rhs;
              }
            }
            const substitutedLatex = d.latex ? substituteLatexValues(d.latex, symbols) : '';
            results[node.id] = { value: passed ? 1 : 0, passed, substitutedLatex, eta };
}
