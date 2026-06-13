import { GraphNode } from '../../types/graph';
import {
  BlockEvalRuntime, ChartSeriesData, deUmlaut, evalBestEffortCondition, evalBestEffortFormula,
  evalCondExpr, evalFormula, extractMissingSymbols, indexLoopLatexName, interpolateChart,
  interpolateChartInverse, latexCondToJs, latexToJs, normalizeMaterialKey, parseNum, setSymbol,
  substituteLatexValues, substituteValues,
} from '../../utils/evalGraphShared';

export function evaluateGroupCalc(node: GraphNode, runtime: BlockEvalRuntime) {
  const d: any = node.data;
  const { graph, inputs, tables, materialProps, context, results, symbols, strSymbols, incomingFrom, getSelectionValue } = runtime;
  // Inline-Variablen + Fallauswahl + mehrere Ausgaben
            let stateObj: Record<string, string> = {};
            try { stateObj = JSON.parse(inputs[node.id] as string ?? '{}'); } catch { /* */ }
            const localSym = { ...symbols };
            for (const v of (d.vars || [])) {
              const raw = stateObj[v.id] ?? stateObj[v.name] ?? v.default_value ?? '0';
              const num = parseNum(raw);
              if (isFinite(num)) setSymbol(localSym, v.name, num);
            }
            const selLabel = stateObj['__sel__'] ?? '';
            const opt = (d.options || []).find((o: any) => o.id === selLabel || o.label === selLabel);
            const outVals: Record<string, number> = {};
            const outLatex: Record<string, string> = {};
            for (const out of (d.outputs || [])) {
              const latex = opt?.formulas?.[out.id] ?? '';
              if (!latex) { outVals[out.id] = NaN; continue; }
              const jsExpr = latexToJs(latex);
              const v = evalFormula(jsExpr, localSym) ?? NaN;
              outVals[out.id] = v;
              outLatex[out.id] = substituteLatexValues(latex, localSym);
              if (out.name && isFinite(v)) setSymbol(symbols, out.name, v);
            }
            results[node.id] = { matrixVals: outVals, matrixLatex: outLatex, selectedLabel: selLabel };
}
