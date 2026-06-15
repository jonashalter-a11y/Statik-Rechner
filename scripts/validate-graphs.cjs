const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHECK_TYPES = new Set([
  'beamvisual', 'calc', 'cases', 'chartlookup', 'check', 'comment', 'condition',
  'dropdown', 'frame', 'groupcalc', 'image', 'loopblock', 'matrix', 'minmax',
  'output', 'ref', 'section', 'stdcalc', 'tablecalc', 'tablevalue', 'title',
  'variable', 'woodclass', 'summenblock', 'sum', 'summenblock_neu',
]);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function walkJson(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) out.push(...walkJson(full));
    else if (item.isFile() && item.name.endsWith('.json')) out.push(full);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function safeParseJson(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  try { return JSON.parse(text); } catch { return null; }
}

function getGraph(payload) {
  if (payload.graph && Array.isArray(payload.graph.nodes)) return payload.graph;
  const graphJson = payload.verification?.graph_json || payload.graph_json;
  const parsed = safeParseJson(graphJson);
  if (parsed && Array.isArray(parsed.nodes)) return parsed;
  return null;
}

function collectTables() {
  const tables = new Map();
  for (const file of walkJson(path.join(ROOT, 'data', 'tables'))) {
    const data = readJson(file);
    const list = Array.isArray(data) ? data : (Array.isArray(data.tables) ? data.tables : []);
    for (const table of list) if (table?.id) tables.set(String(table.id), table);
  }
  return tables;
}

function addPayloadTables(tables, payload) {
  for (const table of Array.isArray(payload.tables) ? payload.tables : []) {
    if (table?.id) tables.set(String(table.id), table);
  }
}

function collectTableRefs(graph) {
  const ids = new Set();
  for (const node of graph.nodes || []) {
    const data = node.data || {};
    if (data.table_ref) ids.add(String(data.table_ref));
    if (data.chart_ref) ids.add(String(data.chart_ref));
  }
  return [...ids];
}

function collectDependencies(graph) {
  const nodeById = new Map((graph.nodes || []).map(node => [node.id, node]));
  const deps = [];
  const seen = new Set();
  const add = (source, target) => {
    source = String(source || '');
    target = String(target || '');
    if (!source || !target || source === target) return;
    const key = `${source}->${target}`;
    if (seen.has(key)) return;
    seen.add(key);
    deps.push({ source, target });
  };

  for (const edge of graph.edges || []) {
    if (['workflow', 'condition'].includes(edge.data?.kind || 'workflow')) add(edge.source, edge.target);
  }

  for (const node of graph.nodes || []) {
    const data = node.data || {};
    add(data.source_id, node.id);
    add(data.source_dropdown, node.id);
    add(data.source_tablecalc, node.id);
    if ((node.type === 'condition' || node.type === 'cases') && data.source && !['woodType', 'woodClass'].includes(String(data.source))) {
      add(data.source, node.id);
    }
    if (node.type === 'stdcalc' && !data.source_tablecalc) {
      const wired = (graph.edges || []).find(edge => edge.target === node.id && nodeById.get(edge.source)?.type === 'tablecalc')?.source;
      add(wired, node.id);
    }
  }

  return deps;
}

function findCycles(graph) {
  const ids = new Set((graph.nodes || []).map(node => node.id));
  const adj = new Map([...ids].map(id => [id, []]));
  for (const dep of collectDependencies(graph)) {
    if (ids.has(dep.source) && ids.has(dep.target)) adj.get(dep.source).push(dep.target);
  }

  const cycles = [];
  const state = new Map();
  const stack = [];
  const visit = (id) => {
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'visiting') {
      const start = stack.indexOf(id);
      if (start >= 0) cycles.push([...stack.slice(start), id]);
      return;
    }
    state.set(id, 'visiting');
    stack.push(id);
    for (const next of adj.get(id) || []) visit(next);
    stack.pop();
    state.set(id, 'done');
  };
  for (const id of ids) visit(id);
  return cycles;
}

function validateGraph(graph, tables) {
  const errors = [];
  const warnings = [];
  const nodeIds = new Set();
  const addError = (msg) => errors.push(msg);
  const addWarning = (msg) => warnings.push(msg);

  if (!Array.isArray(graph.nodes)) addError('graph.nodes fehlt oder ist kein Array');
  if (!Array.isArray(graph.edges)) addError('graph.edges fehlt oder ist kein Array');
  if (errors.length) return { errors, warnings };

  for (const node of graph.nodes) {
    if (!node.id) {
      addError('Block ohne ID gefunden');
      continue;
    }
    if (nodeIds.has(node.id)) addError(`Doppelte Block-ID "${node.id}"`);
    nodeIds.add(node.id);
    if (!CHECK_TYPES.has(node.type)) addError(`Unbekannter Blocktyp "${node.type}" in ${node.id}`);
    if (!node.data) addError(`Blockdaten fehlen in ${node.id}`);
  }

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source)) addError(`Kante "${edge.id || '?'}" verweist auf fehlende Quelle "${edge.source}"`);
    if (!nodeIds.has(edge.target)) addError(`Kante "${edge.id || '?'}" verweist auf fehlendes Ziel "${edge.target}"`);
  }

  for (const dep of collectDependencies(graph)) {
    if (!nodeIds.has(dep.source)) addError(`Block "${dep.target}" verweist auf fehlende Quelle "${dep.source}"`);
    if (!nodeIds.has(dep.target)) addError(`Abhängigkeit von "${dep.source}" verweist auf fehlendes Ziel "${dep.target}"`);
  }

  for (const tableId of collectTableRefs(graph)) {
    if (!tables.has(tableId)) addError(`Tabelle/Diagramm "${tableId}" wurde nicht gefunden`);
  }

  for (const node of graph.nodes) {
    const data = node.data || {};
    if ((node.type === 'variable' && data.inputKind === 'table_column') || node.type === 'dropdown' || node.type === 'tablecalc') {
      if ((node.type !== 'dropdown' || data.mode !== 'custom') && !data.table_ref) addError(`Tabellen-Referenz fehlt in ${node.id}`);
    }
    if (node.type === 'chartlookup' && !data.chart_ref) addError(`Diagramm-Referenz fehlt in ${node.id}`);
    if (node.type === 'ref' && !data.source_id) addError(`Referenzquelle fehlt in ${node.id}`);
    if ((node.type === 'calc' || node.type === 'stdcalc' || node.type === 'check') && !String(data.expr || data.latex || '').trim()) {
      addWarning(`Formel/Ausdruck fehlt in ${node.id}`);
    }

    const tableId = data.table_ref || data.chart_ref;
    const table = tableId ? tables.get(String(tableId)) : null;
    if (table) {
      const rows = Array.isArray(table.rows) ? table.rows : [];
      const col = data.table_col ?? data.label_col;
      if (col != null && rows.length > 0 && rows.every(row => row?.[Number(col)] == null)) {
        addWarning(`Spalte ${col} existiert in Tabelle "${tableId}" nicht (${node.id})`);
      }
      if (!rows.length && node.type !== 'chartlookup') addWarning(`Tabelle "${tableId}" enthält keine Zeilen (${node.id})`);
      if (node.type === 'chartlookup' && !table.chart_json?.series?.length) addWarning(`Diagramm "${tableId}" enthält keine Kurven (${node.id})`);
    }
  }

  for (const cycle of findCycles(graph)) addError(`Zyklische Abhängigkeit: ${cycle.join(' -> ')}`);
  for (const id of graph.display_order || []) if (!nodeIds.has(id)) addWarning(`display_order enthält fehlenden Block "${id}"`);
  for (const id of graph.hidden_nodes || []) if (!nodeIds.has(id)) addWarning(`hidden_nodes enthält fehlenden Block "${id}"`);

  return { errors, warnings };
}

function main() {
  const files = walkJson(path.join(ROOT, 'nachweise'));
  const globalTables = collectTables();
  let errorCount = 0;
  let warningCount = 0;

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    let payload;
    try {
      payload = readJson(file);
    } catch (err) {
      console.error(`\n${rel}`);
      console.error(`  Fehler: JSON konnte nicht gelesen werden: ${err.message}`);
      errorCount += 1;
      continue;
    }

    const graph = getGraph(payload);
    if (!graph) {
      console.error(`\n${rel}`);
      console.error('  Fehler: Kein Graph gefunden');
      errorCount += 1;
      continue;
    }

    const tables = new Map(globalTables);
    addPayloadTables(tables, payload);
    const { errors, warnings } = validateGraph(graph, tables);
    errorCount += errors.length;
    warningCount += warnings.length;

    if (errors.length || warnings.length) {
      console.log(`\n${rel}`);
      for (const err of errors) console.log(`  Fehler: ${err}`);
      for (const warn of warnings) console.log(`  Hinweis: ${warn}`);
    }
  }

  const summary = `${files.length} Nachweise geprüft, ${errorCount} Fehler, ${warningCount} Hinweise`;
  if (errorCount > 0) {
    console.error(`\nValidierung fehlgeschlagen: ${summary}`);
    process.exit(1);
  }
  console.log(`\nValidierung erfolgreich: ${summary}`);
}

main();
