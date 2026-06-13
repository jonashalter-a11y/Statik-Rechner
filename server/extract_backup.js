const Database = require('better-sqlite3');
const fs = require('fs');

const backupPath = './db-backups/sia265.db.before-restore-readable-710914b-20260613';
const db = new Database(backupPath);

console.log('Extrahiere Daten aus Backup...\n');

// ─── Extrahiere alle Norms
const norms = db.prepare('SELECT * FROM norms ORDER BY id').all();
console.log(`✓ ${norms.length} Norms gefunden`);

// ─── Extrahiere Kapitel & Nachweise pro Norm
const result = {};
for (const norm of norms) {
  const chaps = db.prepare('SELECT id, parent_id, number, title FROM chapters WHERE norm_id=? ORDER BY sort_order').all(norm.id);
  const verifs = db.prepare('SELECT id, chapter_id, title, formula_latex, formula_description, compute_expr, graph_json, notes FROM verifications WHERE norm_id=? ORDER BY sort_order').all(norm.id);
  
  result[norm.id] = { chapters: chaps, verifications: verifs, count: verifs.length };
  console.log(`  ${norm.id}: ${chaps.length} Kapitel, ${verifs.length} Nachweise`);
}

db.close();

// Speichere als JSON für weitere Verarbeitung
fs.writeFileSync('./backup_export.json', JSON.stringify(result, null, 2));
console.log('\n✓ Backup-Daten in backup_export.json gespeichert');
