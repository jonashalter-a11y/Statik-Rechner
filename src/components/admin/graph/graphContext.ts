import { createContext, useContext } from 'react';
import { BlockData } from '../../../types/graph';

export interface DbTableMeta { id: string; title: string; chapter_id?: string | null; type?: string; }
export interface DbTableFull { id: string; title: string; headers: string[]; rows: string[][]; chart_json?: { series: { name: string; data: [number,number][] }[] } | null; }

export interface GraphCtxValue {
  updateNodeData: (id: string, patch: Partial<BlockData>) => void;
  setNodeStyle: (id: string, style: Record<string, any>) => void;
  removeNode: (id: string) => void;
  dbTables: DbTableMeta[];
  loadTableFull: (id: string) => Promise<DbTableFull | null>;
  // Verfügbare benannte Werte (für klickbare Chips in Rechnungen)
  allNames: { id: string; name: string; label: string }[];
  graphNodes: { id: string; type: string; label: string; name: string }[];
  // Vollständige Node-Daten (für Dropdown-Optionen etc.)
  allNodeData: Record<string, any>;
  // Eingehende Knoten je Ziel-ID (Kante source → target)
  sourceNodesMap: Record<string, Array<{ id: string; type: string; data: any }>>;
  unitOptions: string[];
  // Klick-zum-Einfügen: aktiver calc/stdcalc-Node, in den eingefügt wird
  pickTargetId: string | null;
  setPickTargetId: (id: string | null) => void;
  insertName: (targetId: string, name: string) => void;
}

export const GraphCtx = createContext<GraphCtxValue | null>(null);
export const useGraphCtx = () => {
  const ctx = useContext(GraphCtx);
  if (!ctx) throw new Error('GraphCtx fehlt');
  return ctx;
};
