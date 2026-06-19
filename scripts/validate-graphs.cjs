const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHECK_TYPES = new Set([
  'beamvisual', 'calc', 'cases', 'chartlookup', 'check', 'comment', 'condition',
  'dropdown', 'frame', 'groupcalc', 'image', 'loopblock', 'matrix', 'minmax',
  'output', 'polargrid', 'ref', 'section', 'stdcalc', 'switchcalc', 'tablecalc', 'tablevalue', 'title',
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

  const producerBySymbol = new Map();
  for (const node of graph.nodes || []) {
    const name = node.data?.name;
    if (!name) continue;
    const jsName = jsSymbolName(name);
    if (/^[A-Za-z_$][\w$]*$/.test(jsName) && !producerBySymbol.has(jsName)) producerBySymbol.set(jsName, node.id);
    const compact = jsName.replace(/_([A-Za-z]+)_(\d+)(?=_|$)/g, '_$1$2');
    if (/^[A-Za-z_$][\w$]*$/.test(compact) && !producerBySymbol.has(compact)) producerBySymbol.set(compact, node.id);
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
    for (const symbol of extractExprIdentifiers(data.expr)) add(producerBySymbol.get(symbol), node.id);
  }

  return deps;
}

function jsSymbolName(name) {
  return String(name || '')
    .replace(/\\(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|lambda|mu|nu|xi|pi|rho|sigma|tau|phi|chi|psi|omega)\b/g, '$1')
    .replace(/[ä]/g, 'ae').replace(/[ö]/g, 'oe').replace(/[ü]/g, 'ue')
    .replace(/[Ä]/g, 'Ae').replace(/[Ö]/g, 'Oe').replace(/[Ü]/g, 'Ue')
    .replace(/[ß]/g, 'ss')
    .replace(/\\/g, '')
    .replace(/([A-Za-z0-9_])'+/g, '$1')
    .replace(/_\{([^{}]+)\}/g, (_m, sub) => '_' + sub.replace(/[,\s.]+/g, '_'))
    .replace(/[{},\s.]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function addSymbol(symbols, name) {
  const jsName = jsSymbolName(name);
  if (/^[A-Za-z_$][\w$]*$/.test(jsName)) {
    symbols.add(jsName);
    const compact = jsName.replace(/_([A-Za-z]+)_(\d+)(?=_|$)/g, '_$1$2');
    symbols.add(compact);
  }
}

function extractMissingSymbols(expr, symbols) {
  const cleaned = String(expr || '')
    .replace(/\\pi\b/g, '')
    .replace(/\bpi\b/g, '')
    .replace(/\\e\b/g, '')
    .replace(/\be\b/g, '')
    .replace(/Math\.[A-Za-z_$][\w$]*/g, '');
  const ids = cleaned.match(/[A-Za-z_$][\w$]*/g) || [];
  const ignored = new Set(['Math', 'NaN', 'Infinity', 'undefined', 'null', 'true', 'false', 'pi', 'e']);
  return [...new Set(ids.filter(id => !ignored.has(id) && !symbols.has(id)))];
}

function extractExprIdentifiers(expr) {
  const cleaned = String(expr || '')
    .replace(/Math\.[A-Za-z_$][\w$]*/g, '')
    .replace(/\b(?:NaN|Infinity|undefined|null|true|false|Math|pi|e)\b/g, '');
  return [...new Set(cleaned.match(/[A-Za-z_$][\w$]*/g) || [])];
}

function topoSort(graph) {
  const nodes = graph.nodes || [];
  const nodeById = new Map(nodes.map((node, index) => [node.id, { node, index }]));
  const indeg = new Map(nodes.map(node => [node.id, 0]));
  const adj = new Map(nodes.map(node => [node.id, []]));
  for (const dep of collectDependencies(graph)) {
    if (!adj.has(dep.source) || !indeg.has(dep.target)) continue;
    adj.get(dep.source).push(dep.target);
    indeg.set(dep.target, (indeg.get(dep.target) || 0) + 1);
  }

  const inputTypes = new Set(['variable', 'dropdown', 'woodclass', 'tablevalue', 'chartlookup', 'polargrid']);
  const priority = (id) => {
    const entry = nodeById.get(id);
    return [(entry && inputTypes.has(entry.node.type)) ? 0 : 1, entry?.index ?? 0];
  };
  const sortQueue = (items) => items.sort((a, b) => {
    const pa = priority(a), pb = priority(b);
    return (pa[0] - pb[0]) || (pa[1] - pb[1]);
  });

  const queue = sortQueue(nodes.filter(node => (indeg.get(node.id) || 0) === 0).map(node => node.id));
  const order = [];
  const seen = new Set();
  while (queue.length) {
    const id = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    order.push(id);
    for (const target of adj.get(id) || []) {
      indeg.set(target, (indeg.get(target) || 0) - 1);
      if ((indeg.get(target) || 0) <= 0 && !seen.has(target)) {
        queue.push(target);
        sortQueue(queue);
      }
    }
  }
  for (const node of nodes) if (!seen.has(node.id)) order.push(node.id);
  return order.map(id => nodeById.get(id)?.node).filter(Boolean);
}

function validateFormulaSymbols(graph, addWarning) {
  const symbols = new Set();
  const check = (node, label, expr, local = symbols) => {
    const missing = extractMissingSymbols(expr, local);
    if (missing.length) addWarning(`${label} nutzt fehlende Symbole: ${missing.join(', ')} (${node.id})`);
  };

  for (const node of topoSort(graph)) {
    const data = node.data || {};
    const local = new Set(symbols);
    if (node.type === 'stdcalc' && data.picker_name) addSymbol(local, data.picker_name);
    if (node.type === 'tablecalc') addSymbol(local, 'cell');

    if (['calc', 'stdcalc', 'check', 'minmax'].includes(node.type) && String(data.expr || '').trim()) {
      check(node, 'Formel', data.expr, local);
    }
    if (node.type === 'condition') {
      for (const condition of Array.isArray(data.conditions) ? data.conditions : []) {
        if (String(condition?.expr || '').trim()) check(node, 'Bedingung', condition.expr, local);
      }
    }
    if (node.type === 'cases') {
      for (const item of Array.isArray(data.cases) ? data.cases : []) {
        const cond = String(item?.cond_expr || '').trim();
        if (cond && !/^(else|sonst|\(leer\s*[=:]\s*else\))$/i.test(cond)) check(node, 'Fall-Bedingung', cond, local);
      }
    }
    if (node.type === 'matrix') {
      for (const row of Array.isArray(data.rows) ? data.rows : []) {
        for (const cell of Array.isArray(row?.cells) ? row.cells : []) {
          const expr = String(cell || '').trim();
          if (expr && !expr.includes('\\')) check(node, 'Matrix-Zelle', expr, local);
        }
      }
    }

    if (['variable', 'dropdown', 'tablevalue', 'calc', 'stdcalc', 'minmax', 'cases', 'polargrid'].includes(node.type)) addSymbol(symbols, data.name);
    if (node.type === 'chartlookup' && !data.all_series) addSymbol(symbols, data.name);
    if (node.type === 'matrix') {
      for (const col of Array.isArray(data.columns) ? data.columns : []) addSymbol(symbols, col?.name);
    }
    if (node.type === 'loopblock') {
      for (const ag of Array.isArray(data.aggregations) ? data.aggregations : []) addSymbol(symbols, ag?.name);
    }
  }
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
  validateFormulaSymbols(graph, addWarning);
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
