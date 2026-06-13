const fs = require('fs');
const path = require('path');

const EXPORT_ROOT = path.join(__dirname, 'nachweise');

function slugify(value) {
  const slug = String(value || 'nachweis')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
  return slug || 'nachweis';
}

function parseJson(value, fallback) {
  if (value == null || value === '') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function readGraph(graphJson) {
  if (!graphJson) return { graph: null };
  try {
    return { graph: JSON.parse(graphJson) };
  } catch (err) {
    return {
      graph: null,
      graph_json: graphJson,
      graph_parse_error: String(err.message || err),
    };
  }
}

function collectTableRefs(value, refs = new Set()) {
  if (!value || typeof value !== 'object') return refs;
  if (Array.isArray(value)) {
    value.forEach(item => collectTableRefs(item, refs));
    return refs;
  }

  Object.entries(value).forEach(([key, entry]) => {
    if ((key === 'table_ref' || key === 'tableRef') && entry) refs.add(String(entry));
    collectTableRefs(entry, refs);
  });
  return refs;
}

function loadTables(db, tableIds) {
  if (!tableIds.length) return [];
  const placeholders = tableIds.map(() => '?').join(',');
  return db.prepare(`SELECT * FROM db_tables WHERE id IN (${placeholders})`)
    .all(...tableIds)
    .map(table => ({
      ...table,
      headers: parseJson(table.headers, []),
      rows: parseJson(table.rows, []),
      chart_json: parseJson(table.chart_json, null),
    }));
}

function buildVerificationExport(db, verificationId) {
  const verification = db.prepare('SELECT * FROM verifications WHERE id=?').get(verificationId);
  if (!verification) return null;

  const chapter = db.prepare('SELECT * FROM chapters WHERE id=?').get(verification.chapter_id) || null;
  const variables = db.prepare('SELECT * FROM variables WHERE verification_id=? ORDER BY sort_order').all(verification.id);
  const options = variables.length
    ? db.prepare(`SELECT * FROM variable_options WHERE variable_id IN (${variables.map(() => '?').join(',')}) ORDER BY sort_order`).all(...variables.map(v => v.id))
    : [];
  const variablesWithOptions = variables.map(variable => ({
    ...variable,
    options: options.filter(option => option.variable_id === variable.id),
  }));

  const graphPayload = readGraph(verification.graph_json);
  const tableRefs = new Set(variablesWithOptions.map(v => v.table_ref).filter(Boolean).map(String));
  collectTableRefs(graphPayload.graph, tableRefs);

  return {
    version: 1,
    exported_at: new Date().toISOString(),
    verification,
    chapter,
    variables: variablesWithOptions,
    tables: loadTables(db, Array.from(tableRefs)),
    ...graphPayload,
  };
}

function exportVerificationById(db, verificationId) {
  const payload = buildVerificationExport(db, verificationId);
  if (!payload) return null;

  const normDir = path.join(EXPORT_ROOT, slugify(payload.verification.norm_id));
  fs.mkdirSync(normDir, { recursive: true });

  const filePath = path.join(
    normDir,
    `${slugify(payload.verification.title)}__${slugify(payload.verification.id)}.json`,
  );
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
  return filePath;
}

function exportVerificationsByNorm(db, normId) {
  const rows = db.prepare('SELECT id FROM verifications WHERE norm_id=? AND active=1 ORDER BY sort_order').all(normId);
  return rows.map(row => exportVerificationById(db, row.id)).filter(Boolean);
}

function exportActiveVerifications(db) {
  const rows = db.prepare('SELECT id FROM verifications WHERE active=1 ORDER BY norm_id, sort_order').all();
  return rows.map(row => exportVerificationById(db, row.id)).filter(Boolean);
}

module.exports = {
  EXPORT_ROOT,
  exportActiveVerifications,
  exportVerificationById,
  exportVerificationsByNorm,
};
