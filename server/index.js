const express = require('express');
const cors = require('cors');
const db = require('./db');
const { buildVerificationExport, exportVerificationById, exportVerificationsByNorm, importVerificationExport, deleteExportFile } = require('./verification-export');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

function safeExportVerification(id) {
  try {
    exportVerificationById(db, id);
  } catch (err) {
    console.error(`Nachweis-Export fehlgeschlagen (${id}):`, err);
  }
}

function safeExportNorm(normId) {
  if (!normId) return;
  try {
    exportVerificationsByNorm(db, normId);
  } catch (err) {
    console.error(`Nachweis-Export fehlgeschlagen (${normId}):`, err);
  }
}

function normalizeId(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

function generatedVerificationId(title) {
  const base = normalizeId(title).slice(0, 30) || 'nachweis';
  return `${base}_${Date.now().toString(36)}`;
}

// ─── NORMEN ──────────────────────────────────────────────────────────────────
app.get('/api/norms', (_, res) => res.json(db.prepare('SELECT * FROM norms').all()));
app.post('/api/norms', (req, res) => {
  const { id, name, label, year, description = '' } = req.body;
  if (!id || !name || !label || !year) {
    return res.status(400).json({ error: 'id, name, label und year sind erforderlich' });
  }
  try {
    db.prepare('INSERT INTO norms (id, name, label, year, description) VALUES (?, ?, ?, ?, ?)')
      .run(String(id).trim(), String(name).trim(), String(label).trim(), Number(year), String(description || '').trim());
    res.json({ id: String(id).trim() });
  } catch (err) {
    res.status(400).json({ error: String(err.message || err) });
  }
});

// ─── KAPITEL (gefiltert nach Norm) ───────────────────────────────────────────
app.get('/api/chapters', (req, res) => {
  const norm = req.query.norm || 'sia265';
  res.json(db.prepare('SELECT * FROM chapters WHERE norm_id=? ORDER BY sort_order').all(norm));
});
app.post('/api/chapters', (req, res) => {
  const { id, norm_id, parent_id, number, title } = req.body;
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM chapters WHERE norm_id=?').get(norm_id).m || 0;
  db.prepare('INSERT INTO chapters (id, norm_id, parent_id, number, title, sort_order) VALUES (?, ?, ?, ?, ?, ?)').run(id, norm_id, parent_id||null, number, title, maxOrder+1);
  safeExportNorm(norm_id);
  res.json({ ok: true });
});
app.put('/api/chapters/:id', (req, res) => {
  const { number, title } = req.body;
  const existing = db.prepare('SELECT norm_id FROM chapters WHERE id=?').get(req.params.id);
  db.prepare('UPDATE chapters SET number=?, title=? WHERE id=?').run(number, title, req.params.id);
  if (existing) safeExportNorm(existing.norm_id);
  res.json({ ok: true });
});
app.delete('/api/chapters/:id', (req, res) => {
  const existing = db.prepare('SELECT norm_id FROM chapters WHERE id=?').get(req.params.id);
  db.prepare('DELETE FROM chapters WHERE id=?').run(req.params.id);
  if (existing) safeExportNorm(existing.norm_id);
  res.json({ ok: true });
});

// ─── NACHWEISE (gefiltert nach Norm) ─────────────────────────────────────────
// Hilfsfunktion: für type=table_column die Optionen aus db_tables laden
function resolveTableColumnOptions(vr) {
  if (vr.type !== 'table_column' || !vr.table_ref || vr.table_col == null) return [];
  const tbl = db.prepare('SELECT headers, rows FROM db_tables WHERE id=?').get(vr.table_ref);
  if (!tbl) return [];
  try {
    const rows = JSON.parse(tbl.rows);
    const col = Number(vr.table_col);
    const seen = new Set();
    return rows
      .map((row, i) => ({ label: String(row[col] ?? ''), value: String(row[col] ?? ''), sort_order: i }))
      .filter(o => { if (seen.has(o.value)) return false; seen.add(o.value); return o.value !== ''; });
  } catch { return []; }
}

app.get('/api/verifications', (req, res) => {
  const norm = req.query.norm || 'sia265';
  const vs = db.prepare('SELECT * FROM verifications WHERE norm_id=? AND active=1 ORDER BY sort_order').all(norm);
  const vars = db.prepare('SELECT * FROM variables ORDER BY sort_order').all();
  const opts = db.prepare('SELECT * FROM variable_options ORDER BY sort_order').all();
  res.json(vs.map(v => ({
    ...v,
    variables: vars.filter(vr => vr.verification_id === v.id)
      .map(vr => ({
        ...vr,
        options: vr.type === 'table_column'
          ? resolveTableColumnOptions(vr)
          : opts.filter(o => o.variable_id === vr.id),
      })),
  })));
});

app.get('/api/verification-export/:id', (req, res) => {
  const payload = buildVerificationExport(db, req.params.id);
  if (!payload) return res.status(404).json({ error: 'Not found' });
  res.json(payload);
});

app.get('/api/verifications/:id', (req, res) => {
  const v = db.prepare('SELECT * FROM verifications WHERE id=?').get(req.params.id);
  if (!v) return res.status(404).json({ error: 'Not found' });
  const vars = db.prepare('SELECT * FROM variables WHERE verification_id=? ORDER BY sort_order').all(v.id);
  const opts = vars.length ? db.prepare(`SELECT * FROM variable_options WHERE variable_id IN (${vars.map(()=>'?').join(',')}) ORDER BY sort_order`).all(...vars.map(v=>v.id)) : [];
  v.variables = vars.map(vr => ({
    ...vr,
    options: vr.type === 'table_column'
      ? resolveTableColumnOptions(vr)
      : opts.filter(o => o.variable_id === vr.id),
  }));
  res.json(v);
});

app.post('/api/verifications', (req, res) => {
  const { id: requestedId='', norm_id='sia265', chapter_id, title, formula_latex='', formula_description='', compute_expr='', graph_json=null, notes='' } = req.body;
  const id = requestedId ? normalizeId(requestedId) : generatedVerificationId(title);
  if (!id) return res.status(400).json({ error: 'ID ist ungültig' });
  try {
    const gj = graph_json == null ? null : (typeof graph_json === 'string' ? graph_json : JSON.stringify(graph_json));
    db.prepare('INSERT INTO verifications (id, norm_id, chapter_id, title, formula_latex, formula_description, compute_expr, graph_json, notes) VALUES (?,?,?,?,?,?,?,?,?)').run(id, norm_id, chapter_id, title, formula_latex, formula_description, compute_expr, gj, notes || '');
    safeExportVerification(id);
    res.json({ id });
  } catch (err) {
    res.status(400).json({ error: String(err.message || err) });
  }
});
app.put('/api/verifications/:id', (req, res) => {
  const { id: requestedId, new_id, title, chapter_id, formula_latex, formula_description, compute_expr, graph_json, notes } = req.body;
  const oldId = req.params.id;
  const nextId = normalizeId(new_id || requestedId || oldId);
  if (!nextId) return res.status(400).json({ error: 'ID ist ungültig' });

  try {
    const updateTx = db.transaction(() => {
      const existing = db.prepare('SELECT id, norm_id FROM verifications WHERE id=?').get(oldId);
      if (!existing) throw new Error('Nachweis nicht gefunden');
      if (nextId !== oldId) {
        const conflict = db.prepare('SELECT id FROM verifications WHERE id=?').get(nextId);
        if (conflict) throw new Error(`ID "${nextId}" existiert bereits`);
      }

      db.prepare('UPDATE verifications SET title=?, chapter_id=?, formula_latex=?, formula_description=?, compute_expr=?, notes=? WHERE id=?').run(title, chapter_id, formula_latex, formula_description, compute_expr||'', notes||'', oldId);
      if (graph_json !== undefined) {
        const gj = graph_json == null ? null : (typeof graph_json === 'string' ? graph_json : JSON.stringify(graph_json));
        db.prepare('UPDATE verifications SET graph_json=? WHERE id=?').run(gj, oldId);
      }
      if (nextId !== oldId) {
        const row = db.prepare('SELECT * FROM verifications WHERE id=?').get(oldId);
        db.prepare(`
          INSERT INTO verifications (id, norm_id, chapter_id, title, formula_latex, formula_description, compute_expr, sort_order, active, graph_json, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          nextId,
          row.norm_id,
          row.chapter_id,
          row.title,
          row.formula_latex || '',
          row.formula_description || '',
          row.compute_expr || '',
          row.sort_order || 0,
          row.active == null ? 1 : row.active,
          row.graph_json || null,
          row.notes || '',
        );
        db.prepare('UPDATE variables SET verification_id=? WHERE verification_id=?').run(nextId, oldId);
        db.prepare('DELETE FROM verifications WHERE id=?').run(oldId);
        deleteExportFile(existing.norm_id, oldId);
      }
    });
    updateTx();
    safeExportVerification(nextId);
    res.json({ ok: true, id: nextId });
  } catch (err) {
    res.status(400).json({ error: String(err.message || err) });
  }
});
app.delete('/api/verifications/:id', (req, res) => {
  db.prepare('UPDATE verifications SET active=0 WHERE id=?').run(req.params.id);
  safeExportVerification(req.params.id);
  res.json({ ok: true });
});

app.post('/api/verifications/import', (req, res) => {
  try {
    const result = importVerificationExport(db, req.body?.payload || req.body, { norm_id: req.body?.norm_id });
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ error: String(err.message || err) });
  }
});

// ─── VARIABLEN ───────────────────────────────────────────────────────────────
app.get('/api/verifications/:vid/variables', (req, res) => {
  const vars = db.prepare('SELECT * FROM variables WHERE verification_id=? ORDER BY sort_order').all(req.params.vid);
  const opts = db.prepare('SELECT * FROM variable_options ORDER BY sort_order').all();
  res.json(vars.map(v => ({ ...v, options: opts.filter(o => o.variable_id === v.id) })));
});
app.post('/api/verifications/:vid/variables', (req, res) => {
  const { name, label, unit='', type='number', default_value='0', description='', options=[], table_ref=null, table_col=null } = req.body;
  const id = req.params.vid + '_' + name + '_' + Date.now().toString(36);
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM variables WHERE verification_id=?').get(req.params.vid).m || 0;
  db.prepare('INSERT INTO variables (id, verification_id, name, label, unit, type, default_value, description, sort_order, table_ref, table_col) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(id, req.params.vid, name, label, unit, type, String(default_value), description, maxOrder+1, table_ref, table_col != null ? Number(table_col) : null);
  if (type !== 'table_column') {
    options.forEach((o, i) => db.prepare('INSERT INTO variable_options (variable_id, label, value, sort_order) VALUES (?,?,?,?)').run(id, o.label, o.value, i));
  }
  safeExportVerification(req.params.vid);
  res.json({ id });
});
app.put('/api/variables/:id', (req, res) => {
  const { name, label, unit='', type, default_value, description='', options=[], table_ref=null, table_col=null } = req.body;
  const existing = db.prepare('SELECT verification_id FROM variables WHERE id=?').get(req.params.id);
  db.prepare('UPDATE variables SET name=?, label=?, unit=?, type=?, default_value=?, description=?, table_ref=?, table_col=? WHERE id=?').run(name, label, unit, type, String(default_value), description, table_ref, table_col != null ? Number(table_col) : null, req.params.id);
  db.prepare('DELETE FROM variable_options WHERE variable_id=?').run(req.params.id);
  if (type !== 'table_column') {
    options.forEach((o, i) => db.prepare('INSERT INTO variable_options (variable_id, label, value, sort_order) VALUES (?,?,?,?)').run(req.params.id, o.label, o.value, i));
  }
  if (existing) safeExportVerification(existing.verification_id);
  res.json({ ok: true });
});
app.delete('/api/variables/:id', (req, res) => {
  const existing = db.prepare('SELECT verification_id FROM variables WHERE id=?').get(req.params.id);
  db.prepare('DELETE FROM variables WHERE id=?').run(req.params.id);
  if (existing) safeExportVerification(existing.verification_id);
  res.json({ ok: true });
});

// ─── HOLZARTEN / -KLASSEN ────────────────────────────────────────────────────
app.get('/api/wood-types', (_, res) => res.json(db.prepare('SELECT * FROM wood_types ORDER BY sort_order').all()));
app.post('/api/wood-types', (req, res) => {
  const { name, label } = req.body;
  const id = name.toLowerCase().replace(/\s+/g,'_');
  db.prepare('INSERT INTO wood_types (id, name, label, sort_order) VALUES (?,?,?,99)').run(id, name, label);
  res.json({ id });
});
app.put('/api/wood-types/:id', (req, res) => {
  db.prepare('UPDATE wood_types SET name=?, label=? WHERE id=?').run(req.body.name, req.body.label, req.params.id);
  res.json({ ok: true });
});
app.delete('/api/wood-types/:id', (req, res) => {
  db.prepare('DELETE FROM wood_types WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/wood-classes', (_, res) => {
  const classes = db.prepare('SELECT * FROM wood_classes ORDER BY wood_type_id, sort_order').all();
  const props   = db.prepare('SELECT * FROM wood_class_properties ORDER BY id').all();
  res.json(classes.map(c => ({ ...c, properties: props.filter(p => p.wood_class_id === c.id) })));
});
app.post('/api/wood-classes', (req, res) => {
  const { wood_type_id, name, label, properties=[] } = req.body;
  const id = name.toUpperCase().replace(/\s+/g,'_');
  db.prepare('INSERT INTO wood_classes (id, wood_type_id, name, label, sort_order) VALUES (?,?,?,?,99)').run(id, wood_type_id, name, label);
  properties.forEach(p => db.prepare('INSERT INTO wood_class_properties (wood_class_id, key, label, value, unit) VALUES (?,?,?,?,?)').run(id, p.key, p.label, p.value, p.unit||''));
  res.json({ id });
});
app.put('/api/wood-classes/:id', (req, res) => {
  const { name, label, properties=[] } = req.body;
  db.prepare('UPDATE wood_classes SET name=?, label=? WHERE id=?').run(name, label, req.params.id);
  db.prepare('DELETE FROM wood_class_properties WHERE wood_class_id=?').run(req.params.id);
  properties.forEach(p => db.prepare('INSERT INTO wood_class_properties (wood_class_id, key, label, value, unit) VALUES (?,?,?,?,?)').run(req.params.id, p.key, p.label, p.value, p.unit||''));
  res.json({ ok: true });
});
app.delete('/api/wood-classes/:id', (req, res) => {
  db.prepare('DELETE FROM wood_classes WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ─── DATENBANK-TABELLEN (gefiltert nach Norm + Kapitel) ──────────────────────
app.get('/api/db-tables', (req, res) => {
  const norm       = req.query.norm;
  const chapter_id = req.query.chapter_id;
  let sql = 'SELECT id, norm_id, chapter_id, title, description, type FROM db_tables WHERE 1=1';
  const params = [];
  if (norm)       { sql += ' AND norm_id=?';    params.push(norm); }
  if (chapter_id) { sql += ' AND chapter_id=?'; params.push(chapter_id); }
  sql += ' ORDER BY title';
  res.json(db.prepare(sql).all(...params));
});
app.get('/api/db-tables/:id', (req, res) => {
  const t = db.prepare('SELECT * FROM db_tables WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json({ ...t, headers: JSON.parse(t.headers), rows: JSON.parse(t.rows), chart_json: t.chart_json ? JSON.parse(t.chart_json) : null });
});
app.post('/api/db-tables', (req, res) => {
  const { norm_id='sia265', chapter_id=null, title, description='', type='table', headers=[], rows=[], chart_json=null } = req.body;
  const id = title.toLowerCase().replace(/[^a-z0-9]/g,'_') + '_' + Date.now().toString(36);
  db.prepare('INSERT INTO db_tables (id, norm_id, chapter_id, title, description, type, headers, rows, chart_json) VALUES (?,?,?,?,?,?,?,?,?)').run(id, norm_id, chapter_id, title, description, type, JSON.stringify(headers), JSON.stringify(rows), chart_json ? JSON.stringify(chart_json) : null);
  safeExportNorm(norm_id);
  res.json({ id });
});
app.put('/api/db-tables/:id', (req, res) => {
  const { norm_id, chapter_id=null, title, description, type='table', headers=[], rows=[], chart_json=null } = req.body;
  const existing = db.prepare('SELECT norm_id FROM db_tables WHERE id=?').get(req.params.id);
  db.prepare('UPDATE db_tables SET norm_id=?, chapter_id=?, title=?, description=?, type=?, headers=?, rows=?, chart_json=? WHERE id=?').run(norm_id, chapter_id, title, description||'', type, JSON.stringify(headers), JSON.stringify(rows), chart_json ? JSON.stringify(chart_json) : null, req.params.id);
  if (existing) safeExportNorm(existing.norm_id);
  safeExportNorm(norm_id);
  res.json({ ok: true });
});
app.delete('/api/db-tables/:id', (req, res) => {
  const existing = db.prepare('SELECT norm_id FROM db_tables WHERE id=?').get(req.params.id);
  db.prepare('DELETE FROM db_tables WHERE id=?').run(req.params.id);
  if (existing) safeExportNorm(existing.norm_id);
  res.json({ ok: true });
});

// ─── EINHEITEN ────────────────────────────────────────────────────────────────
app.get('/api/units', (_, res) => res.json(db.prepare('SELECT * FROM units ORDER BY sort_order, id').all()));
app.post('/api/units', (req, res) => {
  const { latex, sort_order = 0 } = req.body;
  if (!latex) return res.status(400).json({ error: 'latex fehlt' });
  try {
    const r = db.prepare('INSERT INTO units (latex, sort_order) VALUES (?, ?)').run(String(latex).trim(), Number(sort_order));
    res.json({ id: r.lastInsertRowid, latex: String(latex).trim(), sort_order: Number(sort_order) });
  } catch (e) { res.status(409).json({ error: 'Einheit existiert bereits' }); }
});
app.put('/api/units/:id', (req, res) => {
  const { latex, sort_order = 0 } = req.body;
  db.prepare('UPDATE units SET latex = ?, sort_order = ? WHERE id = ?').run(String(latex).trim(), Number(sort_order), req.params.id);
  res.json({ ok: true });
});
app.delete('/api/units/:id', (req, res) => {
  db.prepare('DELETE FROM units WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Backend läuft auf http://localhost:${PORT}`));
