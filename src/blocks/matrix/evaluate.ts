import { GraphNode } from '../../types/graph';
import {
  BlockEvalRuntime, ChartSeriesData, deUmlaut, evalBestEffortCondition, evalBestEffortFormula,
  evalCondExpr, evalFormula, extractMissingSymbols, indexLoopLatexName, interpolateChart,
  interpolateChartInverse, latexCondToJs, latexToJs, normalizeMaterialKey, parseNum, setSymbol,
  substituteLatexValues, substituteValues,
} from '../../utils/evalGraphShared';

export function evaluateMatrix(node: GraphNode, runtime: BlockEvalRuntime) {
  const d: any = node.data;
  const { graph, inputs, tables, materialProps, context, results, symbols, strSymbols, incomingFrom, getSelectionValue } = runtime;
  const selLabel = inputs[node.id] ?? '';
            const rows: any[] = d.rows || [];
            const cols: any[] = d.columns || [];
            const row = rows.find(r => r.id === selLabel || r.label === selLabel) ?? rows[0];
            const colVals: Record<string, number> = {};
            const colLatex: Record<string, string> = {};
            if (row) {
              cols.forEach((col: any, ci: number) => {
                let cellExpr = (row.cells?.[ci] ?? '').trim();
                // Wenn cells[ci] LaTeX enthält (noch nicht migriert oder Anzeige-Formel), konvertieren
                if (cellExpr && cellExpr.includes('\\')) {
                  cellExpr = latexToJs(cellExpr);
                }
                // Fallback: wenn leer, LaTeX aus cells_latex auto-konvertieren
                if (!cellExpr) {
                  const cellLtx = (row.cells_latex?.[ci] ?? '').trim();
                  if (cellLtx) cellExpr = latexToJs(cellLtx);
                }
                if (!cellExpr) return;
                const val = evalFormula(cellExpr, symbols);
                if (col.name && val != null && isFinite(val)) {
                  setSymbol(symbols, col.name, val);
                  colVals[col.name] = val;
                }
                // LaTeX-Formel mit eingesetzten Werten für die Anzeige
                const cellLatex = (row.cells_latex?.[ci] ?? '').trim();
                if (cellLatex && col.name) {
                  colLatex[col.name] = substituteLatexValues(cellLatex, symbols);
                }
              });
            }
            results[node.id] = { matrixVals: colVals, matrixLatex: colLatex, selectedLabel: row?.label ?? '' };
}
