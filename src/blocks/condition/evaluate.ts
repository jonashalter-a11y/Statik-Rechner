import { GraphNode } from '../../types/graph';
import {
  BlockEvalRuntime, ChartSeriesData, deUmlaut, evalBestEffortCondition, evalBestEffortFormula,
  evalCondExpr, evalFormula, extractMissingSymbols, indexLoopLatexName, interpolateChart,
  interpolateChartInverse, latexCondToJs, latexToJs, normalizeMaterialKey, parseNum, setSymbol,
  substituteLatexValues, substituteValues,
} from '../../utils/evalGraphShared';

export function evaluateCondition(node: GraphNode, runtime: BlockEvalRuntime) {
  const d: any = node.data;
  const { graph, inputs, tables, materialProps, context, results, symbols, strSymbols, incomingFrom, getSelectionValue } = runtime;
  let active = '';
            if ((d.mode || 'expr') === 'select') {
              const selected = getSelectionValue(d.source || 'woodType').trim().toLowerCase();
              for (const c of (d.conditions || [])) {
                const match = String(c.match || c.latex || '').trim().toLowerCase();
                if (match && selected === match) { active = c.id; break; }
              }
            } else {
              for (const c of (d.conditions || [])) {
                // Immer frisch aus latex ableiten (verhindert veraltete c.expr-Werte im Graph)
                const expr = latexCondToJs(c.latex || '') || c.expr || '';
                // evalCondExpr: akzeptiert String- und Zahlenvariablen (z.B. GK === 'III' && z < 5)
                const ok = evalCondExpr(expr, { ...symbols, ...strSymbols });
                if (ok) { active = c.id; break; }
              }
            }
            results[node.id] = { activeConditionId: active };
}
