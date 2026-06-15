import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Verification } from '../types';
import MathDisplay from './MathDisplay';
import { nameToLatex } from '../utils/formatName';
import { getGraph } from '../utils/legacyToGraph';
import { evalGraph, topoSort, collectTableRefs, DbTableData } from '../utils/evalGraph';
import { formatNumber, substituteValues } from '../utils/substituteFormula';
import { substituteLatexValues } from '../utils/evalGraphShared';
import { evalCondExpr } from '../utils/evalFormula';
import { latexCondToJs, latexToJs } from '../utils/latexToJs';
import { validateGraph } from '../utils/validateGraph';
import { api } from '../api';
import { useStore } from '../store/useStore';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { computeBeam, BeamLoad, SupportKind } from '../utils/beamAnalysis';
import { computeSection, CSShape, ShapeKind } from '../utils/sectionAnalysis';
import { GraphNode, VerificationGraph } from '../types/graph';

const CHART_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2'];

function interpolateY(data: [number, number][], x: number): number | undefined {
  if (!data.length) return undefined;
  for (let i = 0; i < data.length - 1; i++) {
    const [x0, y0] = data[i], [x1, y1] = data[i + 1];
    if (x >= x0 && x <= x1) return x0 === x1 ? y0 : y0 + (y1 - y0) * (x - x0) / (x1 - x0);
  }
  if (x === data[data.length - 1][0]) return data[data.length - 1][1];
  return undefined;
}

function ChartLookupModal({ chartJson, xAxisLabel, yAxisLabel, xUnit, currentX, direction, onClose }: {
  chartJson: any; xAxisLabel: string; yAxisLabel: string; xUnit: string;
  currentX: number; direction: 'x_to_y' | 'y_to_x'; onClose: () => void;
}) {
  const [hoverX, setHoverX] = useState<number | null>(null);
  const activeX = hoverX ?? currentX;
  const series: { name: string; data: [number, number][] }[] = chartJson?.series ?? [];

  const origX = Array.from(new Set(series.flatMap(s => s.data.map(d => d[0])))).sort((a, b) => a - b);
  const xMin = origX[0] ?? 0, xMax = origX[origX.length - 1] ?? 1;
  const range = xMax - xMin;
  const step = range <= 200 ? 1 : Math.ceil(range / 200);
  const denseX: number[] = [];
  for (let x = xMin; x <= xMax + 1e-9; x = Math.round((x + step) * 1e9) / 1e9) denseX.push(x);
  const allX = Array.from(new Set([...denseX, ...origX])).sort((a, b) => a - b);
  const chartData = allX.map(x => {
    const pt: Record<string, number> = { x };
    series.forEach((s, i) => { const y = interpolateY(s.data, x); if (y !== undefined) pt[`s${i}`] = Math.round(y * 10000) / 10000; });
    return pt;
  });

  const xLabel = xUnit ? `${xAxisLabel} [${xUnit}]` : xAxisLabel;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 720, maxWidth: '95vw', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>📉 Diagramm</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af' }}>×</button>
        </div>

        {/* Aktuelle Werte */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12, padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #a7f3d0' }}>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            {direction === 'x_to_y' ? xAxisLabel : yAxisLabel}: <strong style={{ color: '#047857' }}>{isFinite(activeX) ? Math.round(activeX * 1000) / 1000 : '–'}</strong>
            {xUnit && <span style={{ marginLeft: 3, color: '#9ca3af' }}>{xUnit}</span>}
          </div>
          {series.map((s, i) => {
            const y = isFinite(activeX) ? interpolateY(s.data, activeX) : undefined;
            return (
              <div key={i} style={{ fontSize: 12, color: '#6b7280' }}>
                <span style={{ color: CHART_COLORS[i % CHART_COLORS.length], fontWeight: 600 }}>{s.name}</span>
                {': '}
                <strong>{y !== undefined ? Math.round(y * 10000) / 10000 : '–'}</strong>
              </div>
            );
          })}
        </div>

        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 40, left: 16 }}
            onMouseMove={(e: any) => { if (e?.activeLabel != null) setHoverX(Number(e.activeLabel)); }}
            onMouseLeave={() => setHoverX(null)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="x" tick={{ fontSize: 11 }}
              label={{ value: xLabel, position: 'insideBottom', offset: -28, fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={48}
              label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', offset: 12, fontSize: 11 }} />
            <Tooltip contentStyle={{ fontSize: 11 }}
              formatter={(v: any, name: any) => [v, name]}
              labelFormatter={(x: any) => `${xAxisLabel}: ${x}${xUnit ? ` ${xUnit}` : ''}`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {isFinite(activeX) && (
              <ReferenceLine x={activeX} stroke={hoverX !== null ? '#6b7280' : '#059669'}
                strokeWidth={hoverX !== null ? 1 : 2} strokeDasharray={hoverX !== null ? '4 3' : undefined}
                label={{ value: String(Math.round(activeX * 100) / 100), position: 'top', fontSize: 10, fill: hoverX !== null ? '#6b7280' : '#047857' }} />
            )}
            {series.map((s, i) => (
              <Line key={i} type="linear" dataKey={`s${i}`} name={s.name}
                stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Store-Verification → vom Legacy-Adapter erwartete Form
function toLegacyShape(v: Verification) {
  return {
    id: v.id, title: v.title,
    formula_latex: v.formula?.latex || '',
    formula_description: v.formula?.description || '',
    compute_expr: v.computeExpr || '',
    graph_json: v.graph_json || null,
    variables: (v.variables || []).map((x: any) => ({
      name: x.name, label: x.label, unit: x.unit, type: x.type,
      default_value: String(x.value ?? ''),
      options: (x.options || []).map((o: any) => ({ label: o.label, value: String(o.value) })),
      table_ref: x.table_ref ?? null,
      table_col: x.table_col ?? null,
    })),
  };
}

const lbl: React.CSSProperties = { fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 };
const card: React.CSSProperties = { border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 10px', marginBottom: 6, background: '#fff' };

// ── Träger-Rechner (interaktive Eingabe + M/Q/N-Verlauf) ───────────────────────

interface LocalBeamState {
  L: number;
  left: SupportKind;
  right: SupportKind;
  loads: BeamLoad[];
}

const SUPPORT_LABELS: Record<SupportKind, string> = {
  pin: '△ Gelenk', roller: '○ Rolle', fixed: '▐ Einspannung', free: '— Frei',
};

function BeamSketchSVG({ L, left, right, loads }: LocalBeamState) {
  const W = 500, beamY = 80, beamH = 12, marginX = 60;
  const x0 = marginX, x1 = W - marginX, bLen = x1 - x0;

  function support(x: number, type: SupportKind, side: 'left' | 'right') {
    if (type === 'free') return null;
    const s = 16;
    const els: React.ReactNode[] = [];
    if (type === 'pin' || type === 'roller') {
      els.push(<polygon key="t" points={`${x},${beamY + beamH} ${x - s},${beamY + beamH + s * 1.2} ${x + s},${beamY + beamH + s * 1.2}`} fill="#374151" />);
      if (type === 'roller') {
        els.push(<circle key="c" cx={x} cy={beamY + beamH + s * 1.2 + 7} r={5} fill="none" stroke="#374151" strokeWidth={2} />);
        els.push(<line key="g" x1={x - 18} y1={beamY + beamH + s * 1.2 + 14} x2={x + 18} y2={beamY + beamH + s * 1.2 + 14} stroke="#374151" strokeWidth={2} />);
      } else {
        els.push(<line key="g" x1={x - 18} y1={beamY + beamH + s * 1.2} x2={x + 18} y2={beamY + beamH + s * 1.2} stroke="#374151" strokeWidth={2} />);
        for (let i = -3; i <= 3; i++) els.push(<line key={`h${i}`} x1={x + i * 7 - 3} y1={beamY + beamH + s * 1.2} x2={x + i * 7 - 9} y2={beamY + beamH + s * 1.2 + 8} stroke="#374151" strokeWidth={1.2} />);
      }
    } else {
      const d = side === 'left' ? -1 : 1;
      els.push(<rect key="w" x={x + d * 2} y={beamY - 24} width={14} height={beamH + 48} fill="#374151" />);
      for (let i = 0; i < 5; i++) {
        const y = beamY - 20 + i * 14;
        els.push(<line key={`h${i}`} x1={x + d * 16} y1={y} x2={x + d * 24} y2={y + 8} stroke="#374151" strokeWidth={1.2} />);
      }
    }
    return <g key={`sup-${side}`}>{els}</g>;
  }

  const loadEls: React.ReactNode[] = [];
  loads.forEach((ld, li) => {
    const downward = ld.dir === 1;
    const color = ld.kind === 'uniform' ? (downward ? '#dc2626' : '#2563eb') : (downward ? '#7c3aed' : '#0891b2');
    const aH = 30, ah = 6;
    const aY0 = downward ? beamY - 4 : beamY + beamH + 4;
    const aY1 = aY0 - (downward ? aH : -aH);
    const label = `${ld.value} ${ld.kind === 'uniform' ? 'kN/m' : 'kN'}`;

    if (ld.kind === 'uniform') {
      const xa = x0 + (ld.pos / L) * bLen;
      const xb = x0 + (Math.min(ld.pos2 ?? L, L) / L) * bLen;
      for (let i = 0; i <= 6; i++) {
        const ax = xa + (xb - xa) * i / 6;
        loadEls.push(
          <line key={`ua${li}${i}`} x1={ax} y1={aY1} x2={ax} y2={aY0} stroke={color} strokeWidth={1.5} />,
          <polygon key={`uh${li}${i}`} points={`${ax},${aY0} ${ax - ah / 2},${aY0 - (downward ? ah : -ah)} ${ax + ah / 2},${aY0 - (downward ? ah : -ah)}`} fill={color} />,
        );
      }
      loadEls.push(<line key={`ul${li}`} x1={xa} y1={aY1} x2={xb} y2={aY1} stroke={color} strokeWidth={2} />);
      loadEls.push(<text key={`ut${li}`} x={(xa + xb) / 2} y={aY1 - (downward ? 7 : -7)} textAnchor="middle" fontSize={10} fill={color} fontWeight="600">{label}</text>);
    } else {
      const px = x0 + (ld.pos / L) * bLen;
      loadEls.push(
        <line key={`pa${li}`} x1={px} y1={aY1} x2={px} y2={aY0} stroke={color} strokeWidth={2} />,
        <polygon key={`ph${li}`} points={`${px},${aY0} ${px - ah},${aY0 - (downward ? ah * 1.5 : -ah * 1.5)} ${px + ah},${aY0 - (downward ? ah * 1.5 : -ah * 1.5)}`} fill={color} />,
        <text key={`pt${li}`} x={px} y={aY1 - (downward ? 7 : -7)} textAnchor="middle" fontSize={10} fill={color} fontWeight="600">{label}</text>,
      );
    }
  });

  const dimY = beamY + beamH + 50;
  return (
    <svg viewBox={`0 0 ${W} 160`} style={{ width: '100%', maxHeight: 160, overflow: 'visible' }}>
      {loadEls}
      <rect x={x0} y={beamY} width={bLen} height={beamH} fill="#374151" rx={2} />
      {support(x0, left, 'left')}
      {support(x1, right, 'right')}
      <line x1={x0} y1={dimY} x2={x1} y2={dimY} stroke="#6b7280" strokeWidth={1.5} />
      <line x1={x0} y1={dimY - 4} x2={x0} y2={dimY + 4} stroke="#6b7280" strokeWidth={1.5} />
      <line x1={x1} y1={dimY - 4} x2={x1} y2={dimY + 4} stroke="#6b7280" strokeWidth={1.5} />
      <polygon points={`${x0 + 8},${dimY} ${x0 + 16},${dimY - 3} ${x0 + 16},${dimY + 3}`} fill="#6b7280" />
      <polygon points={`${x1 - 8},${dimY} ${x1 - 16},${dimY - 3} ${x1 - 16},${dimY + 3}`} fill="#6b7280" />
      <text x={(x0 + x1) / 2} y={dimY + 13} textAnchor="middle" fontSize={11} fill="#374151" fontWeight="700">L = {L} m</text>
    </svg>
  );
}

function DiagramSVG({ x, y, label, color, unit }: { x: number[]; y: number[]; label: string; color: string; unit: string }) {
  const W = 500, H = 100, padX = 50, padY = 12;
  const iW = W - padX * 2, iH = H - padY * 2;
  if (!x.length) return null;

  const ymax = Math.max(...y.map(Math.abs), 0.001);
  const yMin = Math.min(...y);
  const yMax = Math.max(...y);
  const xMax = x[x.length - 1];

  // Mapping helpers
  const px = (xi: number) => padX + (xi / xMax) * iW;
  const py = (yi: number) => padY + iH / 2 - (yi / ymax) * (iH / 2 - 4);

  // Build SVG path (filled)
  const baseline = py(0);
  let pathPos = `M ${px(x[0])},${baseline}`;
  let pathNeg = `M ${px(x[0])},${baseline}`;
  for (let i = 0; i < x.length; i++) {
    pathPos += ` L ${px(x[i])},${py(y[i])}`;
    pathNeg += ` L ${px(x[i])},${py(y[i])}`;
  }
  pathPos += ` L ${px(xMax)},${baseline} Z`;
  pathNeg += ` L ${px(xMax)},${baseline} Z`;

  // Extreme value positions
  const iMax = y.indexOf(yMax);
  const iMin = y.indexOf(yMin);

  const fmt = (v: number) => Math.abs(v) < 0.001 ? '0' : v.toFixed(2);

  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 2 }}>{label}</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxHeight: H, display: 'block' }}>
        {/* Nulllinie */}
        <line x1={padX} y1={baseline} x2={W - padX} y2={baseline} stroke="#9ca3af" strokeWidth={1} strokeDasharray="4 3" />
        {/* Y-Achse */}
        <line x1={padX} y1={padY} x2={padX} y2={H - padY} stroke="#d1d5db" strokeWidth={1} />

        {/* Positive Fläche (oben) */}
        <clipPath id={`cp-${label}-pos`}><rect x={padX} y={padY} width={iW} height={iH / 2} /></clipPath>
        <path d={pathPos} fill={color} fillOpacity={0.18} stroke="none" clipPath={`url(#cp-${label}-pos)`} />

        {/* Negative Fläche (unten) */}
        <clipPath id={`cp-${label}-neg`}><rect x={padX} y={padY + iH / 2} width={iW} height={iH / 2} /></clipPath>
        <path d={pathNeg} fill={color} fillOpacity={0.18} stroke="none" clipPath={`url(#cp-${label}-neg)`} />

        {/* Linie */}
        <polyline
          points={x.map((xi, i) => `${px(xi)},${py(y[i])}`).join(' ')}
          fill="none" stroke={color} strokeWidth={2}
        />

        {/* Extremwert-Marker */}
        {yMax !== 0 && (
          <>
            <circle cx={px(x[iMax])} cy={py(yMax)} r={3} fill={color} />
            <text x={px(x[iMax])} y={py(yMax) - 5} textAnchor="middle" fontSize={9} fill={color} fontWeight="700">
              {fmt(yMax)} {unit}
            </text>
          </>
        )}
        {yMin !== 0 && iMin !== iMax && (
          <>
            <circle cx={px(x[iMin])} cy={py(yMin)} r={3} fill={color} />
            <text x={px(x[iMin])} y={py(yMin) + 12} textAnchor="middle" fontSize={9} fill={color} fontWeight="700">
              {fmt(yMin)} {unit}
            </text>
          </>
        )}

        {/* Achsenbeschriftung */}
        <text x={W - padX + 4} y={baseline + 4} fontSize={9} fill="#6b7280">x [m]</text>
        <text x={padX - 4} y={padY + 5} textAnchor="end" fontSize={9} fill="#6b7280">+</text>
        <text x={padX - 4} y={H - padY} textAnchor="end" fontSize={9} fill="#6b7280">−</text>
      </svg>
    </div>
  );
}

// ─── Querschnitt-Kalkulator ───────────────────────────────────────────────────
const SHAPE_LABEL_MAP: Record<ShapeKind, string> = {
  rect: 'Rechteck',
  circle: 'Kreis',
  hollow_rect: 'Hohlrechteck',
  hollow_circle: 'Hohlkreis',
  triangle: 'Dreieck (rechtwinklig)',
};

function newShape(kind: ShapeKind): CSShape {
  const id = Math.random().toString(36).slice(2, 7);
  const defaults: Record<ShapeKind, Partial<CSShape>> = {
    rect:          { b: 100, h: 200, bi: 0,   hi: 0,   di: 0 },
    circle:        { b: 100, h: 0,   bi: 0,   hi: 0,   di: 0 },
    hollow_rect:   { b: 200, h: 300, bi: 160, hi: 260, di: 0 },
    hollow_circle: { b: 200, h: 0,   bi: 0,   hi: 0,   di: 100 },
    triangle:      { b: 150, h: 200, bi: 0,   hi: 0,   di: 0 },
  };
  return { id, kind, label: SHAPE_LABEL_MAP[kind], cx: 0, cy: 0, subtract: false, ...defaults[kind] } as CSShape;
}

function SectionSVG({ shapes, cyS, cxS }: { shapes: CSShape[]; cyS: number; cxS: number }) {
  if (!shapes.length) return <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>Keine Formen</div>;

  // bounding box including origin (0,0)
  const ys: number[] = [0];
  shapes.forEach(s => {
    const hh = s.kind === 'triangle' ? s.h : (s.h / 2 || s.b / 2);
    ys.push(s.cy - hh, s.cy + (s.kind === 'triangle' ? 0 : hh));
  });
  const xs2: number[] = [0, ...shapes.flatMap(s => [s.cx - s.b / 2, s.cx + s.b / 2])];
  const x0 = Math.min(...xs2), x1 = Math.max(...xs2);
  const y0 = Math.min(...ys), y1 = Math.max(...ys);

  // extra margin for axis arrows and labels
  const W = 300, H = 220, padL = 30, padB = 30, padR = 24, padT = 20;
  const drawW = W - padL - padR;
  const drawH = H - padB - padT;
  const scaleX = (x1 - x0 === 0) ? 1 : drawW / (x1 - x0);
  const scaleY = (y1 - y0 === 0) ? 1 : drawH / (y1 - y0);
  const scale = Math.min(scaleX, scaleY);

  // center the geometry within the draw area
  const geoW = (x1 - x0) * scale;
  const geoH = (y1 - y0) * scale;
  const offX = padL + (drawW - geoW) / 2;
  const offY = padT + (drawH - geoH) / 2;

  const tx = (x: number) => offX + (x - x0) * scale;
  const ty = (y: number) => offY + geoH - (y - y0) * scale;

  // origin in SVG coords
  const ox = tx(0), oy = ty(0);
  // axis endpoints
  const axXEnd = W - 8, axYEnd = 8;
  const arrSize = 5;

  const shapeEl = (s: CSShape, i: number) => {
    const fill = s.subtract ? '#fee2e2' : '#dbeafe';
    const stroke = s.subtract ? '#ef4444' : '#2563eb';
    if (s.kind === 'rect' || s.kind === 'hollow_rect') {
      const bw = s.b * scale, bh = s.h * scale;
      const rx = tx(s.cx - s.b / 2), ry = ty(s.cy + s.h / 2);
      if (s.kind === 'hollow_rect') {
        const iw = s.bi * scale, ih = s.hi * scale;
        const rix = tx(s.cx - s.bi / 2), riy = ty(s.cy + s.hi / 2);
        return (
          <g key={i}>
            <rect x={rx} y={ry} width={bw} height={bh} fill={fill} stroke={stroke} strokeWidth={1} />
            <rect x={rix} y={riy} width={iw} height={ih} fill="#fff" stroke={stroke} strokeWidth={1} strokeDasharray="3 2" />
          </g>
        );
      }
      return <rect key={i} x={rx} y={ry} width={bw} height={bh} fill={fill} stroke={stroke} strokeWidth={1} />;
    }
    if (s.kind === 'circle') {
      const r = s.b / 2 * scale;
      return <circle key={i} cx={tx(s.cx)} cy={ty(s.cy)} r={r} fill={fill} stroke={stroke} strokeWidth={1} />;
    }
    if (s.kind === 'hollow_circle') {
      const ra = s.b / 2 * scale, ri = s.di / 2 * scale;
      return (
        <g key={i}>
          <circle cx={tx(s.cx)} cy={ty(s.cy)} r={ra} fill={fill} stroke={stroke} strokeWidth={1} />
          <circle cx={tx(s.cx)} cy={ty(s.cy)} r={ri} fill="#fff" stroke={stroke} strokeWidth={1} strokeDasharray="3 2" />
        </g>
      );
    }
    if (s.kind === 'triangle') {
      const x1t = tx(s.cx - s.b / 2), y1t = ty(s.cy);
      const x2t = tx(s.cx + s.b / 2), y2t = ty(s.cy);
      const x3t = tx(s.cx - s.b / 2), y3t = ty(s.cy + s.h);
      return <polygon key={i} points={`${x1t},${y1t} ${x2t},${y2t} ${x3t},${y3t}`} fill={fill} stroke={stroke} strokeWidth={1} />;
    }
    return null;
  };

  const scx = tx(cxS), scy = ty(cyS);

  return (
    <svg width={W} height={H} style={{ border: '1px solid #e5e7eb', borderRadius: 6, background: '#f9fafb', display: 'block' }}>
      {/* Koordinatensystem-Achsen */}
      {/* x-Achse */}
      <line x1={ox} y1={oy} x2={axXEnd} y2={oy} stroke="#374151" strokeWidth={1} markerEnd="url(#arr)" />
      {/* y-Achse */}
      <line x1={ox} y1={oy} x2={ox} y2={axYEnd} stroke="#374151" strokeWidth={1} markerEnd="url(#arr)" />
      {/* Pfeilspitzen-Definition */}
      <defs>
        <marker id="arr" markerWidth={arrSize} markerHeight={arrSize} refX={arrSize - 1} refY={arrSize / 2} orient="auto">
          <polygon points={`0 0, ${arrSize} ${arrSize / 2}, 0 ${arrSize}`} fill="#374151" />
        </marker>
      </defs>
      {/* Achsenbeschriftungen */}
      <text x={axXEnd - 2} y={oy - 5} fontSize={9} fill="#374151" textAnchor="middle">x</text>
      <text x={ox + 5} y={axYEnd + 4} fontSize={9} fill="#374151">y</text>
      {/* Nullpunkt O */}
      <circle cx={ox} cy={oy} r={2} fill="#374151" />
      <text x={ox - 9} y={oy + 9} fontSize={8} fill="#374151">O</text>

      {/* Querschnitt-Formen */}
      {shapes.map((s, i) => shapeEl(s, i))}

      {/* Schwerpunkt S */}
      {isFinite(scx) && isFinite(scy) && (
        <g>
          <line x1={scx - 8} y1={scy} x2={scx + 8} y2={scy} stroke="#dc2626" strokeWidth={1.5} />
          <line x1={scx} y1={scy - 8} x2={scx} y2={scy + 8} stroke="#dc2626" strokeWidth={1.5} />
          <circle cx={scx} cy={scy} r={2} fill="#dc2626" />
          <text x={scx + 5} y={scy - 5} fontSize={9} fill="#dc2626" fontWeight="bold">S</text>
        </g>
      )}
    </svg>
  );
}

function fmtE(v: number): string {
  if (!isFinite(v)) return '—';
  if (Math.abs(v) >= 1e7) return v.toExponential(3);
  return String(Math.round(v * 1000) / 1000);
}

function SectionCalcPanel({ label, savedShapes, onShapesChange }: {
  label: string;
  savedShapes?: string;
  onShapesChange?: (shapes: CSShape[]) => void;
}) {
  const initShapes = React.useMemo<CSShape[]>(() => {
    if (!savedShapes) return [newShape('rect')];
    try { return JSON.parse(savedShapes) as CSShape[]; } catch { return [newShape('rect')]; }
  }, []);

  const [shapes, setShapesRaw] = React.useState<CSShape[]>(initShapes);

  const setShapes = (fn: (prev: CSShape[]) => CSShape[]) =>
    setShapesRaw(prev => { const next = fn(prev); onShapesChange?.(next); return next; });

  const updateShape = (id: string, patch: Partial<CSShape>) =>
    setShapes(s => s.map(x => x.id === id ? { ...x, ...patch } : x));
  const removeShape = (id: string) => setShapes(s => s.filter(x => x.id !== id));
  const addShape = (kind: ShapeKind) => setShapes(s => [...s, newShape(kind)]);

  const res = React.useMemo(() => {
    try { return computeSection(shapes); } catch { return null; }
  }, [shapes]);

  const numF = (v: number, d = 2) => isFinite(v) ? String(Math.round(v * Math.pow(10, d)) / Math.pow(10, d)) : '—';

  const dimField = (id: string, field: keyof CSShape, lbl: string, shape: CSShape) => (
    <label key={field as string} style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11 }}>
      <span style={{ color: '#6b7280', fontSize: 10 }}>{lbl} [mm]</span>
      <input type="number" value={(shape[field] as number) ?? 0}
        onChange={e => updateShape(id, { [field]: parseFloat(e.target.value) || 0 })}
        style={{ width: 70, padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11 }}
      />
    </label>
  );

  const dims = (s: CSShape) => {
    switch (s.kind) {
      case 'rect':          return [dimField(s.id, 'b', 'b', s), dimField(s.id, 'h', 'h', s)];
      case 'circle':        return [dimField(s.id, 'b', 'D (⌀)', s)];
      case 'hollow_rect':   return [dimField(s.id, 'b', 'b', s), dimField(s.id, 'h', 'h', s), dimField(s.id, 'bi', 'b_i', s), dimField(s.id, 'hi', 'h_i', s)];
      case 'hollow_circle': return [dimField(s.id, 'b', 'D_a (⌀)', s), dimField(s.id, 'di', 'D_i (⌀)', s)];
      case 'triangle':      return [dimField(s.id, 'b', 'b', s), dimField(s.id, 'h', 'h', s)];
    }
  };

  const thCell: React.CSSProperties = { padding: '3px 8px', fontWeight: 600, fontSize: 10, color: '#374151', borderBottom: '1px solid #e5e7eb', background: '#f3f4f6', textAlign: 'right' };
  const tdCell: React.CSSProperties = { padding: '3px 8px', fontSize: 10, color: '#374151', borderBottom: '1px solid #f3f4f6', textAlign: 'right' };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 10 }}>⊕ {label || 'Querschnitt'}</div>

      {/* Form-Liste */}
      {shapes.map((s, i) => (
        <div key={s.id} style={{ border: '1px solid #e5e7eb', borderRadius: 6, marginBottom: 8, padding: '8px 10px', background: s.subtract ? '#fff1f2' : '#f9fafb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 12, color: '#374151' }}>#{i + 1}</span>
            <input value={s.label} onChange={e => updateShape(s.id, { label: e.target.value })}
              style={{ flex: 1, padding: '2px 6px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11 }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#dc2626' }}>
              <input type="checkbox" checked={s.subtract} onChange={e => updateShape(s.id, { subtract: e.target.checked })} /> Abzug
            </label>
            <button onClick={() => removeShape(s.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 14, padding: 2 }}>✕</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
            {dims(s)}
            {dimField(s.id, 'cx', 'x_S [mm]', s)}
            {dimField(s.id, 'cy', 'y_S [mm]', s)}
          </div>
        </div>
      ))}

      {/* Neue Form hinzufügen */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {(Object.keys(SHAPE_LABEL_MAP) as ShapeKind[]).map(k => (
          <button key={k} onClick={() => addShape(k)}
            style={{ padding: '3px 8px', fontSize: 10, border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
            + {SHAPE_LABEL_MAP[k]}
          </button>
        ))}
      </div>

      {/* SVG-Vorschau + Ergebnisse nebeneinander */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
        {res && <SectionSVG shapes={shapes} cyS={res.cyS} cxS={res.cxS} />}

        {res && (
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>Ergebnisse</div>
            <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
              <tbody>
                {[
                  ['A', numF(res.A, 1), 'mm²'],
                  ['x_S', numF(res.cxS, 2), 'mm'],
                  ['y_S', numF(res.cyS, 2), 'mm'],
                  ['I_y', numF(res.Iy, 0), 'mm⁴'],
                  ['I_z', numF(res.Iz, 0), 'mm⁴'],
                  ['W_y', numF(res.Wy, 1), 'mm³'],
                  ['W_z', numF(res.Wz, 1), 'mm³'],
                ].map(([n, v, u]) => (
                  <tr key={n as string}>
                    <td style={{ padding: '2px 8px 2px 0', fontWeight: 600, color: '#374151' }}><MathDisplay latex={n as string} /></td>
                    <td style={{ padding: '2px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{v}</td>
                    <td style={{ padding: '2px 0', color: '#6b7280', fontSize: 10 }}>{u}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Steiner-Tabelle I_y */}
      {res && res.shapes.length > 0 && (
        <div style={{ overflowX: 'auto', marginBottom: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 4, color: '#374151' }}>Steiner-Anteile — I<sub>y</sub></div>
          <table style={{ borderCollapse: 'collapse', fontSize: 10, width: '100%', minWidth: 520 }}>
            <thead>
              <tr>
                {['Form', 'A [mm²]', 'y_i [mm]', 'e_{y,i} [mm]', 'A·e²_{y,i} [mm⁴]', 'I_{y,i} [mm⁴]', 'I_{y,i}+Steiner [mm⁴]'].map(h => (
                  <th key={h} style={thCell}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {res.shapes.map((sr, i) => {
                const sign = sr.sign;
                const total_i = sign * (sr.Iy + sr.steinY);
                return (
                  <tr key={i} style={{ background: sign < 0 ? '#fff1f2' : undefined }}>
                    <td style={{ ...tdCell, textAlign: 'left' }}>{shapes[i]?.label || `#${i + 1}`}{sign < 0 ? ' (−)' : ''}</td>
                    <td style={tdCell}>{fmtE(sr.A)}</td>
                    <td style={tdCell}>{fmtE(sr.cy)}</td>
                    <td style={tdCell}>{fmtE(sr.ey)}</td>
                    <td style={tdCell}>{fmtE(sr.steinY)}</td>
                    <td style={tdCell}>{fmtE(sr.Iy)}</td>
                    <td style={{ ...tdCell, fontWeight: 600 }}>{fmtE(total_i)}</td>
                  </tr>
                );
              })}
              <tr style={{ background: '#f3f4f6' }}>
                <td style={{ ...tdCell, textAlign: 'left', fontWeight: 700 }}>Σ</td>
                <td style={{ ...tdCell, fontWeight: 700 }}>{fmtE(res.A)}</td>
                <td style={{ ...tdCell }}>—</td>
                <td style={{ ...tdCell }}>—</td>
                <td style={{ ...tdCell }}>—</td>
                <td style={{ ...tdCell }}>—</td>
                <td style={{ ...tdCell, fontWeight: 700 }}>{fmtE(res.Iy)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Steiner-Tabelle I_z */}
      {res && res.shapes.length > 0 && (
        <div style={{ overflowX: 'auto', marginBottom: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 4, color: '#374151' }}>Steiner-Anteile — I<sub>z</sub></div>
          <table style={{ borderCollapse: 'collapse', fontSize: 10, width: '100%', minWidth: 520 }}>
            <thead>
              <tr>
                {['Form', 'A [mm²]', 'x_i [mm]', 'e_{z,i} [mm]', 'A·e²_{z,i} [mm⁴]', 'I_{z,i} [mm⁴]', 'I_{z,i}+Steiner [mm⁴]'].map(h => (
                  <th key={h} style={thCell}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {res.shapes.map((sr, i) => {
                const sign = sr.sign;
                const total_i = sign * (sr.Iz + sr.steinZ);
                return (
                  <tr key={i} style={{ background: sign < 0 ? '#fff1f2' : undefined }}>
                    <td style={{ ...tdCell, textAlign: 'left' }}>{shapes[i]?.label || `#${i + 1}`}{sign < 0 ? ' (−)' : ''}</td>
                    <td style={tdCell}>{fmtE(sr.A)}</td>
                    <td style={tdCell}>{fmtE(sr.cx)}</td>
                    <td style={tdCell}>{fmtE(sr.ez)}</td>
                    <td style={tdCell}>{fmtE(sr.steinZ)}</td>
                    <td style={tdCell}>{fmtE(sr.Iz)}</td>
                    <td style={{ ...tdCell, fontWeight: 600 }}>{fmtE(total_i)}</td>
                  </tr>
                );
              })}
              <tr style={{ background: '#f3f4f6' }}>
                <td style={{ ...tdCell, textAlign: 'left', fontWeight: 700 }}>Σ</td>
                <td style={{ ...tdCell, fontWeight: 700 }}>{fmtE(res.A)}</td>
                <td style={{ ...tdCell }}>—</td>
                <td style={{ ...tdCell }}>—</td>
                <td style={{ ...tdCell }}>—</td>
                <td style={{ ...tdCell }}>—</td>
                <td style={{ ...tdCell, fontWeight: 700 }}>{fmtE(res.Iz)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Formel-Darstellung */}
      {res && (
        <div style={{ marginTop: 12, padding: '8px 12px', background: '#f5f3ff', borderRadius: 6, border: '1px solid #e9d5ff' }}>
          <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 6, color: '#6d28d9' }}>Berechnungsformeln (Steiner)</div>

          {/* Schwerpunkt y_S */}
          <MathDisplay latex={`y_S = \\dfrac{\\sum_i A_i \\cdot y_i}{\\sum_i A_i} = \\dfrac{${res.shapes.map(sr => `${fmtE(sr.A)} {\\cdot} ${fmtE(sr.cy)}`).join(' + ')}}{${fmtE(res.A)}} = ${fmtE(res.cyS)}\\;\\mathrm{mm}`} />

          {/* Schwerpunkt x_S */}
          <div style={{ marginTop: 6 }}>
            <MathDisplay latex={`x_S = \\dfrac{\\sum_i A_i \\cdot x_i}{\\sum_i A_i} = \\dfrac{${res.shapes.map(sr => `${fmtE(sr.A)} {\\cdot} ${fmtE(sr.cx)}`).join(' + ')}}{${fmtE(res.A)}} = ${fmtE(res.cxS)}\\;\\mathrm{mm}`} />
          </div>

          {/* I_y */}
          <div style={{ marginTop: 6 }}>
            <MathDisplay latex={`I_y = \\sum_i (I_{y,i} + A_i \\cdot e_{y,i}^2) = ${res.shapes.map(sr => `(${fmtE(sr.Iy)} + ${fmtE(sr.A)}{\\cdot}${fmtE(sr.ey)}^2)`).join(' + ')} = ${fmtE(res.Iy)}\\;\\mathrm{mm}^4`} />
          </div>

          {/* I_z */}
          <div style={{ marginTop: 6 }}>
            <MathDisplay latex={`I_z = \\sum_i (I_{z,i} + A_i \\cdot e_{z,i}^2) = ${res.shapes.map(sr => `(${fmtE(sr.Iz)} + ${fmtE(sr.A)}{\\cdot}${fmtE(sr.ez)}^2)`).join(' + ')} = ${fmtE(res.Iz)}\\;\\mathrm{mm}^4`} />
          </div>
        </div>
      )}
    </div>
  );
}

function BeamCalcPanel({ label }: { label: string }) {
  const [state, setState] = React.useState<LocalBeamState>({
    L: 5, left: 'pin', right: 'roller', loads: [],
  });

  const setS = (p: Partial<LocalBeamState>) => setState(prev => ({ ...prev, ...p }));

  const addLoad = (kind: BeamLoad['kind']) => {
    const id = 'ld' + Date.now();
    const newLoad: BeamLoad = kind === 'uniform'
      ? { id, kind, value: 10, pos: 0, pos2: state.L, dir: 1 }
      : { id, kind, value: 10, pos: state.L / 2, dir: 1 };
    setS({ loads: [...state.loads, newLoad] });
  };
  const updLoad = (idx: number, patch: Partial<BeamLoad>) => {
    const next = [...state.loads];
    next[idx] = { ...next[idx], ...patch };
    setS({ loads: next });
  };
  const removeLoad = (idx: number) => setS({ loads: state.loads.filter((_, i) => i !== idx) });

  const res = state.L > 0 && state.loads.length > 0
    ? computeBeam(state)
    : null;

  const inp: React.CSSProperties = { fontSize: 12, border: '1px solid #d1d5db', borderRadius: 4, padding: '3px 6px', width: '100%', boxSizing: 'border-box' };
  const selectS: React.CSSProperties = { ...inp, appearance: 'none', background: '#fff' };
  const SUPPORT_OPTS: SupportKind[] = ['pin', 'roller', 'fixed', 'free'];

  return (
    <div>
      {label && <div style={{ fontWeight: 700, fontSize: 13, color: '#14532d', marginBottom: 8 }}>{label}</div>}

      {/* Eingaben */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, marginBottom: 2 }}>Stützweite L [m]</div>
          <input style={inp} type="number" min={0.1} step={0.1} value={state.L} onChange={e => setS({ L: parseFloat(e.target.value) || 1 })} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, marginBottom: 2 }}>Auflager links</div>
          <select style={selectS} value={state.left} onChange={e => setS({ left: e.target.value as SupportKind })}>
            {SUPPORT_OPTS.map(s => <option key={s} value={s}>{SUPPORT_LABELS[s]}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, marginBottom: 2 }}>Auflager rechts</div>
          <select style={selectS} value={state.right} onChange={e => setS({ right: e.target.value as SupportKind })}>
            {SUPPORT_OPTS.map(s => <option key={s} value={s}>{SUPPORT_LABELS[s]}</option>)}
          </select>
        </div>
      </div>

      {/* Träger-Skizze */}
      <BeamSketchSVG {...state} />

      {/* Lastentabelle */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>Lasten</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => addLoad('uniform')} style={{ fontSize: 11, background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', color: '#92400e' }}>≡ Streckenlast</button>
            <button onClick={() => addLoad('point')} style={{ fontSize: 11, background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', color: '#5b21b6' }}>↓ Einzellast</button>
          </div>
        </div>
        {state.loads.map((ld, li) => (
          <div key={ld.id} style={{ display: 'grid', gridTemplateColumns: ld.kind === 'uniform' ? '1fr 0.7fr 0.7fr 0.7fr 0.7fr auto' : '1fr 0.7fr 0.7fr 0.7fr auto', gap: 4, marginBottom: 4, background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 4, padding: '4px 6px', alignItems: 'center', fontSize: 11 }}>
            <span style={{ color: '#6b7280', fontSize: 10, fontWeight: 600 }}>{ld.kind === 'uniform' ? '≡ Streckenlast' : '↓ Einzellast'}</span>
            <div>
              <div style={{ fontSize: 9, color: '#9ca3af' }}>Wert [kN{ld.kind === 'uniform' ? '/m' : ''}]</div>
              <input style={{ ...inp, fontSize: 11 }} type="number" step={0.5} value={ld.value} onChange={e => updLoad(li, { value: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <div style={{ fontSize: 9, color: '#9ca3af' }}>Richtung</div>
              <select style={{ ...selectS, fontSize: 11 }} value={ld.dir} onChange={e => updLoad(li, { dir: parseInt(e.target.value) as 1 | -1 })}>
                <option value={1}>↓ nach unten</option>
                <option value={-1}>↑ nach oben</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 9, color: '#9ca3af' }}>{ld.kind === 'uniform' ? 'Von [m]' : 'Position [m]'}</div>
              <input style={{ ...inp, fontSize: 11 }} type="number" step={0.1} min={0} max={state.L} value={ld.pos} onChange={e => updLoad(li, { pos: parseFloat(e.target.value) ?? 0 })} />
            </div>
            {ld.kind === 'uniform' && (
              <div>
                <div style={{ fontSize: 9, color: '#9ca3af' }}>Bis [m]</div>
                <input style={{ ...inp, fontSize: 11 }} type="number" step={0.1} min={0} max={state.L} value={ld.pos2 ?? state.L} onChange={e => updLoad(li, { pos2: parseFloat(e.target.value) ?? state.L })} />
              </div>
            )}
            <button onClick={() => removeLoad(li)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 4px' }}>×</button>
          </div>
        ))}
        {state.loads.length === 0 && <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', padding: 8 }}>Noch keine Lasten – bitte hinzufügen</div>}
      </div>

      {/* Auflagerreaktionen */}
      {res && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 4, padding: '6px 10px', marginBottom: 8, fontSize: 11 }}>
          <div style={{ fontWeight: 700, color: '#14532d', marginBottom: 4 }}>⚖ {res.systemName}</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span>RA = <b>{res.reactions.RA.toFixed(2)} kN</b></span>
            <span>RB = <b>{res.reactions.RB.toFixed(2)} kN</b></span>
            {res.reactions.MA !== 0 && <span>M_A = <b>{res.reactions.MA.toFixed(2)} kNm</b></span>}
            {res.reactions.MB !== 0 && <span>M_B = <b>{res.reactions.MB.toFixed(2)} kNm</b></span>}
          </div>
        </div>
      )}

      {/* Diagramme */}
      {res && (
        <div>
          <DiagramSVG x={res.x} y={res.M} label="Momentenverlauf M [kNm]" color="#dc2626" unit="kNm" />
          <DiagramSVG x={res.x} y={res.Q} label="Querkraftverlauf Q [kN]" color="#2563eb" unit="kN" />
        </div>
      )}
    </div>
  );
}
const sel: React.CSSProperties = { border: '1px solid #d1d5db', borderRadius: 5, padding: '4px 8px', fontSize: 13, width: '100%', background: '#fff' };

function defaultInputForNode(n: GraphNode, graph: VerificationGraph, tables: Record<string, DbTableData>): string | undefined {
  const d: any = n.data;
  if (n.type === 'variable') {
    if (d.hasDefault === false) return '';
    if (d.inputKind === 'dropdown') return String(d.options?.[0]?.value ?? d.default_value ?? '');
    if (d.inputKind === 'table_column') {
      const t = d.table_ref ? tables[d.table_ref] : null;
      return t ? String(t.rows?.[0]?.[d.table_col] ?? d.default_value ?? '') : String(d.default_value ?? '');
    }
    return String(d.default_value ?? '');
  }
  if (n.type === 'dropdown') {
    if (d.mode === 'custom') return String(d.options?.[0]?.label ?? '');
    const t = d.table_ref ? tables[d.table_ref] : null;
    return t ? String(t.rows?.[0]?.[d.label_col ?? 0] ?? '') : '';
  }
  if (n.type === 'matrix') return String((d as any).rows?.[0]?.label ?? '');
  if (n.type === 'stdcalc') {
    const srcEdge = graph.edges.find((e) => e.target === n.id);
    const tc = graph.nodes.find((x) => x.type === 'tablecalc' && srcEdge && x.id === srcEdge.source)
      || graph.nodes.find((x) => x.type === 'tablecalc');
    return (tc?.data as any)?.zones?.[0] ?? '';
  }
  return undefined;
}

function graphInputKeys(graph: VerificationGraph): Set<string> {
  const keys = new Set<string>();
  for (const n of graph.nodes) {
    if (defaultInputForNode(n, graph, {}) !== undefined || ['variable', 'dropdown', 'matrix', 'stdcalc', 'loopblock'].includes(n.type)) {
      keys.add(n.id);
    }
  }
  return keys;
}

function graphInputSignature(graph: VerificationGraph): string {
  return JSON.stringify(graph.nodes.map(n => {
    const d: any = n.data || {};
    return {
      id: n.id,
      type: n.type,
      name: d.name || '',
      inputKind: d.inputKind || '',
      default_value: d.default_value ?? '',
      table_ref: d.table_ref || '',
      chart_ref: d.chart_ref || '',
      table_col: d.table_col ?? '',
      label_col: d.label_col ?? '',
      options: d.options || null,
      rows: n.type === 'matrix' ? d.rows?.map((r: any) => ({ id: r.id, label: r.label })) : null,
      zones: n.type === 'stdcalc' || n.type === 'tablecalc' ? d.zones || null : null,
    };
  }));
}

function sanitizeGraphInputs(inputs: Record<string, string> | undefined, graph: VerificationGraph): Record<string, string> {
  const allowed = graphInputKeys(graph);
  const nodeIds = new Set(graph.nodes.map(n => n.id));
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(inputs || {})) {
    if (key.endsWith('_override')) {
      const baseKey = key.replace(/_override$/, '');
      if (nodeIds.has(baseKey)) next[key] = value;
      continue;
    }
    if (allowed.has(key)) next[key] = value;
  }
  return next;
}

export default function GraphVerificationView({ verification, readOnly = false, initialInputs, onInputsChange }: { verification: Verification; readOnly?: boolean; initialInputs?: Record<string, string>; onInputsChange?: (inputs: Record<string, string>) => void }) {
  const woodTypeByVerif = useStore(s => s.woodTypeByVerif);
  const woodClassIdByVerif = useStore(s => s.woodClassIdByVerif);
  const setWoodTypeForVerif = useStore(s => s.setWoodTypeForVerif);
  const setWoodClassIdForVerif = useStore(s => s.setWoodClassIdForVerif);
  const apiWoodClasses = useStore(s => s.apiWoodClasses);
  const setGraphInputs = useStore(s => s.setGraphInputs);
  const graph = useMemo(() => getGraph(toLegacyShape(verification)), [verification.id, verification.graph_json]);
  const inputSignature = useMemo(() => graphInputSignature(graph), [graph]);
  const [tables, setTables] = useState<Record<string, DbTableData>>({});
  const [inputs, setInputs] = useState<Record<string, string>>(() => sanitizeGraphInputs(initialInputs, graph));
  const [decimals, setDecimals] = useState(3);
  const [imageModal, setImageModal] = useState<{ src: string; label?: string; source?: string } | null>(null);
  const [chartModal, setChartModal] = useState<string | null>(null); // Node-ID
  const [overrideModal, setOverrideModal] = useState<{ nodeId: string; currentValue: number } | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const toggleSection = (id: string) => setCollapsedSections(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const effectiveWoodType = woodTypeByVerif[verification.id] || '';
  const effectiveWoodClassId = woodClassIdByVerif[verification.id] || '';
  const materialProps = useMemo(() => {
    if (!effectiveWoodType || !effectiveWoodClassId) return {};
    const woodClass = apiWoodClasses.find(c => c.id === effectiveWoodClassId);
    if (!woodClass) return {};
    const props = Object.fromEntries((woodClass?.properties || []).map(p => [p.key, p.value]));
    if (props.beta_c != null && props.b_c == null) props.b_c = props.beta_c;
    return props;
  }, [apiWoodClasses, effectiveWoodType, effectiveWoodClassId]);
  const tableRefs = useMemo(() => collectTableRefs(graph), [graph]);
  const tablesReady = tableRefs.every(id => tables[id]);
  const graphValidation = useMemo(
    () => validateGraph(graph, { tables: tablesReady ? tables : undefined }),
    [graph, tables, tablesReady]
  );

  // Referenzierte Tabellen vorladen
  useEffect(() => {
    let alive = true;
    if (!tableRefs.length) { setTables({}); return; }
    Promise.all(tableRefs.map(id => api.getTableFull(id)
      .then((t: any) => [id, { headers: t.headers || [], rows: t.rows || [], chart_json: t.chart_json ?? null }] as const)
      .catch(() => [id, { headers: [] as string[], rows: [] as string[][], chart_json: null }] as const)))
      .then(pairs => { if (!alive) return; const m: Record<string, DbTableData> = {}; pairs.forEach(p => { m[p[0]] = p[1]; }); setTables(m); });
    return () => { alive = false; };
  }, [tableRefs]);

  useEffect(() => {
    const cleaned = sanitizeGraphInputs(initialInputs, graph);
    setInputs(cleaned);
    if (!readOnly && !onInputsChange && JSON.stringify(cleaned) !== JSON.stringify(initialInputs || {})) {
      setGraphInputs(verification.id, cleaned);
    }
  }, [verification.id, inputSignature]);

  // Default-Eingaben setzen (nur für Felder, die noch nicht belegt sind)
  useEffect(() => {
    // Im echten readOnly-Modus (ohne onInputsChange) keine Defaults nötig — initialInputs sind bereits korrekt
    if (readOnly && !onInputsChange) return;
    setInputs(prev => {
      const next = { ...prev };
      let changed = false;
      for (const n of graph.nodes) {
        const d: any = n.data;
        if (n.type === 'variable' && d.hasDefault === false && next[n.id] === String(d.default_value ?? '')) {
          next[n.id] = '';
          changed = true;
        }
        if (next[n.id] != null) continue;
        const defaultValue = defaultInputForNode(n, graph, tables);
        if (defaultValue !== undefined) {
          next[n.id] = defaultValue;
          changed = true;
        }
      }
      // Store aktualisieren (nur wenn nicht Print-Item — Print-Items tracken ihre Inputs selbst)
      if (changed && !onInputsChange) setGraphInputs(verification.id, next);
      return next;
    });
  }, [graph, tables]);

  const resetInputs = () => {
    const next: Record<string, string> = {};
    for (const n of graph.nodes) {
      const defaultValue = defaultInputForNode(n, graph, tables);
      if (defaultValue !== undefined) next[n.id] = defaultValue;
    }
    setInputs(next);
    if (onInputsChange) {
      onInputsChange(next);
    } else if (!readOnly) {
      setGraphInputs(verification.id, next);
      setWoodTypeForVerif(verification.id, '');
      setWoodClassIdForVerif(verification.id, '');
    }
  };

  const setInput = (id: string, val: string) => setInputs(prev => {
    const next = { ...prev, [id]: val };
    if (onInputsChange) {
      onInputsChange(next);
    } else if (!readOnly) {
      setGraphInputs(verification.id, next);
    }
    return next;
  });
  const inputsReady = useMemo(() => {
    if (!tablesReady) return false;
    if (readOnly && !onInputsChange) return true;
    return graph.nodes.every(n => {
      const d: any = n.data;
      if (n.type === 'variable' && d.hasDefault === false) return true;
      return defaultInputForNode(n, graph, tables) === undefined || inputs[n.id] != null;
    });
  }, [graph, inputs, tables, tablesReady, readOnly, onInputsChange]);
  const graphReady = tablesReady && inputsReady && graphValidation.isValid;

  const ev = useMemo(() => {
    if (!graphReady) return { results: {}, symbols: {} };

    // Normale Evaluation
    const result = evalGraph(graph, inputs, tables, materialProps, { woodType: effectiveWoodType, woodClassId: effectiveWoodClassId });

    // Nach der Evaluation: Wende Override-Werte an
    for (const [key, value] of Object.entries(inputs)) {
      if (key.endsWith('_override')) {
        const nodeId = key.replace('_override', '');
        const numValue = parseFloat(String(value));
        if (!isNaN(numValue)) {
          // Überschreibe das Ergebnis
          if (result.results[nodeId]) {
            result.results[nodeId].value = numValue;
          }

          // Aktualisiere Symbole für diesen Node basierend auf seinem Namen
          const node = graph.nodes.find(n => n.id === nodeId);
          if (node?.data && 'name' in node.data) {
            const name = String((node.data as any).name);
            // Versuche verschiedene Normalisierungsvarianten
            const aliases = [
              name,
              name.replace(/\\/g, ''),
              name.replace(/_\{|\}/g, ''),
              name.replace(/\\/g, '').replace(/_\{|\}/g, ''),
            ];
            for (const alias of aliases) {
              result.symbols[alias] = numValue;
            }
          }
        }
      }
    }

    return result;
  }, [graphReady, graph, inputs, tables, materialProps, effectiveWoodType, effectiveWoodClassId]);
  const ordered = useMemo(() => {
    const sorted = topoSort(graph);
    const order = graph.display_order;
    if (!order?.length) return sorted;
    const idToNode = new Map(sorted.map(n => [n.id, n]));
    const result: typeof sorted = [];
    for (const id of order) { const n = idToNode.get(id); if (n) result.push(n); }
    const inOrder = new Set(order);
    for (const n of sorted) { if (!inOrder.has(n.id)) result.push(n); }
    return result;
  }, [graph]);
  // Welche Bedingung führt via Condition-Kante zu welchem Node?
  const conditionAfterNode = useMemo(() => {
    const map = new Map<string, string>(); // targetNodeId → conditionNodeId
    for (const e of graph.edges) {
      if ((e.data?.kind ?? 'workflow') === 'condition') map.set(e.target, e.source);
    }
    return map;
  }, [graph]);

  // Welche Knoten sind über aktive Bedingungszweige erreichbar?
  const activeNodeIds = useMemo(() => {
    const active = new Set<string>();
    const visit = (nodeId: string) => {
      if (active.has(nodeId)) return;
      active.add(nodeId);
      for (const e of graph.edges) {
        if (e.source !== nodeId) continue;
        const kind = e.data?.kind ?? 'workflow';
        if (kind === 'workflow') {
          visit(e.target);
        } else if (kind === 'condition') {
          const condResult = ev.results[nodeId];
          const condId = e.data?.conditionId || e.sourceHandle;
          if (!condId || condResult?.activeConditionId === condId) {
            visit(e.target);
          }
        }
      }
    };
    const hasIncoming = new Set(graph.edges.map(e => e.target));
    for (const n of graph.nodes) {
      if (!hasIncoming.has(n.id)) visit(n.id);
    }
    return active;
  }, [graph, ev.results]);

  // Tabellen-Spalten-Optionen (für variable inputKind=table_column)
  const colOptions = (tableId?: string, col?: number) => {
    const t = tableId ? tables[tableId] : null;
    if (!t) return [] as string[];
    const seen = new Set<string>();
    const out: string[] = [];
    t.rows.forEach(r => { const c = String(r[col ?? 0] ?? ''); if (c && !seen.has(c)) { seen.add(c); out.push(c); } });
    return out;
  };
  const rowLabels = (tableId?: string, col?: number) => {
    const t = tableId ? tables[tableId] : null;
    if (!t) return [] as string[];
    return t.rows.map(r => String(r[col ?? 0] ?? ''));
  };

  const num = (x?: number) => {
    if (x == null || isNaN(x)) return '—';
    if (Math.abs(x) >= 1e5 || (Math.abs(x) < 1e-3 && x !== 0)) return x.toExponential(2);
    return String(Math.round(x * Math.pow(10, decimals)) / Math.pow(10, decimals));
  };
  const isFiniteNumber = (x?: number) => typeof x === 'number' && isFinite(x);
  const displayName = (name?: string) => {
    const trimmed = String(name || '').trim();
    if (!trimmed) return 'Ergebnis';
    return /_\{/.test(trimmed) ? trimmed : nameToLatex(trimmed);
  };
  const unitLatex = (unit?: string) => {
    const trimmed = String(unit || '').trim();
    if (!trimmed) return '';
    if (trimmed === '[]' || trimmed === '-' || trimmed === '1') return '';
    if (trimmed.includes('\\') || trimmed.includes('{')) return trimmed;
    const part = (value: string) => {
      const match = value.trim().match(/^([A-Za-z]+)(\^.+)?$/);
      if (!match) return value.trim();
      return `\\mathrm{${match[1]}}${match[2] || ''}`;
    };
    const pieces = trimmed.split('/');
    if (pieces.length === 2) return `${part(pieces[0])}/${part(pieces[1])}`;
    return part(trimmed);
  };
  const resultLatex = (value?: number, unit?: string) => {
    if (!isFiniteNumber(value)) return '';
    const unitPart = unit ? `\\;${unitLatex(unit)}` : '';
    return `\\underline{\\underline{${num(value)}${unitPart}}}`;
  };

  // Ergebnis = letzter calc/stdcalc in Reihenfolge
  const resultNode = [...ordered].reverse().find(n => (n.type === 'calc' || n.type === 'stdcalc' || n.type === 'minmax') && !ev.results[n.id]?.skipped);
  const resultVal = resultNode ? ev.results[resultNode.id]?.value : undefined;
  const resultName = resultNode ? String((resultNode.data as any).name || '') : '';
  const isEta = /^\\?eta(?:_|$)/.test(resultName.trim()) || resultName.trim() === '\\eta';

  const renderCondition = (condId: string) => {
    const cn = graph.nodes.find(n => n.id === condId);
    if (!cn) return null;
    const d: any = cn.data;
    const r = ev.results[condId] || {};

    // Wenn der Block skipped/unausgewertet: selbst auswerten mit bekannten Werten
    let activeCondId = r.activeConditionId as string | undefined;
    if (!activeCondId) {
      const localSymbols: Record<string, number | string> = {};
      for (const n of graph.nodes) {
        const nd: any = n.data;
        const val = ev.results[n.id]?.value;
        if (nd.name && val != null && isFinite(val as number)) localSymbols[nd.name] = val as number;
        if (n.type === 'dropdown' && nd.name && inputs[n.id] != null) localSymbols[nd.name] = inputs[n.id];
      }
      for (const c of (d.conditions || [])) {
        const expr = latexCondToJs(c.latex || '') || c.expr || '';
        if (expr && evalCondExpr(expr, localSymbols)) { activeCondId = c.id; break; }
      }
    }

    return (
      <div key={`cond_after_${condId}`} style={{ marginBottom: 6 }}>
        {/* Header */}
        <div style={{ ...card, background: '#fff', marginBottom: 6 }}>
          <div style={lbl}>🔶 {d.label || 'Bedingung'}</div>
        </div>
        {/* Einzelne Bedingungen */}
        {(d.conditions || []).map((c: any, idx: number) => {
          const isPassed = activeCondId === c.id;
          const latexFormula = c.latex || c.expr || '';
          const numSymbols = ev.symbols;
          const substitutedLatex = substituteLatexValues(latexFormula, numSymbols);

          return (
            <div key={c.id} style={{ marginBottom: idx < (d.conditions || []).length - 1 ? 6 : 0 }}>
              {/* LaTeX-Formel (weiße Box oben) */}
              <div style={{ ...card, background: '#fff', marginBottom: 4 }}>
                <MathDisplay latex={latexFormula} />
              </div>
              {/* Gelbe Substitutions-Box mit eingesetzten Werten + Status */}
              <div style={{
                ...card,
                background: '#fefce8',
                borderColor: '#fde68a',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                {/* Status-Icon: Grün (✓) wenn bestanden, Rot (✗) wenn nicht */}
                <span style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: isPassed ? '#15803d' : '#dc2626',
                  minWidth: 24,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexShrink: 0,
                }}>
                  {isPassed ? '✓' : '✗'}
                </span>
                {/* Substitutierte Formel mit Werten */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <MathDisplay latex={substitutedLatex} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Aufeinanderfolgende Variablen zu Gruppen zusammenfassen (2-Spalten-Raster)
  // Titel-Blöcke bilden einklappbare Abschnitte; Bild-Blöcke erscheinen an ihrer Workflow-Position
  type Sec =
    | { type: 'vars'; nodes: typeof ordered }
    | { type: 'single'; node: (typeof ordered)[0] }
    | { type: 'title'; node: (typeof ordered)[0] };
  const sections: Sec[] = useMemo(() => {
    const secs: Sec[] = [];
    for (const n of ordered) {
      const r = ev.results[n.id] || {};
      if (n.type === 'frame') continue;
      const isHidden = (graph.hidden_nodes ?? []).includes(n.id);
      if (isHidden || r.skipped || !activeNodeIds.has(n.id) || n.type === 'output' || n.type === 'woodclass' || n.type === 'condition') continue;
      if (n.type === 'title') {
        secs.push({ type: 'title', node: n });
        continue;
      }
      if (n.type === 'variable' || n.type === 'dropdown' || n.type === 'ref') {
        const last = secs[secs.length - 1];
        if (last?.type === 'vars') last.nodes.push(n);
        else secs.push({ type: 'vars', nodes: [n] });
      } else {
        secs.push({ type: 'single', node: n });
      }
    }
    return secs;
  }, [ordered, ev.results, graph.hidden_nodes, activeNodeIds]);

  // Berechne welche sections-Einträge durch einen eingeklappten Titel verdeckt sind
  const hiddenBySectionCollapse = useMemo(() => {
    const hidden = new Set<number>();
    let activeCollapsedIdx: number | null = null;
    sections.forEach((sec, i) => {
      if (sec.type === 'title') {
        activeCollapsedIdx = collapsedSections.has(sec.node.id) ? i : null;
      } else if (activeCollapsedIdx !== null) {
        hidden.add(i);
      }
    });
    return hidden;
  }, [sections, collapsedSections]);

  const validationNotice = graphValidation.issues.length > 0 && !readOnly ? (
    <div style={{
      ...card,
      background: graphValidation.errors.length ? '#fef2f2' : '#fffbeb',
      borderColor: graphValidation.errors.length ? '#fecaca' : '#fde68a',
      color: graphValidation.errors.length ? '#991b1b' : '#92400e',
      fontSize: 12,
      lineHeight: 1.45,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>
        {graphValidation.errors.length ? 'Graph-Fehler' : 'Graph-Hinweise'}
      </div>
      {graphValidation.issues.slice(0, 5).map((issue, i) => (
        <div key={i}>
          {issue.severity === 'error' ? 'Fehler' : 'Hinweis'}
          {issue.nodeId ? ` (${issue.nodeId})` : ''}: {issue.message}
        </div>
      ))}
      {graphValidation.issues.length > 5 && (
        <div>+ {graphValidation.issues.length - 5} weitere Hinweise</div>
      )}
    </div>
  ) : null;

  if (!graphReady) {
    return (
      <>
        {validationNotice}
        {!graphValidation.errors.length && (
          <div style={{ ...card, background: '#f8fafc', color: '#64748b', fontSize: 12 }}>
            Nachweis wird vorbereitet...
          </div>
        )}
      </>
    );
  }

  return (
    <div>
      {validationNotice}
      {!readOnly && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={resetInputs}
            style={{
              marginRight: 8,
              padding: '3px 10px',
              fontSize: 12,
              borderRadius: 4,
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#334155',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Reset
          </button>
          <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Kommastellen:</span>
          {[1, 2, 3, 4].map(d => (
            <button key={d} onClick={() => setDecimals(d)} style={{
              padding: '2px 9px', fontSize: 12, borderRadius: 4, cursor: 'pointer',
              border: `1px solid ${decimals === d ? '#2563eb' : '#d1d5db'}`,
              background: decimals === d ? '#eff6ff' : '#fff',
              color: decimals === d ? '#1d4ed8' : '#374151',
              fontWeight: decimals === d ? 700 : 400,
            }}>{d}</button>
          ))}
        </div>
      )}
      {sections.map((sec, si) => {
        if (hiddenBySectionCollapse.has(si)) return null;
        if (sec.type === 'title') {
          const d: any = sec.node.data;
          const color: string = d.color || '#2563eb';
          const isCollapsed = collapsedSections.has(sec.node.id);
          return (
            <div key={sec.node.id} onClick={() => toggleSection(sec.node.id)}
              style={{ ...card, background: `${color}12`, borderColor: color, borderWidth: 2, cursor: 'pointer', marginTop: 10, marginBottom: 4, userSelect: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 3, height: 16, background: color, borderRadius: 2, flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: '#1f2937', flex: 1 }}>{d.label || 'Abschnitt'}</span>
                <span style={{ fontSize: 11, color, fontWeight: 700 }}>{isCollapsed ? '▶' : '▼'}</span>
              </div>
            </div>
          );
        }
        if (sec.type === 'vars') {
          const varGroupId = `vars_${sec.nodes.map(n => n.id).join('_')}`;
          return (
            <div key={varGroupId} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
              {sec.nodes.map(n => {
                const d: any = n.data;

                // Dropdown-Block (type='dropdown') → halb-breit in der Grid
                if (n.type === 'dropdown') {
                  const opts = d.mode === 'custom' ? (d.options || []).map((o: any) => o.label) : rowLabels(d.table_ref, d.label_col ?? 0);
                  const dropVal = ev.results[n.id]?.value;
                  const hasValue = d.mode === 'custom' && d.name && dropVal != null && isFiniteNumber(dropVal);
                  return (
                    <div key={n.id} style={{ ...card, marginBottom: 0 }}>
                      <div style={lbl}>{d.label || 'Auswahl'}</div>
                      <select style={sel} disabled={readOnly} value={inputs[n.id] ?? ''} onChange={e => setInput(n.id, e.target.value)}>
                        {opts.map((o: string, i: number) => <option key={i} value={o}>{o}</option>)}
                      </select>
                      {hasValue && (
                        <div style={{ marginTop: 4, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 8px', overflowX: 'auto' }}>
                          <MathDisplay latex={`${displayName(d.name)} = ${num(dropVal)}${d.unit ? `\\;${unitLatex(d.unit)}` : ''}`} />
                        </div>
                      )}
                    </div>
                  );
                }

                // Referenz-Block → zeigt den Wert des referenzierten Blocks (read-only, halb-breit)
                if (n.type === 'ref') {
                  // Gezogene Kante hat Vorrang über gespeicherte source_id (analog evalGraph)
                  const wiredSrcId = graph.edges.find(e => e.target === n.id && (e.data?.kind ?? 'workflow') === 'workflow')?.source;
                  const effectiveSrcId = wiredSrcId || (d as any).source_id;
                  const srcNode = graph.nodes.find(nn => nn.id === effectiveSrcId);
                  const srcD: any = srcNode?.data;
                  const refVal = ev.results[effectiveSrcId]?.value;
                  return (
                    <div key={n.id} style={{ ...card, marginBottom: 0, background: '#f0f9ff', borderColor: '#bae6fd' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                        {srcD?.name && <MathDisplay latex={nameToLatex(srcD.name)} />}
                        {srcD?.label && <span style={{ color: '#6b7280', fontSize: 11 }}>{srcD.label}</span>}
                        {srcD?.unit && <span style={{ color: '#9ca3af', fontSize: 11 }}><MathDisplay latex={`[${unitLatex(srcD.unit)}]`} /></span>}
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: isFiniteNumber(refVal) ? '#0369a1' : '#9ca3af', textAlign: 'right' }}>
                        {num(refVal)}
                      </div>
                    </div>
                  );
                }

                // Variable-Block → volle Breite bei Kommentar, Dropdown-Input, Tabellenspalte oder Link
                const fullWidth = (d.inputKind === 'number_comment' && d.comment) || d.inputKind === 'dropdown' || d.inputKind === 'table_column' || d.inputKind === 'number_link';
                return (
                  <div key={n.id} style={{ ...card, marginBottom: 0, ...(fullWidth ? { gridColumn: '1 / -1' } : {}) }}>
                    {d.inputKind === 'number_comment' && d.comment && (
                      <div style={{ background: '#fee2e2', border: '2px solid #dc2626', borderRadius: 4, padding: '5px 8px', marginBottom: 6, fontSize: 11, color: '#991b1b', fontWeight: 600, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {d.comment}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                      <MathDisplay latex={d.name ? nameToLatex(d.name) : '?'} />
                      {d.label && <span style={{ color: '#6b7280', fontSize: 11 }}>{d.label}</span>}
                      {d.unit && <span style={{ color: '#9ca3af', fontSize: 11 }}><MathDisplay latex={`[${unitLatex(d.unit)}]`} /></span>}
                      {d.inputKind === 'number_image' && d.image && (
                        <button onClick={() => setImageModal({ src: d.image, source: d.imageSource })} title="Bild anzeigen"
                          style={{ background: '#dbeafe', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', color: '#1d4ed8', fontWeight: 700, fontSize: 12, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          i
                        </button>
                      )}
                      {d.inputKind === 'number_link' && d.url && (
                        <a href={d.url} target="_blank" rel="noopener noreferrer" title={d.url}
                          style={{ background: '#e0f2fe', border: '1px solid #7dd3fc', borderRadius: 4, padding: '2px 7px', cursor: 'pointer', color: '#0369a1', fontSize: 11, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                          🔗 Link
                        </a>
                      )}
                    </div>
                    {d.inputKind === 'dropdown' ? (
                      <select style={sel} disabled={readOnly} value={inputs[n.id] ?? ''} onChange={e => setInput(n.id, e.target.value)}>
                        {(d.options || []).map((o: any, i: number) => <option key={i} value={String(o.value)}>{o.label}</option>)}
                      </select>
                    ) : d.inputKind === 'table_column' ? (
                      <select style={sel} disabled={readOnly} value={inputs[n.id] ?? ''} onChange={e => setInput(n.id, e.target.value)}>
                        {colOptions(d.table_ref, d.table_col).map((c, i) => <option key={i} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <input
                          type="text"
                          disabled={readOnly}
                          style={{ ...sel, textAlign: 'right', fontFamily: 'monospace', flex: 1 }}
                          value={inputs[n.id] ?? ''}
                          placeholder="z.B. 10*11+(45/29) dann ="
                          onChange={e => setInput(n.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && typeof inputs[n.id] === 'string' && (inputs[n.id].includes('*') || inputs[n.id].includes('+') || inputs[n.id].includes('-') || inputs[n.id].includes('/') || inputs[n.id].includes('^'))) {
                              try {
                                const formula = String(inputs[n.id] || '').replace(/\^/g, '**');
                                const result = new Function('return ' + formula)();
                                if (typeof result === 'number' && isFinite(result)) {
                                  setInput(n.id, String(result));
                                }
                              } catch {
                                // Fehler beim Evaluieren — nichts tun
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => {
                            try {
                              const formula = String(inputs[n.id] || '').replace(/\^/g, '**');
                              const result = new Function('return ' + formula)();
                              if (typeof result === 'number' && isFinite(result)) {
                                setInput(n.id, String(result));
                              }
                            } catch {
                              // Fehler beim Evaluieren
                            }
                          }}
                          style={{
                            padding: '6px 10px',
                            background: '#4f46e5',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            cursor: readOnly ? 'not-allowed' : 'pointer',
                            fontSize: 12,
                            fontWeight: 600,
                            opacity: readOnly ? 0.5 : 1,
                          }}
                        >
                          =
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        }

        const n = sec.node;
        const d: any = n.data;
        const r = ev.results[n.id] || {};

        if (n.type === 'image') {
          return (
            <div key={n.id} style={{ ...card, padding: 0, overflow: 'hidden' }}>
              {d.title && (
                <div style={{ padding: '7px 12px 4px', fontWeight: 600, fontSize: 12, color: '#374151', borderBottom: d.image ? '1px solid #f0f0f0' : undefined }}>
                  {d.title}
                </div>
              )}
              {d.image && (
                <div style={{ position: 'relative' }}>
                  <img src={d.image} style={{ width: '100%', maxHeight: 320, objectFit: 'contain', display: 'block', cursor: 'pointer' }}
                    onClick={() => setImageModal({ src: d.image, label: d.label, source: d.source })} />
                  <button onClick={() => setImageModal({ src: d.image, label: d.label, source: d.source })}
                    title="Bild vergrössern"
                    style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    🔍
                  </button>
                </div>
              )}
              {(d.label || d.source) && (
                <div style={{ padding: '5px 12px 7px', borderTop: d.image ? '1px solid #f0f0f0' : undefined }}>
                  {d.label && <div style={{ fontSize: 11, color: '#374151' }}>{d.label}</div>}
                  {d.source && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>Quelle: {d.source}</div>}
                </div>
              )}
            </div>
          );
        }

        if (n.type === 'dropdown') {
          const opts = d.mode === 'custom' ? (d.options || []).map((o: any) => o.label) : rowLabels(d.table_ref, d.label_col ?? 0);
          const dropVal = ev.results[n.id]?.value;
          const hasValue = d.mode === 'custom' && d.name && dropVal != null && isFiniteNumber(dropVal);
          return (
            <div key={n.id} style={card}>
              <div style={lbl}>🟧 {d.label || 'Auswahl'}</div>
              <select style={sel} disabled={readOnly} value={inputs[n.id] ?? ''} onChange={e => setInput(n.id, e.target.value)}>
                {opts.map((o: string, i: number) => <option key={i} value={o}>{o}</option>)}
              </select>
              {hasValue && (
                <div style={{ marginTop: 5, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 8px', overflowX: 'auto' }}>
                  <MathDisplay latex={`${displayName(d.name)} = ${num(dropVal)}${d.unit ? `\\;${unitLatex(d.unit)}` : ''}`} />
                </div>
              )}
            </div>
          );
        }

        if (n.type === 'tablevalue') {
          return (
            <div key={n.id} style={{ ...card, background: '#f0fdf4', borderColor: '#bbf7d0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MathDisplay latex={d.name ? nameToLatex(d.name) : '?'} />
                <span style={{ color: '#6b7280', fontSize: 12 }}>=</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{num(r.value)}</span>
                {d.unit && <span style={{ color: '#9ca3af', fontSize: 12 }}>{d.unit}</span>}
              </div>
            </div>
          );
        }

        if (n.type === 'chartlookup') {
          const dir: 'x_to_y' | 'y_to_x' = (d as any).direction ?? 'x_to_y';
          const allVals: number[] | undefined = (r as any).allSeriesValues;
          const seriesNames = tables[(d as any).chart_ref]?.chart_json?.series?.map((s: any) => s.name) ?? [];
          const chartJson = tables[(d as any).chart_ref]?.chart_json;
          const currentX: number = (r as any).inputValue ?? NaN;
          return (
            <div key={n.id} style={{ ...card, background: '#ecfdf5', borderColor: '#a7f3d0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  {d.label && <div style={{ color: '#6b7280', fontSize: 11, marginBottom: 4 }}>{d.label}</div>}
                  {allVals ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                      {allVals.map((v, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <MathDisplay latex={nameToLatex(seriesNames[i] ?? `${d.name}_${i + 1}`)} />
                          <span style={{ color: '#6b7280', fontSize: 12 }}>=</span>
                          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: isNaN(v) ? '#9ca3af' : 'inherit' }}>{num(v)}</span>
                          {d.unit && !isNaN(v) && <span style={{ color: '#9ca3af', fontSize: 12 }}>{d.unit}</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <MathDisplay latex={d.name ? nameToLatex(d.name) : '?'} />
                      <span style={{ color: '#6b7280', fontSize: 12 }}>=</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{num(r.value)}</span>
                      {d.unit && <span style={{ color: '#9ca3af', fontSize: 12 }}>{d.unit}</span>}
                    </div>
                  )}
                </div>
                {chartJson && !readOnly && (
                  <button onClick={() => setChartModal(n.id)}
                    title="Diagramm anzeigen"
                    style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 13, color: '#047857', flexShrink: 0 }}>
                    📉
                  </button>
                )}
              </div>
            </div>
          );
        }

        if (n.type === 'calc' || n.type === 'stdcalc') {
          const parentCondId = conditionAfterNode.get(n.id);
          return (
            <React.Fragment key={n.id}>
              <div style={{ ...card, background: '#fafafa' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <MathDisplay latex={d.name ? nameToLatex(d.name) : '?'} />
                  <span style={{ color: '#6b7280', fontSize: 12 }}>{d.label}</span>
                </div>
                {n.type === 'stdcalc' && (() => {
                  const srcEdge = graph.edges.find(e => e.target === n.id);
                  const tc = graph.nodes.find(x => x.type === 'tablecalc' && srcEdge && x.id === srcEdge.source) || graph.nodes.find(x => x.type === 'tablecalc');
                  const zones = (tc?.data as any)?.zones || [];
                  return (
                    <div style={{ marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: '#92400e' }}>Auswahl {d.picker_name}: </span>
                      <select style={{ ...sel, width: 'auto', display: 'inline-block' }} disabled={readOnly} value={inputs[n.id] ?? ''} onChange={e => setInput(n.id, e.target.value)}>
                        {zones.map((z: string, i: number) => <option key={i} value={z}>{z}</option>)}
                      </select>
                    </div>
                  );
                })()}
                {d.latex && (() => {
                  // Formel beginnt mit "=" → linke Seite (Name) voranstellen
                  const tpl = d.latex.trimStart().startsWith('=') && d.name
                    ? `${nameToLatex(d.name)} ${d.latex.trimStart()}`
                    : d.latex;
                  return (
                    <div className="formula-block" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 4, padding: '5px 8px', marginBottom: 4, overflowX: 'auto' }}>
                      <MathDisplay latex={tpl} display />
                    </div>
                  );
                })()}
                {(r.substitutedLatex || d.latex) && (
                  <div className="formula-block" style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 4, padding: '5px 8px', marginBottom: 4, overflowX: 'auto' }}>
                    {(() => {
                      const sub = (r.substitutedLatex || d.latex || '').trimStart().startsWith('=') && d.name
                        ? `${nameToLatex(d.name)} ${(r.substitutedLatex || d.latex || '').trimStart()}`
                        : (r.substitutedLatex || d.latex || '');
                      // GELBE BOX: Zeige substituierte Werte + Ergebnis wenn vorhanden
                      const resultPart = isFiniteNumber(r.value) ? ` = ${resultLatex(r.value, d.unit)}` : '';
                      return <MathDisplay latex={`${sub}${resultPart}`} display />;
                    })()}
                  </div>
                )}
                {isFiniteNumber(r.value) && !readOnly && (
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setOverrideModal({ nodeId: n.id, currentValue: inputs[`${n.id}_override`] ? parseFloat(String(inputs[`${n.id}_override`])) : (r.value ?? 0) })}
                      style={{
                        padding: '4px 6px',
                        background: 'transparent',
                        border: '1px solid #cbd5e1',
                        borderRadius: 3,
                        fontSize: 12,
                        cursor: 'pointer',
                        color: '#6b7280',
                      }}
                      title="Wert überschreiben"
                    >
                      ✏️
                    </button>
                    {inputs[`${n.id}_override`] && (
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 3, padding: '2px 6px' }}>
                        <span style={{ fontSize: 11, color: '#ea580c', fontWeight: 600 }}>
                          {d.name ? nameToLatex(d.name) : '?'} = {inputs[`${n.id}_override`]} {d.unit ? `[${d.unit}]` : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => setInput(`${n.id}_override`, '')}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ea580c',
                            cursor: 'pointer',
                            fontSize: 14,
                            padding: 0,
                            lineHeight: 1,
                          }}
                          title="Override löschen"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {(r.missingSymbols || []).length > 0 && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 4, padding: '5px 8px', marginBottom: 4, fontSize: 12 }}>
                    Fehlende: {(r.missingSymbols || []).map((name: string, i: number) => (
                      <React.Fragment key={name}>{i > 0 && ', '}<MathDisplay latex={displayName(name)} /></React.Fragment>
                    ))}
                  </div>
                )}
              </div>
              {parentCondId && renderCondition(parentCondId)}
            </React.Fragment>
          );
        }

        if (n.type === 'minmax') {
          const parentCondId = conditionAfterNode.get(n.id);
          const caseVals: number[] = (r as any).caseValues || [];
          const activeIdx: number = (r as any).activeCaseIndex ?? -1;
          const modeMatch = (d.latex || '').match(/\\(min|max)\b/);
          const modeStr = modeMatch ? `\\${modeMatch[1]}` : '\\min';
          const caseMatch = (d.latex || '').match(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/);
          const rawCases: string[] = caseMatch ? caseMatch[1].split(/\\\\/).map((c: string) => c.trim()).filter(Boolean) : [];
          const nameLatex = d.name ? nameToLatex(d.name) : '?';
          const subLatex: string = (r as any).substitutedLatex || '';
          return (
            <React.Fragment key={n.id}>
              <div style={{ ...card, background: '#fafafa' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <MathDisplay latex={nameLatex} />
                  {d.label && <span style={{ color: '#6b7280', fontSize: 12 }}>{d.label}</span>}
                </div>
                {rawCases.length > 0 && (
                  <div className="formula-block" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 4, padding: '5px 8px', marginBottom: 4, overflowX: 'auto' }}>
                    <MathDisplay latex={`${nameLatex} = ${modeStr} \\begin{cases} ${rawCases.join(' \\\\ ')} \\end{cases}`} display />
                  </div>
                )}
                {subLatex && (
                  <div className="formula-block" style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 4, padding: '5px 8px', marginBottom: 4, overflowX: 'auto' }}>
                    <MathDisplay latex={isFiniteNumber(r.value) ? `${subLatex} = ${resultLatex(r.value, d.unit)}` : subLatex} display />
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {rawCases.map((caseLatex: string, i: number) => {
                    const isActive = i === activeIdx;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 7px', borderRadius: 4, background: isActive ? '#f3f4f6' : '#f9fafb', border: `1px solid ${isActive ? '#9ca3af' : '#e5e7eb'}` }}>
                        <span style={{ fontSize: 11, color: isActive ? '#374151' : '#d1d5db', flexShrink: 0 }}>{isActive ? '✓' : '○'}</span>
                        <div style={{ flex: 1, overflowX: 'auto' }}>
                          <MathDisplay latex={((r as any).substitutedCases || [])[i] || caseLatex} />
                        </div>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: isActive ? 700 : 400, color: isActive ? '#111827' : '#6b7280', flexShrink: 0 }}>
                          {isFinite(caseVals[i]) ? num(caseVals[i]) : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {parentCondId && renderCondition(parentCondId)}
            </React.Fragment>
          );
        }

        if (n.type === 'cases') {
          const caseVals: number[] = (r as any).caseValues || [];
          const activeIdx: number = (r as any).activeCaseIndex ?? -1;
          const caseDefs: Array<{ formula_latex: string; cond_expr: string }> = d.cases || [];
          const subLatex: string = r.substitutedLatex || '';
          const nameLatex = d.name ? nameToLatex(d.name) : '?';
          const parentCondId = conditionAfterNode.get(n.id);
          const activeTemplate = activeIdx >= 0 ? (caseDefs[activeIdx]?.formula_latex || '') : '';
          return (
            <React.Fragment key={n.id}>
              <div style={{ ...card, background: '#fafafa' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <MathDisplay latex={nameLatex} />
                  {d.label && <span style={{ color: '#6b7280', fontSize: 12 }}>{d.label}</span>}
                  {d.unit && <span style={{ color: '#9ca3af', fontSize: 11 }}><MathDisplay latex={`[${unitLatex(d.unit)}]`} /></span>}
                </div>
                {/* Template-Formel des aktiven Falls (weiss, wie bei calc-Blöcken) */}
                {activeTemplate && (
                  <div className="formula-block" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 4, padding: '5px 8px', marginBottom: 4, overflowX: 'auto' }}>
                    <MathDisplay latex={activeTemplate} display />
                  </div>
                )}
                {/* Eingesetzte Werte (gelb) */}
                {subLatex && (
                  <div className="formula-block" style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 4, padding: '5px 8px', marginBottom: 4, overflowX: 'auto' }}>
                    <MathDisplay latex={isFiniteNumber(r.value) ? `${subLatex} = ${resultLatex(r.value, d.unit)}` : subLatex} display />
                  </div>
                )}
                {/* Alle Fälle */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {caseDefs.map((c: any, i: number) => {
                    const isActive = i === activeIdx;
                    const isSelectMode = d.mode === 'select';
                    const condLabel = isSelectMode
                      ? ((c.match_value || '').trim() || 'sonst')
                      : (() => { const _ce = (c.cond_expr || '').trim(); return (!_ce || /^\(leer\s*[=:]\s*else\)$/i.test(_ce) || /^else$/i.test(_ce) || /^sonst$/i.test(_ce)) ? 'sonst' : _ce; })();
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 4, background: isActive ? '#f5f3ff' : '#f9fafb', border: `1px solid ${isActive ? '#c4b5fd' : '#e5e7eb'}` }}>
                        <span style={{ fontSize: 13, color: isActive ? '#7c3aed' : '#d1d5db', flexShrink: 0, lineHeight: 1 }}>{isActive ? '✓' : '○'}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ overflowX: 'auto' }}><MathDisplay latex={c.formula_latex} /></div>
                          <div style={{ fontSize: 9.5, color: '#9ca3af', marginTop: 1, fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {condLabel}
                          </div>
                        </div>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: isActive ? 700 : 400, color: isActive ? '#6d28d9' : '#9ca3af', flexShrink: 0 }}>
                          {isFinite(caseVals[i]) ? num(caseVals[i]) : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {parentCondId && renderCondition(parentCondId)}
            </React.Fragment>
          );
        }

        if (n.type === 'tablecalc') {
          const tableRes = r.table || {};
          return (
            <div key={n.id} style={{ ...card, background: '#eff6ff', borderColor: '#bfdbfe' }}>
              <div style={lbl}>🟦 {d.label || d.name} [{d.unit}]</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead><tr>{Object.keys(tableRes).map(z => <th key={z} style={{ border: '1px solid #cbd5e1', padding: '3px 8px', background: '#dbeafe' }}>{z}</th>)}</tr></thead>
                  <tbody><tr>{Object.values(tableRes).map((val, i) => <td key={i} style={{ border: '1px solid #e2e8f0', padding: '3px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{num(val as number)}</td>)}</tr></tbody>
                </table>
              </div>
            </div>
          );
        }

        if (n.type === 'check') {
          const passed = r.passed;
          const unknown = passed === undefined;
          const bg = unknown ? '#f9fafb' : passed ? '#d1fae5' : '#fee2e2';
          const borderColor = unknown ? '#d1d5db' : passed ? '#6ee7b7' : '#fca5a5';
          const textColor = unknown ? '#6b7280' : passed ? '#065f46' : '#991b1b';
          const showEta = d.show_eta !== false;
          const etaVar = d.eta_var || '\\eta';
          return (
            <div key={n.id} style={{ ...card, background: bg, borderColor, borderWidth: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>{unknown ? '⬜' : passed ? '✅' : '❌'}</span>
                <div style={{ flex: 1 }}>
                  {d.label && <div style={{ fontWeight: 700, fontSize: 13, color: textColor, marginBottom: 4 }}>{d.label}</div>}

                  {showEta && isFiniteNumber(r.eta) && (
                    <div style={{ background: '#fff', border: `1px solid ${borderColor}`, borderRadius: 5, padding: '5px 8px', overflowX: 'auto', marginBottom: 4 }}>
                      <MathDisplay latex={`${etaVar} = ${num(r.eta)}`} display />
                    </div>
                  )}

                  {d.latex && (
                    <div style={{ background: '#fff', border: `1px solid ${borderColor}`, borderRadius: 5, padding: '5px 8px', overflowX: 'auto', marginBottom: 4 }}>
                      <MathDisplay latex={d.latex} display />
                    </div>
                  )}
                  {r.substitutedLatex && r.substitutedLatex !== d.latex && (
                    <div style={{ background: unknown ? '#f1f5f9' : passed ? '#ecfdf5' : '#fef2f2', border: `1px solid ${borderColor}`, borderRadius: 5, padding: '5px 8px', overflowX: 'auto', marginBottom: 4 }}>
                      <MathDisplay latex={d.unit ? `${r.substitutedLatex} \\; [${unitLatex(d.unit)}]` : r.substitutedLatex} display />
                    </div>
                  )}
                  <div style={{ fontWeight: 700, fontSize: 13, color: textColor }}>
                    {unknown ? 'Berechnung läuft…' : passed ? 'Nachweis erfüllt' : 'Nachweis nicht erfüllt'}
                  </div>
                  {showEta && isFiniteNumber(r.eta) && r.eta! > 1 && (
                    <div style={{ marginTop: 3, fontSize: 11, color: textColor }}>
                      <MathDisplay latex={`${etaVar} = ${num(r.eta)} > 1`} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }
        if (n.type === 'matrix') {
          const md: any = d;
          const cols: any[] = md.columns || [];
          const rows: any[] = md.rows || [];
          const matVals: Record<string, number> = (r as any).matrixVals || {};
          const matLatex: Record<string, string> = (r as any).matrixLatex || {};
          return (
            <div key={n.id} style={{ ...card, background: '#ecfeff', borderColor: '#0891b2' }}>
              {md.label && <div style={{ fontWeight: 600, fontSize: 12, color: '#0369a1', marginBottom: 6 }}>{md.label}</div>}
              <div style={lbl}>{md.row_label || 'Material / Schicht'}</div>
              <select style={{ ...sel, marginBottom: 8, borderColor: '#0891b2' }} disabled={readOnly}
                value={inputs[n.id] ?? ''}
                onChange={e => setInput(n.id, e.target.value)}>
                {rows.map((row: any) => <option key={row.id} value={row.label}>{row.label}</option>)}
              </select>
              {cols.length > 0 && cols.map((col: any) => {
                const val = matVals[col.name];
                const subLatex = matLatex[col.name];
                const colHeader = col.header || col.name;
                return (
                  <div key={col.id} style={{ background: '#f0fdfe', border: '1px solid #a5f3fc', borderRadius: 4, padding: '4px 8px', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
                      <span style={{ color: '#0369a1', fontWeight: 600, fontSize: 11 }}>
                        <MathDisplay latex={colHeader} />
                      </span>
                      {col.unit && <span style={{ fontSize: 10, color: '#6b7280' }}>[{col.unit}]</span>}
                    </div>
                    {isFiniteNumber(val) ? (
                      <MathDisplay latex={
                        subLatex
                          ? `${col.name ? nameToLatex(col.name) : '?'} = ${subLatex} = ${resultLatex(val, col.unit)}`
                          : `${col.name ? nameToLatex(col.name) : '?'} = ${resultLatex(val, col.unit)}`
                      } />
                    ) : <span style={{ color: '#9ca3af', fontSize: 11 }}>—</span>}
                  </div>
                );
              })}
            </div>
          );
        }

        if (n.type === 'beamvisual') {
          return (
            <div key={n.id} style={{ ...card, background: '#f0fdf4', borderColor: '#15803d', padding: '10px 14px' }}>
              <BeamCalcPanel label={(d as any).label || ''} />
            </div>
          );
        }

        if (n.type === 'section') {
          return (
            <div key={n.id} style={{ ...card, background: '#fdf4ff', borderColor: '#9333ea', padding: '10px 14px' }}>
              <SectionCalcPanel
                label={(d as any).label || ''}
                savedShapes={inputs[n.id]}
                onShapesChange={shapes => setInput(n.id, JSON.stringify(shapes))}
              />
            </div>
          );
        }

        if (n.type === 'loopblock') {
          const lb = d as import('../types/graph').LoopBlockData;
          let state: { count?: string; items?: Record<string, string>[]; globals?: Record<string, string> } = {};
          try { state = JSON.parse(inputs[n.id] as string ?? '{}'); } catch { /* */ }
          const countVal = Math.max(1, Math.min(Number(state.count ?? 1) || 1, lb.max_count || 8));
          const items: Record<string, string>[] = Array.isArray(state.items) ? [...state.items] : [];
          while (items.length < countVal) items.push({});
          const stateGlobals: Record<string, string> = state.globals ?? {};

          const setState = (patch: Partial<typeof state>) => {
            setInput(n.id, JSON.stringify({ ...state, ...patch }));
          };
          const setItem = (i: number, patch: Record<string, string>) => {
            const newItems = [...items];
            newItems[i] = { ...newItems[i], ...patch };
            setState({ items: newItems });
          };
          const setGlobal = (patch: Record<string, string>) => {
            setState({ globals: { ...stateGlobals, ...patch } });
          };

          // Vars aufteilen
          const globalVars = (lb.vars || []).filter(v => v.scope === 'global');
          const scopedLayerVars  = (lb.vars || []).filter(v => v.scope !== 'global');
          const layerVars = scopedLayerVars;

          const res = ev?.results?.[n.id] as any;
          const perIterVals: Record<string, number[]> = res?.loopPerIter ?? {};
          const perIterCalcVals: Record<string, number[]> = res?.loopCalcPerIter ?? {};
          const perIterFormulas: Record<string, string[]> = res?.loopFormulas ?? {};
          const perIterCalcFormulas: Record<string, string[]> = res?.loopCalcFormulas ?? {};
          const aggrVals: Record<string, number> = res?.matrixVals ?? {};
          const optionMatchesLoop = (opt: any, selected: string) =>
            opt?.id === selected || opt?.label === selected || (Array.isArray(opt?.aliases) && opt.aliases.includes(selected));
          const optionForLoopItem = (loopItem: Record<string, string> | undefined) => {
            const selected = loopItem?.['__sel__'] ?? '';
            return (lb.options || []).find(opt => optionMatchesLoop(opt, selected));
          };
          const normalizeLoopVarName = (name: string) =>
            name
              .replace(/\\/g, '')
              .replace(/_\{([^{}]+)\}/g, (_m, sub: string) => '_' + sub.replace(/[,\s.]+/g, '_'))
              .replace(/[{},\s.]+/g, '_')
              .replace(/_+/g, '_')
              .replace(/^_|_$/g, '');
          const loopOptionTextKey = (opt: any) =>
            String(opt?.category || opt?.label || '')
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '');
          const isLoopHollowOption = (opt: any) => loopOptionTextKey(opt).includes('hohlraum');
          const isLoopDeltaProtectingOption = (opt: any) => {
            if (!opt) return false;
            if (Object.prototype.hasOwnProperty.call(opt, 'protects_deltat')) return opt.protects_deltat === true;
            return loopOptionTextKey(opt).includes('gips');
          };
          const loopLayerThickness = (loopItem: Record<string, string> | undefined) => {
            if (!loopItem) return NaN;
            for (const v of layerVars) {
              const key = normalizeLoopVarName(v.name || '');
              const isThickness = key === 'd_i' || key === 'd' || key === 'd_n' || String(v.label || '').toLowerCase().includes('dicke');
              if (!isThickness) continue;
              const raw = loopItem[v.id] ?? loopItem[v.name] ?? v.default_value ?? '';
              const num = parseFloat(String(raw).replace(',', '.'));
              if (isFinite(num)) return num;
            }
            return NaN;
          };
          const isEffectiveLoopHollow = (idx: number) => {
            if (idx < 0 || idx >= countVal) return false;
            return isLoopHollowOption(optionForLoopItem(items[idx])) && loopLayerThickness(items[idx]) >= 40;
          };
          const nearestNonHollowIndex = (idx: number, step: -1 | 1) => {
            let j = idx + step;
            while (j >= 0 && j < countVal) {
              if (!isLoopHollowOption(optionForLoopItem(items[j]))) return j;
              j += step;
            }
            return -1;
          };
          const hollowNotes = Array.from({ length: countVal }, (_, i) => i)
            .filter(isEffectiveLoopHollow)
            .map(hollowIdx => {
              const beforeIdx = nearestNonHollowIndex(hollowIdx, -1);
              const afterIdx = nearestNonHollowIndex(hollowIdx, 1);
              const beforeOpt = optionForLoopItem(items[beforeIdx]);
              const afterOpt = optionForLoopItem(items[afterIdx]);
              const afterIsLast = afterIdx === countVal - 1;
              const deltaId = afterIsLast ? 'deltatn' : 'deltat';
              const deltaVal = afterIdx >= 0 ? perIterVals[deltaId]?.[afterIdx] : NaN;
              const hollowThickness = loopLayerThickness(items[hollowIdx]);
              return {
                hollowIdx,
                beforeIdx,
                afterIdx,
                beforeLabel: beforeOpt?.label || 'vorherige Schicht',
                afterLabel: afterOpt?.label || 'nachfolgende Schicht',
                afterIsLast,
                afterProtectsDelta: isLoopDeltaProtectingOption(afterOpt),
                deltaVal,
                hollowThickness,
              };
            });
          const ignoredHollowNotes = Array.from({ length: countVal }, (_, i) => i)
            .filter(i => isLoopHollowOption(optionForLoopItem(items[i])) && !isEffectiveLoopHollow(i))
            .map(i => ({ idx: i, thickness: loopLayerThickness(items[i]) }));

          return (
            <div key={n.id} style={{ ...card, background: '#fff7f0', borderColor: '#c2410c', padding: '10px 14px' }}>
              {lb.label && <div style={{ fontWeight: 600, fontSize: 13, color: '#c2410c', marginBottom: 8 }}>{lb.label}</div>}

              {/* Globale Variablen (einmal für alle Schichten) */}
              {globalVars.length > 0 && (
                <div style={{ background: '#fff', border: '1px solid #fed7aa', borderRadius: 6, padding: '8px 10px', marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#92400e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Globale Variablen (alle Schichten)</div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {globalVars.map(v => {
                      const rawVal = stateGlobals[v.id] ?? stateGlobals[v.name] ?? v.default_value ?? '';
                      return (
                        <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <MathDisplay latex={v.name} />
                          {v.inputKind === 'dropdown' ? (
                            <select
                              value={rawVal}
                              onChange={e => setGlobal({ [v.id]: e.target.value })}
                              style={{ minWidth: 110, border: '1.5px solid #fb923c', borderRadius: 4, padding: '3px 6px', fontSize: 13, background: '#fff' }}
                            >
                              {(v.options || []).map(o => <option key={`${o.label}_${o.value}`} value={o.value}>{o.label}</option>)}
                            </select>
                          ) : (
                            <input
                              type="number"
                              value={rawVal}
                              onChange={e => setGlobal({ [v.id]: e.target.value })}
                              style={{ width: 72, border: '1.5px solid #fb923c', borderRadius: 4, padding: '3px 6px', fontSize: 13, textAlign: 'right' }}
                            />
                          )}
                          {v.unit && <span style={{ fontSize: 11, color: '#9ca3af' }}>[{v.unit}]</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Anzahl Schichten */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{lb.count_label || 'Anzahl Schichten n'}</div>
                <input
                  type="number" min={1} max={lb.max_count || 8}
                  value={countVal}
                  onChange={e => {
                    const nc = Math.max(1, Math.min(Number(e.target.value) || 1, lb.max_count || 8));
                    setState({ count: String(nc), items: items.slice(0, nc) });
                  }}
                  style={{ width: 56, border: '1.5px solid #c2410c', borderRadius: 4, padding: '3px 6px', fontSize: 13, textAlign: 'center' }}
                />
              </div>

              {(hollowNotes.length > 0 || ignoredHollowNotes.length > 0) && (
                <div style={{ background: '#fff', border: '1px solid #fed7aa', borderRadius: 6, padding: '8px 10px', marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#92400e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sonderbedingungen Hohlraum</div>
                  {hollowNotes.map(note => (
                    <div key={note.hollowIdx} style={{ fontSize: 12, color: '#374151', lineHeight: 1.45, marginBottom: 8 }}>
                      <div><strong>Schicht {note.hollowIdx + 1}: Hohlraum {formatNumber(note.hollowThickness)} mm.</strong> Ab 40 mm wird der Hohlraum nach Tab. 236-1 berücksichtigt.</div>
                      {note.beforeIdx >= 0 && (
                        <div>Brandzugewandte Seite: Schicht {note.beforeIdx + 1} ({note.beforeLabel}) verwendet <MathDisplay latex="k_{pos,unexp}" /> gemäss Tab. 233-1. Auf dieser Seite wird kein Faktor <MathDisplay latex="1.6" /> und kein <MathDisplay latex="3 \cdot \Delta t" /> angesetzt.</div>
                      )}
                      {note.afterIdx >= 0 && (
                        <div>
                          Brandabgewandte Seite: Schicht {note.afterIdx + 1} ({note.afterLabel}) verwendet <MathDisplay latex="1.6 \cdot k_{pos,exp}" /> und <MathDisplay latex={note.afterIsLast ? '3 \\cdot \\Delta t_n' : '3 \\cdot \\Delta t_i'} />.
                          {isFinite(note.deltaVal) && <> Aktuell: <MathDisplay latex={`${note.afterIsLast ? '\\Delta t_n' : '\\Delta t_i'} = ${formatNumber(note.deltaVal)}\\;\\mathrm{min}`} />.</>}
                        </div>
                      )}
                      {note.afterIdx >= 0 && note.afterProtectsDelta && (
                        <div><MathDisplay latex="\Delta t" /> wird nur angesetzt, weil die Bedingung aus Kap. 2.3.4 mit Gipsplatte Typ F bzw. Gipsfaserplatte erfüllt ist.</div>
                      )}
                    </div>
                  ))}
                  {ignoredHollowNotes.map(note => (
                    <div key={note.idx} style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.45 }}>
                      Schicht {note.idx + 1}: Hohlraum {isFinite(note.thickness) ? formatNumber(note.thickness) : '-'} mm ist kleiner als 40 mm und wird gemäss Kap. 2.3.6 vernachlässigt.
                    </div>
                  ))}
                </div>
              )}

              {/* Iterationen */}
              {Array.from({ length: countVal }, (_, i) => {
                const item = items[i] ?? {};
                const selLabel = item['__sel__'] ?? '';
                const iterOutVals: Record<string, number> = {};
                for (const out of (lb.outputs || [])) {
                  iterOutVals[out.id] = perIterVals[out.id]?.[i] ?? NaN;
                }

                const optionMatches = (opt: any, selected: string) =>
                  opt?.id === selected || opt?.label === selected || (Array.isArray(opt?.aliases) && opt.aliases.includes(selected));
                const selectedOpt = (lb.options || []).find(opt => optionMatches(opt, selLabel));
                const optionForItem = (loopItem: Record<string, string> | undefined) => {
                  const selected = loopItem?.['__sel__'] ?? '';
                  return (lb.options || []).find(opt => optionMatches(opt, selected));
                };
                const isHollowOption = (opt: typeof selectedOpt) =>
                  String(opt?.category || opt?.label || '').toLowerCase().includes('hohlraum');
                const layerThickness = (loopItem: Record<string, string> | undefined) => {
                  if (!loopItem) return NaN;
                  for (const v of layerVars) {
                    const key = normalizeVarName(v.name || '');
                    const isThickness = key === 'd_i' || key === 'd' || key === 'd_n' || String(v.label || '').toLowerCase().includes('dicke');
                    if (!isThickness) continue;
                    const raw = loopItem[v.id] ?? loopItem[v.name] ?? v.default_value ?? '';
                    const num = parseFloat(String(raw).replace(',', '.'));
                    if (isFinite(num)) return num;
                  }
                  return NaN;
                };
                const isEffectiveHollow = (idx: number) => {
                  if (idx < 0 || idx >= countVal) return false;
                  const opt = optionForItem(items[idx]);
                  return isHollowOption(opt) && layerThickness(items[idx]) >= 40;
                };
                const outputApplies = (out: import('../types/graph').GroupCalcOutput) => {
                  const key = `${out.id || ''} ${out.name || ''} ${out.label || ''}`.toLowerCase();
                  if (out.id === 'kpos_hl_brandzugewandt' || out.id === 'kpos_hl_brandabgewandt') return false;
                  if (isHollowOption(selectedOpt)) return false;
                  if (out.scope === 'last' && i !== countVal - 1) return false;
                  if (out.id === 'tprot') return i < countVal - 1;
                  if (out.id === 'tins') return i === countVal - 1;
                  if (!key.includes('hohlraum') && !key.includes('_hl_') && !key.includes('pos,h')) return true;
                  if (key.includes('brandzugewandt')) return isEffectiveHollow(i + 1);
                  if (key.includes('brandabgewandt') || key.includes('pos,h')) return isEffectiveHollow(i - 1);
                  return isEffectiveHollow(i - 1) || isEffectiveHollow(i + 1);
                };

                // Werte-Map: globale Vars + per-Schicht-Vars dieser Iteration
                // Schlüssel = normalisierter JS-Name (ohne \, {} aufgelöst)
                const normalizeVarName = (n: string) =>
                  n
                    .replace(/\\/g, '')
                    .replace(/_\{([^{}]+)\}/g, (_m, sub: string) => '_' + sub.replace(/[,\s.]+/g, '_'))
                    .replace(/[{},\s.]+/g, '_')
                    .replace(/_+/g, '_')
                    .replace(/^_|_$/g, '');

                const varVals: Record<string, number> = {};
                for (const v of globalVars) {
                  const raw = stateGlobals[v.id] ?? stateGlobals[v.name] ?? v.default_value ?? '0';
                  const num = parseFloat(raw);
                  if (isFinite(num)) varVals[normalizeVarName(v.name)] = num;
                }
                for (const v of layerVars) {
                  const raw = item[v.id] ?? item[v.name] ?? v.default_value ?? '0';
                  const num = parseFloat(raw);
                  if (isFinite(num)) varVals[normalizeVarName(v.name)] = num;
                }
                for (const out of (lb.outputs || [])) {
                  const prevVals = (perIterVals[out.id] || []).slice(0, i).filter(isFinite);
                  const prevSum = prevVals.reduce((a, b) => a + b, 0);
                  const prevLast = prevVals.length ? prevVals[prevVals.length - 1] : NaN;
                  varVals[`sum_${out.id}_prev`] = prevSum;
                  varVals[`sum_${out.id}_before`] = prevSum;
                  if (isFinite(prevLast)) varVals[`prev_${out.id}`] = prevLast;
                  const currentVal = iterOutVals[out.id];
                  if (isFinite(currentVal)) {
                    varVals[out.id] = currentVal;
                    if (out.name) varVals[normalizeVarName(out.name)] = currentVal;
                  }
                }
                varVals.prev_is_hohlraum = isEffectiveHollow(i - 1) ? 1 : 0;
                varVals.next_is_hohlraum = isEffectiveHollow(i + 1) ? 1 : 0;

                const isLatex = (s: string) => s.includes('\\') || s.includes('^{');

                const indexLatexName = (name: string, idx: number | 'n' | 'j') => {
                  if (!name) return '';
                  return name
                    .replace(/_\{([^{}]*)\}/g, (_m, sub: string) => `_{${sub.replace(/(^|,)i(?=,|$)/g, `$1${idx}`)}}`)
                    .replace(/_i\b/g, `_${idx}`);
                };

                const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const splitTopLevelComma = (expr: string) => {
                  const parts: string[] = [];
                  let depth = 0;
                  let start = 0;
                  for (let idx = 0; idx < expr.length; idx++) {
                    const ch = expr[idx];
                    if (ch === '(' || ch === '[' || ch === '{') depth++;
                    else if (ch === ')' || ch === ']' || ch === '}') depth = Math.max(0, depth - 1);
                    else if (ch === ',' && depth === 0) {
                      parts.push(expr.slice(start, idx).trim());
                      start = idx + 1;
                    }
                  }
                  parts.push(expr.slice(start).trim());
                  return parts.filter(Boolean);
                };
                const splitTopLevelTernary = (expr: string) => {
                  let depth = 0;
                  let question = -1;
                  for (let idx = 0; idx < expr.length; idx++) {
                    const ch = expr[idx];
                    if (ch === '(' || ch === '[' || ch === '{') depth++;
                    else if (ch === ')' || ch === ']' || ch === '}') depth = Math.max(0, depth - 1);
                    else if (ch === '?' && depth === 0) { question = idx; break; }
                  }
                  if (question < 0) return null;
                  depth = 0;
                  for (let idx = question + 1; idx < expr.length; idx++) {
                    const ch = expr[idx];
                    if (ch === '(' || ch === '[' || ch === '{') depth++;
                    else if (ch === ')' || ch === ']' || ch === '}') depth = Math.max(0, depth - 1);
                    else if (ch === ':' && depth === 0) {
                      return {
                        cond: expr.slice(0, question).trim(),
                        yes: expr.slice(question + 1, idx).trim(),
                        no: expr.slice(idx + 1).trim(),
                      };
                    }
                  }
                  return null;
                };
                const replaceFunctionCall = (expr: string, fn: string, render: (content: string) => string) => {
                  let s = expr;
                  let guard = 0;
                  while (guard++ < 20) {
                    const start = s.indexOf(`${fn}(`);
                    if (start < 0) break;
                    const innerStart = start + fn.length + 1;
                    let depth = 1;
                    let end = innerStart;
                    for (; end < s.length; end++) {
                      if (s[end] === '(') depth++;
                      else if (s[end] === ')') {
                        depth--;
                        if (depth === 0) break;
                      }
                    }
                    if (depth !== 0) break;
                    const inner = s.slice(innerStart, end);
                    s = s.slice(0, start) + render(inner) + s.slice(end + 1);
                  }
                  return s;
                };
                const resolveConditionalExpression = (cond: string) => {
                  const replaced = substituteValues(cond, varVals)
                    .replace(/\s+/g, ' ')
                    .trim();
                  const match = replaced.match(/^(-?\d+(?:\.\d+)?)\s*(>=|<=|>|<|==|===|!=|!==)\s*(-?\d+(?:\.\d+)?)$/);
                  if (!match) return null;
                  const left = Number(match[1]);
                  const right = Number(match[3]);
                  switch (match[2]) {
                    case '>=': return left >= right;
                    case '<=': return left <= right;
                    case '>': return left > right;
                    case '<': return left < right;
                    case '==':
                    case '===': return left === right;
                    case '!=':
                    case '!==': return left !== right;
                    default: return null;
                  }
                };
                const resolveSimpleTernaries = (expr: string) => {
                  let s = expr;
                  let guard = 0;
                  const ternaryGroup = /\(([^()?:]+?)\?([^()?:]+?):([^()?:]+?)\)/;
                  while (guard++ < 20) {
                    const match = s.match(ternaryGroup);
                    if (!match) break;
                    const decision = resolveConditionalExpression(match[1]);
                    if (decision == null) break;
                    s = s.slice(0, match.index) + `(${decision ? match[2].trim() : match[3].trim()})` + s.slice((match.index || 0) + match[0].length);
                  }
                  return s;
                };
                const jsExprToLatex = (expr: string, replacements: Record<string, string>): string => {
                  let s = expr || '';
                  for (const [key, value] of Object.entries(replacements).sort((a, b) => b[0].length - a[0].length)) {
                    s = s.replace(new RegExp(`(?<![\\w$])${escapeRe(key)}(?![\\w$])`, 'g'), value);
                  }
                  const ternary = splitTopLevelTernary(s);
                  if (ternary) {
                    return `\\begin{cases} ${jsExprToLatex(ternary.yes, {})} & ${jsExprToLatex(ternary.cond, {})} \\\\ ${jsExprToLatex(ternary.no, {})} & \\text{sonst} \\end{cases}`;
                  }
                  s = replaceFunctionCall(s, 'Math.min', content => `\\min\\left(${splitTopLevelComma(content).map(part => jsExprToLatex(part, {})).join(', ')}\\right)`);
                  s = replaceFunctionCall(s, 'min', content => `\\min\\left(${splitTopLevelComma(content).map(part => jsExprToLatex(part, {})).join(', ')}\\right)`);
                  s = replaceFunctionCall(s, 'Math.sqrt', content => `\\sqrt{${content}}`);
                  s = replaceFunctionCall(s, 'sqrt', content => `\\sqrt{${content}}`);
                  return s
                    .replace(/\bMath\.pow\s*\(([^,()]+)\s*,\s*([^()]+)\)/g, '{$1}^{$2}')
                    .replace(/\*/g, '\\cdot ')
                    .replace(/<=/g, '\\le ')
                    .replace(/>=/g, '\\ge ')
                    .replace(/(?<![<>=!])>(?![=])/g, '>')
                    .replace(/(?<![<>=!])<(?![=])/g, '<')
                    .replace(/\s+/g, ' ')
                    .trim();
                };

                const buildLoopFormulaLatex = (expr: string, mode: 'symbols' | 'values', currentOutputId?: string) => {
                  const replacements: Record<string, string> = {};
                  for (const v of globalVars) {
                    const raw = stateGlobals[v.id] ?? stateGlobals[v.name] ?? v.default_value ?? '0';
                    replacements[normalizeVarName(v.name)] = mode === 'values' ? formatNumber(parseFloat(raw)) : v.name;
                  }
                  for (const v of layerVars) {
                    const raw = item[v.id] ?? item[v.name] ?? v.default_value ?? '0';
                    replacements[normalizeVarName(v.name)] = mode === 'values' ? formatNumber(parseFloat(raw)) : indexLatexName(v.name, i + 1) || v.name;
                  }
                  for (const out of (lb.outputs || [])) {
                    const prevVals = (perIterVals[out.id] || []).slice(0, i).filter(isFinite);
                    const currentVal = iterOutVals[out.id];
                    const prevSymbolTerms = prevVals.map((_, pi) => indexLatexName(out.name, pi + 1) || `${out.id}_{${pi + 1}}`);
                    const prevValueTerms = prevVals.map(v => formatNumber(v));
                    const sumUpper = i === countVal - 1 ? 'n-1' : String(i);
                    const sumSymbol = out.name
                      ? `\\sum_{j=1}^{${sumUpper}} ${indexLatexName(out.name, 'j') || `${out.id}_{j}`}`
                      : `\\sum_{j=1}^{${sumUpper}} ${out.id}_{j}`;
                    const sumText = mode === 'values'
                      ? (prevValueTerms.length ? `(${prevValueTerms.join(' + ')})` : '0')
                      : (prevSymbolTerms.length ? sumSymbol : '0');
                    replacements[`sum_${out.id}_prev`] = sumText;
                    replacements[`sum_${out.id}_before`] = sumText;
                    const prevLast = prevVals.length ? prevVals[prevVals.length - 1] : NaN;
                    if (isFinite(prevLast)) {
                      let prevSymbol = prevSymbolTerms[prevSymbolTerms.length - 1] || `prev_${out.id}`;
                      if (out.id === 'tprot' && currentOutputId === 'deltat') prevSymbol = 't_{prot,i-1}';
                      if (out.id === 'tprot' && currentOutputId === 'deltatn') prevSymbol = 't_{prot,n-1}';
                      replacements[`prev_${out.id}`] = mode === 'values' ? formatNumber(prevLast) : prevSymbol;
                    }
                    replacements[out.id] = mode === 'values'
                      ? (isFinite(currentVal) ? formatNumber(currentVal) : '?')
                      : (indexLatexName(out.name, i + 1) || `${out.id}_{${i + 1}}`);
                    if (out.name) {
                      replacements[normalizeVarName(out.name)] = replacements[out.id];
                    }
                  }
                  if (mode === 'values') {
                    for (const [key, value] of Object.entries(varVals)) {
                      if (!(key in replacements)) replacements[key] = formatNumber(value);
                    }
                  }
                  const displayExpr = resolveSimpleTernaries(expr);
                  return jsExprToLatex(displayExpr, replacements);
                };
                const loopUnit = (unit?: string) => {
                  const u = unitLatex(unit);
                  return u ? `\\;${u}` : '';
                };

                // Substitution in LaTeX-Formel: Var-Namen durch Zahlenwerte ersetzen
                // Probiert sowohl `d_i` als auch `d_{i}` Schreibweisen
                const substituteLatex = (tex: string) => {
                  let s = tex;
                  const entries = Object.entries(varVals).sort((a, b) => b[0].length - a[0].length);
                  for (const [jsName, val] of entries) {
                    const numStr = formatNumber(val);
                    // Formen zum Ausprobieren: d_i, d_{i}, und für Griechisch: \beta_0, \beta_{0}
                    const forms: string[] = [
                      '\\' + jsName,                                          // \beta_0 (griechisch)
                      '\\' + jsName.replace(/_([A-Za-z0-9]+)$/g, '_{$1}'),  // \beta_{0}
                      jsName,                                                  // d_i
                      jsName.replace(/_([A-Za-z0-9]+)$/g, '_{$1}'),          // d_{i}
                    ];
                    for (const form of forms) {
                      const esc = form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                      try { s = s.replace(new RegExp(esc + '(?![\\w{])', 'g'), numStr); } catch { /* */ }
                    }
                  }
                  return s;
                };

                return (
                  <div key={i} style={{ border: '1px solid #fed7aa', borderRadius: 6, padding: '8px 10px', marginBottom: 8, background: '#fff' }}>
                    <div style={{ fontWeight: 600, fontSize: 11, color: '#c2410c', marginBottom: 6 }}>
                      Schicht {i + 1}{i === countVal - 1 ? ' (n = letzte)' : ''}
                    </div>

                    {/* Material-Dropdown */}
                    <div style={{ marginBottom: 6 }}>
                      <div style={lbl}>{lb.dropdown_label || 'Material'}</div>
                      <select
                        value={selLabel}
                        onChange={e => setItem(i, { '__sel__': e.target.value })}
                        style={{ width: '100%', border: '1px solid #fb923c', borderRadius: 4, padding: '4px 6px', fontSize: 12, background: '#fff' }}
                      >
                        <option value="">— wählen —</option>
                        {(lb.options || []).map(opt => (
                          <option key={opt.id} value={opt.label}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Per-Schicht-Variablen */}
                    {scopedLayerVars.filter(v => v.scope !== 'last' || i === countVal - 1).length > 0 && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                        {scopedLayerVars.filter(v => v.scope !== 'last' || i === countVal - 1).map(v => {
                          const rawVal = item[v.id] ?? item[v.name] ?? v.default_value ?? '';
                          return (
                            <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 4, flex: '0 0 auto' }}>
                              <MathDisplay latex={v.name} />
                              {v.inputKind === 'dropdown' ? (
                                <select
                                  value={rawVal}
                                  onChange={e => setItem(i, { [v.id]: e.target.value })}
                                  style={{ minWidth: 96, border: '1px solid #fed7aa', borderRadius: 4, padding: '3px 5px', fontSize: 12, background: '#fff' }}
                                >
                                  {(v.options || []).map(o => <option key={`${o.label}_${o.value}`} value={o.value}>{o.label}</option>)}
                                </select>
                              ) : (
                                <input
                                  type="number"
                                  value={rawVal}
                                  onChange={e => setItem(i, { [v.id]: e.target.value })}
                                  style={{ width: 64, border: '1px solid #fed7aa', borderRadius: 4, padding: '3px 5px', fontSize: 12, textAlign: 'right' }}
                                />
                              )}
                              {v.unit && <span style={{ fontSize: 10, color: '#9ca3af' }}>[{v.unit}]</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Zusatzrechnungen des Materials */}
                    {selectedOpt && (selectedOpt.calcs || []).map(calc => {
                      const val = perIterCalcVals[calc.id]?.[i] ?? NaN;
                      const activeCalcFormula = perIterCalcFormulas[calc.id]?.[i];
                      const formula = activeCalcFormula !== undefined ? activeCalcFormula : (calc.formula || '');
                      if (!formula && !isFinite(val)) return null;
                      if (calc.name && isFinite(val)) varVals[normalizeVarName(calc.name)] = val;
                      const isLatexFormula = isLatex(formula);
                      const subLatex = isLatexFormula ? substituteLatex(formula) : '';
                      const jsFormula = isLatexFormula ? latexToJs(formula) : formula;
                      const subJs = jsFormula ? substituteValues(jsFormula, varVals) : '';
                      const symbolFormula = !isLatexFormula ? buildLoopFormulaLatex(jsFormula, 'symbols') : '';
                      const valueFormula = !isLatexFormula ? buildLoopFormulaLatex(jsFormula, 'values') : '';
                      return (
                        <div key={calc.id} style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 2, padding: '8px 12px', marginTop: 6, overflowX: 'auto', minHeight: 72 }}>
                          <div style={{ fontSize: 12, color: '#c2410c', fontWeight: 700, marginBottom: 4 }}>
                            {calc.name && <MathDisplay latex={calc.name} />}
                          </div>
                          <div style={{ color: '#111827', fontSize: 17, fontWeight: 500, lineHeight: 1.6 }}>
                            {isLatexFormula
                              ? <MathDisplay
                                  latex={`${calc.label || ''}${calc.label ? ' = ' : ''}${subLatex || formula}${isFinite(val) ? ` = \\underline{${formatNumber(val)}${loopUnit(calc.unit)}}` : ''}`}
                                  display
                                />
                              : <>
                                  <MathDisplay latex={`${calc.label ? `\\text{${calc.label}} = ` : ''}${symbolFormula}`} display />
                                  <MathDisplay latex={`= ${valueFormula}${isFinite(val) ? ` = \\underline{${formatNumber(val)}${loopUnit(calc.unit)}}` : ''}`} display />
                                </>
                            }
                          </div>
                        </div>
                      );
                    })}

                    {/* Ausgaben dieser Iteration — mit Formelzeile */}
                    {selLabel && (lb.outputs || []).map(out => {
                      if (!outputApplies(out)) return null;
                      const val = iterOutVals[out.id];
                      const formula = perIterFormulas[out.id]?.[i] ?? selectedOpt?.formulas?.[out.id] ?? '';
                      const isLatexFormula = isLatex(formula);
                      // Substitution: LaTeX-Formel → Werte einsetzen
                      const subLatex = isLatexFormula ? substituteLatex(formula) : '';
                      // JS-Formel: latexToJs konvertieren, dann substituteValues
                      const jsFormula = isLatexFormula ? latexToJs(formula) : formula;
                      const subJs = jsFormula ? substituteValues(jsFormula, varVals) : '';
                      const hasSubstitution = isLatexFormula
                        ? (subLatex !== formula && subLatex.trim() !== '')
                        : (subJs !== jsFormula && subJs.trim() !== '');
                      const symbolFormula = !isLatexFormula ? buildLoopFormulaLatex(jsFormula, 'symbols', out.id) : '';
                      const valueFormula = !isLatexFormula ? buildLoopFormulaLatex(jsFormula, 'values', out.id) : '';
                      const isHollowAdjustedKpos = varVals.prev_is_hohlraum >= 1 && (out.id === 'kposn' || out.id === 'kposi');
                      const adjustedKposName = out.id === 'kposn' ? 'k_{pos,exp,n}' : `k_{pos,exp,${i + 1}}`;
                      return (
                        <div key={out.id} style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 2, padding: '8px 12px', marginTop: 6, overflowX: 'auto', minHeight: 82 }}>
                          <div style={{ fontSize: 12, color: '#c2410c', fontWeight: 700, marginBottom: 4 }}>
                            {out.name && <MathDisplay latex={out.name} />}
                          </div>
                          <div style={{ color: '#111827', fontSize: 18, fontWeight: 500, lineHeight: 1.6 }}>
                            {formula
                              ? isLatexFormula
                                ? <MathDisplay
                                    latex={`${out.label || ''}${out.label ? ' = ' : ''}${hasSubstitution ? subLatex : formula}${isFinite(val) ? ` = \\underline{${formatNumber(val)}${loopUnit(out.unit)}}` : ''}`}
                                    display
                                  />
                                : <>
                                    <MathDisplay latex={`${out.label ? `\\text{${out.label}} = ` : ''}${symbolFormula}`} display />
                                    <MathDisplay latex={`= ${valueFormula}${isFinite(val) ? ` = \\underline{${formatNumber(val)}${loopUnit(out.unit)}}` : ''}`} display />
                                  </>
                              : <span style={{ color: isFinite(val) ? '#111827' : '#6b7280', fontWeight: 800 }}>
                                  {out.label && <span style={{ marginRight: 4 }}>{out.label}</span>}
                                  {isFinite(val) ? formatNumber(val) : '—'} {out.unit}
                                </span>
                            }
                            {isHollowAdjustedKpos && isFinite(val) && (
                              <div style={{ marginTop: 6, fontSize: 15 }}>
                                <MathDisplay latex={`\\text{Hohlraum brandabgewandt: } 1.6 \\cdot ${adjustedKposName} = 1.6 \\cdot ${formatNumber(val)} = \\underline{${formatNumber(1.6 * val)}}`} display />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {/* Aggregations-Ergebnisse */}
              {(lb.aggregations || []).length > 0 && (
                <div style={{ borderTop: '2px solid #c2410c', marginTop: 8, paddingTop: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#c2410c', marginBottom: 6 }}>Gesamtergebnis</div>
                  {(lb.aggregations || []).map((ag, ai) => {
                    const val = aggrVals[ag.output_id];
                    const tprotVals = (perIterVals.tprot || []).slice(0, Math.max(0, countVal - 1)).filter(isFinite);
                    const lastTins = (perIterVals.tins || [])[countVal - 1];
                    const isTotal = ag.output_id === 't_total' || ag.name === 't_{ins}';
                    const agUnit = (unit?: string) => {
                      const u = unitLatex(unit);
                      return u ? `\\;${u}` : '';
                    };
                    const methodLabel = ag.method === 'sum' ? 'Σ' : ag.method === 'last' ? 'letzte Schicht' : ag.method === 'expr' ? 'Ausdruck' : ag.method;
                    if (isTotal) {
                      const valueTerms = [...tprotVals.map(v => formatNumber(v)), ...(isFinite(lastTins) ? [formatNumber(lastTins)] : [])];
                      const valueFormula = valueTerms.length ? valueTerms.join(' + ') : '0';
                      return (
                        <div key={ai} style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 4, padding: '10px 12px', marginBottom: 8, overflowX: 'auto' }}>
                          <div style={{ fontSize: 12, color: '#c2410c', fontWeight: 700, marginBottom: 4 }}>{ag.label}</div>
                          <div style={{ color: '#111827', fontSize: 18, fontWeight: 500, lineHeight: 1.6 }}>
                            <MathDisplay latex={`${ag.name || 't_{ins}'} = \\sum_{i=1}^{n-1} t_{prot,i} + t_{ins,n}`} display />
                            <MathDisplay latex={`= ${valueFormula}${isFinite(val) ? ` = \\underline{${formatNumber(val)}${agUnit(ag.unit)}}` : ''}`} display />
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={ai} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div>
                          <div style={{ fontSize: 11, color: '#6b7280' }}>{ag.label} <span style={{ color: '#9ca3af' }}>({methodLabel})</span></div>
                          {ag.name && <MathDisplay latex={ag.name} />}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: isFinite(val) ? '#c2410c' : '#9ca3af' }}>
                            {isFinite(val) ? formatNumber(val) : '—'}
                          </div>
                          {ag.unit && <div style={{ fontSize: 10, color: '#9ca3af' }}>[{ag.unit}]</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        if (n.type === 'groupcalc') {
          const gc = d as import('../types/graph').GroupCalcData;
          let state: Record<string, string> = {};
          try { state = JSON.parse(inputs[n.id] as string ?? '{}'); } catch { /* */ }

          const setState = (patch: Record<string, string>) => {
            const next = { ...state, ...patch };
            setInput(n.id, JSON.stringify(next));
          };

          const selLabel = state['__sel__'] ?? '';
          const res = ev?.results?.[n.id];
          const outVals: Record<string, number> = (res as any)?.matrixVals ?? {};
          const outLatex: Record<string, string> = (res as any)?.matrixLatex ?? {};

          return (
            <div key={n.id} style={{ ...card, background: '#f0fdfa', borderColor: '#0f766e', padding: '10px 14px' }}>
              {gc.label && <div style={{ fontWeight: 600, fontSize: 13, color: '#0f766e', marginBottom: 8 }}>{gc.label}</div>}

              {/* Dropdown */}
              <div style={{ marginBottom: 8 }}>
                <div style={lbl}>{gc.dropdown_label || 'Auswahl'}</div>
                <select
                  value={selLabel}
                  onChange={e => setState({ '__sel__': e.target.value })}
                  style={{ width: '100%', border: '1.5px solid #0f766e', borderRadius: 5, padding: '5px 8px', fontSize: 13, background: '#fff', color: '#134e4a' }}
                >
                  <option value="">— wählen —</option>
                  {(gc.options || []).map(opt => (
                    <option key={opt.id} value={opt.label}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Eingabe-Variablen */}
              {(gc.vars || []).map(v => {
                const rawVal = state[v.id] ?? state[v.name] ?? v.default_value ?? '';
                return (
                  <div key={v.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 6, gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 1 }}>{v.label}</div>
                      {v.name && <MathDisplay latex={v.name.includes('_{') ? v.name : nameToLatex(v.name)} />}
                    </div>
                    <input
                      type="number"
                      value={rawVal}
                      onChange={e => setState({ [v.id]: e.target.value })}
                      style={{ width: 80, border: '1px solid #5eead4', borderRadius: 4, padding: '4px 6px', fontSize: 13, textAlign: 'right' }}
                    />
                    {v.unit && <div style={{ fontSize: 11, color: '#6b7280', minWidth: 32 }}>[{v.unit}]</div>}
                  </div>
                );
              })}

              {/* Ausgaben */}
              {(gc.outputs || []).length > 0 && (gc.vars || []).length > 0 && <div style={{ borderTop: '1px solid #5eead4', marginTop: 6, paddingTop: 6 }} />}
              {(gc.outputs || []).map(out => {
                const val = outVals[out.id];
                const latex = outLatex[out.id];
                return (
                  <div key={out.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{out.label}</div>
                      {out.name && <MathDisplay latex={out.name.includes('_{') ? out.name : nameToLatex(out.name)} />}
                      {latex && selLabel && (
                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                          = <MathDisplay latex={latex} />
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: isFinite(val) ? '#0f766e' : '#9ca3af' }}>
                        {isFinite(val) ? formatNumber(val) : '—'}
                      </div>
                      {out.unit && <div style={{ fontSize: 11, color: '#6b7280' }}>[{out.unit}]</div>}
                    </div>
                  </div>
                );
              })}

              {!selLabel && (gc.options || []).length > 0 && (
                <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 4 }}>
                  Material wählen um Berechnung zu starten
                </div>
              )}
            </div>
          );
        }

        if (n.type === 'comment') {
          const cd = d as import('../types/graph').CommentData;
          const tbl = cd.table_ref ? tables[cd.table_ref] : null;
          const chartJson = tbl?.chart_json ?? null;
          return (
            <div key={n.id} style={{ ...card, background: '#fffbeb', borderColor: '#fcd34d' }}>
              {/* Kommentartext */}
              {cd.text && (
                <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: cd.extra !== 'none' ? 10 : 0 }}>
                  {cd.text}
                </div>
              )}

              {/* Link */}
              {cd.extra === 'link' && cd.link_url && (
                <a href={cd.link_url} target="_blank" rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 5, color: '#92400e', fontSize: 12, textDecoration: 'none', fontWeight: 500 }}>
                  🔗 {cd.link_label || cd.link_url}
                </a>
              )}

              {/* Bild */}
              {cd.extra === 'image' && cd.image && (
                <div>
                  <img src={cd.image} style={{ maxWidth: '100%', maxHeight: 320, objectFit: 'contain', borderRadius: 5, border: '1px solid #fcd34d', display: 'block', cursor: 'pointer' }}
                    onClick={() => setImageModal({ src: cd.image!, label: cd.image_caption, source: cd.image_source })} />
                  {(cd.image_caption || cd.image_source) && (
                    <div style={{ marginTop: 4 }}>
                      {cd.image_caption && <div style={{ fontSize: 11, color: '#374151' }}>{cd.image_caption}</div>}
                      {cd.image_source && <div style={{ fontSize: 10, color: '#9ca3af' }}>Quelle: {cd.image_source}</div>}
                    </div>
                  )}
                </div>
              )}

              {/* Diagramm aus lokalen Daten */}
              {cd.extra === 'chart' && chartJson && (() => {
                const series: any[] = chartJson.series ?? [];
                const allX = series.flatMap((s: any) => (s.data ?? []).map((p: any) => p[0]));
                const xMin = Math.min(...allX), xMax = Math.max(...allX);
                const chartData = [];
                const steps = 80;
                for (let i = 0; i <= steps; i++) {
                  const xv = xMin + (xMax - xMin) * i / steps;
                  const pt: Record<string, number> = { x: xv };
                  series.forEach((s: any) => {
                    const pts: [number, number][] = s.data ?? [];
                    for (let j = 0; j < pts.length - 1; j++) {
                      if (xv >= pts[j][0] && xv <= pts[j + 1][0]) {
                        const t2 = (xv - pts[j][0]) / (pts[j + 1][0] - pts[j][0]);
                        pt[s.name] = pts[j][1] + t2 * (pts[j + 1][1] - pts[j][1]);
                        break;
                      }
                    }
                  });
                  chartData.push(pt);
                }
                return (
                  <div>
                    {tbl?.headers?.[0] && <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 2 }}>{tbl?.headers?.[0] ?? ''}</div>}
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 16, left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']}
                          tickFormatter={(v: number) => String(Math.round(v * 10) / 10)}
                          label={{ value: chartJson.xAxis?.label ?? '', position: 'insideBottom', offset: -8, fontSize: 10 }}
                          tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 9 }}
                          label={{ value: chartJson.yAxis?.label ?? '', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                        <Tooltip formatter={(v: any) => [typeof v === 'number' ? Math.round(v * 1000) / 1000 : v]} labelFormatter={(l: any) => `x = ${Math.round(Number(l) * 100) / 100}`} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        {series.map((s: any, i: number) => (
                          <Line key={s.name} type="monotone" dataKey={s.name} stroke={CHART_COLORS[i % CHART_COLORS.length]} dot={false} strokeWidth={1.5} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}

              {/* Tabelle aus lokalen Daten */}
              {cd.extra === 'table' && tbl && (
                <div style={{ overflowX: 'auto' }}>
                  {tbl.headers.length > 0 && (
                    <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
                      <thead>
                        <tr>
                          {tbl.headers.map((h, i) => (
                            <th key={i} style={{ padding: '4px 8px', fontWeight: 600, color: '#374151', background: '#fef3c7', borderBottom: '2px solid #fcd34d', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tbl.rows.map((row, ri) => (
                          <tr key={ri} style={{ background: ri % 2 === 0 ? '#fffbeb' : '#fff' }}>
                            {row.map((cell, ci) => (
                              <td key={ci} style={{ padding: '3px 8px', borderBottom: '1px solid #fef3c7', color: '#374151' }}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Ladezustand */}
              {(cd.extra === 'chart' || cd.extra === 'table') && cd.table_ref && !tbl && (
                <div style={{ fontSize: 11, color: '#9ca3af' }}>Tabelle wird geladen…</div>
              )}
            </div>
          );
        }

        return null;
      })}

      {/* Bild-Modal (Info-Button) */}
      {imageModal && (
        <div onClick={() => setImageModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
            <button onClick={() => setImageModal(null)} style={{ position: 'absolute', top: 6, right: 8, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#374151', lineHeight: 1, zIndex: 1 }}>×</button>
            <img src={imageModal.src} style={{ maxWidth: '85vw', maxHeight: '80vh', objectFit: 'contain', display: 'block' }} />
            {(imageModal.label || imageModal.source) && (
              <div style={{ padding: '8px 14px', borderTop: '1px solid #e5e7eb', background: '#f8fafc' }}>
                {imageModal.label && <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 2 }}>{imageModal.label}</div>}
                {imageModal.source && <div style={{ fontSize: 11, color: '#6b7280' }}>Quelle: {imageModal.source}</div>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ergebnis-Box */}
      {resultNode && isEta && (
        <div style={{
          padding: 12, borderRadius: 8, marginTop: 4,
          background: resultVal != null && resultVal <= 1 ? '#d1fae5' : '#fee2e2',
          border: `1px solid ${resultVal != null && resultVal <= 1 ? '#6ee7b7' : '#fca5a5'}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 24 }}>{resultVal != null && resultVal <= 1 ? '✅' : '❌'}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: resultVal != null && resultVal <= 1 ? '#065f46' : '#991b1b' }}>
              {`η = ${num(resultVal)} ${resultVal != null && resultVal <= 1 ? '≤ 1.0 → erfüllt' : '> 1.0 → nicht erfüllt'}`}
            </div>
            {resultVal != null && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Ausnutzung: {(resultVal * 100).toFixed(1)}%</div>}
          </div>
        </div>
      )}

      {/* Override-Modal */}
      {overrideModal && (
        <div onClick={() => setOverrideModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 10px 40px rgba(0,0,0,0.3)', minWidth: 300 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 12 }}>Wert ändern</div>
            <input
              type="text"
              autoFocus
              defaultValue={String(overrideModal.currentValue)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (val) {
                    const num = parseFloat(val);
                    if (!isNaN(num)) {
                      setInput(`${overrideModal.nodeId}_override`, String(num));
                      setOverrideModal(null);
                    }
                  }
                }
              }}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #cbd5e1',
                borderRadius: 4,
                fontSize: 13,
                fontFamily: 'monospace',
                marginBottom: 12,
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setOverrideModal(null)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 4,
                  background: '#fff',
                  color: '#374151',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => {
                  const input = (document.activeElement as HTMLInputElement);
                  const val = input?.value?.trim();
                  if (val) {
                    const num = parseFloat(val);
                    if (!isNaN(num)) {
                      setInput(`${overrideModal.nodeId}_override`, String(num));
                      setOverrideModal(null);
                    }
                  }
                }}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  borderRadius: 4,
                  background: '#4f46e5',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diagramm-Modal */}
      {chartModal && (() => {
        const node = graph.nodes.find(n => n.id === chartModal);
        if (!node) return null;
        const nd = node.data as any;
        const cj = tables[nd.chart_ref]?.chart_json;
        if (!cj) return null;
        const inputVal: number = (ev.results[chartModal] as any)?.inputValue ?? NaN;
        return (
          <ChartLookupModal
            chartJson={cj}
            xAxisLabel={cj.xAxis?.label ?? 'x'}
            yAxisLabel={cj.yAxis?.label ?? 'y'}
            xUnit={cj.xAxis?.unit ?? ''}
            currentX={inputVal}
            direction={nd.direction ?? 'x_to_y'}
            onClose={() => setChartModal(null)}
          />
        );
      })()}
    </div>
  );
}
