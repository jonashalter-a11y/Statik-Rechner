import { GraphNode } from '../../types/graph';
import { BlockEvalRuntime, setSymbol } from '../../utils/evalGraphShared';

type PolarPoint = { x: number; z: number };

function parsePoints(raw: unknown): PolarPoint[] {
  if (raw == null || raw === '') return [];
  try {
    const parsed = JSON.parse(String(raw));
    const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.points) ? parsed.points : [];
    return items
      .map((p: any) => ({ x: Number(p?.x), z: Number(p?.z) }))
      .filter((p: PolarPoint) => Number.isFinite(p.x) && Number.isFinite(p.z));
  } catch {
    return [];
  }
}

export function evaluatePolargrid(node: GraphNode, runtime: BlockEvalRuntime) {
  const d: any = node.data;
  const points = parsePoints(runtime.inputs[node.id]);
  const pointArea = Number(d.point_area ?? 1);
  const area = Number.isFinite(pointArea) ? pointArea : 1;
  const sumR2 = points.reduce((sum, p) => sum + p.x * p.x + p.z * p.z, 0);
  const value = area * sumR2;

  runtime.results[node.id] = {
    value,
    matrixVals: {
      n: points.length,
      sum_r2: sumR2,
    },
  };

  if (d.name) setSymbol(runtime.symbols, d.name, value);
}
