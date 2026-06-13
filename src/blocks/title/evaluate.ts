import { GraphNode } from '../../types/graph';
import { BlockEvalRuntime } from '../../utils/evalGraphShared';

export function evaluateTitle(node: GraphNode, runtime: BlockEvalRuntime) {
  runtime.results[node.id] = {};
}
