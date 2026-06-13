// ─── Querschnitts-Berechnung mit Steiner-Anteilen ─────────────────────────────
export type ShapeKind = 'rect' | 'circle' | 'hollow_rect' | 'hollow_circle' | 'triangle';

export interface CSShape {
  id: string;
  kind: ShapeKind;
  label: string;
  // Abmessungen (mm)
  b: number;   // Breite (Rechteck/Dreieck) oder Außendurchmesser (Kreis)
  h: number;   // Höhe (Rechteck/Dreieck), ungenutzt bei Kreis
  bi: number;  // Innenbreite (Hohlrechteck)
  hi: number;  // Innenhöhe (Hohlrechteck)
  di: number;  // Innendurchmesser (Hohlkreis)
  // Lage des Eigenflächenschwerpunkts vom Bezugspunkt
  cx: number;  // x-Koordinate des Schwerpunkts [mm]
  cy: number;  // y-Koordinate des Schwerpunkts [mm] (positive = nach oben)
  subtract: boolean; // true = Abzugsfläche (Aussparung)
}

export interface ShapeResult {
  A: number;     // Fläche [mm²]
  Iy: number;    // Eigenes Iy um Schwerpunkt [mm⁴]
  Iz: number;    // Eigenes Iz um Schwerpunkt [mm⁴]
  cx: number; cy: number;
}

export interface SectionResult {
  shapes: (ShapeResult & { sign: number; ey: number; ez: number; steinY: number; steinZ: number })[];
  A: number;       // Gesamtfläche [mm²]
  cxS: number;     // Schwerpunkt x
  cyS: number;     // Schwerpunkt y
  Iy: number;      // Gesamtes Iy um Schwerpunktachse [mm⁴]
  Iz: number;      // Gesamtes Iz um Schwerpunktachse [mm⁴]
  Wy: number;      // Widerstandsmoment Iy / e_max [mm³]
  Wz: number;      // Widerstandsmoment Iz / e_max [mm³]
}

export function computeShapeProps(s: CSShape): ShapeResult {
  let A = 0, Iy = 0, Iz = 0;
  switch (s.kind) {
    case 'rect':
      A = s.b * s.h;
      Iy = (s.b * Math.pow(s.h, 3)) / 12;
      Iz = (s.h * Math.pow(s.b, 3)) / 12;
      break;
    case 'circle': {
      const r = s.b / 2;
      A = Math.PI * r * r;
      Iy = Iz = Math.PI * Math.pow(r, 4) / 4;
      break;
    }
    case 'hollow_rect':
      A = s.b * s.h - s.bi * s.hi;
      Iy = (s.b * Math.pow(s.h, 3) - s.bi * Math.pow(s.hi, 3)) / 12;
      Iz = (s.h * Math.pow(s.b, 3) - s.hi * Math.pow(s.bi, 3)) / 12;
      break;
    case 'hollow_circle': {
      const ra = s.b / 2, ri = s.di / 2;
      A = Math.PI * (ra * ra - ri * ri);
      Iy = Iz = Math.PI * (Math.pow(ra, 4) - Math.pow(ri, 4)) / 4;
      break;
    }
    case 'triangle':
      A = (s.b * s.h) / 2;
      Iy = (s.b * Math.pow(s.h, 3)) / 36;
      Iz = (s.h * Math.pow(s.b, 3)) / 48;
      break;
  }
  return { A, Iy, Iz, cx: s.cx, cy: s.cy };
}

export function computeSection(shapes: CSShape[]): SectionResult {
  const props = shapes.map(s => ({ ...computeShapeProps(s), sign: s.subtract ? -1 : 1 }));

  const A = props.reduce((sum, p) => sum + p.sign * p.A, 0);
  const cxS = A === 0 ? 0 : props.reduce((sum, p) => sum + p.sign * p.A * p.cx, 0) / A;
  const cyS = A === 0 ? 0 : props.reduce((sum, p) => sum + p.sign * p.A * p.cy, 0) / A;

  const shapesResult = props.map(p => {
    const ey = p.cy - cyS;
    const ez = p.cx - cxS;
    const steinY = p.A * ey * ey;
    const steinZ = p.A * ez * ez;
    return { ...p, ey, ez, steinY, steinZ };
  });

  const Iy = shapesResult.reduce((sum, p) => sum + p.sign * (p.Iy + p.steinY), 0);
  const Iz = shapesResult.reduce((sum, p) => sum + p.sign * (p.Iz + p.steinZ), 0);

  // Widerstandsmoment: Abstand von Schwerpunktachse zu Randfaser
  const allY = shapes.flatMap(s => {
    const sp = computeShapeProps(s);
    switch (s.kind) {
      case 'rect': return [s.cy - s.h / 2, s.cy + s.h / 2];
      case 'circle': return [s.cy - s.b / 2, s.cy + s.b / 2];
      case 'hollow_rect': return [s.cy - s.h / 2, s.cy + s.h / 2];
      case 'hollow_circle': return [s.cy - s.b / 2, s.cy + s.b / 2];
      case 'triangle': return [s.cy - s.h * 2 / 3, s.cy + s.h / 3];
      default: return [s.cy];
    }
  });
  const allZ = shapes.flatMap(s => {
    switch (s.kind) {
      case 'rect': return [s.cx - s.b / 2, s.cx + s.b / 2];
      case 'circle': return [s.cx - s.b / 2, s.cx + s.b / 2];
      default: return [s.cx - s.b / 2, s.cx + s.b / 2];
    }
  });

  const eYmax = Math.max(...allY.map(y => Math.abs(y - cyS)), 1);
  const eZmax = Math.max(...allZ.map(z => Math.abs(z - cxS)), 1);
  const Wy = Iy / eYmax;
  const Wz = Iz / eZmax;

  return { shapes: shapesResult, A, cxS, cyS, Iy, Iz, Wy, Wz };
}

export const SHAPE_DEFAULTS: Record<ShapeKind, Partial<CSShape>> = {
  rect:         { b: 100, h: 200, bi: 0, hi: 0, di: 0 },
  circle:       { b: 100, h: 0,   bi: 0, hi: 0, di: 0 },
  hollow_rect:  { b: 200, h: 300, bi: 160, hi: 260, di: 0 },
  hollow_circle:{ b: 200, h: 0,   bi: 0, hi: 0, di: 100 },
  triangle:     { b: 150, h: 200, bi: 0, hi: 0, di: 0 },
};

export const SHAPE_LABELS: Record<ShapeKind, string> = {
  rect: '▭ Rechteck',
  circle: '○ Kreis',
  hollow_rect: '▭◻ Hohlrechteck',
  hollow_circle: '◎ Hohlkreis',
  triangle: '△ Dreieck (rechtwinklig)',
};
