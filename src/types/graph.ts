// ─── Graph-Datenmodell für den Node-Editor (React Flow) ────────────────────────
// Ein Nachweis wird als Graph aus Blöcken gespeichert. Jeder Block (Node) hat
// einen Typ und blocktyp-spezifische `data`. Kanten (Edges) verbinden Blöcke
// im Workflow (Standard) oder als Bedingungs-Verzweigung.

export type BlockType =
  | 'variable'    // 🟪 Eingabe-Variable
  | 'dropdown'    // 🟧 Auswahl (Liste / Tabelle / Tabellenspalte)
  | 'woodclass'   // 🟨 aktuelle Holzklasse aus dem Frontend-Header
  | 'tablevalue'  // 🟩 Wert aus der vom Dropdown gewählten Zeile
  | 'calc'        // 🟥 Rechnung (LaTeX + JS-Ausdruck)
  | 'stdcalc'     // 🟫 Standard-Berechnung (ein Operand aus Tabellenberechnung)
  | 'tablecalc'   // 🟦 Tabellenberechnung (Formel über Tabellenspalten)
  | 'condition'   // 🔶 Bedingung (verzweigt Workflow)
  | 'output';     // ⬜ PDF/Ausgabe

export type EdgeKind = 'workflow' | 'condition';

// ── Block-Daten je Typ ──────────────────────────────────────────────────────
export interface VariableData {
  kind: 'variable';
  name: string;           // LaTeX-Name, z.B. "q_0", "gamma_M"
  label: string;          // Klartext-Bezeichnung
  unit: string;           // Einheit (z.B. "kN/m²")
  default_value: string;  // Standardwert
  description?: string;
  withImage?: boolean;    // 🟪 "mit Bild"-Variante
  image?: string;         // Daten-URL oder Pfad (Info-Button)
  // Eingabe-Variante: 'number' (Default) | 'dropdown' (feste Optionen) | 'table_column'
  inputKind?: 'number' | 'dropdown' | 'table_column';
  options?: { label: string; value: string }[]; // inputKind=dropdown
  table_ref?: string;     // inputKind=table_column → db_tables.id
  table_col?: number;     // inputKind=table_column → Spaltenindex
}

export type DropdownMode = 'custom' | 'table' | 'table_column';
export interface DropdownData {
  kind: 'dropdown';
  name: string;           // interner Name des Dropdowns
  label: string;          // Anzeige (z.B. "Geländekategorie")
  mode: DropdownMode;
  options?: { label: string; value: string }[]; // mode=custom
  table_ref?: string;     // mode=table | table_column → db_tables.id
  table_col?: number;     // mode=table_column → Spaltenindex (Anzeige)
  label_col?: number;     // Spalte, die als Auswahl-Label dient (Default 0)
}

export interface WoodClassData {
  kind: 'woodclass';
  label: string;          // nur Backend-Info, im Frontend nicht sichtbar
}

export interface TableValueData {
  kind: 'tablevalue';
  name: string;           // LaTeX-Name des gelesenen Werts (z.B. "z_g")
  label: string;
  unit: string;
  source_dropdown?: string; // Node-ID des Dropdowns, dessen Zeile genutzt wird
  table_col: number;        // Spalte, aus der der Wert gelesen wird
}

export interface CalcData {
  kind: 'calc';
  name: string;           // LaTeX-Name des Ergebnisses (z.B. "c_h")
  label: string;
  unit: string;
  latex: string;          // Anzeige-Formel (LaTeX)
  expr: string;           // JS-Ausdruck zur Berechnung
  description?: string;
}

export interface StdCalcData {
  kind: 'stdcalc';
  name: string;
  label: string;
  unit: string;
  latex: string;
  expr: string;           // JS-Ausdruck; nutzt einen im Frontend gewählten Tabellenwert
  picker_name: string;    // Variablenname des im Frontend wählbaren Werts (z.B. "c_pe")
  source_tablecalc?: string; // Node-ID des tablecalc, aus dem gewählt wird
}

export interface TableCalcData {
  kind: 'tablecalc';
  name: string;           // Basisname (z.B. "q_k")
  label: string;
  unit: string;
  table_ref?: string;     // db_tables.id (Quelle der Spaltenwerte/Zonen)
  zones: string[];        // Zonen-/Spaltennamen (z.B. ["A","B",...])
  expr: string;           // JS-Ausdruck je Zone; Platzhalter "cell" = Zonenwert
}

export interface ConditionData {
  kind: 'condition';
  label: string;
  mode?: 'expr' | 'select';
  source?: string; // mode=select: "woodType", "woodClass" oder Node-ID eines Dropdowns
  conditions: { id: string; latex: string; expr: string; match?: string }[]; // je Zweig 1 Bedingung/Auswahlwert
}

export interface OutputData {
  kind: 'output';
  label: string;
  blocks: string[];       // Node-IDs, die ins PDF/Protokoll sollen (Reihenfolge)
}

export type BlockData =
  | VariableData | DropdownData | WoodClassData | TableValueData | CalcData
  | StdCalcData | TableCalcData | ConditionData | OutputData;

// ── React-Flow-kompatible Node/Edge-Strukturen ──────────────────────────────
export interface GraphNode {
  id: string;
  type: BlockType;
  position: { x: number; y: number };
  data: BlockData;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null; // bei Bedingungen: ID des Zweigs
  targetHandle?: string | null;
  data?: { kind: EdgeKind; conditionId?: string };
}

export interface VerificationGraph {
  version: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const emptyGraph = (): VerificationGraph => ({ version: 1, nodes: [], edges: [] });
