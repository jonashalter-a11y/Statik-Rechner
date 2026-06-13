import { GraphNode } from '../../types/graph';
import {
  BlockEvalRuntime, ChartSeriesData, deUmlaut, evalBestEffortCondition, evalBestEffortFormula,
  evalCondExpr, evalFormula, extractMissingSymbols, indexLoopLatexName, interpolateChart,
  interpolateChartInverse, latexCondToJs, latexToJs, normalizeMaterialKey, parseNum, setSymbol,
  substituteLatexValues, substituteValues,
} from '../../utils/evalGraphShared';

export function evaluateCases(node: GraphNode, runtime: BlockEvalRuntime) {
  const d: any = node.data;
  const { graph, inputs, tables, materialProps, context, results, symbols, strSymbols, incomingFrom, getSelectionValue } = runtime;
  const caseDefs: Array<{ formula_latex: string; cond_expr: string; match_value?: string }> = d.cases || [];
            const caseValues: number[] = caseDefs.map(c => {
              const expr = latexToJs(c.formula_latex || '');
              return evalFormula(expr, symbols) ?? NaN;
            });
            const isElseExpr = (s: string) => !s || /^\(leer\s*[=:]\s*else\)$/i.test(s) || /^else$/i.test(s) || /^sonst$/i.test(s);
            let activeCaseIndex = -1;
            let elseIdx = -1;
            if (d.mode === 'select' && d.source) {
              // Dropdown-Modus: Vergleich nach match_value
              const selVal = getSelectionValue(d.source).trim();
              for (let i = 0; i < caseDefs.length; i++) {
                const mv = (caseDefs[i].match_value || '').trim();
                if (!mv) { if (elseIdx < 0) elseIdx = i; continue; }
                if (selVal === mv || selVal.toLowerCase() === mv.toLowerCase()) { activeCaseIndex = i; break; }
              }
            } else {
              // Ausdruck-Modus: JS-Bedingungen
              for (let i = 0; i < caseDefs.length; i++) {
                const condExpr = (caseDefs[i].cond_expr || '').trim();
                if (isElseExpr(condExpr)) { if (elseIdx < 0) elseIdx = i; continue; }
                if (evalCondExpr(condExpr, { ...symbols, ...strSymbols })) { activeCaseIndex = i; break; }
              }
            }
            if (activeCaseIndex < 0 && elseIdx >= 0) activeCaseIndex = elseIdx;
            const v = activeCaseIndex >= 0 ? (caseValues[activeCaseIndex] ?? NaN) : NaN;
            const activeFormula = activeCaseIndex >= 0 ? (caseDefs[activeCaseIndex].formula_latex || '') : '';
            const substitutedLatex = activeFormula ? substituteLatexValues(activeFormula, symbols) : '';
            results[node.id] = { value: v, caseValues, activeCaseIndex, substitutedLatex };
            if (d.name && isFinite(v)) setSymbol(symbols, d.name, v);
}
