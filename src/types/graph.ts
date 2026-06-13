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
  | 'matrix'       // ⊞  Materialtabelle: Zeilen = Materialien, Spalten = berechnete Variablen
  | 'beamvisual'   // 🏗 Träger-Visualisierung (SVG)
  | 'section'      // ⊕ Querschnitt-Flächenträgheitsmoment
  | 'comment'      // 💬 Kommentar-Block mit optionalem Extra (Link, Bild, Diagramm, Tabelle)
  | 'groupcalc'    // ⚙ Gruppenberechnung: inline Variablen + Fallauswahl + mehrere Ausgaben
  | 'loopblock'    // ⟳ Schleifenblock: n Iterationen mit Aggregation (z.B. Brandschutz-Schichten)
  | 'summenblock'  // ➕ Summen-Block: Summe von Variablen/Ausdrücken
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

export interface SummenblockData {
  kind: 'summenblock';
  name: string;           // Ausgabe-Variable (z.B. "sum")
  label: string;          // Bezeichnung (z.B. "Summe")
  unit: string;           // Einheit
  expr: string;           // Formel (z.B. "a + b + c")
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
  mode?: 'expr' | 'select'; // 'expr' = JS-Bedingung (Standard), 'select' = Dropdown-Vergleich
  source?: string;           // Node-ID der Quelle (für mode='select')
  cases: Array<{
    id: string;
    formula_latex: string;  // Formel (LaTeX, wird zu JS konvertiert)
    cond_expr: string;      // JS-Bedingung (leer = else/Standard) — nur für mode='expr'
    match_value?: string;   // Vergleichswert (für mode='select'), z.B. 'II'
  }>;
}

export interface MatrixData {
  kind: 'matrix';
  label: string;
  row_label: string;   // Dropdown-Label (z.B. "Material / Schicht")
  columns: Array<{
    id: string;
    name: string;      // JS-Variablenname (z.B. "t_prot")
    header: string;    // Anzeigetext (LaTeX möglich)
    unit: string;
  }>;
  rows: Array<{
    id: string;
    label: string;          // Zeilenname / Material (erscheint im Dropdown)
    cells: string[];        // JS-Ausdruck pro Spalte (für Berechnung)
    cells_latex?: string[]; // LaTeX-Formel pro Spalte (für Anzeige, optional)
  }>;
}

export type SupportType = 'pin' | 'roller' | 'fixed' | 'free';

export interface BeamLoad {
  id: string;
  kind: 'distributed' | 'point';
  var_name: string;       // JS-Variablenname des Lastwertes
  label: string;          // Anzeigetext (LaTeX möglich)
  position?: number;      // 0–1 relative Position (nur bei point)
  pos_var?: string;       // optional: Variablenname für Position
  direction: 'down' | 'up';
}

export interface BeamVisualData {
  kind: 'beamvisual';
  label: string;
  span_var: string;       // JS-Variablenname der Stützweite
  span_unit: string;      // z.B. "m" oder "mm"
  left_support: SupportType;
  right_support: SupportType;
  loads: BeamLoad[];
}

export interface SectionData {
  kind: 'section';
  label: string;
}

export type CommentExtra = 'none' | 'link' | 'image' | 'chart' | 'table';

export interface CommentData {
  kind: 'comment';
  text: string;             // Kommentartext (Markdown-ähnlich, plain)
  extra: CommentExtra;
  // extra = 'link'
  link_url?: string;
  link_label?: string;
  // extra = 'image'
  image?: string;           // base64 Daten-URL
  image_source?: string;
  image_caption?: string;
  // extra = 'chart' | 'table'
  table_ref?: string;       // db_tables.id
}

// ── ⟳ Schleifenblock ────────────────────────────────────────────────────────
// Iteriert n-mal über ein Template (Dropdown + Eingabe-Variablen + Ausgaben).
// Jede Iteration bekommt indexierte Symbole (d_1, d_2, …, d_n) im globalen
// Symbolraum. Aggregationen (sum/last/max/min) fassen die Schleifenergebnisse
// zu einem Gesamtwert zusammen (z.B. Σ t_prot,0,i).
export interface LoopBlockAggr {
  output_id: string;         // ID des GroupCalcOutput, der aggregiert wird
  method: 'sum' | 'last' | 'max' | 'min' | 'expr';
  expr?: string;             // method='expr': JS-Ausdruck, z.B. sum_tprot_before_last + last_tins
  name: string;              // LaTeX-Symbol des Gesamtwerts (z.B. "t_{prot,0}")
  label: string;             // Anzeigetext
  unit: string;
}
export interface LoopBlockData {
  kind: 'loopblock';
  label: string;             // Block-Titel
  count_label: string;       // Beschriftung des Anzahl-Inputs (z.B. "Anzahl Schichten n")
  max_count: number;         // Maximale Iterationen
  // Template pro Iteration (gleiche Struktur wie GroupCalcData)
  dropdown_label: string;
  vars: GroupCalcVar[];
  options: GroupCalcOption[];
  outputs: GroupCalcOutput[];
  // Aggregationen
  aggregations: LoopBlockAggr[];
}

// ── ⚙ Gruppenberechnung ─────────────────────────────────────────────────────
// Selbst-enthaltener Block: definiert Eingabe-Variablen, eine Fallauswahl
// und mehrere Ausgaben. Im Frontend werden Variablen-Inputs, Dropdown und
// berechnete Ausgaben direkt gerendert — keine externen Variable-Blöcke nötig.
export interface GroupCalcVar {
  id: string;
  name: string;          // LaTeX-Variablenname (z.B. "d_i")
  label: string;         // Anzeigetext (z.B. "Schichtdicke")
  unit: string;          // Einheit (z.B. "mm")
  default_value: string; // Standardwert als String
  scope?: 'layer' | 'global'; // 'layer' = pro Schicht (default), 'global' = einmal für alle
}
export interface GroupCalcOption {
  id: string;
  label: string;         // Auswahl-Text (z.B. "Mineralwolle ≥ 26 kg/m³")
  formulas: Record<string, string>; // output.id → LaTeX-Formel
  formulaCases?: Record<string, Array<{
    id: string;
    cond_expr: string;      // JS-Bedingung, leer = sonst/Standard
    cond_latex?: string;    // optionale Anzeige-Bedingung
    formula: string;        // LaTeX- oder JS-Formel
  }>>;
  calcs?: Array<{
    id: string;
    name: string;           // Symbol, das danach in Formeln verfügbar ist
    label: string;
    unit: string;
    formula: string;        // LaTeX- oder JS-Formel
    cond_expr?: string;     // optional: nur rechnen, wenn Bedingung erfüllt
    cond_latex?: string;
  }>;
}
export interface GroupCalcOutput {
  id: string;
  name: string;  // LaTeX-Variablenname (z.B. "t_{prot,0,i}")
  label: string; // Anzeigetext
  unit: string;
}
export interface GroupCalcData {
  kind: 'groupcalc';
  label: string;          // Block-Titel
  dropdown_label: string; // Dropdown-Beschriftung (z.B. "Material / Schicht")
  vars: GroupCalcVar[];
  options: GroupCalcOption[];
  outputs: GroupCalcOutput[];
}

export type BlockData =
  | VariableData | DropdownData | WoodClassData | TableValueData | CalcData
  | StdCalcData | TableCalcData | ChartLookupData | ConditionData | CheckData | MinMaxData | ImageBlockData
  | TitleData | FrameData | RefData | CasesData | MatrixData | BeamVisualData | SectionData | CommentData
  | GroupCalcData | LoopBlockData | SummenblockData | OutputData;

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
  display_order?: string[];
  hidden_nodes?: string[];  // ausgeblendete Blöcke im Frontend
}

export const emptyGraph = (): VerificationGraph => ({ version: 1, nodes: [], edges: [] });
