import { GraphNode } from '../../types/graph';
import {
  BlockEvalRuntime, evalFormula, extractMissingSymbols, setSymbol, substituteValues, substituteLatexValues, latexToJs,
} from '../../utils/evalGraphShared';
import { SwitchCalcData } from './defaults';

export function evaluateSwitchCalc(node: GraphNode, runtime: BlockEvalRuntime) {
  const d = node.data as unknown as SwitchCalcData;
  const { symbols, results, inputs } = runtime;

  // Nutze die Auswahl vom Frontend (inputs[node.id]) oder fallback auf Block-Daten
  const selectedId = inputs?.[node.id] || d.selectedOptionId || d.options[0]?.id;
  const currentOption = d.options.find(o => o.id === selectedId);

  if (!currentOption) {
    results[node.id] = { value: NaN, substituted: '', substitutedLatex: '', missingSymbols: [] };
    return;
  }

  const expr = currentOption.expr || (currentOption.latex ? latexToJs(currentOption.latex) : '');
  const missingSymbols = extractMissingSymbols(expr, symbols);
  const v = evalFormula(expr, symbols);
  const substituted = substituteValues(expr, symbols);
  const substitutedLatex = currentOption.latex ? substituteLatexValues(currentOption.latex, symbols) : '';

  results[node.id] = { value: v ?? NaN, substituted, substitutedLatex, missingSymbols };
  if (d.name && v != null) setSymbol(symbols, d.name, v);
}
