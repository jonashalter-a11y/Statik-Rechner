import { GraphNode } from '../../types/graph';
import {
  BlockEvalRuntime, ChartSeriesData, deUmlaut, evalBestEffortCondition, evalBestEffortFormula,
  evalCondExpr, evalFormula, extractMissingSymbols, indexLoopLatexName, interpolateChart,
  interpolateChartInverse, latexCondToJs, latexToJs, normalizeMaterialKey, parseNum, setSymbol,
  substituteLatexValues, substituteValues,
} from '../../utils/evalGraphShared';

export function evaluateStdCalc(node: GraphNode, runtime: BlockEvalRuntime) {
  const d: any = node.data;
  const { graph, inputs, tables, materialProps, context, results, symbols, strSymbols, incomingFrom, getSelectionValue } = runtime;
  const srcId = d.source_tablecalc || incomingFrom(node.id).find(id => graph.nodes.find(n => n.id === id)?.type === 'tablecalc');
            const tableRes = srcId ? results[srcId]?.table : undefined;
            const selectedZone = inputs[node.id] != null ? String(inputs[node.id]) : '';
            const pickerVal = tableRes ? tableRes[selectedZone] : NaN;
            const localSym = { ...symbols, [d.picker_name || 'cell']: pickerVal };
            const expr = d.latex ? latexToJs(d.latex) : (d.expr || '');
            const missingSymbols = extractMissingSymbols(expr, localSym);
            const v = evalFormula(expr, localSym);
            const substituted = substituteValues(expr, localSym);
            const substitutedLatex = d.latex ? substituteLatexValues(d.latex, localSym) : '';
            results[node.id] = { value: v ?? NaN, substituted, substitutedLatex, missingSymbols };
            if (d.name && v != null) setSymbol(symbols, d.name, v);
}
