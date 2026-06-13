const Database = require('better-sqlite3');
const fs = require('fs');

const backupPath = './db-backups/sia265.db.before-restore-readable-710914b-20260613';
const db = new Database(backupPath);

console.log('Konvertiere Backup mit graph_json als STRING...\n');

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

    const obj = {
      id: v.id,
      chapter_id: v.chapter_id,
      title: v.title,
      formula_latex: v.formula_latex || '',
      formula_description: v.formula_description || '',
      compute_expr: v.compute_expr || '',
      variables: varWithOptions
    };

    // graph_json MUSS als STRING gespeichert werden!
    if (v.graph_json) {
      // Falls es noch nicht als String ist, stringify es
      if (typeof v.graph_json === 'string') {
        obj.graph_json = v.graph_json;
      } else {
        obj.graph_json = JSON.stringify(v.graph_json);
      }
    }

    if (v.notes) {
      obj.notes = v.notes;
    }

    return obj;
  });
}

function getChaptersForNorm(normId) {
  return db.prepare(`
    SELECT id, parent_id, number, title
    FROM chapters
    WHERE norm_id = ?
    ORDER BY sort_order
  `).all(normId).map(c => [c.id, c.parent_id, c.number, c.title]);
}

const norms = [
  { id: 'sia265' },
  { id: 'sia261' },
  { id: 'lignum_brandschutz' },
  { id: 'lignum_erdbeben' },
  { id: 'baustatik' }
];

for (const norm of norms) {
  const chaps = getChaptersForNorm(norm.id);
  const verifs = getVerificationsForNorm(norm.id);

  if (norm.id === 'sia265') {
    fs.writeFileSync('./seed-chapters.js', 
      'module.exports = ' + JSON.stringify(chaps, null, 2) + ';\n');
    fs.writeFileSync('./seed-verifications.js',
      'module.exports = ' + JSON.stringify(verifs, null, 2) + ';\n');
  } else {
    const code = `module.exports = {
  chapters: ${JSON.stringify(chaps, null, 2)},
  verifications: ${JSON.stringify(verifs, null, 2)}
};\n`;
    fs.writeFileSync(`./seed-${norm.id}.js`, code);
  }
  
  console.log(`✓ seed-${norm.id === 'sia265' ? 'verifications.js' : norm.id + '.js'} (${verifs.filter(v => v.graph_json).length}/${verifs.length} mit graph_json)`);
}

db.close();
console.log('\n✓ Done!');
