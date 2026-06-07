// Adapter: wandelt einen klassischen Nachweis (flache Variablenliste + compute_expr)
// in einen Graphen um, damit bestehende Nachweise im Node-System weiter funktionieren.
//
// Schema: je Variable ein `variable`-Node (links gestapelt) → ein `calc`-Node rechts,
// der das compute_expr auswertet. Workflow-Kanten von jeder Variable zum calc.

import { VerificationGraph, GraphNode, GraphEdge, VariableData, CalcData } from '../types/graph';

interface LegacyVariable {
  id?: string; name: string; label?: string; unit?: string;
  type?: string; default_value?: string; description?: string;
  options?: { label: string; value: string }[];
  table_ref?: string | null; table_col?: number | null;
}
interface LegacyVerification {
  id: string; title: string;
  formula_latex?: string; formula_description?: string;
  compute_expr?: string;
  variables?: LegacyVariable[];
}

export function legacyToGraph(v: LegacyVerification): VerificationGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const vars = v.variables || [];

  vars.forEach((vr, i) => {
    const inputKind: VariableData['inputKind'] =
      vr.type === 'dropdown' ? 'dropdown'
      : vr.type === 'table_column' ? 'table_column'
      : 'number';
    const data: VariableData = {
      kind: 'variable',
      name: vr.name,
      label: vr.label || vr.name,
      unit: vr.unit || '',
      default_value: vr.default_value ?? '0',
      description: vr.description || '',
      inputKind,
      options: vr.options || [],
      table_ref: vr.table_ref || undefined,
      table_col: vr.table_col != null ? vr.table_col : undefined,
    };
    nodes.push({
      id: `var_${vr.name || i}`,
      type: 'variable',
      position: { x: 40, y: 40 + i * 130 },
      data,
    });
  });

  const calcData: CalcData = {
    kind: 'calc',
    name: 'eta',
    label: v.title,
    unit: '',
    latex: v.formula_latex || '',
    expr: v.compute_expr || '',
    description: v.formula_description || '',
  };
  const calcId = 'calc_result';
  nodes.push({
    id: calcId,
    type: 'calc',
    position: { x: 460, y: 40 + Math.max(0, (vars.length - 1) / 2) * 130 },
    data: calcData,
  });

  vars.forEach((vr, i) => {
    edges.push({
      id: `e_${i}`,
      source: `var_${vr.name || i}`,
      target: calcId,
      data: { kind: 'workflow' },
    });
  });

  return { version: 1, nodes, edges };
}

// Liefert den Graphen eines Nachweises: nutzt graph_json, sonst Legacy-Adapter.
export function getGraph(v: LegacyVerification & { graph_json?: string | null }): VerificationGraph {
  if (v.graph_json) {
    try {
      const g = typeof v.graph_json === 'string' ? JSON.parse(v.graph_json) : v.graph_json;
      if (g && Array.isArray(g.nodes)) return g as VerificationGraph;
    } catch { /* fällt auf Legacy zurück */ }
  }
  return legacyToGraph(v);
}
