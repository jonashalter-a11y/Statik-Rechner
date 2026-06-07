import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap, addEdge,
  useNodesState, useEdgesState, Connection, Edge, Node, MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeTypes } from './BlockNodes';
import { GraphCtx, DbTableMeta, DbTableFull } from './graphContext';
import { api } from '../../../api';
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
  { type: 'condition',  icon: '🔶', label: 'Bedingung',         color: '#ca8a04' },
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
    case 'tablecalc':  return { kind: 'tablecalc', name: '', label: '', unit: '', zones: [], expr: 'cell' };
    case 'condition':  return { kind: 'condition', label: '', conditions: [] };
    case 'output':     return { kind: 'output', label: 'PDF', blocks: [] };
  }
}

interface Props {
  graph: VerificationGraph;
  onChange: (g: VerificationGraph) => void;
  dbTables: DbTableMeta[];
}

export default function GraphEditor({ graph, onChange, dbTables }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(
    graph.nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data as any })),
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
  const tableCache = useRef<Map<string, DbTableFull>>(new Map());
  const idCounter = useRef(1);
  const newId = (t: string) => `${t}_${Date.now().toString(36)}_${idCounter.current++}`;

  // Serialisieren → an Parent melden
  useEffect(() => {
    const g: VerificationGraph = {
      version: 1,
      nodes: nodes.map(n => ({ id: n.id, type: n.type as BlockType, position: n.position, data: n.data as any })) as GraphNode[],
      edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle ?? null, targetHandle: e.targetHandle ?? null, data: (e.data as any) || { kind: 'workflow' } })) as GraphEdge[],
    };
    onChange(g);
  }, [nodes, edges]);

  const updateNodeData = useCallback((id: string, patch: Partial<BlockData>) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...(n.data as any), ...patch } } : n));
  }, [setNodes]);

  const removeNode = useCallback((id: string) => {
    setNodes(nds => nds.filter(n => n.id !== id));
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
  }, [setNodes, setEdges]);

  const loadTableFull = useCallback(async (id: string): Promise<DbTableFull | null> => {
    if (tableCache.current.has(id)) return tableCache.current.get(id)!;
    try {
      const full = await api.getDbTableFull(id);
      const t: DbTableFull = { id: full.id, title: full.title, headers: full.headers || [], rows: full.rows || [] };
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
  const graphNodes = useMemo(
    () => nodes.map(n => ({ id: n.id, type: String(n.type || ''), name: (n.data as any).name || '', label: (n.data as any).label || '' })),
    [nodes],
  );

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

  const addNode = (type: BlockType) => {
    const id = newId(type);
    setNodes(nds => [...nds, {
      id, type, position: { x: 120 + (nds.length % 4) * 60, y: 60 + nds.length * 30 },
      data: defaultData(type) as any,
    }]);
  };

  const ctxValue = useMemo(() => ({
    updateNodeData, removeNode, dbTables, loadTableFull,
    allNames, graphNodes, pickTargetId, setPickTargetId, insertName,
  }), [updateNodeData, removeNode, dbTables, loadTableFull, allNames, graphNodes, pickTargetId, insertName]);

  return (
    <GraphCtx.Provider value={ctxValue}>
      <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
        {/* Palette */}
        <div style={{ width: 150, borderRight: '1px solid #e5e7eb', background: '#fff', padding: 8, overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Blöcke</div>
          {PALETTE.map(p => (
            <button key={p.type} onClick={() => addNode(p.type)} style={{
              display: 'flex', alignItems: 'center', gap: 6, width: '100%', marginBottom: 4,
              border: `1px solid ${p.color}`, borderLeft: `4px solid ${p.color}`, background: '#fff',
              borderRadius: 6, padding: '5px 7px', cursor: 'pointer', fontSize: 11, textAlign: 'left',
            }}>
              <span>{p.icon}</span><span>{p.label}</span>
            </button>
          ))}
          <div style={{ marginTop: 10, fontSize: 10, color: '#9ca3af', lineHeight: 1.4 }}>
            Pfeil ziehen = Workflow.<br />Aus 🔶 = Bedingung.<br />Klick auf Pfeil = löschen.
          </div>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect} onEdgeClick={onEdgeClick}
            nodeTypes={nodeTypes as any}
            fitView proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{ markerEnd: { type: MarkerType.ArrowClosed } }}
          >
            <Background color="#e5e7eb" gap={18} />
            <Controls />
            <MiniMap nodeStrokeWidth={3} pannable zoomable style={{ width: 120, height: 80 }} />
          </ReactFlow>
        </div>
      </div>
    </GraphCtx.Provider>
  );
}
