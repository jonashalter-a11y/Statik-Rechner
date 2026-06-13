import { GraphNode } from '../../types/graph';
import { BlockEvalRuntime } from '../../utils/evalGraphShared';

export function evaluateFrame(node: GraphNode, runtime: BlockEvalRuntime) {
  runtime.results[node.id] = {};
}
