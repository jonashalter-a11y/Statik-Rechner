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
            const optionMatches = (opt: any, selected: string) =>
              opt?.id === selected || opt?.label === selected || (Array.isArray(opt?.aliases) && opt.aliases.includes(selected));
            const optionForItem = (item: Record<string, string> | undefined) => {
              const sel = item?.['__sel__'] ?? '';
              return (d.options || []).find((o: any) => optionMatches(o, sel));
            };
            const isHollowOption = (opt: any) =>
              String(opt?.category || opt?.label || '').toLowerCase().includes('hohlraum');
            const categoryKey = (opt: any) =>
              String(opt?.category || opt?.label || '')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');
            const isCoverOption = (opt: any) => {
              const key = categoryKey(opt);
              return key.includes('bekleidung') || key.includes('beplankung');
            };
            const isInsulationOption = (opt: any) => categoryKey(opt).includes('damm');
            const isGypsumOption = (opt: any) => {
              if (!opt) return false;
              if (Object.prototype.hasOwnProperty.call(opt, 'protects_deltat')) return opt.protects_deltat === true;
              return categoryKey(opt).includes('gips');
            };
            const layerThickness = (item: Record<string, string> | undefined) => {
              if (!item) return NaN;
              for (const v of (d.vars || [])) {
                if (v.scope === 'global') continue;
                const key = normalizeMaterialKey(v.name || '').replace(/\\/g, '');
                const isThickness = key === 'd_i' || key === 'd' || key === 'd_n' || String(v.label || '').toLowerCase().includes('dicke');
                if (!isThickness) continue;
                const raw = item[v.id] ?? item[v.name] ?? v.default_value ?? '';
                const num = parseNum(raw);
                if (isFinite(num)) return num;
              }
              return NaN;
            };
            const isEffectiveHollow = (idx: number) => {
              if (idx < 0 || idx >= n) return false;
              const opt = optionForItem(items[idx]);
              return isHollowOption(opt) && layerThickness(items[idx]) >= 40;
            };
            const isIgnoredHollow = (idx: number) => {
              if (idx < 0 || idx >= n) return false;
              const opt = optionForItem(items[idx]);
              return isHollowOption(opt) && !isEffectiveHollow(idx);
            };
            const previousMaterialIndex = (idx: number) => {
              let j = idx - 1;
              while (j >= 0 && isIgnoredHollow(j)) j--;
              return j;
            };
            const previousNonHollowMaterialIndex = (idx: number) => {
              let j = idx - 1;
              while (j >= 0) {
                const opt = optionForItem(items[j]);
                if (!isHollowOption(opt)) return j;
                j--;
              }
              return j;
            };
            const nextMaterialIndex = (idx: number) => {
              let j = idx + 1;
              while (j < n && isIgnoredHollow(j)) j++;
              return j;
            };
            const outputApplies = (out: any, idx: number, opt: any) => {
              const key = `${out?.id || ''} ${out?.name || ''} ${out?.label || ''}`.toLowerCase();
              if (isHollowOption(opt)) return false;
              if (out?.scope === 'last' && idx !== n - 1) return false;
              if (out?.scope === 'allButLast' && idx === n - 1) return false;
              if (out?.id === 'tprot') return idx < n - 1;
              if (out?.id === 'tins') return idx === n - 1;
              if (!key.includes('hohlraum') && !key.includes('_hl_') && !key.includes('pos,h')) return true;
              if (key.includes('brandzugewandt')) return isEffectiveHollow(idx + 1);
              if (key.includes('brandabgewandt') || key.includes('pos,h')) return isEffectiveHollow(idx - 1);
              return isEffectiveHollow(idx - 1) || isEffectiveHollow(idx + 1);
            };

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
                if (v.scope === 'last' && i !== n - 1) continue;
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
              const opt = (d.options || []).find((o: any) => optionMatches(o, selLabel));
              const prevOpt = optionForItem(items[previousMaterialIndex(i)]);
              const prevNonHollowOpt = optionForItem(items[previousNonHollowMaterialIndex(i)]);
              const nextOpt = optionForItem(items[nextMaterialIndex(i)]);
              setSymbol(localSym, 'prev_is_bekleidung', isCoverOption(prevOpt) ? 1 : 0);
              setSymbol(localSym, 'prev_is_daemmung', isInsulationOption(prevOpt) ? 1 : 0);
              setSymbol(localSym, 'prev_is_hohlraum', isEffectiveHollow(i - 1) ? 1 : 0);
              setSymbol(localSym, 'prev_is_gips', isGypsumOption(prevNonHollowOpt) ? 1 : 0);
              setSymbol(localSym, 'next_is_bekleidung', isCoverOption(nextOpt) ? 1 : 0);
              setSymbol(localSym, 'next_is_daemmung', isInsulationOption(nextOpt) ? 1 : 0);
              setSymbol(localSym, 'next_is_hohlraum', isEffectiveHollow(i + 1) ? 1 : 0);
              setSymbol(localSym, 'next_is_gips', isGypsumOption(nextOpt) ? 1 : 0);

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
                if (!outputApplies(out, i, opt)) {
                  perIterVals[out.id].push(NaN);
                  if (!perIterFormulas[out.id]) perIterFormulas[out.id] = [];
                  perIterFormulas[out.id].push('');
                  continue;
                }
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
              else if (ag.method === 'allButLast') agg = finite.slice(0, Math.max(0, finite.length - 1)).reduce((a, b) => a + b, 0);
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
