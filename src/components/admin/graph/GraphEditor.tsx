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
import { topoSort } from '../../../utils/evalGraph';
import { validateGraph } from '../../../utils/validateGraph';
import { createDefaultBlockData, PALETTE } from '../../../blocks';

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

const CLIPBOARD_STORAGE_KEY = 'graph_editor_clipboard';

function cloneData<T>(value: T): T {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value));
}

function loadClipboardFromStorage(): GraphClipboard | null {
  try {
    const stored = localStorage.getItem(CLIPBOARD_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function saveClipboardToStorage(clip: GraphClipboard | null): void {
  try {
    if (!clip) {
      localStorage.removeItem(CLIPBOARD_STORAGE_KEY);
    } else {
      localStorage.setItem(CLIPBOARD_STORAGE_KEY, JSON.stringify(clip));
    }
  } catch {
    // Fehler beim localStorage - ignorieren
  }
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
    graph.nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data as any, ...(n.style ? { style: n.style } : {}), ...(n.type === 'frame' ? { zIndex: -1 } : {}) })),
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
  const [clipboardVersion, setClipboardVersion] = useState(0);
  const [lassoMode, setLassoMode] = useState(false);
  const [, setHistoryVersion] = useState(0);
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [displayOrder, setDisplayOrder] = useState<string[] | null>(graph.display_order ?? null);
  const [hiddenNodes, setHiddenNodes] = useState<Set<string>>(new Set(graph.hidden_nodes ?? []));
  const [dragOrderIdx, setDragOrderIdx] = useState<number | null>(null);
  const [dragOverOrderIdx, setDragOverOrderIdx] = useState<number | null>(null);
  const [collapsedOrderSections, setCollapsedOrderSections] = useState<Set<string>>(new Set());
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [lastSelectedOrderIdx, setLastSelectedOrderIdx] = useState<number | null>(null);
  const toggleOrderSection = (id: string) => setCollapsedOrderSections(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const tableCache = useRef<Map<string, DbTableFull>>(new Map());
  const clipboardRef = useRef<GraphClipboard | null>(loadClipboardFromStorage());
  const historyRef = useRef<GraphSnapshot[]>([]);
  const historyIndexRef = useRef(-1);
  const historyPausedRef = useRef(false);
  const restoringHistoryRef = useRef(false);
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const idCounter = useRef(1);
  const newId = (t: string) => `${t}_${Date.now().toString(36)}_${idCounter.current++}`;

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  const currentGraph = useMemo<VerificationGraph>(() => ({
    version: 1,
    nodes: nodes.map(n => {
      const gn: GraphNode = { id: n.id, type: n.type as BlockType, position: n.position, data: n.data as any };
      const w = (n.style as any)?.width ?? n.width;
      const h = (n.style as any)?.height ?? n.height;
      if (w || h) gn.style = { ...(w ? { width: w } : {}), ...(h ? { height: h } : {}) };
      return gn;
    }) as GraphNode[],
    edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle ?? null, targetHandle: e.targetHandle ?? null, data: (e.data as any) || { kind: 'workflow' } })) as GraphEdge[],
    ...(displayOrder ? { display_order: displayOrder } : {}),
    ...(hiddenNodes.size > 0 ? { hidden_nodes: [...hiddenNodes] } : {}),
  }), [nodes, edges, displayOrder, hiddenNodes]);

  const graphValidation = useMemo(() => validateGraph(currentGraph), [currentGraph]);

  // Serialisieren → an Parent melden SOFORT (kein Debounce - Auto-Save handled das)
  useEffect(() => {
    onChange(currentGraph);
  }, [currentGraph, onChange]);

  // Sync: neue Nodes ans Ende der Reihenfolge hängen, gelöschte entfernen
  useEffect(() => {
    if (!displayOrder) return;
    const nodeIds = new Set(nodes.map(n => n.id));
    const cleaned = displayOrder.filter(id => nodeIds.has(id));
    const newIds = nodes.filter(n => !displayOrder.includes(n.id)).map(n => n.id);
    if (cleaned.length !== displayOrder.length || newIds.length) {
      setDisplayOrder([...cleaned, ...newIds]);
    }
  }, [nodes]);

  const pushHistorySnapshot = useCallback((snapshot: GraphSnapshot) => {
    const index = historyIndexRef.current;
    const current = index >= 0 ? historyRef.current[index] : null;
    if (current && snapshotKey(current) === snapshotKey(snapshot)) return;

    const nextHistory = historyRef.current.slice(0, index + 1);
    nextHistory.push(snapshot);
    if (nextHistory.length > 80) nextHistory.shift();
    historyRef.current = nextHistory;
    historyIndexRef.current = nextHistory.length - 1;
    setHistoryVersion(v => v + 1);
  }, []);

  useEffect(() => {
    if (restoringHistoryRef.current) {
      restoringHistoryRef.current = false;
      return;
    }
    if (historyPausedRef.current) return;
    pushHistorySnapshot(cloneGraphState(nodes, edges));
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

  const setNodeStyle = useCallback((id: string, style: Record<string, any>) => {
    setNodes(nds =>
      nds.map(n =>
        n.id === id ? { ...n, style: { ...(n.style || {}), ...style } } : n,
      ),
    );
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
      const full = await api.getTableFull(id);
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
  const allNodeData = useMemo(
    () => Object.fromEntries(nodes.map(n => [n.id, n.data])),
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
      data: createDefaultBlockData(type) as any,
      ...(type === 'frame' ? { style: { width: 300, height: 200 }, zIndex: -1 } : {}),
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
    const clipboard: GraphClipboard = {
      nodes: selectedNodes.map(n => ({ ...n, data: cloneData(n.data) })),
      edges: edges
        .filter(e => selectedIds.has(e.source) && selectedIds.has(e.target))
        .map(e => ({ ...e, data: cloneData(e.data) })),
    };
    clipboardRef.current = clipboard;
    saveClipboardToStorage(clipboard);
    setClipboardVersion(v => v + 1);
  }, [nodes, edges]);

  const pasteCopied = useCallback(() => {
    const clip = clipboardRef.current;
    if (!clip?.nodes.length) return;

    // Create new IDs for pasted nodes (avoid ID collisions)
    const idMap = new Map<string, string>();
    clip.nodes.forEach(n => idMap.set(n.id, newId(String(n.type || 'node'))));

    // Remap the pasted nodes with new IDs and offset positions
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

    // Remap edges to use new node IDs (only edges between pasted nodes)
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

    // IMPORTANT: Merge existing nodes/edges with pasted ones (not replace)
    // Always spread existing state first, then append new items
    setNodes(nds => {
      // Deselect all existing nodes, then append pasted nodes
      const existingNodes = nds.map(n => ({ ...n, selected: false }));
      return [...existingNodes, ...pastedNodes];
    });
    setEdges(eds => {
      // Deselect all existing edges, then append pasted edges
      const existingEdges = eds.map(e => ({ ...e, selected: false }));
      return [...existingEdges, ...pastedEdges];
    });
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

  const handleNodeDragStart = useCallback(() => {
    historyPausedRef.current = true;
  }, []);

  const handleNodeDragStop = useCallback(() => {
    historyPausedRef.current = false;
    window.setTimeout(() => {
      pushHistorySnapshot(cloneGraphState(nodesRef.current, edgesRef.current));
    }, 0);
  }, [pushHistorySnapshot]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isFormField = tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;
      if (isFormField) return;
      const mod = event.metaKey || event.ctrlKey;

      // Delete ausgewählte Blöcke (Delete oder Backspace)
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        const selectedNodes = nodesRef.current.filter(n => n.selected);
        const selectedEdges = edgesRef.current.filter(e => e.selected);
        selectedNodes.forEach(n => removeNode(n.id));
        selectedEdges.forEach(e => setEdges(es => es.filter(x => x.id !== e.id)));
        return;
      }

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
  }, [copySelected, pasteCopied, undoGraph, redoGraph, removeNode, setEdges]);

  const ctxValue = useMemo(() => ({
    updateNodeData, setNodeStyle, removeNode, dbTables, loadTableFull,
    allNames, graphNodes, allNodeData, sourceNodesMap, unitOptions, pickTargetId, setPickTargetId, insertName,
  }), [updateNodeData, setNodeStyle, removeNode, dbTables, loadTableFull, allNames, graphNodes, allNodeData, sourceNodesMap, unitOptions, pickTargetId, insertName]);

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
            {(() => {
              // Dummy dependency on clipboardVersion to trigger re-render
              void clipboardVersion;
              const hasClipboard = clipboardRef.current?.nodes.length ?? 0;
              return (
                <button
                  type="button"
                  onClick={pasteCopied}
                  disabled={!hasClipboard}
                  style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: 5, padding: '5px 4px', cursor: hasClipboard ? 'pointer' : 'not-allowed', fontSize: 11, color: hasClipboard ? '#334155' : '#94a3b8' }}
                  title={hasClipboard ? `${hasClipboard} Blöcke im Clipboard` : 'Nichts zum Einfügen'}
                >
                  Einfügen
                </button>
              );
            })()}
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
          <button
            type="button"
            onClick={() => setShowOrderPanel(s => !s)}
            style={{
              marginTop: 8, width: '100%', display: 'flex', alignItems: 'center', gap: 5,
              border: `1px solid ${(showOrderPanel || displayOrder) ? '#2563eb' : '#cbd5e1'}`,
              borderLeft: `4px solid ${(showOrderPanel || displayOrder) ? '#2563eb' : '#94a3b8'}`,
              background: (showOrderPanel || displayOrder) ? '#eff6ff' : '#fff',
              borderRadius: 6, padding: '5px 7px', cursor: 'pointer', fontSize: 11,
              color: (showOrderPanel || displayOrder) ? '#1d4ed8' : '#334155',
              fontWeight: (showOrderPanel || displayOrder) ? 700 : 400,
            }}
          >
            <span>📋</span><span>Reihenfolge{displayOrder ? ' ✓' : ''}</span>
          </button>
          <div style={{ marginTop: 10, fontSize: 10, color: '#9ca3af', lineHeight: 1.4 }}>
            Pfeil ziehen = Workflow.<br />Aus 🔶 = Bedingung.<br />Klick auf Pfeil = löschen.
          </div>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, minWidth: 0, background: 'rgba(219, 234, 254, 0.25)', position: 'relative' }} onDragOver={onDragOver} onDrop={onDrop}>
          <div style={{
            position: 'absolute',
            top: 10,
            left: 10,
            zIndex: 10,
            width: 360,
            maxWidth: 'calc(100% - 20px)',
            border: `1px solid ${graphValidation.errors.length ? '#fecaca' : graphValidation.warnings.length ? '#fde68a' : '#bbf7d0'}`,
            background: graphValidation.errors.length ? '#fef2f2' : graphValidation.warnings.length ? '#fffbeb' : '#f0fdf4',
            color: graphValidation.errors.length ? '#991b1b' : graphValidation.warnings.length ? '#92400e' : '#166534',
            borderRadius: 6,
            padding: '7px 9px',
            fontSize: 11,
            lineHeight: 1.45,
            boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
            pointerEvents: 'none',
          }}>
            <div style={{ fontWeight: 700, marginBottom: graphValidation.issues.length ? 3 : 0 }}>
              {graphValidation.errors.length
                ? `${graphValidation.errors.length} Fehler im Graph`
                : graphValidation.warnings.length
                  ? `${graphValidation.warnings.length} Hinweise im Graph`
                  : 'Graph sauber'}
            </div>
            {graphValidation.issues.slice(0, 4).map((issue, i) => (
              <div key={i}>
                {issue.severity === 'error' ? 'Fehler' : 'Hinweis'}
                {issue.nodeId ? ` (${issue.nodeId})` : ''}: {issue.message}
              </div>
            ))}
            {graphValidation.issues.length > 4 && (
              <div>+ {graphValidation.issues.length - 4} weitere Meldungen</div>
            )}
          </div>
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={handleNodesChange} onEdgesChange={onEdgesChange}
            onNodeDragStart={handleNodeDragStart}
            onNodeDragStop={handleNodeDragStop}
            onConnect={onConnect} onEdgeClick={onEdgeClick}
            nodeTypes={nodeTypes as any}
            fitView proOptions={{ hideAttribution: true }}
            minZoom={0.05}
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

        {/* Reihenfolge-Panel */}
        {showOrderPanel && (() => {
          const NON_RENDERABLE = new Set(['output', 'condition', 'woodclass', 'image', 'frame']);
          const paletteIcon = (t: string) => PALETTE.find(p => p.type === t)?.icon ?? '■';
          const nodeLabel = (n: Node) => { const d: any = n.data; return d.label || d.name || n.type || '?'; };

          const sortedNodes = (() => {
            try {
              const g: any = { version: 1, nodes: nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data })), edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, data: e.data || { kind: 'workflow' } })) };
              return topoSort(g);
            } catch { return nodes; }
          })();

          const currentOrder: Node[] = displayOrder
            ? (() => {
                const idToNode = new Map(nodes.map(n => [n.id, n]));
                const res: Node[] = [];
                for (const id of displayOrder) { const n = idToNode.get(id); if (n) res.push(n); }
                const inOrd = new Set(displayOrder);
                for (const n of nodes) { if (!inOrd.has(n.id)) res.push(n); }
                return res;
              })()
            : sortedNodes as unknown as Node[];

          const handleOrderItemClick = (i: number, e: React.MouseEvent) => {
            const nodeId = currentOrder[i].id;
            const mod = e.ctrlKey || e.metaKey;
            const shift = e.shiftKey;

            if (shift && lastSelectedOrderIdx !== null) {
              const start = Math.min(lastSelectedOrderIdx, i);
              const end = Math.max(lastSelectedOrderIdx, i);
              const newSelected = new Set(selectedOrderIds);
              for (let idx = start; idx <= end; idx++) {
                newSelected.add(currentOrder[idx].id);
              }
              setSelectedOrderIds(newSelected);
            } else if (mod) {
              const newSelected = new Set(selectedOrderIds);
              if (newSelected.has(nodeId)) {
                newSelected.delete(nodeId);
              } else {
                newSelected.add(nodeId);
              }
              setSelectedOrderIds(newSelected);
              setLastSelectedOrderIdx(i);
            } else {
              setSelectedOrderIds(new Set([nodeId]));
              setLastSelectedOrderIdx(i);
            }
          };

          const handleDragStart = (i: number, e: React.DragEvent) => {
            const nodeId = currentOrder[i].id;
            if (!selectedOrderIds.has(nodeId)) {
              setSelectedOrderIds(new Set([nodeId]));
              setLastSelectedOrderIdx(i);
            }
            setDragOrderIdx(i);
          };

          const handleDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setDragOverOrderIdx(i); };

          const handleDrop = (e: React.DragEvent, i: number) => {
            e.preventDefault();
            if (dragOrderIdx == null || dragOrderIdx === i) { setDragOrderIdx(null); setDragOverOrderIdx(null); return; }

            const ids = currentOrder.map(n => n.id);
            const draggedId = ids[dragOrderIdx];
            const isSelected = selectedOrderIds.has(draggedId);

            if (isSelected && selectedOrderIds.size > 1) {
              const selectedIndices = Array.from(selectedOrderIds)
                .map(id => ids.indexOf(id))
                .sort((a, b) => a - b);
              const offset = i - dragOrderIdx;

              const newIds = [...ids];
              const movedIds = selectedIndices.map(idx => newIds[idx]);
              const remaining = newIds.filter((id, idx) => !selectedIndices.includes(idx));

              let insertIdx = Math.max(0, Math.min(offset > 0 ? i - selectedIndices.length + 1 : i, remaining.length));
              remaining.splice(insertIdx, 0, ...movedIds);

              setDisplayOrder(remaining);
            } else {
              const [moved] = ids.splice(dragOrderIdx, 1);
              ids.splice(i, 0, moved);
              setDisplayOrder(ids);
            }

            setDragOrderIdx(null);
            setDragOverOrderIdx(null);
          };

          const handleDragEnd = () => { setDragOrderIdx(null); setDragOverOrderIdx(null); };

          // Sichtbarkeit: Blöcke nach einem eingeklappten Titel ausblenden
          const visibleIndices = new Set<number>();
          let activeTitleCollapsed = false;
          currentOrder.forEach((n, i) => {
            if (String(n.type) === 'title') {
              activeTitleCollapsed = collapsedOrderSections.has(n.id);
              visibleIndices.add(i);
            } else if (!activeTitleCollapsed) {
              visibleIndices.add(i);
            }
          });

          return (
            <div style={{ width: 210, borderLeft: '1px solid #e5e7eb', background: '#fff', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
              <div style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>📋 Reihenfolge</span>
                <button type="button" onClick={() => setShowOrderPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#9ca3af', lineHeight: 1, padding: 0 }}>×</button>
              </div>

              {/* Toggle Standard / Anpassen */}
              <div style={{ display: 'flex', gap: 4, padding: '6px 8px', borderBottom: '1px solid #f1f5f9' }}>
                <button type="button"
                  onClick={() => setDisplayOrder(null)}
                  style={{ flex: 1, border: `1px solid ${!displayOrder ? '#2563eb' : '#e5e7eb'}`, background: !displayOrder ? '#eff6ff' : '#f9fafb', borderRadius: 4, padding: '4px 0', fontSize: 10, cursor: 'pointer', color: !displayOrder ? '#1d4ed8' : '#6b7280', fontWeight: !displayOrder ? 700 : 400 }}>
                  Standard
                </button>
                <button type="button"
                  onClick={() => { if (!displayOrder) setDisplayOrder(currentOrder.map(n => n.id)); }}
                  style={{ flex: 1, border: `1px solid ${displayOrder ? '#2563eb' : '#e5e7eb'}`, background: displayOrder ? '#eff6ff' : '#f9fafb', borderRadius: 4, padding: '4px 0', fontSize: 10, cursor: 'pointer', color: displayOrder ? '#1d4ed8' : '#6b7280', fontWeight: displayOrder ? 700 : 400 }}>
                  Anpassen
                </button>
              </div>

              {!displayOrder && (
                <div style={{ padding: '8px 10px', fontSize: 10, color: '#9ca3af', lineHeight: 1.5 }}>
                  Reihenfolge folgt automatisch dem Workflow (Pfeile im Graphen).
                </div>
              )}

              {/* Liste (Standard = nur Vorschau, Anpassen = Drag & Drop) */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '4px 6px' }}>
                {displayOrder && <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4, paddingLeft: 4 }}>Ziehen zum Umsortieren:</div>}
                {currentOrder.map((n, i) => {
                  if (!visibleIndices.has(i)) return null;
                  const isTitle = String(n.type) === 'title';
                  const isNonRend = NON_RENDERABLE.has(String(n.type || ''));
                  const isDragging = dragOrderIdx === i;
                  const isDragOver = dragOverOrderIdx === i;
                  const isSelected = selectedOrderIds.has(n.id);
                  const titleColor = isTitle ? ((n.data as any).color || '#2563eb') : undefined;
                  const isCollapsed = isTitle && collapsedOrderSections.has(n.id);
                  return (
                    <div
                      key={n.id}
                      draggable={!!displayOrder}
                      onClick={e => handleOrderItemClick(i, e)}
                      onDragStart={e => displayOrder && handleDragStart(i, e)}
                      onDragOver={e => displayOrder && handleDragOver(e, i)}
                      onDrop={e => displayOrder && handleDrop(e, i)}
                      onDragEnd={handleDragEnd}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: isTitle ? '5px 6px' : '3px 6px 3px 18px',
                        marginBottom: isTitle ? 4 : 2, borderRadius: 4,
                        border: `1px solid ${isDragOver ? '#2563eb' : isSelected ? '#3b82f6' : isTitle ? (titleColor + '60') : '#e5e7eb'}`,
                        background: isDragging ? '#f0f9ff' : isDragOver ? '#eff6ff' : isSelected ? '#dbeafe' : isTitle ? (titleColor + '15') : '#fafafa',
                        cursor: displayOrder ? 'grab' : 'default',
                        fontSize: 11, opacity: isNonRend ? 0.4 : 1,
                        userSelect: 'none',
                        borderLeft: isTitle ? `3px solid ${titleColor}` : isSelected ? '3px solid #3b82f6' : undefined,
                        marginTop: isTitle ? 4 : 0,
                      }}
                    >
                      {displayOrder && (
                        <span style={{
                          color: isSelected ? '#3b82f6' : '#d1d5db',
                          fontSize: 12, flexShrink: 0,
                          fontWeight: isSelected ? 700 : 400,
                        }}>≡</span>
                      )}
                      <span style={{ flexShrink: 0 }}>{paletteIcon(String(n.type || ''))}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isTitle ? titleColor : '#374151', flex: 1, fontWeight: isTitle ? 700 : 400 }}>{nodeLabel(n)}</span>
                      <button type="button"
                        onClick={e => { e.stopPropagation(); setHiddenNodes(prev => { const next = new Set(prev); next.has(n.id) ? next.delete(n.id) : next.add(n.id); return next; }); }}
                        title={hiddenNodes.has(n.id) ? 'Einblenden' : 'Ausblenden'}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, padding: 0, lineHeight: 1, flexShrink: 0, color: hiddenNodes.has(n.id) ? '#d1d5db' : '#6b7280', opacity: hiddenNodes.has(n.id) ? 0.5 : 1 }}>
                        {hiddenNodes.has(n.id) ? '🙈' : '👁'}
                      </button>
                      {isTitle && (
                        <button type="button" onClick={() => toggleOrderSection(n.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 9, color: titleColor, padding: 0, lineHeight: 1, flexShrink: 0 }}>
                          {isCollapsed ? '▶' : '▼'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
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
