import { createContext, useContext } from 'react';
import { BlockData } from '../../../types/graph';

export interface DbTableMeta { id: string; title: string; }
export interface DbTableFull { id: string; title: string; headers: string[]; rows: string[][]; }

export interface GraphCtxValue {
  updateNodeData: (id: string, patch: Partial<BlockData>) => void;
  removeNode: (id: string) => void;
  dbTables: DbTableMeta[];
  loadTableFull: (id: string) => Promise<DbTableFull | null>;
  // Verfügbare benannte Werte (für klickbare Chips in Rechnungen)
  allNames: { id: string; name: string; label: string }[];
  graphNodes: { id: string; type: string; label: string; name: string }[];
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
