const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// ─── NORMEN ──────────────────────────────────────────────────────────────────
app.get('/api/norms', (_, res) => res.json(db.prepare('SELECT * FROM norms').all()));

// ─── KAPITEL (gefiltert nach Norm) ───────────────────────────────────────────
app.get('/api/chapters', (req, res) => {
  const norm = req.query.norm || 'sia265';
  res.json(db.prepare('SELECT * FROM chapters WHERE norm_id=? ORDER BY sort_order').all(norm));
});
app.post('/api/chapters', (req, res) => {
  const { id, norm_id, parent_id, number, title } = req.body;
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM chapters WHERE norm_id=?').get(norm_id).m || 0;
  db.prepare('INSERT INTO chapters (id, norm_id, parent_id, number, title, sort_order) VALUES (?, ?, ?, ?, ?, ?)').run(id, norm_id, parent_id||null, number, title, maxOrder+1);
  res.json({ ok: true });
});
app.put('/api/chapters/:id', (req, res) => {
  const { number, title } = req.body;
  db.prepare('UPDATE chapters SET number=?, title=? WHERE id=?').run(number, title, req.params.id);
  res.json({ ok: true });
});
app.delete('/api/chapters/:id', (req, res) => {
  db.prepare('DELETE FROM chapters WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ─── NACHWEISE (gefiltert nach Norm) ─────────────────────────────────────────
app.get('/api/verifications', (req, res) => {
  const norm = req.query.norm || 'sia265';
  const vs = db.prepare('SELECT * FROM verifications WHERE norm_id=? AND active=1 ORDER BY sort_order').all(norm);
  const vars = db.prepare('SELECT * FROM variables ORDER BY sort_order').all();
  const opts = db.prepare('SELECT * FROM variable_options ORDER BY sort_order').all();
  res.json(vs.map(v => ({
    ...v,
    variables: vars.filter(vr => vr.verification_id === v.id)
      .map(vr => ({ ...vr, options: opts.filter(o => o.variable_id === vr.id) })),
  })));
});

app.get('/api/verifications/:id', (req, res) => {
  const v = db.prepare('SELECT * FROM verifications WHERE id=?').get(req.params.id);
  if (!v) return res.status(404).json({ error: 'Not found' });
  const vars = db.prepare('SELECT * FROM variables WHERE verification_id=? ORDER BY sort_order').all(v.id);
  const opts = vars.length ? db.prepare(`SELECT * FROM variable_options WHERE variable_id IN (${vars.map(()=>'?').join(',')}) ORDER BY sort_order`).all(...vars.map(v=>v.id)) : [];
  v.variables = vars.map(vr => ({ ...vr, options: opts.filter(o => o.variable_id === vr.id) }));
  res.json(v);
});

app.post('/api/verifications', (req, res) => {
  const { norm_id='sia265', chapter_id, title, formula_latex='', formula_description='', compute_expr='' } = req.body;
  const id = title.toLowerCase().replace(/[^a-z0-9]/g,'_').slice(0,30) + '_' + Date.now().toString(36);
  db.prepare('INSERT INTO verifications (id, norm_id, chapter_id, title, formula_latex, formula_description, compute_expr) VALUES (?,?,?,?,?,?,?)').run(id, norm_id, chapter_id, title, formula_latex, formula_description, compute_expr);
  res.json({ id });
});
app.put('/api/verifications/:id', (req, res) => {
  const { title, chapter_id, formula_latex, formula_description, compute_expr } = req.body;
  db.prepare('UPDATE verifications SET title=?, chapter_id=?, formula_latex=?, formula_description=?, compute_expr=? WHERE id=?').run(title, chapter_id, formula_latex, formula_description, compute_expr||'', req.params.id);
  res.json({ ok: true });
});
app.delete('/api/verifications/:id', (req, res) => {
  db.prepare('UPDATE verifications SET active=0 WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ─── VARIABLEN ───────────────────────────────────────────────────────────────
app.get('/api/verifications/:vid/variables', (req, res) => {
  const vars = db.prepare('SELECT * FROM variables WHERE verification_id=? ORDER BY sort_order').all(req.params.vid);
  const opts = db.prepare('SELECT * FROM variable_options ORDER BY sort_order').all();
  res.json(vars.map(v => ({ ...v, options: opts.filter(o => o.variable_id === v.id) })));
});
app.post('/api/verifications/:vid/variables', (req, res) => {
  const { name, label, unit='', type='number', default_value='0', description='', options=[] } = req.body;
  const id = req.params.vid + '_' + name + '_' + Date.now().toString(36);
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM variables WHERE verification_id=?').get(req.params.vid).m || 0;
  db.prepare('INSERT INTO variables (id, verification_id, name, label, unit, type, default_value, description, sort_order) VALUES (?,?,?,?,?,?,?,?,?)').run(id, req.params.vid, name, label, unit, type, String(default_value), description, maxOrder+1);
  options.forEach((o, i) => db.prepare('INSERT INTO variable_options (variable_id, label, value, sort_order) VALUES (?,?,?,?)').run(id, o.label, o.value, i));
  res.json({ id });
});
app.put('/api/variables/:id', (req, res) => {
  const { name, label, unit='', type, default_value, description='', options=[] } = req.body;
  db.prepare('UPDATE variables SET name=?, label=?, unit=?, type=?, default_value=?, description=? WHERE id=?').run(name, label, unit, type, String(default_value), description, req.params.id);
  db.prepare('DELETE FROM variable_options WHERE variable_id=?').run(req.params.id);
  options.forEach((o, i) => db.prepare('INSERT INTO variable_options (variable_id, label, value, sort_order) VALUES (?,?,?,?)').run(req.params.id, o.label, o.value, i));
  res.json({ ok: true });
});
app.delete('/api/variables/:id', (req, res) => {
  db.prepare('DELETE FROM variables WHERE id=?').run(req.params.id);
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

// ─── DATENBANK-TABELLEN (gefiltert nach Norm + Kategorie) ─────────────────────
app.get('/api/db-tables', (req, res) => {
  const norm = req.query.norm;
  const cat  = req.query.category;
  let sql = 'SELECT id, norm_id, category, title, description FROM db_tables WHERE 1=1';
  const params = [];
  if (norm) { sql += ' AND norm_id=?'; params.push(norm); }
  if (cat)  { sql += ' AND category=?'; params.push(cat); }
  sql += ' ORDER BY norm_id, category, title';
  res.json(db.prepare(sql).all(...params));
});
app.get('/api/db-tables/:id', (req, res) => {
  const t = db.prepare('SELECT * FROM db_tables WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json({ ...t, headers: JSON.parse(t.headers), rows: JSON.parse(t.rows) });
});
app.get('/api/db-tables/categories', (req, res) => {
  const norm = req.query.norm;
  let sql = 'SELECT DISTINCT category FROM db_tables';
  const params = [];
  if (norm) { sql += ' WHERE norm_id=?'; params.push(norm); }
  res.json(db.prepare(sql).all(...params).map(r => r.category));
});
app.post('/api/db-tables', (req, res) => {
  const { norm_id='sia265', category='', title, description='', headers, rows } = req.body;
  const id = title.toLowerCase().replace(/[^a-z0-9]/g,'_') + '_' + Date.now().toString(36);
  db.prepare('INSERT INTO db_tables (id, norm_id, category, title, description, headers, rows) VALUES (?,?,?,?,?,?,?)').run(id, norm_id, category, title, description, JSON.stringify(headers), JSON.stringify(rows));
  res.json({ id });
});
app.put('/api/db-tables/:id', (req, res) => {
  const { norm_id, category, title, description, headers, rows } = req.body;
  db.prepare('UPDATE db_tables SET norm_id=?, category=?, title=?, description=?, headers=?, rows=? WHERE id=?').run(norm_id, category||'', title, description||'', JSON.stringify(headers), JSON.stringify(rows), req.params.id);
  res.json({ ok: true });
});
app.delete('/api/db-tables/:id', (req, res) => {
  db.prepare('DELETE FROM db_tables WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend läuft auf http://localhost:${PORT}`));
