import { GraphNode } from '../../types/graph';
import {
  BlockEvalRuntime, ChartSeriesData, deUmlaut, evalBestEffortCondition, evalBestEffortFormula,
  evalCondExpr, evalFormula, extractMissingSymbols, indexLoopLatexName, interpolateChart,
  interpolateChartInverse, latexCondToJs, latexToJs, normalizeMaterialKey, parseNum, setSymbol,
  substituteLatexValues, substituteValues,
} from '../../utils/evalGraphShared';

export function evaluateMinMax(node: GraphNode, runtime: BlockEvalRuntime) {
  const d: any = node.data;
  const { graph, inputs, tables, materialProps, context, results, symbols, strSymbols, incomingFrom, getSelectionValue } = runtime;
  const expr = d.expr || latexToJs(d.latex || '');
            const v = evalFormula(expr, symbols);
            // Extrahiere Fälle aus \begin{cases}...\end{cases} für die Einzelanzeige
            const caseMatch = (d.latex || '').match(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/);
            const modeMatch = (d.latex || '').match(/\\(min|max)\b/);
            const rawCases = caseMatch ? caseMatch[1].split(/\\\\/).map((c: string) => c.trim()).filter(Boolean) : [];
            const caseValues = rawCases.map((c: string) => {
              const cv = evalFormula(latexToJs(c), symbols);
              return cv != null && isFinite(cv) ? cv : NaN;
            });
            const finiteVals = caseValues.filter(isFinite);
            let activeCaseIndex = -1;
            if (finiteVals.length > 0 && v != null && isFinite(v)) {
              activeCaseIndex = caseValues.findIndex((cv: number) => Math.abs(cv - v) < 1e-9);
            }
            const caseSubstituted = rawCases.map((c: string) => substituteLatexValues(c, symbols));
            const substitutedLatex = substituteLatexValues(d.latex || '', symbols);
            results[node.id] = { value: v ?? NaN, caseValues, activeCaseIndex, substitutedCases: caseSubstituted, modeStr: modeMatch ? modeMatch[1] : 'min', substitutedLatex } as any;
            if (d.name && v != null && isFinite(v)) setSymbol(symbols, d.name, v);
}
