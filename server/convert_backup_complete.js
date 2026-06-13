const Database = require('better-sqlite3');
const fs = require('fs');

const backupPath = './db-backups/sia265.db.before-restore-readable-710914b-20260613';
const db = new Database(backupPath);

console.log('Konvertiere Backup KOMPLETT mit graph_json...\n');

// Helper zum Extrahieren von Verifikationen mit Variablen UND graph_json
function getVerificationsForNorm(normId) {
  const rows = db.prepare(`
    SELECT v.id, v.chapter_id, v.title, v.formula_latex, v.formula_description, v.compute_expr, v.graph_json, v.notes
    FROM verifications v
    WHERE v.norm_id = ?
    ORDER BY v.sort_order
  `).all(normId);

  return rows.map(v => {
    const vars = db.prepare(`
      SELECT var.id, var.name, var.label, var.unit, var.type, var.default_value, var.description, var.table_ref, var.table_col
      FROM variables var
      WHERE var.verification_id = ?
      ORDER BY var.sort_order
    `).all(v.id);

    const varWithOptions = vars.map(vr => {
      const options = db.prepare(`
        SELECT label, value, sort_order
        FROM variable_options
        WHERE variable_id = ?
        ORDER BY sort_order
      `).all(vr.id);
      
      return {
        name: vr.name,
        label: vr.label,
        unit: vr.unit || '',
        type: vr.type || 'number',
        default_value: vr.default_value || '0',
        description: vr.description || '',
        ...(vr.table_ref && { table_ref: vr.table_ref }),
        ...(vr.table_col != null && { table_col: vr.table_col }),
        ...(options.length > 0 && { options })
      };
    });

    // Parse graph_json wenn vorhanden
    let graphJson = null;
    if (v.graph_json) {
      try {
        graphJson = JSON.parse(v.graph_json);
      } catch (e) {
        graphJson = v.graph_json;
      }
    }

    return {
      id: v.id,
      chapter_id: v.chapter_id,
      title: v.title,
      formula_latex: v.formula_latex || '',
      formula_description: v.formula_description || '',
      compute_expr: v.compute_expr || '',
      ...(graphJson && { graph_json: graphJson }),
      ...(v.notes && { notes: v.notes }),
      variables: varWithOptions
    };
  });
}

// Helper für Kapitel
function getChaptersForNorm(normId) {
  return db.prepare(`
    SELECT id, parent_id, number, title
    FROM chapters
    WHERE norm_id = ?
    ORDER BY sort_order
  `).all(normId).map(c => [c.id, c.parent_id, c.number, c.title]);
}

// ─── Schreibe alle Seed-Dateien ──────────────────────────────────────

const norms = [
  { id: 'sia265', name: 'seed-chapters.js + seed-verifications.js' },
  { id: 'sia261', name: 'seed-sia261.js' },
  { id: 'lignum_brandschutz', name: 'seed-lignum-brandschutz.js' },
  { id: 'lignum_erdbeben', name: 'seed-lignum-erdbeben.js' },
  { id: 'baustatik', name: 'seed-baustatik.js' }
];

for (const norm of norms) {
  const chaps = getChaptersForNorm(norm.id);
  const verifs = getVerificationsForNorm(norm.id);

  if (norm.id === 'sia265') {
    fs.writeFileSync('./seed-chapters.js', 
      'module.exports = ' + JSON.stringify(chaps, null, 2) + ';\n');
    fs.writeFileSync('./seed-verifications.js',
      'module.exports = ' + JSON.stringify(verifs, null, 2) + ';\n');
    console.log(`✓ seed-chapters.js (${chaps.length} Kapitel)`);
    console.log(`✓ seed-verifications.js (${verifs.length} Nachweise mit graph_json)`);
  } else {
    const code = `module.exports = {
  chapters: ${JSON.stringify(chaps, null, 2)},
  verifications: ${JSON.stringify(verifs, null, 2)}
};\n`;
    fs.writeFileSync(`./${norm.name}`, code);
    console.log(`✓ ${norm.name} (${chaps.length} Kapitel, ${verifs.length} Nachweise mit graph_json)`);
  }
}

db.close();
console.log('\n✓ Alle Seed-Dateien mit graph_json erstellt!');
