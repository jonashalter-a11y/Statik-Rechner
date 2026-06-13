import { GraphNode } from '../../types/graph';
import { BlockEvalRuntime, evalFormula, setSymbol } from '../../utils/evalGraphShared';

export function evaluateSummenblock(node: GraphNode, runtime: BlockEvalRuntime) {
  const d: any = node.data;
  const { symbols, results } = runtime;

  const result = evalFormula(d.expr || '0', symbols);
  results[node.id] = {
    value: result ?? NaN,
    substituted: d.expr || '0',
  };

  if (d.name && result != null) {
    setSymbol(symbols, d.name, result);
  }
}
