// ─── Graph-Datenmodell für den Node-Editor (React Flow) ────────────────────────
// Ein Nachweis wird als Graph aus Blöcken gespeichert. Jeder Block (Node) hat
// einen Typ und blocktyp-spezifische `data`. Kanten (Edges) verbinden Blöcke
// im Workflow (Standard) oder als Bedingungs-Verzweigung.

export type BlockType =
  | 'variable'     // 🟪 Eingabe-Variable
  | 'dropdown'     // 🟧 Auswahl (Liste / Tabelle / Tabellenspalte)
  | 'woodclass'    // 🟨 aktuelle Holzklasse aus dem Frontend-Header
  | 'tablevalue'   // 🟩 Wert aus der vom Dropdown gewählten Zeile
  | 'calc'         // 🟥 Rechnung (LaTeX + JS-Ausdruck)
  | 'stdcalc'      // 🟫 Standard-Berechnung (ein Operand aus Tabellenberechnung)
  | 'tablecalc'    // 🟦 Tabellenberechnung (Formel über Tabellenspalten)
  | 'chartlookup'  // 📉 Diagramm-Ablesewert (X-Variable → interpolierter Y-Wert)
  | 'condition'    // 🔶 Bedingung (verzweigt Workflow)
  | 'check'        // ✅ Nachweis-Prüfung (Ungleichung → grün/rot)
  | 'minmax'       // ↕ Min / Max aus mehreren Ausdrücken
  | 'image'        // 🖼 Bild-Block (nur Anzeige)
  | 'title'        // 📌 Abschnittstitel (einklappbar im Frontend)
  | 'frame'        // 🔲 Visueller Rahmen auf dem Canvas (nicht im Frontend gerendert)
  | 'ref'          // 🔗 Referenz auf einen anderen Block (nur Anzeige, kein neuer Eingabe)
  | 'cases'        // ⑂  Fallunterscheidung (piecewise): mehrere Formeln mit JS-Bedingungen
  | 'output';      // ⬜ PDF/Ausgabe

export type EdgeKind = 'workflow' | 'condition';

// ── Block-Daten je Typ ──────────────────────────────────────────────────────
export interface VariableData {
  kind: 'variable';
  name: string;           // LaTeX-Name, z.B. "q_0", "gamma_M"
  label: string;          // Klartext-Bezeichnung
  unit: string;           // Einheit (z.B. "kN/m²")
  default_value: string;  // Standardwert
  hasDefault?: boolean;   // false → kein Vorausfüllen im Frontend (Feld leer)
  description?: string;
  withImage?: boolean;    // 🟪 "mit Bild"-Variante
  image?: string;         // Daten-URL oder Pfad (Info-Button)
  imageSource?: string;   // Quelle / Kommentar zum Info-Bild
  // Eingabe-Variante: 'number' (Default) | 'dropdown' (feste Optionen) | 'table_column' | 'number_image' (Zahl + Info-Bild) | 'number_link' (Zahl + Link-Button)
  inputKind?: 'number' | 'dropdown' | 'table_column' | 'number_image' | 'number_comment' | 'number_link';
  options?: { label: string; value: string }[]; // inputKind=dropdown
  table_ref?: string;     // inputKind=table_column → db_tables.id
  table_col?: number;     // inputKind=table_column → Spaltenindex
  comment?: string;       // inputKind=number_comment → erscheint hervorgehoben über dem Input
  url?: string;           // inputKind=number_link → URL die im Frontend als Button geöffnet wird
}

export type DropdownMode = 'custom' | 'table' | 'table_column';
export interface DropdownData {
  kind: 'dropdown';
  name: string;           // interner Name des Dropdowns
  label: string;          // Anzeige (z.B. "Geländekategorie")
  unit?: string;          // Einheit des gewählten Werts (optional)
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

export interface CheckData {
  kind: 'check';
  label: string;          // Bezeichnung, z.B. "Biegenachweis"
  latex: string;          // Ungleichung als LaTeX, z.B. "\sigma_{m,d} \leq f_{m,d,eff}"
  expr: string;           // auto-abgeleitet: "(sigma_m_d) <= (f_m_d_eff) ? 1 : 0"
  unit?: string;          // Einheit der verglichenen Grösse, z.B. "N/mm^2"
}

export interface OutputData {
  kind: 'output';
  label: string;
  blocks: string[];       // Node-IDs, die ins PDF/Protokoll sollen (Reihenfolge)
}

export interface MinMaxData {
  kind: 'minmax';
  name: string;    // Ergebnis-Variable (LaTeX, z.B. f_{v,0,d})
  label: string;
  unit: string;
  latex: string;   // vollständige Formel, z.B. f = \min\begin{cases}a \\ b\end{cases}
  expr: string;    // auto-abgeleiteter JS-Ausdruck
}

export interface ChartLookupData {
  kind: 'chartlookup';
  chart_ref: string;     // db_tables.id (type='chart')
  series_index: number;  // Kurven-Index (0-basiert), ignoriert wenn all_series=true
  all_series?: boolean;  // alle Kurven → name_1, name_2, name_3 …
  direction?: 'x_to_y' | 'y_to_x'; // Standard: x_to_y
  x_name: string;        // Variablenname für Eingabe (X bei x_to_y, Y bei y_to_x)
  name: string;          // LaTeX-Basisname des Ergebnisses
  label: string;
  unit: string;
}

export interface ImageBlockData {
  kind: 'image';
  title?: string;         // Titelzeile über dem Bild (z.B. "Figur 3")
  label: string;          // Bildunterschrift / Beschreibung (unter dem Bild)
  source?: string;        // Quelle / Kommentar
  image?: string;         // base64 Daten-URL
}

export interface TitleData {
  kind: 'title';
  label: string;          // Abschnittsüberschrift
  color: string;          // Akzentfarbe (#hex)
}

export interface FrameData {
  kind: 'frame';
  label: string;          // optionaler Beschriftungstext
  color: string;          // Rahmenfarbe (#hex)
}

export interface RefData {
  kind: 'ref';
  source_id: string;      // Node-ID des referenzierten Blocks
}

export interface CasesData {
  kind: 'cases';
  name: string;           // LaTeX-Name des Ergebnisses (z.B. "c_h")
  label: string;
  unit: string;
  cases: Array<{
    id: string;
    formula_latex: string; // Formel (LaTeX, wird zu JS konvertiert)
    cond_expr: string;     // JS-Bedingung (leer = else/Standard)
  }>;
}

export type BlockData =
  | VariableData | DropdownData | WoodClassData | TableValueData | CalcData
  | StdCalcData | TableCalcData | ChartLookupData | ConditionData | CheckData | MinMaxData | ImageBlockData
  | TitleData | FrameData | RefData | CasesData | OutputData;

// ── React-Flow-kompatible Node/Edge-Strukturen ──────────────────────────────
export interface GraphNode {
  id: string;
  type: BlockType;
  position: { x: number; y: number };
  data: BlockData;
  style?: { width?: number; height?: number; [key: string]: unknown };
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
  display_order?: string[]; // optionale Anzeigereihenfolge im Frontend (Node-IDs)
}

export const emptyGraph = (): VerificationGraph => ({ version: 1, nodes: [], edges: [] });
