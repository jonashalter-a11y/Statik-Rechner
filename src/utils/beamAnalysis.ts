// ─── Träger-Analyse (analytisch / Kraftgrössenverfahren) ──────────────────────
// Löst Einfeldträger für: gelenkig, Kragarm links/rechts, eingespannt-Rolle, beidseitig eingespannt

export type SupportKind = 'pin' | 'roller' | 'fixed' | 'free';

export interface BeamLoad {
  id: string;
  kind: 'point' | 'uniform';
  value: number;   // kN oder kN/m (positiv = nach unten)
  pos: number;     // Absolutposition in m vom linken Ende
  pos2?: number;   // Endposition (nur uniform, default = L)
  dir: 1 | -1;     // 1 = nach unten, -1 = nach oben
}

export interface BeamSystem {
  L: number;
  left: SupportKind;
  right: SupportKind;
  loads: BeamLoad[];
}

export interface BeamResults {
  x: number[];
  M: number[];   // Biegemoment [kNm], positiv = Zug unten (Feldmoment)
  Q: number[];   // Querkraft [kN], positiv = links oben / rechts unten
  N: number[];   // Normalkraft [kN], immer 0 für reine Vertikallasten
  Mmax: number; Mmin: number;
  Qmax: number; Qmin: number;
  reactions: { RA: number; RB: number; MA: number; MB: number };
  systemName: string;
}

const NP = 400;

// Querkraft-Anteil der Lasten bis Stelle x (positiv = nach unten wirkende Last)
function shearLoads(loads: BeamLoad[], x: number): number {
  let V = 0;
  for (const ld of loads) {
    const F = ld.value * ld.dir;
    if (ld.kind === 'point') {
      if (ld.pos < x) V += F;
    } else {
      const a = ld.pos;
      const b = ld.pos2 ?? 1e9;
      if (a < x) V += F * (Math.min(b, x) - a);
    }
  }
  return V;
}

// Momentenanteil der Lasten bis Stelle x (Summe Fi*(x-xi) für xi < x)
function momentLoads(loads: BeamLoad[], x: number): number {
  let M = 0;
  for (const ld of loads) {
    const F = ld.value * ld.dir;
    if (ld.kind === 'point') {
      if (ld.pos <= x) M += F * (x - ld.pos);
    } else {
      const a = ld.pos;
      const b = ld.pos2 ?? 1e9;
      if (a < x) {
        const bx = Math.min(b, x);
        M += F * (bx - a) * (x - (a + bx) / 2);
      }
    }
  }
  return M;
}

// Gesamte Vertikallast (positiv = nach unten)
function totalLoad(loads: BeamLoad[]): number {
  let V = 0;
  for (const ld of loads) {
    const F = ld.value * ld.dir;
    V += ld.kind === 'point' ? F : F * ((ld.pos2 ?? 1e9) - ld.pos);
  }
  return V;
}

// Primärmoment (einfach gelenkig, keine Einspannmomente)
function M0(loads: BeamLoad[], L: number, x: number): number {
  const RA0 = momentLoads(loads, L) / L;
  return RA0 * x - momentLoads(loads, x);
}

// ── Ergebnis-Arrays aus Reaktionen berechnen ────────────────────────────────
function buildResults(
  loads: BeamLoad[], L: number,
  MA: number, MB: number,
  systemName: string,
): BeamResults {
  // RA aus: M(L) = MB = MA + RA*L - momentLoads(loads, L)
  const RA = (MB - MA + momentLoads(loads, L)) / L;
  const RB = totalLoad(loads) - RA;

  const xs = Array.from({ length: NP + 1 }, (_, i) => (i * L) / NP);
  const Q = xs.map(x => RA - shearLoads(loads, x));
  const M = xs.map(x => MA + RA * x - momentLoads(loads, x));
  const N = xs.map(() => 0);

  return {
    x: xs, M, Q, N,
    Mmax: Math.max(...M), Mmin: Math.min(...M),
    Qmax: Math.max(...Q), Qmin: Math.min(...Q),
    reactions: { RA, RB, MA, MB },
    systemName,
  };
}

// ── Numerische Integration (Kraftgrössenverfahren) ──────────────────────────
function numericalIntegrals(loads: BeamLoad[], L: number): { dA: number; dB: number } {
  const n = 400;
  const dx = L / n;
  let dA = 0, dB = 0;
  for (let i = 0; i <= n; i++) {
    const xi = i * dx;
    const w = i === 0 || i === n ? 0.5 : 1; // Trapezregel
    const m0 = M0(loads, L, xi);
    dA += w * m0 * (1 - xi / L) * dx;
    dB += w * m0 * (xi / L) * dx;
  }
  return { dA, dB };
}

// ── Systeme ──────────────────────────────────────────────────────────────────

function simplySupported(sys: BeamSystem): BeamResults {
  return buildResults(sys.loads, sys.L, 0, 0, 'Einfeldträger (gelenkig)');
}

function cantileverLeft(sys: BeamSystem): BeamResults {
  // Kragarm: eingespannt links (A), frei rechts (B)
  // RA = totalLoad, MA so dass M(L) = 0
  const total = totalLoad(sys.loads);
  const MA = momentLoads(sys.loads, sys.L) - total * sys.L;
  // MB = 0 (freies Ende), RA = total
  return buildResults(sys.loads, sys.L, MA, 0, 'Kragarm (Einspannung links)');
}

function cantileverRight(sys: BeamSystem): BeamResults {
  // Kragarm: frei links (A), eingespannt rechts (B)
  // RA = MA = 0, M(x) = -momentLoads(x)
  const L = sys.L;
  const xs = Array.from({ length: NP + 1 }, (_, i) => (i * L) / NP);
  const Q = xs.map(x => -shearLoads(sys.loads, x));
  const M = xs.map(x => -momentLoads(sys.loads, x));
  const N = xs.map(() => 0);
  const MB = M[M.length - 1];
  const RB = shearLoads(sys.loads, L);
  return {
    x: xs, M, Q, N,
    Mmax: Math.max(...M), Mmin: Math.min(...M),
    Qmax: Math.max(...Q), Qmin: Math.min(...Q),
    reactions: { RA: 0, RB, MA: 0, MB },
    systemName: 'Kragarm (Einspannung rechts)',
  };
}

function proppedLeft(sys: BeamSystem): BeamResults {
  // Eingespannt links, Rolle rechts  (1× statisch unbestimmt, Redundante: MA)
  const { dA } = numericalIntegrals(sys.loads, sys.L);
  const MA = -3 * dA / sys.L;
  return buildResults(sys.loads, sys.L, MA, 0, 'Eingespannt-Gelenkig');
}

function proppedRight(sys: BeamSystem): BeamResults {
  // Rolle links, Eingespannt rechts  (1× statisch unbestimmt, Redundante: MB)
  const { dB } = numericalIntegrals(sys.loads, sys.L);
  const MB = -3 * dB / sys.L;
  return buildResults(sys.loads, sys.L, 0, MB, 'Gelenkig-Eingespannt');
}

function fixedFixed(sys: BeamSystem): BeamResults {
  // Beidseitig eingespannt (2× statisch unbestimmt)
  const { dA, dB } = numericalIntegrals(sys.loads, sys.L);
  const L = sys.L;
  const MA = (-4 * dA + 2 * dB) / L;
  const MB = (2 * dA - 4 * dB) / L;
  return buildResults(sys.loads, sys.L, MA, MB, 'Beidseitig eingespannt');
}

// ── Hauptfunktion ─────────────────────────────────────────────────────────────
export function computeBeam(sys: BeamSystem): BeamResults {
  const { left, right } = sys;
  const fixed = (s: SupportKind) => s === 'fixed';
  const free  = (s: SupportKind) => s === 'free';

  if (free(left)  && fixed(right)) return cantileverRight(sys);
  if (fixed(left) && free(right))  return cantileverLeft(sys);
  if (fixed(left) && fixed(right)) return fixedFixed(sys);
  if (fixed(left))                 return proppedLeft(sys);
  if (fixed(right))                return proppedRight(sys);
  return simplySupported(sys);
}
