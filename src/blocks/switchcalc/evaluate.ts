import { GraphNode } from '../../types/graph';
import {
  BlockEvalRuntime, evalFormulaPM, extractMissingSymbols, setSymbol, substituteValues, substituteLatexValues, latexToJs,
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

  let expr = currentOption.expr || (currentOption.latex ? latexToJs(currentOption.latex) : '');
  // Hat die Anzeige-Formel ein ±, der gespeicherte expr aber nicht, leiten wir
  // den expr aus der LaTeX ab — so wird die ±-Position korrekt übernommen.
  if (!/±|\\pm\b/.test(expr) && /\\pm\b/.test(currentOption.latex || '')) {
    expr = latexToJs(currentOption.latex);
  }
  const missingSymbols = extractMissingSymbols(expr, symbols);
  const pm = evalFormulaPM(expr, symbols);
  const substituted = substituteValues(expr, symbols);
  const substitutedLatex = currentOption.latex ? substituteLatexValues(currentOption.latex, symbols) : '';

  if (pm.hasPM && pm.value != null && pm.valueAlt != null) {
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
