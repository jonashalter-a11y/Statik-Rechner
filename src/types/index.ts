export type Discipline = 'Statik' | 'Bauphysik';
export type Standard = 'SIA' | 'Eurocode';
export type WoodType = 'Vollholz' | 'Brettschichtholz' | 'Brettsperrholz';

export interface WoodClass {
  id: string;
  name: string;
  label: string;
  properties: Record<string, number>;
}

export interface Variable {
  id: string;
  name: string; // e.g. "f_m_k" -> renders as f_{m,k}
  label: string;
  unit: string;
  type: 'number' | 'dropdown' | 'number_info' | 'table' | 'table_column';
  value: number | string | null;
  options?: { label: string; value: number | string }[];
  tableId?: string;
  table_ref?: string;   // db_tables.id  (nur bei type=table_column)
  table_col?: number;   // Spaltenindex   (nur bei type=table_column)
  infoText?: string;
  description: string;
  formula?: string;
}

export interface Formula {
  id: string;
  latex: string; // LaTeX formula
  description: string;
  variables: string[]; // variable ids used
  resultVariableId: string; // which variable stores result
}

export interface Verification {
  id: string;
  chapterId: string;
  title: string;
  variables: Variable[];
  formula: Formula;
  computeExpr?: string;
  graph_json?: string | null;
  comment: string;
  result?: number;
  passed?: boolean;
}

export interface Chapter {
  id: string;
  number: string;
  title: string;
  children?: Chapter[];
  verifications?: string[];   // IDs der Verifikationen (werden aus API geladen)
  expanded?: boolean;
}

export interface PrintBlock {
  verificationId: string;
  title: string;
  position: { x: number; y: number };
}

export interface ProjectState {
  discipline: Discipline;
  standard: Standard;
  woodType: WoodType;
  woodClassId: string;
  chapters: Chapter[];
  activeChapterId: string | null;
  activeVerificationId: string | null;
  printBlocks: PrintBlock[];
  verifications: Verification[];
}
