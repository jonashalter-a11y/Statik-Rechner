import { GraphNode } from '../../types/graph';
import {
  BlockEvalRuntime, ChartSeriesData, deUmlaut, evalBestEffortCondition, evalBestEffortFormula,
  evalCondExpr, evalFormula, extractMissingSymbols, indexLoopLatexName, interpolateChart,
  interpolateChartInverse, latexCondToJs, latexToJs, normalizeMaterialKey, parseNum, setSymbol,
  substituteLatexValues, substituteValues,
} from '../../utils/evalGraphShared';

export function evaluateChartLookup(node: GraphNode, runtime: BlockEvalRuntime) {
  const d: any = node.data;
  const { graph, inputs, tables, materialProps, context, results, symbols, strSymbols, incomingFrom, getSelectionValue } = runtime;
  const chartData = d.chart_ref ? tables[d.chart_ref]?.chart_json : undefined;
            const series = chartData?.series ?? [];
            const inRaw = d.x_name || '';
            const inKey = deUmlaut(inRaw)
              .replace(/\\/g, '')
              .replace(/_\{([^{}]+)\}/g, (_m: string, sub: string) => '_' + sub.replace(/[,\s.]+/g, '_'))
              .replace(/[{},\s.]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
            const inVal = symbols[inKey] ?? symbols[inRaw] ?? NaN;
            const inverse = (d.direction ?? 'x_to_y') === 'y_to_x';
            const interpolate = (pts: [number,number][]) =>
              isFinite(inVal) && pts.length ? (inverse ? interpolateChartInverse(pts, inVal) : interpolateChart(pts, inVal)) : NaN;

            if (d.all_series && series.length > 0) {
              const allValues: number[] = series.map((s: ChartSeriesData) => interpolate(s.data));
              results[node.id] = { value: allValues[0] ?? NaN, allSeriesValues: allValues, inputValue: inVal } as any;
              allValues.forEach((v, i) => {
                if (isFinite(v)) setSymbol(symbols, series[i].name, v);
              });
            } else {
              const pts = series[d.series_index ?? 0]?.data ?? [];
              const outVal = interpolate(pts);
              results[node.id] = { value: outVal, inputValue: inVal } as any;
              if (d.name && isFinite(outVal)) setSymbol(symbols, d.name, outVal);
            }
}
