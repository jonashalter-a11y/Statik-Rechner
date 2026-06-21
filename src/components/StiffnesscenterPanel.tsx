import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StiffnesscenterData, StiffnessWall } from '../types/graph';
import { computeStiffness } from '../blocks/stiffnesscenter/evaluate';

interface Viewport {
  scale: number;
  ox: number;
  oy: number;
}

const STD_KEY = 'stiffnesscenter_standard';

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function worldToScreen(vp: Viewport, x: number, y: number) {
  return { sx: vp.ox + x * vp.scale, sy: vp.oy - y * vp.scale };
}

function screenToWorld(vp: Viewport, sx: number, sy: number) {
  return { x: (sx - vp.ox) / vp.scale, y: (vp.oy - sy) / vp.scale };
}

function fitViewport(w: number, h: number, bx: number, by: number): Viewport {
  const padding = 36;
  const safeBx = Math.max(bx, 0.5);
  const safeBy = Math.max(by, 0.5);
  const scale = Math.max(2, Math.min((w - 2 * padding) / safeBx, (h - 2 * padding) / safeBy));
  const emptyH = w - safeBx * scale;
  const emptyV = h - safeBy * scale;
  return { scale, ox: emptyH / 2, oy: h - emptyV / 2 };
}

interface StiffnesscenterPanelProps {
  data: StiffnesscenterData;
  savedState: string;
  readOnly: boolean;
  onStateChange: (state: string) => void;
  onDataChange?: (patch: Partial<StiffnesscenterData>) => void;
}

export function StiffnesscenterPanel({ data, savedState, readOnly, onStateChange, onDataChange }: StiffnesscenterPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 600, h: 380 });
  const [mode, setMode] = useState<'rect' | 'wall'>('wall');
  const [vp, setVp] = useState<Viewport>(() => fitViewport(600, 380, num(data.b_x, 10), num(data.b_y, 8)));
  const [wallStart, setWallStart] = useState<{ x: number; y: number } | null>(null);
  const [mouseWorld, setMouseWorld] = useState<{ x: number; y: number } | null>(null);
  const [rectDrag, setRectDrag] = useState<{ x0: number; y0: number; x: number; y: number } | null>(null);
  const [gridVisible, setGridVisible] = useState(true);
  const [stdSaved, setStdSaved] = useState(false);
  const [wallMode, setWallMode] = useState<'edge' | 'center'>('edge');
  const [rightWidth, setRightWidth] = useState(260);
  const [bottomHeight, setBottomHeight] = useState(150);
  const splitRef = useRef<{ startX: number; startW: number } | null>(null);
  const vSplitRef = useRef<{ startY: number; startH: number } | null>(null);
  const panRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  let localWalls: StiffnessWall[] = [];
  let savedParams: Partial<StiffnesscenterData> = {};
  try {
    const state = JSON.parse(savedState);
    localWalls = Array.isArray(state?.walls) ? state.walls : [];
    savedParams = state?.params ?? {};
  } catch {}
  if (!Array.isArray(localWalls)) localWalls = [];
  localWalls = localWalls.concat(Array.isArray(data.walls) ? data.walls : []);

  // Merge gespeicherte Parameter mit aktuellen Block-Daten
  const currentData = { ...data, ...savedParams };

  const bx = num(currentData.b_x, 0);
  const by = num(currentData.b_y, 0);
  const result = useMemo(() => computeStiffness({ ...currentData, walls: localWalls }), [currentData, localWalls]);

  // Automatische Rasterweite basierend auf Zoom (wie GeoGebra)
  function getAdaptiveGridStep(scale: number): number {
    const pxPerMeter = scale;
    const targetPxPerGrid = 40; // Ideal pixel spacing
    const baseSteps = [0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];
    let best = 0.005;
    for (const step of baseSteps) {
      if (step * pxPerMeter >= targetPxPerGrid) {
        best = step;
        break;
      }
    }
    return best;
  }

  // Canvas-Grösse messen — füllt den verfügbaren Container (kein Scrollen nötig)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = Math.max(340, Math.floor(entry.contentRect.width));
        const h = Math.max(300, Math.floor(entry.contentRect.height));
        setCanvasSize(prev => (prev.w === w && prev.h === h ? prev : { w, h }));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setVp(fitViewport(canvasSize.w, canvasSize.h, bx, by));
  }, [data.b_x, data.b_y, canvasSize.w, canvasSize.h]);

  // ESC bricht das Wand-Zeichnen ab
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setWallStart(null);
        setRectDrag(null);
        setMouseWorld(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const snap = useCallback((v: number) => {
    const step = getAdaptiveGridStep(vp.scale);
    return Math.round(v / step) * step;
  }, [vp.scale]);
  const persist = useCallback((walls: StiffnessWall[]) => {
    // Params (b_x, b_y, Verfahren) IMMER aus dem aktuellen savedState übernehmen,
    // damit das Zeichnen einer Wand den Grundriss nicht zurücksetzt.
    let params: Partial<StiffnesscenterData> = {};
    try { params = JSON.parse(savedState)?.params ?? {}; } catch {}
    onStateChange(JSON.stringify({ params, walls }));
  }, [onStateChange, savedState]);

  // Wand-Geometrie je nach Zeichenmodus.
  // 'edge': Start = ein Rand, Ende = anderer Rand (volle Länge).
  // 'center': Start = Mitte, Ende = Rand → Wand spannt symmetrisch ±Radius.
  const wallGeom = useCallback(
    (x0: number, y0: number, x1: number, y1: number): { x1: number; y1: number; x2: number; y2: number; axis: 'x' | 'y' } | null => {
      const dx = x1 - x0;
      const dy = y1 - y0;
      if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return null;
      const horizontal = Math.abs(dx) >= Math.abs(dy);
      if (wallMode === 'center') {
        if (horizontal) {
          const h = Math.abs(dx);
          return { x1: x0 - h, y1: y0, x2: x0 + h, y2: y0, axis: 'x' };
        }
        const h = Math.abs(dy);
        return { x1: x0, y1: y0 - h, x2: x0, y2: y0 + h, axis: 'y' };
      }
      // edge
      if (horizontal) {
        const my = (y0 + y1) / 2;
        return { x1: x0, y1: my, x2: x1, y2: my, axis: 'x' };
      }
      const mx = (x0 + x1) / 2;
      return { x1: mx, y1: y0, x2: mx, y2: y1, axis: 'y' };
    },
    [wallMode]
  );

  // Canvas zeichnen
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvasSize.w;
    canvas.height = canvasSize.h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // === GeoGebra-Stil: Gitter + Achsen mit Edge-Pinning ===
    const gridStep = getAdaptiveGridStep(vp.scale);
    const gxMin = Math.floor(-vp.ox / vp.scale / gridStep) * gridStep;
    const gxMax = Math.ceil((canvas.width - vp.ox) / vp.scale / gridStep) * gridStep;
    const gyMin = Math.floor(-(canvas.height - vp.oy) / vp.scale / gridStep) * gridStep;
    const gyMax = Math.ceil(vp.oy / vp.scale / gridStep) * gridStep;

    // Adaptives Raster
    if (gridVisible) {
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      for (let gx = gxMin; gx <= gxMax; gx += gridStep) {
        const { sx } = worldToScreen(vp, gx, 0);
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, canvas.height);
        ctx.stroke();
      }
      for (let gy = gyMin; gy <= gyMax; gy += gridStep) {
        const { sy } = worldToScreen(vp, 0, gy);
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(canvas.width, sy);
        ctx.stroke();
      }
    }

    // Achsen-Position (Edge-Pinning: bei Off-Screen am Rand kleben)
    const rawAxisY = worldToScreen(vp, 0, 0).sy; // y=0 → Bildschirm-Y der X-Achse
    const rawAxisX = worldToScreen(vp, 0, 0).sx; // x=0 → Bildschirm-X der Y-Achse
    const axisY = Math.max(14, Math.min(canvas.height - 16, rawAxisY));
    const axisX = Math.max(28, Math.min(canvas.width - 8, rawAxisX));

    // Achsenlinien
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, axisY);
    ctx.lineTo(canvas.width, axisY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(axisX, 0);
    ctx.lineTo(axisX, canvas.height);
    ctx.stroke();

    // Beschriftung an den Achsen (klebt an der Achse, zieht mit)
    const fmt = (v: number) => v.toFixed(3).replace(/\.?0+$/, '');
    ctx.fillStyle = '#475569';
    ctx.font = '11px sans-serif';

    // X-Achsen-Labels (unter der X-Achse) + Tick-Marks
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let gx = gxMin; gx <= gxMax; gx += gridStep) {
      if (Math.abs(gx) < 1e-9) continue;
      const { sx } = worldToScreen(vp, gx, 0);
      if (sx < axisX + 6 || sx > canvas.width - 4) continue;
      // Tick
      ctx.strokeStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(sx, axisY - 3);
      ctx.lineTo(sx, axisY + 3);
      ctx.stroke();
      // Label mit weißem Hintergrund für Lesbarkeit
      const txt = fmt(gx);
      const w = ctx.measureText(txt).width;
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillRect(sx - w / 2 - 1, axisY + 4, w + 2, 13);
      ctx.fillStyle = '#475569';
      ctx.fillText(txt, sx, axisY + 5);
    }

    // Y-Achsen-Labels (links der Y-Achse) + Tick-Marks
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let gy = gyMin; gy <= gyMax; gy += gridStep) {
      if (Math.abs(gy) < 1e-9) continue;
      const { sy } = worldToScreen(vp, 0, gy);
      if (sy < 4 || sy > axisY - 6) continue;
      // Tick
      ctx.strokeStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(axisX - 3, sy);
      ctx.lineTo(axisX + 3, sy);
      ctx.stroke();
      const txt = fmt(gy);
      const w = ctx.measureText(txt).width;
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillRect(axisX - 7 - w, sy - 6, w + 4, 12);
      ctx.fillStyle = '#475569';
      ctx.fillText(txt, axisX - 6, sy);
    }

    // Ursprung "0"
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('0', axisX - 6, axisY + 5);
    ctx.textBaseline = 'alphabetic';

    // Grundriss-Rechteck
    if (bx > 0 && by > 0) {
      const p0 = worldToScreen(vp, 0, 0);
      const p1 = worldToScreen(vp, bx, by);
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.strokeRect(Math.min(p0.sx, p1.sx), Math.min(p0.sy, p1.sy), Math.abs(p1.sx - p0.sx), Math.abs(p1.sy - p0.sy));
    }

    // Live-Drag-Rechteck
    if (rectDrag) {
      const p0 = worldToScreen(vp, rectDrag.x0, rectDrag.y0);
      const p1 = worldToScreen(vp, rectDrag.x, rectDrag.y);
      ctx.strokeStyle = '#0ea5e9';
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(Math.min(p0.sx, p1.sx), Math.min(p0.sy, p1.sy), Math.abs(p1.sx - p0.sx), Math.abs(p1.sy - p0.sy));
      ctx.setLineDash([]);
    }

    // Massenmittelpunkt M
    const M = worldToScreen(vp, result.x_M, result.y_M);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(M.sx - 8, M.sy - 8);
    ctx.lineTo(M.sx + 8, M.sy + 8);
    ctx.moveTo(M.sx + 8, M.sy - 8);
    ctx.lineTo(M.sx - 8, M.sy + 8);
    ctx.stroke();
    ctx.fillStyle = '#374151';
    ctx.font = '10px sans-serif';
    ctx.fillText('M', M.sx + 10, M.sy - 8);

    // Design-Exzentrizitäten
    if (bx > 0 && by > 0) {
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 1.25;

      ctx.strokeStyle = 'rgba(217,119,6,0.55)';
      [
        { v: result.e_d_x_sup, label: 'e_d,x,sup' },
        { v: result.e_d_x_inf, label: 'e_d,x,inf' },
      ].forEach(({ v, label }) => {
        const y = result.y_M + v;
        const a = worldToScreen(vp, 0, y);
        const b = worldToScreen(vp, bx, y);
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.stroke();
        ctx.fillStyle = 'rgba(146,64,14,0.85)';
        ctx.font = '8px sans-serif';
        ctx.fillText(label, b.sx - 56, a.sy - 2);
      });

      ctx.strokeStyle = 'rgba(124,58,237,0.55)';
      [
        { v: result.e_d_y_sup, label: 'e_d,y,sup' },
        { v: result.e_d_y_inf, label: 'e_d,y,inf' },
      ].forEach(({ v, label }) => {
        const x = result.x_M + v;
        const a = worldToScreen(vp, x, 0);
        const b = worldToScreen(vp, x, by);
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.stroke();
        ctx.fillStyle = 'rgba(91,33,182,0.85)';
        ctx.font = '8px sans-serif';
        ctx.fillText(label, b.sx + 3, b.sy + 9);
      });
      ctx.setLineDash([]);
    }

    // Wände
    localWalls.forEach(w => {
      const a = worldToScreen(vp, w.x1, w.y1);
      const b = worldToScreen(vp, w.x2, w.y2);
      ctx.strokeStyle = w.axis === 'x' ? '#1d4ed8' : '#b91c1c';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
      ctx.stroke();
      ctx.fillStyle = '#111827';
      ctx.font = '8px sans-serif';
      ctx.fillText(`k=${w.k}`, (a.sx + b.sx) / 2 + 4, (a.sy + b.sy) / 2 - 4);
    });

    // Wand-Vorschau (zeigt die tatsächlich entstehende Wand je nach Modus)
    if (mode === 'wall' && wallStart && mouseWorld) {
      const g = wallGeom(wallStart.x, wallStart.y, mouseWorld.x, mouseWorld.y);
      if (g) {
        const a = worldToScreen(vp, g.x1, g.y1);
        const b = worldToScreen(vp, g.x2, g.y2);
        ctx.strokeStyle = g.axis === 'x' ? 'rgba(29,78,216,0.55)' : 'rgba(185,28,28,0.55)';
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.stroke();
        ctx.setLineDash([]);
        // Im Center-Modus die Mitte markieren
        if (wallMode === 'center') {
          const c = worldToScreen(vp, wallStart.x, wallStart.y);
          ctx.fillStyle = '#0f766e';
          ctx.beginPath();
          ctx.arc(c.sx, c.sy, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
        // Endpunkt markieren
        ctx.fillStyle = '#1f2937';
        ctx.beginPath();
        ctx.arc(b.sx, b.sy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Tatsächliche Exzentrizität: M → S
    const Spt = worldToScreen(vp, result.x_S, result.y_S);
    const corner = worldToScreen(vp, result.x_S, result.y_M);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#eab308';
    ctx.beginPath();
    ctx.moveTo(M.sx, M.sy);
    ctx.lineTo(corner.sx, corner.sy);
    ctx.stroke();
    ctx.strokeStyle = '#16a34a';
    ctx.beginPath();
    ctx.moveTo(corner.sx, corner.sy);
    ctx.lineTo(Spt.sx, Spt.sy);
    ctx.stroke();

    // Steifigkeitszentrum S
    ctx.fillStyle = '#0f766e';
    ctx.beginPath();
    ctx.arc(Spt.sx, Spt.sy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#0f766e';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('S', Spt.sx + 9, Spt.sy + 4);
  }, [vp, localWalls, bx, by, mode, wallStart, mouseWorld, rectDrag, result, canvasSize, gridVisible, wallMode, wallGeom]);

  const getWorldFromEvent = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    return screenToWorld(vp, sx, sy);
  };

  const zoomAt = (sx: number, sy: number, factor: number) => {
    const before = screenToWorld(vp, sx, sy);
    const nextScale = Math.min(10000, Math.max(2, vp.scale * factor));
    const nextOx = sx - before.x * nextScale;
    const nextOy = sy + before.y * nextScale;
    setVp({ scale: nextScale, ox: nextOx, oy: nextOy });
  };

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    zoomAt(sx, sy, e.deltaY < 0 ? 1.12 : 1 / 1.12);
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    if (e.button === 1) {
      e.preventDefault();
      panRef.current = { sx: e.clientX, sy: e.clientY, ox: vp.ox, oy: vp.oy };
      return;
    }
    if (e.button !== 0) return;
    const world = getWorldFromEvent(e);
    const sx = snap(world.x);
    const sy = snap(world.y);

    if (mode === 'rect') {
      setRectDrag({ x0: sx, y0: sy, x: sx, y: sy });
      return;
    }

    if (!wallStart) {
      setWallStart({ x: sx, y: sy });
      return;
    }
    const geom = wallGeom(wallStart.x, wallStart.y, snap(world.x), snap(world.y));
    if (!geom) {
      setWallStart(null);
      return;
    }
    const newWall: StiffnessWall = {
      id: `w${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ...geom,
      k: 1,
    };
    const updated = [...localWalls, newWall];
    persist(updated);
    setWallStart(null);
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    if (panRef.current) {
      const dxPx = e.clientX - panRef.current.sx;
      const dyPx = e.clientY - panRef.current.sy;
      setVp(v => ({ ...v, ox: panRef.current!.ox + dxPx, oy: panRef.current!.oy + dyPx }));
      return;
    }
    const world = getWorldFromEvent(e);
    setMouseWorld({ x: snap(world.x), y: snap(world.y) });
    if (rectDrag) {
      setRectDrag(r => (r ? { ...r, x: snap(world.x), y: snap(world.y) } : r));
    }
  };

  const onMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    if (e.button === 1) {
      panRef.current = null;
      return;
    }
    if (mode === 'rect' && rectDrag) {
      const width = Math.max(0.1, round2(Math.abs(rectDrag.x - rectDrag.x0)));
      const height = Math.max(0.1, round2(Math.abs(rectDrag.y - rectDrag.y0)));
      const updatedData = { ...data, b_x: String(width), b_y: String(height) };
      persist(localWalls);
      setRectDrag(null);
    }
  };

  const onMouseLeave = () => {
    panRef.current = null;
    setMouseWorld(null);
    if (rectDrag) setRectDrag(null);
  };

  const updateWallK = (wallId: string, k: number) => {
    const updated = localWalls.map(w => (w.id === wallId ? { ...w, k: Number.isFinite(k) ? k : 0 } : w));
    persist(updated);
  };

  const deleteWall = (wallId: string) => {
    const updated = localWalls.filter(w => w.id !== wallId);
    persist(updated);
  };

  // Aktuelles Layout (Grundriss + Wände) als Standard merken
  const saveAsStandard = () => {
    let params: Partial<StiffnesscenterData> = {};
    try { params = JSON.parse(savedState)?.params ?? {}; } catch {}
    const payload = JSON.stringify({ params: { ...savedParams, ...params }, walls: localWalls });
    try { localStorage.setItem(STD_KEY, payload); } catch {}
    setStdSaved(true);
    setTimeout(() => setStdSaved(false), 1500);
  };

  // Gemerkten Standard wieder laden
  const loadStandard = () => {
    let payload: string | null = null;
    try { payload = localStorage.getItem(STD_KEY); } catch {}
    if (payload) {
      onStateChange(payload);
      setWallStart(null);
      setMouseWorld(null);
    }
  };

  // Reset: löscht alles (Wände + zurück auf Grundeinstellung)
  const resetAll = () => {
    onStateChange(JSON.stringify({ params: {}, walls: [] }));
    setWallStart(null);
    setMouseWorld(null);
  };

  const onSplitterDown = (e: React.MouseEvent) => {
    e.preventDefault();
    splitRef.current = { startX: e.clientX, startW: rightWidth };
    const onMove = (ev: MouseEvent) => {
      if (!splitRef.current) return;
      const delta = splitRef.current.startX - ev.clientX;
      const next = Math.min(600, Math.max(160, splitRef.current.startW + delta));
      setRightWidth(next);
    };
    const onUp = () => {
      splitRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const onBottomSplitterDown = (e: React.MouseEvent) => {
    e.preventDefault();
    vSplitRef.current = { startY: e.clientY, startH: bottomHeight };
    const onMove = (ev: MouseEvent) => {
      if (!vSplitRef.current) return;
      const delta = vSplitRef.current.startY - ev.clientY;
      const next = Math.min(400, Math.max(60, vSplitRef.current.startH + delta));
      setBottomHeight(next);
    };
    const onUp = () => {
      vSplitRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const btnStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 12,
    padding: '6px 12px',
    borderRadius: 4,
    border: `1px solid ${active ? '#0284c7' : '#d1d5db'}`,
    background: active ? '#0284c7' : '#fff',
    color: active ? '#fff' : '#374151',
    cursor: readOnly ? 'not-allowed' : 'pointer',
    fontWeight: 700,
    opacity: readOnly ? 0.6 : 1,
  });

  // Live-Länge der aktuell gezeichneten Wand (für Anzeige oben)
  const fmtLen = (v: number) => v.toFixed(3).replace(/\.?0+$/, '');
  let previewLen: number | null = null;
  if (mode === 'wall' && wallStart && mouseWorld) {
    const g = wallGeom(wallStart.x, wallStart.y, mouseWorld.x, mouseWorld.y);
    if (g) previewLen = Math.hypot(g.x2 - g.x1, g.y2 - g.y1);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%', minHeight: 0 }}>
      {/* HAUPTBEREICH: Canvas + Splitter + Angaben */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'stretch', flex: 1, minHeight: 0 }}>
      {/* LINKS: Canvas + Werkzeuge */}
      <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button className="nodrag" style={btnStyle(wallMode === 'edge')} disabled={readOnly} onClick={() => { setWallMode('edge'); setMode('wall'); setWallStart(null); }} title="Erster Klick = ein Rand, zweiter Klick = anderer Rand">
              ↔ Rand → Rand
            </button>
            <button className="nodrag" style={btnStyle(wallMode === 'center')} disabled={readOnly} onClick={() => { setWallMode('center'); setMode('wall'); setWallStart(null); }} title="Erster Klick = Mitte, zweiter Klick = Rand (Radius)">
              ⊙ Mitte → Rand
            </button>
            {previewLen != null && (
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#0f172a',
                background: '#fef9c3',
                border: '1px solid #fde047',
                borderRadius: 4,
                padding: '5px 10px',
                whiteSpace: 'nowrap',
              }}>
                L = {fmtLen(previewLen)} m{wallMode === 'center' ? `  ·  r = ${fmtLen(previewLen / 2)}` : ''}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="nodrag" style={btnStyle(stdSaved)} disabled={readOnly} onClick={saveAsStandard} title="Aktuelles Layout (Grundriss + Wände) als Standard merken">
              {stdSaved ? '✓ Gemerkt' : '⭐ Als Standard'}
            </button>
            <button className="nodrag" style={btnStyle(false)} disabled={readOnly} onClick={loadStandard} title="Gemerkten Standard laden">
              ⟲ Standard
            </button>
            <button
              className="nodrag"
              disabled={readOnly}
              onClick={resetAll}
              title="Alles löschen (Wände + Grundriss zurücksetzen)"
              style={{ ...btnStyle(false), borderColor: '#dc2626', color: '#dc2626' }}
            >
              🗑 Reset
            </button>
            <button className="nodrag" style={btnStyle(false)} onClick={() => zoomAt(canvasSize.w / 2, canvasSize.h / 2, 1.2)}>＋</button>
            <button className="nodrag" style={btnStyle(false)} onClick={() => zoomAt(canvasSize.w / 2, canvasSize.h / 2, 1 / 1.2)}>－</button>
            <button className="nodrag" style={btnStyle(gridVisible)} onClick={() => setGridVisible(!gridVisible)}>
              {gridVisible ? '▦ Gitter' : '▢ Gitter'}
            </button>
            <button className="nodrag" style={btnStyle(false)} disabled={readOnly} onClick={() => setVp(fitViewport(canvasSize.w, canvasSize.h, bx, by))}>
              ⤢ Zentrieren
            </button>
          </div>
        </div>

        <div ref={containerRef} style={{ width: '100%', flex: 1, minHeight: 0 }}>
          <canvas
            ref={canvasRef}
            width={canvasSize.w}
            height={canvasSize.h}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              border: '1px solid #cbd5e1',
              borderRadius: 4,
              cursor: readOnly ? 'default' : mode === 'wall' ? 'crosshair' : 'cell',
              background: '#fff',
            }}
            onWheel={onWheel}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            onContextMenu={e => e.preventDefault()}
          />
        </div>

        <div style={{ fontSize: 9, color: '#6b7280' }}>
          {readOnly ? (
            '📖 Ansichtsmodus (keine Änderungen möglich)'
          ) : (
            <>Mausrad = Zoom · mittlere Maustaste ziehen = Verschieben · ESC = Abbrechen · {wallMode === 'center' ? '1. Klick = Mitte, 2. Klick = Rand (Radius)' : '1. Klick = Wandanfang, 2. Klick = Wandende'}</>
          )}
        </div>
      </div>

      {/* SPLITTER */}
      <div
        onMouseDown={onSplitterDown}
        title="Ziehen um Breite anzupassen"
        style={{
          width: 8,
          flexShrink: 0,
          cursor: 'col-resize',
          background: '#e5e7eb',
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ width: 2, height: 32, background: '#94a3b8', borderRadius: 2 }} />
      </div>

      {/* RECHTS: Angaben + Wand-Tabelle */}
      <div style={{ width: rightWidth, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', minHeight: 0 }}>
        <div style={{ padding: 10, background: '#f8fafc', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0284c7' }}>Angaben</div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              Breite b_x [m]
            </label>
            <input
              className="nodrag"
              type="number"
              step="0.1"
              disabled={readOnly}
              value={currentData.b_x ?? ''}
              onChange={e => onDataChange?.({ b_x: e.target.value })}
              style={{ width: '100%', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 3, padding: '6px 8px', opacity: readOnly ? 0.6 : 1, boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              Breite b_y [m]
            </label>
            <input
              className="nodrag"
              type="number"
              step="0.1"
              disabled={readOnly}
              value={currentData.b_y ?? ''}
              onChange={e => onDataChange?.({ b_y: e.target.value })}
              style={{ width: '100%', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 3, padding: '6px 8px', opacity: readOnly ? 0.6 : 1, boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              Verfahren
            </label>
            <select
              className="nodrag"
              disabled={readOnly}
              value={currentData.method || 'EKV'}
              onChange={e => onDataChange?.({ method: e.target.value as 'EKV' | 'ASV' })}
              style={{ width: '100%', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 3, padding: '6px 8px', opacity: readOnly ? 0.6 : 1, boxSizing: 'border-box' }}
            >
              <option value="EKV">EKV</option>
              <option value="ASV">ASV</option>
            </select>
          </div>
        </div>

        {/* Wand-Tabelle */}
        {localWalls.length > 0 && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0284c7', marginBottom: 4 }}>Wände ({localWalls.length})</div>
            <div style={{ overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 4 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                  <th style={{ padding: '4px 6px' }}>ID</th>
                  <th style={{ padding: '4px 6px' }}>Achse</th>
                  <th style={{ padding: '4px 6px' }}>Koordinaten [m]</th>
                  <th style={{ padding: '4px 6px' }}>Hebelarm [m]</th>
                  <th style={{ padding: '4px 6px' }}>k</th>
                  {!readOnly && <th style={{ padding: '4px 6px' }} />}
                </tr>
              </thead>
              <tbody>
                {localWalls.map((w, wi) => {
                  const lever = w.axis === 'x' ? w.y1 : w.x1;
                  return (
                    <tr key={w.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '4px 6px' }}>{wi + 1}</td>
                      <td style={{ padding: '4px 6px', color: w.axis === 'x' ? '#1d4ed8' : '#b91c1c', fontWeight: 700 }}>
                        {w.axis === 'x' ? 'k_x' : 'k_y'}
                      </td>
                      <td style={{ padding: '4px 6px', whiteSpace: 'nowrap', fontSize: 8 }}>
                        ({round2(w.x1)}, {round2(w.y1)}) → ({round2(w.x2)}, {round2(w.y2)})
                      </td>
                      <td style={{ padding: '4px 6px' }}>{round2(lever)}</td>
                      <td style={{ padding: '4px 6px', width: 60 }}>
                        <input
                          className="nodrag"
                          type="number"
                          step="0.1"
                          min="0"
                          defaultValue={w.k}
                          disabled={readOnly}
                          onChange={e => updateWallK(w.id, parseFloat(e.target.value))}
                          style={{
                            width: 56,
                            fontSize: 9,
                            border: '1px solid #d1d5db',
                            borderRadius: 2,
                            padding: '2px 4px',
                            opacity: readOnly ? 0.6 : 1,
                          }}
                        />
                      </td>
                      {!readOnly && (
                        <td style={{ padding: '4px 6px' }}>
                          <button
                            className="nodrag"
                            onClick={() => deleteWall(w.id)}
                            title="Wand löschen"
                            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 11 }}
                          >
                            🗑️
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
      </div>

      {/* HORIZONTALER SPLITTER */}
      <div
        onMouseDown={onBottomSplitterDown}
        title="Ziehen um Höhe anzupassen"
        style={{
          height: 8,
          flexShrink: 0,
          cursor: 'row-resize',
          background: '#e5e7eb',
          borderRadius: 4,
          margin: '6px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ height: 2, width: 32, background: '#94a3b8', borderRadius: 2 }} />
      </div>

      {/* UNTEN: Berechnungen der Variablen */}
      <div style={{ height: bottomHeight, flexShrink: 0, overflowY: 'auto', background: '#f8fafc', borderRadius: 6, padding: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0284c7', marginBottom: 8 }}>Berechnung ({currentData.method || 'EKV'})</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
          <ResultCard label="Massenmittelpunkt M" value={`(${round2(result.x_M)} | ${round2(result.y_M)}) m`} />
          <ResultCard label="Steifigkeitszentrum S" value={`(${round2(result.x_S)} | ${round2(result.y_S)}) m`} color="#0f766e" />
          <ResultCard label="Exzentrizität e_x" value={`${round2(result.e_x)} m`} />
          <ResultCard label="Exzentrizität e_y" value={`${round2(result.e_y)} m`} />
          <ResultCard label="e_d,x,sup / inf" value={`${round2(result.e_d_x_sup)} / ${round2(result.e_d_x_inf)} m`} color="#b45309" />
          <ResultCard label="e_d,y,sup / inf" value={`${round2(result.e_d_y_sup)} / ${round2(result.e_d_y_inf)} m`} color="#6d28d9" />
          <ResultCard label="Σ k_x" value={`${round2((result as any).sum_k_x ?? 0)}`} />
          <ResultCard label="Σ k_y" value={`${round2((result as any).sum_k_y ?? 0)}`} />
        </div>
      </div>
    </div>
  );
}

function ResultCard({ label, value, color = '#1f2937' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 5, padding: '6px 9px' }}>
      <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
