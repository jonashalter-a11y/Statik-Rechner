const fs = require('fs');
const path = require('path');

const DATA_ROOT = path.join(__dirname, 'data');
const CHAPTER_ROOT = path.join(DATA_ROOT, 'chapters');
const TABLE_ROOT = path.join(DATA_ROOT, 'tables');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filePath, payload) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseJson(value, fallback) {
  if (value == null || value === '') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function slugify(value) {
  const slug = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || 'data';
}

function normFile() {
  return path.join(DATA_ROOT, 'norms.json');
}

function unitFile() {
  return path.join(DATA_ROOT, 'units.json');
}

function woodFile() {
  return path.join(DATA_ROOT, 'wood.json');
}

function chaptersFile(normId) {
  return path.join(CHAPTER_ROOT, `${slugify(normId)}.json`);
}

function tablesFile(normId) {
  return path.join(TABLE_ROOT, `${slugify(normId)}.json`);
}

function getNormIds(db) {
  return db.prepare('SELECT id FROM norms ORDER BY id').all().map(row => row.id);
}

function exportNorms(db) {
  const rows = db.prepare('SELECT * FROM norms ORDER BY id').all();
  writeJson(normFile(), rows);
  return rows.length;
}

function exportUnits(db) {
  const rows = db.prepare('SELECT * FROM units ORDER BY sort_order, id').all();
  writeJson(unitFile(), rows);
  return rows.length;
}

function exportWood(db) {
  const woodTypes = db.prepare('SELECT * FROM wood_types ORDER BY sort_order, id').all();
  const classes = db.prepare('SELECT * FROM wood_classes ORDER BY wood_type_id, sort_order, id').all();
  const props = db.prepare('SELECT * FROM wood_class_properties ORDER BY id').all();
  const payload = {
    wood_types: woodTypes,
    wood_classes: classes.map(woodClass => ({
      ...woodClass,
      properties: props
        .filter(prop => prop.wood_class_id === woodClass.id)
        .map(({ id, ...prop }) => prop),
    })),
  };
  writeJson(woodFile(), payload);
  return woodTypes.length + classes.length;
}

function exportChapters(db, normId) {
  const rows = db.prepare('SELECT * FROM chapters WHERE norm_id=? ORDER BY sort_order, number, id').all(normId);
  writeJson(chaptersFile(normId), rows);
  return rows.length;
}

function exportTables(db, normId) {
  const rows = db.prepare('SELECT * FROM db_tables WHERE norm_id=? ORDER BY title, id').all(normId)
    .map(row => ({
      ...row,
      headers: parseJson(row.headers, []),
      rows: parseJson(row.rows, []),
      chart_json: parseJson(row.chart_json, null),
    }));
  writeJson(tablesFile(normId), rows);
  return rows.length;
}

function exportAllStaticData(db) {
  const normCount = exportNorms(db);
  const unitCount = exportUnits(db);
  const woodCount = exportWood(db);
  const norms = getNormIds(db);
  const chapterCount = norms.reduce((sum, normId) => sum + exportChapters(db, normId), 0);
  const tableCount = norms.reduce((sum, normId) => sum + exportTables(db, normId), 0);
  return { norms: normCount, units: unitCount, wood: woodCount, chapters: chapterCount, tables: tableCount };
}

function hasStaticDataFiles() {
  return fs.existsSync(normFile())
    || fs.existsSync(unitFile())
    || fs.existsSync(woodFile())
    || fs.existsSync(CHAPTER_ROOT)
    || fs.existsSync(TABLE_ROOT);
}

function ensureStaticDataFiles(db) {
  if (hasStaticDataFiles()) return { created: false };
  return { created: true, ...exportAllStaticData(db) };
}

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(file => file.endsWith('.json'))
    .map(file => path.join(dir, file))
    .sort((a, b) => a.localeCompare(b));
}

function importNorms(db) {
  const rows = readJson(normFile(), []);
  if (!rows.length) return 0;
  db.prepare('DELETE FROM norms').run();
  const stmt = db.prepare('INSERT INTO norms (id, name, label, year, description) VALUES (?, ?, ?, ?, ?)');
  rows.forEach(row => stmt.run(row.id, row.name, row.label, Number(row.year || 0), row.description || ''));
  return rows.length;
}

function importUnits(db) {
  const rows = readJson(unitFile(), []);
  if (!rows.length) return 0;
  db.prepare('DELETE FROM units').run();
  const stmt = db.prepare('INSERT INTO units (id, latex, sort_order) VALUES (?, ?, ?)');
  rows.forEach(row => stmt.run(row.id, row.latex, Number(row.sort_order || 0)));
  return rows.length;
}

function importWood(db) {
  const payload = readJson(woodFile(), null);
  if (!payload) return 0;
  db.prepare('DELETE FROM wood_class_properties').run();
  db.prepare('DELETE FROM wood_classes').run();
  db.prepare('DELETE FROM wood_types').run();

  const insertType = db.prepare('INSERT INTO wood_types (id, name, label, sort_order) VALUES (?, ?, ?, ?)');
  const insertClass = db.prepare('INSERT INTO wood_classes (id, wood_type_id, name, label, sort_order) VALUES (?, ?, ?, ?, ?)');
  const insertProp = db.prepare('INSERT INTO wood_class_properties (wood_class_id, key, label, value, unit) VALUES (?, ?, ?, ?, ?)');

  for (const row of payload.wood_types || []) {
    insertType.run(row.id, row.name, row.label, Number(row.sort_order || 0));
  }
  for (const row of payload.wood_classes || []) {
    insertClass.run(row.id, row.wood_type_id, row.name, row.label, Number(row.sort_order || 0));
    for (const prop of row.properties || []) {
      insertProp.run(row.id, prop.key, prop.label, Number(prop.value || 0), prop.unit || '');
    }
  }
  return (payload.wood_types || []).length + (payload.wood_classes || []).length;
}

function importChapters(db) {
  const files = listJsonFiles(CHAPTER_ROOT);
  if (!files.length) return 0;
  db.prepare('DELETE FROM chapters').run();
  const stmt = db.prepare('INSERT INTO chapters (id, norm_id, parent_id, number, title, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
  let count = 0;
  for (const file of files) {
    const rows = readJson(file, []);
    for (const row of rows) {
      stmt.run(row.id, row.norm_id, row.parent_id || null, row.number || '', row.title || '', Number(row.sort_order || 0));
      count += 1;
    }
  }
  return count;
}

function importTables(db) {
  const files = listJsonFiles(TABLE_ROOT);
  if (!files.length) return 0;
  db.prepare('DELETE FROM db_tables').run();
  const stmt = db.prepare(`
    INSERT INTO db_tables (id, norm_id, chapter_id, category, title, description, type, headers, rows, chart_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  let count = 0;
  for (const file of files) {
    const rows = readJson(file, []);
    for (const row of rows) {
      stmt.run(
        row.id,
        row.norm_id,
        row.chapter_id || null,
        row.category || '',
        row.title || row.id,
        row.description || '',
        row.type || 'table',
        JSON.stringify(row.headers || []),
        JSON.stringify(row.rows || []),
        row.chart_json ? JSON.stringify(row.chart_json) : null,
      );
      count += 1;
    }
  }
  return count;
}

function importStaticData(db) {
  if (!hasStaticDataFiles()) return { skipped: true };
  const result = db.transaction(() => ({
    norms: importNorms(db),
    units: importUnits(db),
    wood: importWood(db),
    chapters: importChapters(db),
    tables: importTables(db),
  }))();
  return { skipped: false, ...result };
}

module.exports = {
  DATA_ROOT,
  exportAllStaticData,
  exportChapters,
  exportNorms,
  exportTables,
  exportUnits,
  exportWood,
  ensureStaticDataFiles,
  importStaticData,
};
