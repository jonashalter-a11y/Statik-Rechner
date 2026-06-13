import { GraphNode } from '../../types/graph';
import {
  BlockEvalRuntime, ChartSeriesData, deUmlaut, evalBestEffortCondition, evalBestEffortFormula,
  evalCondExpr, evalFormula, extractMissingSymbols, indexLoopLatexName, interpolateChart,
  interpolateChartInverse, latexCondToJs, latexToJs, normalizeMaterialKey, parseNum, setSymbol,
  substituteLatexValues, substituteValues,
} from '../../utils/evalGraphShared';

export function evaluateDropdown(node: GraphNode, runtime: BlockEvalRuntime) {
  const d: any = node.data;
  const { graph, inputs, tables, materialProps, context, results, symbols, strSymbols, incomingFrom, getSelectionValue } = runtime;
  const selLabel = inputs[node.id] != null ? String(inputs[node.id]) : '';
            let rowIndex = -1;
            const tbl = d.table_ref ? tables[d.table_ref] : undefined;
            if (tbl) {
              const labelCol = d.label_col ?? 0;
              rowIndex = tbl.rows.findIndex(r => String(r[labelCol]) === selLabel);
            }
            results[node.id] = { selected: { tableId: d.table_ref, rowIndex, label: selLabel } };
            // table-mode: Schlüssel-Spalte (col 0) als String-Symbol speichern (z.B. GK = 'IIa')
            if (d.mode !== 'custom' && d.name && tbl && rowIndex >= 0) {
              const jsName = deUmlaut(d.name).replace(/[^A-Za-z0-9_$]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
              const keyVal = String(tbl.rows[rowIndex][0]);
              if (jsName) strSymbols[jsName] = keyVal;
              const numVal = parseNum(keyVal);
              if (isFinite(numVal)) setSymbol(symbols, d.name, numVal);
              results[node.id].value = isFinite(numVal) ? numVal : NaN;
            }
            // mode=custom: gewählter Wert direkt als Symbol (falls Name gesetzt)
            if (d.mode === 'custom' && d.name) {
              const opt = (d.options || []).find((o: any) => o.label === selLabel || o.value === selLabel);
              const strVal = opt ? String(opt.value) : selLabel;
              const v = parseNum(strVal);
              setSymbol(symbols, d.name, v);
              results[node.id].value = v;
              // String-Wert für Bedingungsausdrücke (GK === 'III')
              const jsName = deUmlaut(d.name).replace(/[^A-Za-z0-9_$]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
              if (jsName) strSymbols[jsName] = strVal;
            }
}
