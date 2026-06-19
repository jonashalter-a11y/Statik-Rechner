import { GraphNode } from '../../types/graph';
import { BlockEvalRuntime, setSymbol } from '../../utils/evalGraphShared';

type PolarPoint = { x: number; z: number };
type PolarWall = { x1: number; z1: number; x2: number; z2: number; thickness?: number };

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

function parseWalls(raw: unknown): PolarWall[] {
  if (raw == null || raw === '') return [];
  try {
    const parsed = JSON.parse(String(raw));
    const items = Array.isArray(parsed?.walls) ? parsed.walls : [];
    return items
      .map((w: any) => ({
        x1: Number(w?.x1),
        z1: Number(w?.z1),
        x2: Number(w?.x2),
        z2: Number(w?.z2),
        thickness: Number(w?.thickness) || 1
      }))
      .filter((w: PolarWall) => Number.isFinite(w.x1) && Number.isFinite(w.z1) && Number.isFinite(w.x2) && Number.isFinite(w.z2));
  } catch {
    return [];
  }
}

export function evaluatePolargrid(node: GraphNode, runtime: BlockEvalRuntime) {
  const d: any = node.data;
  const points = parsePoints(runtime.inputs[node.id]);
  const walls = parseWalls(runtime.inputs[node.id]);
  const pointArea = Number(d.point_area ?? 1);
  const baseArea = Number.isFinite(pointArea) ? pointArea : 1;

  // Diskretisiere Wände zu Punkten
  const allPoints = [...points];
  let wallArea = 0;
  for (const wall of walls) {
    const dx = wall.x2 - wall.x1;
    const dz = wall.z2 - wall.z1;
    const len = Math.sqrt(dx * dx + dz * dz);
    wallArea += len * (wall.thickness || 1);
    const step = 1;
    const count = Math.max(2, Math.ceil(len / step));
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      allPoints.push({
        x: wall.x1 + t * dx,
        z: wall.z1 + t * dz
      });
    }
  }

  const totalArea = walls.length > 0 ? baseArea + wallArea : baseArea;
  const sumR2 = points.reduce((sum, p) => sum + p.x * p.x + p.z * p.z, 0);
  const sumR2All = allPoints.reduce((sum, p) => sum + p.x * p.x + p.z * p.z, 0);
  const sumX = allPoints.reduce((sum, p) => sum + p.x, 0);
  const sumZ = allPoints.reduce((sum, p) => sum + p.z, 0);
  const cx = allPoints.length > 0 ? sumX / allPoints.length : 0;
  const cz = allPoints.length > 0 ? sumZ / allPoints.length : 0;

  const ipPointsOnly = baseArea * sumR2;
  const ipAll = totalArea * sumR2All;
  const value = walls.length > 0 ? ipAll : ipPointsOnly;

  runtime.results[node.id] = {
    value,
    matrixVals: {
      n: points.length,
      n_walls: walls.length,
      sum_r2: sumR2,
      sum_r2_all: sumR2All,
      cx,
      cz,
      area: totalArea,
    },
  };

  if (d.name) setSymbol(runtime.symbols, d.name, value);
}
