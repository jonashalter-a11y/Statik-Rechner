import { GraphNode, StiffnessWall } from '../../types/graph';
import { BlockEvalRuntime, setSymbol } from '../../utils/evalGraphShared';

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// EKV (Ersatzkraftverfahren, ebenes Modell je Richtung): Torsionswirkung wird
// nicht direkt erfasst → e0 wird mit Faktor 1.5 verstärkt (SIA 261 / EC8 §4.3.3.2.4).
// ASV (Antwortspektrumverfahren, räumliches Modell): Torsion ist im 3D-Modell
// bereits abgebildet → nur die ungewollte Ausmitte von 0.05·L wird addiert.
const SUP_FACTOR: Record<'EKV' | 'ASV', number> = { EKV: 1.5, ASV: 1.0 };

export interface StiffnessResult {
  x_S: number;
  y_S: number;
  x_M: number;
  y_M: number;
  e_x: number;
  e_y: number;
  e_d_x_sup: number;
  e_d_x_inf: number;
  e_d_y_sup: number;
  e_d_y_inf: number;
  sum_k_x: number;
  sum_k_y: number;
}

// Reine Berechnungsfunktion, auch genutzt vom Canvas-Live-Preview in BackendNode.tsx.
export function computeStiffness(d: { walls?: StiffnessWall[]; method?: string; b_x?: unknown; b_y?: unknown }): StiffnessResult {
  const walls: StiffnessWall[] = Array.isArray(d.walls) ? d.walls : [];
  const method: 'EKV' | 'ASV' = d.method === 'ASV' ? 'ASV' : 'EKV';
  const bx = num(d.b_x, 0);
  const by = num(d.b_y, 0);

  const xM = bx / 2;
  const yM = by / 2;

  // Vertikale Wände (axis='y') resistieren Erdbeben in y-Richtung → k_y, Hebelarm x_i
  // Horizontale Wände (axis='x') resistieren Erdbeben in x-Richtung → k_x, Hebelarm y_i
  let sumKy = 0;
  let sumKyX = 0;
  let sumKx = 0;
  let sumKxY = 0;

  for (const w of walls) {
    const k = num(w?.k, 0);
    if (!(k > 0)) continue;
    const x1 = num(w?.x1, 0);
    const y1 = num(w?.y1, 0);
    const x2 = num(w?.x2, 0);
    const y2 = num(w?.y2, 0);
    if (w?.axis === 'y') {
      const xi = (x1 + x2) / 2;
      sumKy += k;
      sumKyX += k * xi;
    } else if (w?.axis === 'x') {
      const yi = (y1 + y2) / 2;
      sumKx += k;
      sumKxY += k * yi;
    }
  }

  const xS = sumKy > 0 ? sumKyX / sumKy : xM;
  const yS = sumKx > 0 ? sumKxY / sumKx : yM;

  // e0x: Versatz S↔M entlang x → Hebelarm für Erdbeben in y-Richtung (mit b_x)
  // e0y: Versatz S↔M entlang y → Hebelarm für Erdbeben in x-Richtung (mit b_y)
  const e0x = Number.isFinite(xS - xM) ? xS - xM : 0;
  const e0y = Number.isFinite(yS - yM) ? yS - yM : 0;

  const supFactor = SUP_FACTOR[method];
  const eaY = 0.05 * by; // ungewollte Ausmitte für Erdbeben in x-Richtung
  const eaX = 0.05 * bx; // ungewollte Ausmitte für Erdbeben in y-Richtung

  const eDXSup = supFactor * e0y + eaY;
  const eDXInf = e0y - eaY;
  const eDYSup = supFactor * e0x + eaX;
  const eDYInf = e0x - eaX;

  const result = {
    x_S: xS,
    y_S: yS,
    x_M: xM,
    y_M: yM,
    e_x: e0x,
    e_y: e0y,
    e_d_x_sup: eDXSup,
    e_d_x_inf: eDXInf,
    e_d_y_sup: eDYSup,
    e_d_y_inf: eDYInf,
    sum_k_x: sumKx,
    sum_k_y: sumKy,
  };

  // Robustheit: NaN (z.B. b_x/b_y leer oder keine Wände) nie nach aussen geben
  for (const key of Object.keys(result) as Array<keyof typeof result>) {
    if (!Number.isFinite(result[key])) result[key] = 0;
  }

  return result;
}

export function evaluateStiffnesscenter(node: GraphNode, runtime: BlockEvalRuntime) {
  const d: any = node.data;
  const { symbols } = runtime;
  const result = computeStiffness(d);

  runtime.results[node.id] = {
    value: Math.max(
      Math.abs(result.e_d_x_sup), Math.abs(result.e_d_x_inf),
      Math.abs(result.e_d_y_sup), Math.abs(result.e_d_y_inf),
    ),
    matrixVals: { ...result },
  };

  const base = d.name || 'S';
  setSymbol(symbols, `x_{${base}}`, result.x_S);
  setSymbol(symbols, `y_{${base}}`, result.y_S);
  setSymbol(symbols, 'x_M', result.x_M);
  setSymbol(symbols, 'y_M', result.y_M);
  setSymbol(symbols, 'e_x', result.e_x);
  setSymbol(symbols, 'e_y', result.e_y);
  setSymbol(symbols, 'e_{d,x,sup}', result.e_d_x_sup);
  setSymbol(symbols, 'e_{d,x,inf}', result.e_d_x_inf);
  setSymbol(symbols, 'e_{d,y,sup}', result.e_d_y_sup);
  setSymbol(symbols, 'e_{d,y,inf}', result.e_d_y_inf);
}
