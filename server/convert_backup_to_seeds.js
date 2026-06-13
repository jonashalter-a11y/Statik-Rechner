const Database = require('better-sqlite3');
const fs = require('fs');

const backupPath = './db-backups/sia265.db.before-restore-readable-710914b-20260613';
const db = new Database(backupPath);

console.log('Konvertiere Backup zu Seed-Dateien...\n');

// Helper zum Extrahieren von Verifikationen mit Variablen
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

    return {
      id: v.id,
      chapter_id: v.chapter_id,
      title: v.title,
      formula_latex: v.formula_latex || '',
      formula_description: v.formula_description || '',
      compute_expr: v.compute_expr || '',
      ...(v.graph_json && { graph_json: v.graph_json }),
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

// ─── Schreibe Seed-Dateien ───────────────────────────────────────────

// SIA 265
const sia265Chaps = getChaptersForNorm('sia265');
const sia265Verifs = getVerificationsForNorm('sia265');
fs.writeFileSync('./seed-chapters.js', 
  'module.exports = ' + JSON.stringify(sia265Chaps, null, 2) + ';\n');
fs.writeFileSync('./seed-verifications.js',
  'module.exports = ' + JSON.stringify(sia265Verifs, null, 2) + ';\n');

console.log(`✓ seed-chapters.js (${sia265Chaps.length} Kapitel)`);
console.log(`✓ seed-verifications.js (${sia265Verifs.length} Nachweise)`);

// SIA 261
const sia261Chaps = getChaptersForNorm('sia261');
const sia261Verifs = getVerificationsForNorm('sia261');
fs.writeFileSync('./seed-sia261.js',
  `module.exports = {
  chapters: ${JSON.stringify(sia261Chaps, null, 2)},
  verifications: ${JSON.stringify(sia261Verifs, null, 2)}
};\n`);
console.log(`✓ seed-sia261.js (${sia261Chaps.length} Kapitel, ${sia261Verifs.length} Nachweise)`);

// Lignum Brandschutz
const brandChaps = getChaptersForNorm('lignum_brandschutz');
const brandVerifs = getVerificationsForNorm('lignum_brandschutz');
fs.writeFileSync('./seed-lignum-brandschutz.js',
  `module.exports = {
  chapters: ${JSON.stringify(brandChaps, null, 2)},
  verifications: ${JSON.stringify(brandVerifs, null, 2)}
};\n`);
console.log(`✓ seed-lignum-brandschutz.js (${brandChaps.length} Kapitel, ${brandVerifs.length} Nachweise)`);

// Lignum Erdbeben
const erdbebenChaps = getChaptersForNorm('lignum_erdbeben');
const erdbebenVerifs = getVerificationsForNorm('lignum_erdbeben');
fs.writeFileSync('./seed-lignum-erdbeben.js',
  `module.exports = {
  chapters: ${JSON.stringify(erdbebenChaps, null, 2)},
  verifications: ${JSON.stringify(erdbebenVerifs, null, 2)}
};\n`);
console.log(`✓ seed-lignum-erdbeben.js (${erdbebenChaps.length} Kapitel, ${erdbebenVerifs.length} Nachweise)`);

// Baustatik
const bauChaps = getChaptersForNorm('baustatik');
const bauVerifs = getVerificationsForNorm('baustatik');
fs.writeFileSync('./seed-baustatik.js',
  `module.exports = {
  chapters: ${JSON.stringify(bauChaps, null, 2)},
  verifications: ${JSON.stringify(bauVerifs, null, 2)}
};\n`);
console.log(`✓ seed-baustatik.js (${bauChaps.length} Kapitel, ${bauVerifs.length} Nachweise)`);

db.close();
console.log('\n✓ Alle Seed-Dateien erstellt!');
