import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap, addEdge,
  useNodesState, useEdgesState, useReactFlow, ReactFlowProvider,
  Connection, Edge, Node, MarkerType, NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeTypes } from './BlockNodes';
import { GraphCtx, DbTableMeta, DbTableFull } from './graphContext';
import { api } from '../../../api';
import { useStore } from '../../../store/useStore';
import {
  VerificationGraph, BlockType, BlockData, GraphNode, GraphEdge,
} from '../../../types/graph';

const PALETTE: { type: BlockType; icon: string; label: string; color: string }[] = [
  { type: 'variable',   icon: '🟪', label: 'Variabel',          color: '#7c3aed' },
  { type: 'dropdown',   icon: '🟧', label: 'Dropdown',          color: '#ea580c' },
  { type: 'woodclass',  icon: '🟨', label: 'Holzklasse',        color: '#ca8a04' },
  { type: 'tablevalue', icon: '🟩', label: 'Tabellenwert',      color: '#16a34a' },
  { type: 'calc',       icon: '🟥', label: 'Rechnung',          color: '#dc2626' },
  { type: 'stdcalc',    icon: '🟫', label: 'Std-Berechnung',    color: '#92400e' },
  { type: 'tablecalc',  icon: '🟦', label: 'Tabellenberechnung', color: '#2563eb' },
  { type: 'chartlookup', icon: '📉', label: 'Diagramm-Wert',    color: '#059669' },
  { type: 'condition',  icon: '🔶', label: 'Bedingung',         color: '#ca8a04' },
  { type: 'check',      icon: '✅', label: 'Nachweis',          color: '#059669' },
  { type: 'minmax',     icon: '↕',  label: 'Min / Max',         color: '#be123c' },
  { type: 'image',      icon: '🖼', label: 'Bild',              color: '#a855f7' },
  { type: 'output',     icon: '⬜', label: 'PDF / Ausgabe',     color: '#6b7280' },
];

function defaultData(type: BlockType): BlockData {
  switch (type) {
    case 'variable':   return { kind: 'variable', name: '', label: '', unit: '', default_value: '0', inputKind: 'number', options: [] };
    case 'dropdown':   return { kind: 'dropdown', name: '', label: '', mode: 'custom', options: [] };
    case 'woodclass':  return { kind: 'woodclass', label: 'Aktuelle Holzklasse' };
    case 'tablevalue': return { kind: 'tablevalue', name: '', label: '', unit: '', table_col: 1 };
    case 'calc':       return { kind: 'calc', name: '', label: '', unit: '', latex: '', expr: '' };
    case 'stdcalc':    return { kind: 'stdcalc', name: '', label: '', unit: '', latex: '', expr: '', picker_name: '' };
    case 'tablecalc':    return { kind: 'tablecalc', name: '', label: '', unit: '', zones: [], expr: 'cell' };
    case 'chartlookup':  return { kind: 'chartlookup', chart_ref: '', series_index: 0, x_name: '', name: '', label: '', unit: '' };
    case 'condition':    return { kind: 'condition', label: '', conditions: [] };
    case 'check':      return { kind: 'check', label: '', latex: '', expr: '' };
    case 'minmax':     return { kind: 'minmax', name: '', label: '', unit: '', latex: '', expr: '' };
    case 'image':      return { kind: 'image', label: '' };
    case 'output':     return { kind: 'output', label: 'PDF', blocks: [] };
  }
}

interface Props {
  graph: VerificationGraph;
  onChange: (g: VerificationGraph) => void;
  dbTables: DbTableMeta[];
}

interface GraphClipboard {
  nodes: Node[];
  edges: Edge[];
}

type GraphSnapshot = GraphClipboard;

function cloneData<T>(value: T): T {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value));
}

function cloneGraphState(nodes: Node[], edges: Edge[]): GraphSnapshot {
  return {
    nodes: nodes.map(n => ({ ...n, data: cloneData(n.data) })),
    edges: edges.map(e => ({ ...e, data: cloneData(e.data) })),
  };
}

function snapshotKey(snapshot: GraphSnapshot) {
  return JSON.stringify({
    nodes: snapshot.nodes.map(n => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data,
      selected: Boolean(n.selected),
    })),
    edges: snapshot.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      data: e.data,
      selected: Boolean(e.selected),
    })),
  });
}

function remapCopiedNodeData(data: any, idMap: Map<string, string>) {
  const next = cloneData(data);
  if (next.source_dropdown && idMap.has(next.source_dropdown)) next.source_dropdown = idMap.get(next.source_dropdown);
  if (next.source_tablecalc && idMap.has(next.source_tablecalc)) next.source_tablecalc = idMap.get(next.source_tablecalc);
  if (Array.isArray(next.blocks)) next.blocks = next.blocks.map((id: string) => idMap.get(id) || id);
  return next;
}

function GraphEditorInner({ graph, onChange, dbTables }: Props) {
  const globalUnits = useStore(s => s.globalUnits);
  const { screenToFlowPosition } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(
    graph.nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data as any, ...(n.style ? { style: n.style } : {}) })),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    graph.edges.map(e => ({
      id: e.id, source: e.source, target: e.target,
      sourceHandle: e.sourceHandle ?? undefined, targetHandle: e.targetHandle ?? undefined,
      data: e.data as any, animated: e.data?.kind === 'condition',
      style: { stroke: e.data?.kind === 'condition' ? '#ca8a04' : '#64748b', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed },
    })),
  );
  const [pickTargetId, setPickTargetId] = useState<string | null>(null);
  const [clipboardCount, setClipboardCount] = useState(0);
  const [lassoMode, setLassoMode] = useState(false);
  const [, setHistoryVersion] = useState(0);
  const tableCache = useRef<Map<string, DbTableFull>>(new Map());
  const clipboardRef = useRef<GraphClipboard | null>(null);
  const historyRef = useRef<GraphSnapshot[]>([]);
  const historyIndexRef = useRef(-1);
  const restoringHistoryRef = useRef(false);
  const idCounter = useRef(1);
  const newId = (t: string) => `${t}_${Date.now().toString(36)}_${idCounter.current++}`;

  // Serialisieren → an Parent melden
  useEffect(() => {
    const g: VerificationGraph = {
      version: 1,
      nodes: nodes.map(n => {
        const gn: GraphNode = { id: n.id, type: n.type as BlockType, position: n.position, data: n.data as any };
        // Grösse (vom NodeResizer) speichern
        const w = (n.style as any)?.width ?? n.width;
        const h = (n.style as any)?.height ?? n.height;
        if (w || h) gn.style = { ...(w ? { width: w } : {}), ...(h ? { height: h } : {}) };
        return gn;
      }) as GraphNode[],
      edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle ?? null, targetHandle: e.targetHandle ?? null, data: (e.data as any) || { kind: 'workflow' } })) as GraphEdge[],
    };
    onChange(g);
  }, [nodes, edges]);

  useEffect(() => {
    if (restoringHistoryRef.current) {
      restoringHistoryRef.current = false;
      return;
    }
    const snapshot = cloneGraphState(nodes, edges);
    const index = historyIndexRef.current;
    const current = index >= 0 ? historyRef.current[index] : null;
    if (current && snapshotKey(current) === snapshotKey(snapshot)) return;

    const nextHistory = historyRef.current.slice(0, index + 1);
    nextHistory.push(snapshot);
    if (nextHistory.length > 80) nextHistory.shift();
    historyRef.current = nextHistory;
    historyIndexRef.current = nextHistory.length - 1;
    setHistoryVersion(v => v + 1);
  }, [nodes, edges]);

  const updateNodeData = useCallback((id: string, patch: Partial<BlockData>) => {
    setNodes(nds => {
      const target = nds.find(n => n.id === id);
      if (!target) return nds;
      return nds.map(n => {
        if (n.id === id) return { ...n, data: { ...(n.data as any), ...patch } };
        // Patch auch alle anderen selektierten Blöcke gleichen Typs
        if (target.selected && n.selected && n.type === target.type) {
          return { ...n, data: { ...(n.data as any), ...patch } };
        }
        return n;
      });
    });
  }, [setNodes]);

  // Wrapper: bei Resize eines selektierten Blocks → gleiche Grösse an alle selektierten Blöcke
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
    const dimChange = changes.find((c: any) => c.type === 'dimensions' && c.dimensions) as any;
    if (!dimChange) return;
    setNodes(nds => {
      const selectedIds = new Set(nds.filter(n => n.selected).map(n => n.id));
      if (!selectedIds.has(dimChange.id) || selectedIds.size <= 1) return nds;
      const { width, height } = dimChange.dimensions;
      return nds.map(n =>
        n.selected && n.id !== dimChange.id
          ? { ...n, style: { ...(n.style || {}), width, height } }
          : n,
      );
    });
  }, [onNodesChange, setNodes]);

  const removeNode = useCallback((id: string) => {
    setNodes(nds => nds.filter(n => n.id !== id));
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
  }, [setNodes, setEdges]);

  const loadTableFull = useCallback(async (id: string): Promise<DbTableFull | null> => {
    if (tableCache.current.has(id)) return tableCache.current.get(id)!;
    try {
      const full = await api.getDbTableFull(id);
      const t: DbTableFull = { id: full.id, title: full.title, headers: full.headers || [], rows: full.rows || [], chart_json: full.chart_json ?? null };
      tableCache.current.set(id, t);
      return t;
    } catch { return null; }
  }, []);

  const insertName = useCallback((targetId: string, name: string) => {
    setNodes(nds => nds.map(n => {
      if (n.id !== targetId) return n;
      const data: any = n.data;
      const expr = (data.expr || '') + (data.expr && !/[\s(]$/.test(data.expr) ? ' ' : '') + name;
      return { ...n, data: { ...data, expr } };
    }));
  }, [setNodes]);

  const allNames = useMemo(
    () => nodes.map(n => ({ id: n.id, name: (n.data as any).name || '', label: (n.data as any).label || '' })),
    [nodes],
  );
  const unitOptions = useMemo(() => {
    const fromNodes = nodes
      .map(n => String((n.data as any).unit || '').trim())
      .filter(Boolean);
    const merged = Array.from(new Set([...globalUnits, ...fromNodes]));
    return merged.sort((a, b) => a.localeCompare(b, 'de'));
  }, [nodes, globalUnits]);
  const graphNodes = useMemo(
    () => nodes.map(n => ({ id: n.id, type: String(n.type || ''), name: (n.data as any).name || '', label: (n.data as any).label || '' })),
    [nodes],
  );
  const sourceNodesMap = useMemo(() => {
    const map: Record<string, Array<{ id: string; type: string; data: any }>> = {};
    edges.forEach(e => {
      if (!map[e.target]) map[e.target] = [];
      const src = nodes.find(n => n.id === e.source);
      if (src) map[e.target].push({ id: src.id, type: String(src.type || ''), data: src.data });
    });
    return map;
  }, [nodes, edges]);

  const onConnect = useCallback((c: Connection) => {
    const srcNode = nodes.find(n => n.id === c.source);
    const kind = srcNode?.type === 'condition' ? 'condition' : 'workflow';
    setEdges(eds => addEdge({
      ...c, id: newId('e'),
      animated: kind === 'condition',
      style: { stroke: kind === 'condition' ? '#ca8a04' : '#64748b', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { kind, conditionId: c.sourceHandle || undefined },
    } as any, eds));
  }, [nodes, setEdges]);

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    if (confirm('Diese Verbindung löschen?')) setEdges(eds => eds.filter(e => e.id !== edge.id));
  }, [setEdges]);

  const addNode = (type: BlockType, position?: { x: number; y: number }) => {
    const id = newId(type);
    setNodes(nds => [...nds, {
      id, type,
      position: position ?? { x: 120 + (nds.length % 4) * 60, y: 60 + nds.length * 30 },
      data: defaultData(type) as any,
    }]);
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/reactflow') as BlockType;
    if (!type) return;
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    addNode(type, position);
  }, [screenToFlowPosition, setNodes]);

  const copySelected = useCallback(() => {
    const selectedNodes = nodes.filter(n => n.selected);
    if (!selectedNodes.length) return;
    const selectedIds = new Set(selectedNodes.map(n => n.id));
    clipboardRef.current = {
      nodes: selectedNodes.map(n => ({ ...n, data: cloneData(n.data) })),
      edges: edges
        .filter(e => selectedIds.has(e.source) && selectedIds.has(e.target))
        .map(e => ({ ...e, data: cloneData(e.data) })),
    };
    setClipboardCount(selectedNodes.length);
  }, [nodes, edges]);

  const pasteCopied = useCallback(() => {
    const clip = clipboardRef.current;
    if (!clip?.nodes.length) return;
    const idMap = new Map<string, string>();
    clip.nodes.forEach(n => idMap.set(n.id, newId(String(n.type || 'node'))));
    const pastedNodes = clip.nodes.map(n => {
      const id = idMap.get(n.id)!;
      return {
        ...n,
        id,
        selected: true,
        position: { x: n.position.x + 36, y: n.position.y + 36 },
        data: remapCopiedNodeData(n.data, idMap),
      };
    });
    const pastedEdges = clip.edges
      .filter(e => idMap.has(e.source) && idMap.has(e.target))
      .map(e => ({
        ...e,
        id: newId('e'),
        source: idMap.get(e.source)!,
        target: idMap.get(e.target)!,
        selected: false,
        data: cloneData(e.data),
      }));
    setNodes(nds => [...nds.map(n => ({ ...n, selected: false })), ...pastedNodes]);
    setEdges(eds => [...eds.map(e => ({ ...e, selected: false })), ...pastedEdges]);
  }, [setNodes, setEdges]);

  const undoGraph = useCallback(() => {
    const index = historyIndexRef.current;
    if (index <= 0) return;
    const snapshot = historyRef.current[index - 1];
    restoringHistoryRef.current = true;
    historyIndexRef.current = index - 1;
    setNodes(cloneData(snapshot.nodes));
    setEdges(cloneData(snapshot.edges));
    setHistoryVersion(v => v + 1);
  }, [setNodes, setEdges]);

  const redoGraph = useCallback(() => {
    const index = historyIndexRef.current;
    const snapshot = historyRef.current[index + 1];
    if (!snapshot) return;
    restoringHistoryRef.current = true;
    historyIndexRef.current = index + 1;
    setNodes(cloneData(snapshot.nodes));
    setEdges(cloneData(snapshot.edges));
    setHistoryVersion(v => v + 1);
  }, [setNodes, setEdges]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isFormField = tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;
      if (isFormField) return;
      const mod = event.metaKey || event.ctrlKey;
      if (!mod) return;
      if (event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redoGraph();
        else undoGraph();
      }
      if (event.key.toLowerCase() === 'c') {
        event.preventDefault();
        copySelected();
      }
      if (event.key.toLowerCase() === 'v') {
        event.preventDefault();
        pasteCopied();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [copySelected, pasteCopied, undoGraph, redoGraph]);

  const ctxValue = useMemo(() => ({
    updateNodeData, removeNode, dbTables, loadTableFull,
    allNames, graphNodes, sourceNodesMap, unitOptions, pickTargetId, setPickTargetId, insertName,
  }), [updateNodeData, removeNode, dbTables, loadTableFull, allNames, graphNodes, sourceNodesMap, unitOptions, pickTargetId, insertName]);

  return (
    <GraphCtx.Provider value={ctxValue}>
      <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
        {/* Palette */}
        <div style={{ width: 150, borderRight: '1px solid #e5e7eb', background: '#fff', padding: 8, overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Blöcke</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 8 }}>
            <button
              type="button"
              onClick={undoGraph}
              disabled={historyIndexRef.current <= 0}
              style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: 5, padding: '5px 4px', cursor: historyIndexRef.current > 0 ? 'pointer' : 'not-allowed', fontSize: 11, color: historyIndexRef.current > 0 ? '#334155' : '#94a3b8' }}
            >
              Zurück
            </button>
            <button
              type="button"
              onClick={redoGraph}
              disabled={!historyRef.current[historyIndexRef.current + 1]}
              style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: 5, padding: '5px 4px', cursor: historyRef.current[historyIndexRef.current + 1] ? 'pointer' : 'not-allowed', fontSize: 11, color: historyRef.current[historyIndexRef.current + 1] ? '#334155' : '#94a3b8' }}
            >
              Wieder
            </button>
            <button
              type="button"
              onClick={copySelected}
              disabled={!nodes.some(n => n.selected)}
              style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: 5, padding: '5px 4px', cursor: nodes.some(n => n.selected) ? 'pointer' : 'not-allowed', fontSize: 11, color: nodes.some(n => n.selected) ? '#334155' : '#94a3b8' }}
            >
              Kopieren
            </button>
            <button
              type="button"
              onClick={pasteCopied}
              disabled={!clipboardCount}
              style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: 5, padding: '5px 4px', cursor: clipboardCount ? 'pointer' : 'not-allowed', fontSize: 11, color: clipboardCount ? '#334155' : '#94a3b8' }}
            >
              Einfügen
            </button>
            <button
              type="button"
              onClick={() => setLassoMode(m => !m)}
              title="Lasso-Modus: Ziehen = Auswahl-Box"
              style={{ gridColumn: '1 / -1', border: `1px solid ${lassoMode ? '#2563eb' : '#cbd5e1'}`, background: lassoMode ? '#eff6ff' : '#fff', borderRadius: 5, padding: '5px 4px', cursor: 'pointer', fontSize: 11, color: lassoMode ? '#2563eb' : '#334155', fontWeight: lassoMode ? 700 : 400 }}
            >
              {lassoMode ? '⬚ Lasso AN' : '⬚ Lasso'}
            </button>
          </div>
          {PALETTE.map(p => (
            <button
              key={p.type}
              draggable
              onClick={() => addNode(p.type)}
              onDragStart={e => {
                e.dataTransfer.setData('application/reactflow', p.type);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, width: '100%', marginBottom: 4,
                border: `1px solid ${p.color}`, borderLeft: `4px solid ${p.color}`, background: '#fff',
                borderRadius: 6, padding: '5px 7px', cursor: 'grab', fontSize: 11, textAlign: 'left',
              }}
            >
              <span>{p.icon}</span><span>{p.label}</span>
            </button>
          ))}
          <div style={{ marginTop: 10, fontSize: 10, color: '#9ca3af', lineHeight: 1.4 }}>
            Pfeil ziehen = Workflow.<br />Aus 🔶 = Bedingung.<br />Klick auf Pfeil = löschen.
          </div>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, minWidth: 0, background: 'rgba(219, 234, 254, 0.25)' }} onDragOver={onDragOver} onDrop={onDrop}>
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={handleNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect} onEdgeClick={onEdgeClick}
            nodeTypes={nodeTypes as any}
            fitView proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{ markerEnd: { type: MarkerType.ArrowClosed } }}
            style={{ background: 'transparent' }}
            selectionOnDrag={lassoMode}
            panOnDrag={lassoMode ? [1, 2] : true}
            selectionMode={'partial' as any}
          >
            <Background color="#bfdbfe" gap={18} />
            <Controls />
            <MiniMap nodeStrokeWidth={3} pannable zoomable style={{ width: 120, height: 80 }} />
          </ReactFlow>
        </div>
      </div>
    </GraphCtx.Provider>
  );
}

export default function GraphEditor(props: Props) {
  return (
    <ReactFlowProvider>
      <GraphEditorInner {...props} />
    </ReactFlowProvider>
  );
}
