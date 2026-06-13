import { GraphNode } from '../../types/graph';
import {
  BlockEvalRuntime, ChartSeriesData, deUmlaut, evalBestEffortCondition, evalBestEffortFormula,
  evalCondExpr, evalFormula, extractMissingSymbols, indexLoopLatexName, interpolateChart,
  interpolateChartInverse, latexCondToJs, latexToJs, normalizeMaterialKey, parseNum, setSymbol,
  substituteLatexValues, substituteValues,
} from '../../utils/evalGraphShared';

export function evaluateLoopBlock(node: GraphNode, runtime: BlockEvalRuntime) {
  const d: any = node.data;
  const { graph, inputs, tables, materialProps, context, results, symbols, strSymbols, incomingFrom, getSelectionValue } = runtime;
  // Schleife über n Iterationen — jede hat eigene Eingaben und Ausgaben.
            // Indexierte Symbole (d_1, rho_1, … d_n, rho_n) werden ins globale
            // Symbols-Objekt geschrieben. Aggregationen (sum/last/…) fassen zusammen.
            let state: { count?: string; items?: Record<string, string>[]; globals?: Record<string, string> } = {};
            try { state = JSON.parse(inputs[node.id] as string ?? '{}'); } catch { /* */ }
            const n = Math.max(1, Math.min(parseNum(state.count ?? '1') || 1, d.max_count || 10));
            const items: Record<string, string>[] = Array.isArray(state.items) ? state.items : [];
            const stateGlobals: Record<string, string> = state.globals ?? {};

            // Globale Vars (scope='global') einmal auflösen und in symbols schreiben
            const globalSymPatch: Record<string, number> = {};
            for (const v of (d.vars || [])) {
              if (v.scope !== 'global') continue;
              const raw = stateGlobals[v.id] ?? stateGlobals[v.name] ?? v.default_value ?? '0';
              const num = parseNum(raw);
              if (isFinite(num)) { setSymbol(symbols, v.name, num); globalSymPatch[v.name] = num; }
            }

            const perIterVals: Record<string, number[]> = {};
            for (const out of (d.outputs || [])) perIterVals[out.id] = [];
            const perIterCalcVals: Record<string, number[]> = {};
            const perIterFormulas: Record<string, string[]> = {};
            const perIterCalcFormulas: Record<string, string[]> = {};

            for (let i = 0; i < n; i++) {
              const item = items[i] ?? {};
              // Lokale Symbole: globale + Iter-Variablen
              const localSym = { ...symbols };
              setSymbol(localSym, 'i', i + 1);
              setSymbol(localSym, 'n', n);
              // Globale Vars nochmals sicherstellen (falls symbols zwischenzeitlich überschrieben)
              for (const [k, v2] of Object.entries(globalSymPatch)) setSymbol(localSym, k, v2);
              for (const v of (d.vars || [])) {
                if (v.scope === 'global') continue; // bereits in globalSymPatch
                const raw = item[v.id] ?? item[v.name] ?? v.default_value ?? '0';
                const num = parseNum(raw);
                if (isFinite(num)) setSymbol(localSym, v.name, num);
                // Indizierte Symbole: d_1, rho_1, …
                if (isFinite(num)) {
                  setSymbol(symbols, indexLoopLatexName(v.name, i + 1) || `${v.name}_${i + 1}`, num);
                  if (i === n - 1) setSymbol(symbols, indexLoopLatexName(v.name, 'n') || `${v.name}_n`, num);
                }
              }
              const selLabel = item['__sel__'] ?? '';
              const opt = (d.options || []).find((o: any) => o.id === selLabel || o.label === selLabel);

              for (const out of (d.outputs || [])) {
                const prevVals = perIterVals[out.id] ?? [];
                const finitePrev = prevVals.filter(isFinite);
                const prevSum = finitePrev.reduce((a, b) => a + b, 0);
                const prevLast = finitePrev.length ? finitePrev[finitePrev.length - 1] : NaN;
                setSymbol(localSym, `sum_${out.id}_prev`, prevSum);
                setSymbol(localSym, `sum_${out.id}_before`, prevSum);
                setSymbol(localSym, `prev_${out.id}`, prevLast);
              }

              for (const calc of (opt?.calcs || [])) {
                const enabled = evalBestEffortCondition(calc.cond_expr || calc.cond_latex || '', localSym);
                const val = enabled ? evalBestEffortFormula(calc.formula || '', localSym) : NaN;
                if (!perIterCalcVals[calc.id]) perIterCalcVals[calc.id] = [];
                if (!perIterCalcFormulas[calc.id]) perIterCalcFormulas[calc.id] = [];
                perIterCalcVals[calc.id].push(val);
                perIterCalcFormulas[calc.id].push(enabled ? (calc.formula || '') : '');
                if (calc.name && isFinite(val)) {
                  setSymbol(localSym, calc.name, val);
                  setSymbol(symbols, indexLoopLatexName(calc.name, i + 1) || `${calc.name}_${i + 1}`, val);
                  if (i === n - 1) setSymbol(symbols, indexLoopLatexName(calc.name, 'n') || `${calc.name}_n`, val);
                }
              }

              for (const out of (d.outputs || [])) {
                const cases = opt?.formulaCases?.[out.id] || [];
                const activeCase = cases.find((c: any) => evalBestEffortCondition(c.cond_expr || c.cond_latex || '', localSym));
                const formula = activeCase?.formula ?? opt?.formulas?.[out.id] ?? '';
                const val = evalBestEffortFormula(formula, localSym);
                if (out.id && isFinite(val)) {
                  setSymbol(localSym, out.id, val);
                  setSymbol(localSym, indexLoopLatexName(out.name, i + 1) || out.name, val);
                }
                perIterVals[out.id].push(val);
                if (!perIterFormulas[out.id]) perIterFormulas[out.id] = [];
                perIterFormulas[out.id].push(formula);
                // Indiziertes Ausgabe-Symbol: t_prot_1, t_prot_2, …
                if (out.name && isFinite(val)) {
                  setSymbol(symbols, indexLoopLatexName(out.name, i + 1) || `${out.name}_${i + 1}`, val);
                  if (i === n - 1) setSymbol(symbols, indexLoopLatexName(out.name, 'n') || `${out.name}_n`, val);
                }
              }

              // Zweiter Durchlauf: Zusatzrechnungen dürfen auch die eben berechneten
              // Ausgaben derselben Schicht verwenden (z.B. k_pos aus tprot und Summe vorheriger Schichten).
              for (const calc of (opt?.calcs || [])) {
                const enabled = evalBestEffortCondition(calc.cond_expr || calc.cond_latex || '', localSym);
                const val = enabled ? evalBestEffortFormula(calc.formula || '', localSym) : NaN;
                if (!isFinite(val)) continue;
                if (!perIterCalcVals[calc.id]) perIterCalcVals[calc.id] = [];
                if (!perIterCalcFormulas[calc.id]) perIterCalcFormulas[calc.id] = [];
                perIterCalcVals[calc.id][i] = val;
                perIterCalcFormulas[calc.id][i] = calc.formula || '';
                if (calc.name) {
                  setSymbol(localSym, calc.name, val);
                  setSymbol(symbols, indexLoopLatexName(calc.name, i + 1) || `${calc.name}_${i + 1}`, val);
                  if (i === n - 1) setSymbol(symbols, indexLoopLatexName(calc.name, 'n') || `${calc.name}_n`, val);
                }
              }
            }

            // Aggregationen
            const aggrVals: Record<string, number> = {};
            const aggrLatex: Record<string, string> = {};
            const aggrSym: Record<string, number> = { ...symbols };
            for (const [outId, vals] of Object.entries(perIterVals)) {
              const finite = vals.filter(isFinite);
              const beforeLast = finite.slice(0, Math.max(0, finite.length - 1));
              setSymbol(aggrSym, `sum_${outId}`, finite.reduce((a, b) => a + b, 0));
              setSymbol(aggrSym, `sum_${outId}_before_last`, beforeLast.reduce((a, b) => a + b, 0));
              setSymbol(aggrSym, `last_${outId}`, finite.length ? finite[finite.length - 1] : NaN);
            }
            for (const ag of (d.aggregations || [])) {
              const vals = perIterVals[ag.output_id] ?? [];
              const finite = vals.filter(isFinite);
              let agg = NaN;
              if (ag.method === 'sum') agg = finite.reduce((a, b) => a + b, 0);
              else if (ag.method === 'last') agg = finite.length ? finite[finite.length - 1] : NaN;
              else if (ag.method === 'max') agg = finite.length ? Math.max(...finite) : NaN;
              else if (ag.method === 'min') agg = finite.length ? Math.min(...finite) : NaN;
              else if (ag.method === 'expr') agg = evalBestEffortFormula(ag.expr || '', aggrSym);
              aggrVals[ag.output_id] = agg;
              if (ag.name && isFinite(agg)) setSymbol(symbols, ag.name, agg);
            }
            results[node.id] = {
              matrixVals: aggrVals,
              matrixLatex: aggrLatex,
              // Rohdaten für Frontend-Darstellung
              loopPerIter: perIterVals,
              loopCalcPerIter: perIterCalcVals,
              loopFormulas: perIterFormulas,
              loopCalcFormulas: perIterCalcFormulas,
              loopN: n,
            } as any;
}
