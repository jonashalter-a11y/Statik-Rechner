const fs = require('fs');
const path = require('path');

const EXPORT_ROOT = path.join(__dirname, 'nachweise');
const TRASH_ROOT = path.join(EXPORT_ROOT, '_papierkorb');

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

function exportFilePathFor(payload) {
  const normDir = path.join(EXPORT_ROOT, slugify(payload.verification.norm_id));
  return path.join(normDir, `${slugify(payload.verification.id)}.json`);
}

function trashFilePathFor(payload) {
  const normDir = path.join(TRASH_ROOT, slugify(payload.verification.norm_id));
  const deletedAt = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(normDir, `${slugify(payload.verification.id)}__deleted_${deletedAt}.json`);
}

function deleteExportFile(normId, verificationId) {
  if (!normId || !verificationId) return;
  const filePath = path.join(EXPORT_ROOT, slugify(normId), `${slugify(verificationId)}.json`);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
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

  const stableId = slugify(payload.verification.id);
  const filePath = exportFilePathFor(payload);
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);

  for (const file of fs.readdirSync(normDir)) {
    if (file !== path.basename(filePath) && file.endsWith(`__${stableId}.json`)) {
      fs.unlinkSync(path.join(normDir, file));
    }
  }
  return filePath;
}

function trashVerificationExport(db, verificationId) {
  const payload = buildVerificationExport(db, verificationId);
  if (!payload) return null;

  const filePath = trashFilePathFor(payload);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify({
    ...payload,
    deleted_at: new Date().toISOString(),
  }, null, 2)}\n`);

  deleteExportFile(payload.verification.norm_id, payload.verification.id);
  return filePath;
}

function upsertChapter(db, chapter, normId) {
  if (!chapter?.id) return null;
  const existing = db.prepare('SELECT id FROM chapters WHERE id=?').get(chapter.id);
  if (existing) return chapter.id;

  db.prepare(`
    INSERT INTO chapters (id, norm_id, parent_id, number, title, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    chapter.id,
    normId,
    chapter.parent_id || null,
    chapter.number || '',
    chapter.title || '',
    Number(chapter.sort_order || 0),
  );
  return chapter.id;
}

function fallbackChapterId(db, normId) {
  const chapter = db.prepare('SELECT id FROM chapters WHERE norm_id=? ORDER BY sort_order LIMIT 1').get(normId);
  return chapter?.id || null;
}

function importVerificationExport(db, payload, overrides = {}) {
  if (!payload || typeof payload !== 'object') throw new Error('Ungültige JSON-Datei');

  const sourceVerification = payload.verification || payload;
  if (!sourceVerification?.id) throw new Error('Nachweis-ID fehlt in der JSON-Datei');

  const normId = overrides.norm_id || sourceVerification.norm_id || payload.chapter?.norm_id || 'sia265';
  const chapterId = upsertChapter(db, payload.chapter, normId)
    || sourceVerification.chapter_id
    || fallbackChapterId(db, normId);
  if (!chapterId) throw new Error(`Kein Kapitel für Norm ${normId} gefunden`);

  const graphJson = sourceVerification.graph_json
    || (payload.graph ? JSON.stringify(payload.graph) : null);
  const existing = db.prepare('SELECT sort_order FROM verifications WHERE id=?').get(sourceVerification.id);
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM verifications WHERE norm_id=?').get(normId).m || 0;
  const sortOrder = existing ? existing.sort_order : Number(sourceVerification.sort_order ?? maxOrder + 1);

  const importTransaction = db.transaction(() => {
    for (const table of payload.tables || []) {
      if (!table?.id) continue;
      db.prepare(`
        INSERT INTO db_tables (id, norm_id, chapter_id, category, title, description, type, headers, rows, chart_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          norm_id=excluded.norm_id,
          chapter_id=excluded.chapter_id,
          category=excluded.category,
          title=excluded.title,
          description=excluded.description,
          type=excluded.type,
          headers=excluded.headers,
          rows=excluded.rows,
          chart_json=excluded.chart_json
      `).run(
        table.id,
        normId,
        table.chapter_id || null,
        table.category || '',
        table.title || table.id,
        table.description || '',
        table.type || 'table',
        JSON.stringify(table.headers || []),
        JSON.stringify(table.rows || []),
        table.chart_json ? JSON.stringify(table.chart_json) : null,
      );
    }

    db.prepare(`
      INSERT INTO verifications (id, norm_id, chapter_id, title, formula_latex, formula_description, compute_expr, graph_json, notes, sort_order, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      ON CONFLICT(id) DO UPDATE SET
        norm_id=excluded.norm_id,
        chapter_id=excluded.chapter_id,
        title=excluded.title,
        formula_latex=excluded.formula_latex,
        formula_description=excluded.formula_description,
        compute_expr=excluded.compute_expr,
        graph_json=excluded.graph_json,
        notes=excluded.notes,
        sort_order=excluded.sort_order,
        active=1
    `).run(
      sourceVerification.id,
      normId,
      chapterId,
      sourceVerification.title || sourceVerification.id,
      sourceVerification.formula_latex || '',
      sourceVerification.formula_description || '',
      sourceVerification.compute_expr || '',
      graphJson,
      sourceVerification.notes || '',
      sortOrder,
    );

    db.prepare('DELETE FROM variable_options WHERE variable_id IN (SELECT id FROM variables WHERE verification_id=?)').run(sourceVerification.id);
    db.prepare('DELETE FROM variables WHERE verification_id=?').run(sourceVerification.id);

    for (const [index, variable] of (payload.variables || []).entries()) {
      const variableId = variable.id || `${sourceVerification.id}__${variable.name || `var_${index + 1}`}`;
      db.prepare(`
        INSERT INTO variables (id, verification_id, name, label, unit, type, default_value, description, sort_order, table_ref, table_col)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        variableId,
        sourceVerification.id,
        variable.name || variableId,
        variable.label || variable.name || variableId,
        variable.unit || '',
        variable.type || 'number',
        String(variable.default_value ?? '0'),
        variable.description || '',
        Number(variable.sort_order ?? index),
        variable.table_ref || null,
        variable.table_col != null ? Number(variable.table_col) : null,
      );
      for (const [optionIndex, option] of (variable.options || []).entries()) {
        db.prepare('INSERT INTO variable_options (variable_id, label, value, sort_order) VALUES (?, ?, ?, ?)')
          .run(variableId, option.label || '', String(option.value ?? ''), Number(option.sort_order ?? optionIndex));
      }
    }
  });

  importTransaction();
  const filePath = overrides.skipExport ? exportFilePathFor({
    verification: { ...sourceVerification, norm_id: normId },
  }) : exportVerificationById(db, sourceVerification.id);
  return { id: sourceVerification.id, file: filePath };
}

function activeExportFiles() {
  if (!fs.existsSync(EXPORT_ROOT)) return [];
  const files = [];
  for (const normDirName of fs.readdirSync(EXPORT_ROOT)) {
    if (normDirName === path.basename(TRASH_ROOT)) continue;
    const normDir = path.join(EXPORT_ROOT, normDirName);
    if (!fs.statSync(normDir).isDirectory()) continue;
    for (const fileName of fs.readdirSync(normDir)) {
      if (!fileName.endsWith('.json')) continue;
      files.push({
        normDirName,
        filePath: path.join(normDir, fileName),
      });
    }
  }
  return files.sort((a, b) => a.filePath.localeCompare(b.filePath));
}

function importActiveVerificationExports(db, options = {}) {
  const files = activeExportFiles();
  const importedIds = [];
  const errors = [];

  for (const file of files) {
    try {
      const payload = JSON.parse(fs.readFileSync(file.filePath, 'utf8'));
      const result = importVerificationExport(db, payload, {
        norm_id: payload?.verification?.norm_id || file.normDirName,
        skipExport: true,
      });
      importedIds.push(result.id);
    } catch (err) {
      errors.push({ file: file.filePath, error: String(err.message || err) });
    }
  }

  if (options.pruneMissing !== false && files.length > 0) {
    const placeholders = importedIds.map(() => '?').join(',');
    if (importedIds.length > 0) {
      db.prepare(`UPDATE verifications SET active=0 WHERE active=1 AND id NOT IN (${placeholders})`).run(...importedIds);
    } else {
      db.prepare('UPDATE verifications SET active=0 WHERE active=1').run();
    }
  }

  return {
    imported: importedIds.length,
    files: files.length,
    errors,
  };
}

function exportVerificationsByNorm(db, normId) {
  const rows = db.prepare('SELECT id FROM verifications WHERE norm_id=? AND active=1 ORDER BY sort_order').all(normId);
  return rows.map(row => exportVerificationById(db, row.id)).filter(Boolean);
}

function exportActiveVerifications(db) {
  const rows = db.prepare('SELECT id FROM verifications WHERE active=1 ORDER BY norm_id, sort_order').all();
  const files = rows.map(row => exportVerificationById(db, row.id)).filter(Boolean);
  const keep = new Set(files.map(file => path.resolve(file)));
  if (fs.existsSync(EXPORT_ROOT)) {
    for (const norm of fs.readdirSync(EXPORT_ROOT)) {
      if (norm === path.basename(TRASH_ROOT)) continue;
      const normDir = path.join(EXPORT_ROOT, norm);
      if (!fs.statSync(normDir).isDirectory()) continue;
      for (const file of fs.readdirSync(normDir)) {
        const fullPath = path.resolve(path.join(normDir, file));
        if (file.endsWith('.json') && !keep.has(fullPath)) fs.unlinkSync(fullPath);
      }
    }
  }
  return files;
}

module.exports = {
  EXPORT_ROOT,
  TRASH_ROOT,
  buildVerificationExport,
  exportActiveVerifications,
  exportVerificationById,
  exportVerificationsByNorm,
  importActiveVerificationExports,
  importVerificationExport,
  deleteExportFile,
  trashVerificationExport,
};
