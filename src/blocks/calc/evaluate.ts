import { GraphNode } from '../../types/graph';
import {
  BlockEvalRuntime, ChartSeriesData, deUmlaut, evalBestEffortCondition, evalBestEffortFormula,
  evalCondExpr, evalFormula, evalFormulaPM, extractMissingSymbols, indexLoopLatexName, interpolateChart,
  interpolateChartInverse, latexCondToJs, latexToJs, normalizeMaterialKey, parseNum, setSymbol,
  substituteLatexValues, substituteValues,
} from '../../utils/evalGraphShared';

export function evaluateCalc(node: GraphNode, runtime: BlockEvalRuntime) {
  const d: any = node.data;
  const { graph, inputs, tables, materialProps, context, results, symbols, strSymbols, incomingFrom, getSelectionValue } = runtime;
  const expr = d.expr || (d.latex ? latexToJs(d.latex) : '');
            const missingSymbols = extractMissingSymbols(expr, symbols);
            const pm = evalFormulaPM(expr, symbols);
            const substituted = substituteValues(expr, symbols);
            const substitutedLatex = d.latex ? substituteLatexValues(d.latex, symbols) : '';
            if (pm.hasPM && pm.value != null && pm.valueAlt != null) {
              // ± → zwei Fälle; maßgebend = betragsmäßig größer (für Symbol/η)
              const governing = Math.abs(pm.value) >= Math.abs(pm.valueAlt) ? pm.value : pm.valueAlt;
              results[node.id] = {
                value: governing, substituted, substitutedLatex, missingSymbols,
                valuePM: { plus: pm.value, minus: pm.valueAlt },
              };
              if (d.name) setSymbol(symbols, d.name, governing);
            } else {
              const v = pm.value;
              results[node.id] = { value: v ?? NaN, substituted, substitutedLatex, missingSymbols };
              if (d.name && v != null) setSymbol(symbols, d.name, v);
            }
}
