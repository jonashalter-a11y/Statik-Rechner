const Database = require('better-sqlite3');
const path = require('path');
const seedChapters = require('./seed-chapters');
const seedVerifications = require('./seed-verifications');
const sia261 = require('./seed-sia261');
const lignumBrandschutz = require('./seed-lignum-brandschutz');
const lignumErdbeben = require('./seed-lignum-erdbeben');
const baustatik = require('./seed-baustatik');
const { importActiveVerificationExports } = require('./verification-export');
const { ensureStaticDataFiles, importStaticData } = require('./json-store');

const db = new Database(path.join(__dirname, 'sia265.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema ──────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS norms (
    id      TEXT PRIMARY KEY,
    name    TEXT NOT NULL,
    label   TEXT NOT NULL,
    year    INTEGER NOT NULL,
    description TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS wood_types (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, label TEXT NOT NULL, sort_order INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS wood_classes (
    id TEXT PRIMARY KEY, wood_type_id TEXT NOT NULL, name TEXT NOT NULL, label TEXT NOT NULL, sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (wood_type_id) REFERENCES wood_types(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS wood_class_properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wood_class_id TEXT NOT NULL, key TEXT NOT NULL, label TEXT NOT NULL, value REAL NOT NULL, unit TEXT DEFAULT '',
    FOREIGN KEY (wood_class_id) REFERENCES wood_classes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY, norm_id TEXT NOT NULL DEFAULT 'sia265',
    parent_id TEXT, number TEXT NOT NULL, title TEXT NOT NULL, sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS verifications (
    id TEXT PRIMARY KEY, norm_id TEXT NOT NULL DEFAULT 'sia265',
    chapter_id TEXT NOT NULL, title TEXT NOT NULL,
    formula_latex TEXT NOT NULL DEFAULT '',
    formula_description TEXT DEFAULT '',
    compute_expr TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS variables (
    id TEXT PRIMARY KEY, verification_id TEXT NOT NULL,
    name TEXT NOT NULL, label TEXT NOT NULL, unit TEXT DEFAULT '',
    type TEXT DEFAULT 'number', default_value TEXT DEFAULT '0',
    description TEXT DEFAULT '', sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (verification_id) REFERENCES verifications(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS variable_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    variable_id TEXT NOT NULL, label TEXT NOT NULL, value TEXT NOT NULL, sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (variable_id) REFERENCES variables(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS db_tables (
    id TEXT PRIMARY KEY, norm_id TEXT NOT NULL DEFAULT 'sia265',
    category TEXT DEFAULT '',
    title TEXT NOT NULL, description TEXT DEFAULT '',
    headers TEXT NOT NULL DEFAULT '[]', rows TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS units (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    latex TEXT NOT NULL UNIQUE,
    sort_order INTEGER DEFAULT 0
  );
`);

// Migrations
try { db.exec(`ALTER TABLE chapters ADD COLUMN norm_id TEXT NOT NULL DEFAULT 'sia265'`); } catch (_) {}
try { db.exec(`ALTER TABLE verifications ADD COLUMN norm_id TEXT NOT NULL DEFAULT 'sia265'`); } catch (_) {}
try { db.exec(`ALTER TABLE verifications ADD COLUMN compute_expr TEXT DEFAULT ''`); } catch (_) {}
try { db.exec(`ALTER TABLE db_tables ADD COLUMN norm_id TEXT NOT NULL DEFAULT 'sia265'`); } catch (_) {}
try { db.exec(`ALTER TABLE db_tables ADD COLUMN category TEXT DEFAULT ''`); } catch (_) {}
try { db.exec(`ALTER TABLE db_tables ADD COLUMN chapter_id TEXT DEFAULT NULL`); } catch (_) {}
// table_column: Dropdown-Optionen aus einer db_tables-Spalte laden
try { db.exec(`ALTER TABLE variables ADD COLUMN table_ref TEXT DEFAULT NULL`); } catch (_) {}
try { db.exec(`ALTER TABLE variables ADD COLUMN table_col INTEGER DEFAULT NULL`); } catch (_) {}
// graph_json: Node-Editor-Graph (React Flow) pro Nachweis
try { db.exec(`ALTER TABLE verifications ADD COLUMN graph_json TEXT DEFAULT NULL`); } catch (_) {}
// notes: interner Kommentar / Kontroll-Notizen zum Nachweis
try { db.exec(`ALTER TABLE verifications ADD COLUMN notes TEXT DEFAULT ''`); } catch (_) {}
try { db.exec(`ALTER TABLE db_tables ADD COLUMN type TEXT NOT NULL DEFAULT 'table'`); } catch (_) {}
try { db.exec(`ALTER TABLE db_tables ADD COLUMN chart_json TEXT DEFAULT NULL`); } catch (_) {}

// ─── Einheiten-Seed (einmalig wenn Tabelle leer) ──────────────────────────────
const unitCount = db.prepare('SELECT COUNT(*) as n FROM units').get().n;
if (unitCount === 0) {
  const iU = db.prepare('INSERT OR IGNORE INTO units (latex, sort_order) VALUES (?, ?)');
  const defaults = [
    ['\\mathrm{N/mm^2}',1], ['\\mathrm{kN/m^2}',2], ['\\mathrm{kN/m}',3],
    ['\\mathrm{kN}',4], ['\\mathrm{N}',5], ['\\mathrm{MN}',6],
    ['\\mathrm{m}',7], ['\\mathrm{cm}',8], ['\\mathrm{mm}',9],
    ['\\mathrm{m^2}',10], ['\\mathrm{cm^2}',11], ['\\mathrm{mm^2}',12],
    ['\\mathrm{m^3}',13], ['\\mathrm{cm^3}',14], ['\\mathrm{mm^3}',15],
    ['\\mathrm{kg/m^3}',16], ['\\mathrm{kN/m^3}',17],
    ['\\mathrm{°C}',18], ['-',19], ['\\%',20],
  ];
  defaults.forEach(([l,s]) => iU.run(l, s));
}

// ─── Seed ────────────────────────────────────────────────────────────────────
const normCount = db.prepare('SELECT COUNT(*) as n FROM norms').get().n;
if (normCount === 0) {
  const insertNorm = db.prepare('INSERT INTO norms (id, name, label, year, description) VALUES (?, ?, ?, ?, ?)');
  insertNorm.run('sia265', 'SIA 265', 'SIA 265 – Holzbau', 2021, 'Bemessung von Holztragwerken nach schweizerischer Norm');
  insertNorm.run('sia261', 'SIA 261', 'SIA 261 – Einwirkungen', 2020, 'Einwirkungen auf Tragwerke nach schweizerischer Norm');
  insertNorm.run('lignum_brandschutz', 'Lignum Brandschutz', 'Lignum Brandschutz', 2026, '');
  insertNorm.run('lignum_erdbeben', 'Lignum Erdbeben', 'Lignum Erdbeben', 2026, '');
  insertNorm.run('baustatik', 'Baustatik', 'Baustatik', 2021, 'Allgemeine statische Nachweise');
}

const woodTypeCount = db.prepare('SELECT COUNT(*) as n FROM wood_types').get().n;
if (woodTypeCount === 0) {
  const iWT  = db.prepare('INSERT INTO wood_types (id, name, label, sort_order) VALUES (?, ?, ?, ?)');
  const iWC  = db.prepare('INSERT INTO wood_classes (id, wood_type_id, name, label, sort_order) VALUES (?, ?, ?, ?, ?)');
  const iProp= db.prepare('INSERT INTO wood_class_properties (wood_class_id, key, label, value, unit) VALUES (?, ?, ?, ?, ?)');

  iWT.run('vollholz','Vollholz','Vollholz (Nadelholz)',1);
  iWT.run('laubholz','Laubholz','Laubholz (Buche/Eiche)',2);
  iWT.run('bsh','Brettschichtholz','Brettschichtholz (BSH)',3);

  const vhKlassen=[
    ['C16','C16 – Vollholz Nadelholz',1,{f_m_k:[16,'N/mm²','Biegefestigkeit'],f_t_0_k:[9.4,'N/mm²','Zug ‖'],f_c_0_k:[13,'N/mm²','Druck ‖'],f_t_90_k:[0.4,'N/mm²','Zug ⊥'],f_c_90_k:[2.6,'N/mm²','Druck ⊥'],f_v_k:[2.3,'N/mm²','Schub'],E_0_mean:[8000,'N/mm²','E-Modul'],E_0_05:[5300,'N/mm²','E0,05'],rho_k:[310,'kg/m³','Rohdichte']}],
    ['C24','C24 – Vollholz Nadelholz',2,{f_m_k:[24,'N/mm²','Biegefestigkeit'],f_t_0_k:[14,'N/mm²','Zug ‖'],f_c_0_k:[21,'N/mm²','Druck ‖'],f_t_90_k:[0.4,'N/mm²','Zug ⊥'],f_c_90_k:[2.7,'N/mm²','Druck ⊥'],f_v_k:[2.5,'N/mm²','Schub'],E_0_mean:[11000,'N/mm²','E-Modul'],E_0_05:[7300,'N/mm²','E0,05'],rho_k:[350,'kg/m³','Rohdichte']}],
    ['C30','C30 – Vollholz Nadelholz',3,{f_m_k:[30,'N/mm²','Biegefestigkeit'],f_t_0_k:[18,'N/mm²','Zug ‖'],f_c_0_k:[23,'N/mm²','Druck ‖'],f_t_90_k:[0.4,'N/mm²','Zug ⊥'],f_c_90_k:[3.0,'N/mm²','Druck ⊥'],f_v_k:[2.7,'N/mm²','Schub'],E_0_mean:[12000,'N/mm²','E-Modul'],E_0_05:[8000,'N/mm²','E0,05'],rho_k:[380,'kg/m³','Rohdichte']}],
  ];
  for(const[n,l,o,p]of vhKlassen){iWC.run(n,'vollholz',n,l,o);for(const[k,[v,u,lb]]of Object.entries(p))iProp.run(n,k,lb,v,u);}

  iWC.run('D30','laubholz','D30','D30 – Laubholz',1);
  for(const[k,[v,u,lb]]of Object.entries({f_m_k:[30,'N/mm²','Biegefestigkeit'],f_t_0_k:[18,'N/mm²','Zug ‖'],f_c_0_k:[23,'N/mm²','Druck ‖'],f_t_90_k:[0.6,'N/mm²','Zug ⊥'],f_c_90_k:[8.0,'N/mm²','Druck ⊥'],f_v_k:[3.0,'N/mm²','Schub'],E_0_mean:[11000,'N/mm²','E-Modul'],rho_k:[530,'kg/m³','Rohdichte']}))iProp.run('D30',k,lb,v,u);

  const bshKlassen=[
    ['GL20h','GL20h – BSH homogen',1,{f_m_k:[20,'N/mm²','Biegefestigkeit'],f_t_0_k:[13.3,'N/mm²','Zug ‖'],f_c_0_k:[16,'N/mm²','Druck ‖'],f_t_90_k:[0.5,'N/mm²','Zug ⊥'],f_c_90_k:[2.5,'N/mm²','Druck ⊥'],f_v_k:[3.5,'N/mm²','Schub'],E_0_mean:[8400,'N/mm²','E-Modul'],rho_k:[340,'kg/m³','Rohdichte']}],
    ['GL24h','GL24h – BSH homogen',2,{f_m_k:[24,'N/mm²','Biegefestigkeit'],f_t_0_k:[16.5,'N/mm²','Zug ‖'],f_c_0_k:[24,'N/mm²','Druck ‖'],f_t_90_k:[0.5,'N/mm²','Zug ⊥'],f_c_90_k:[2.7,'N/mm²','Druck ⊥'],f_v_k:[3.5,'N/mm²','Schub'],E_0_mean:[11600,'N/mm²','E-Modul'],rho_k:[380,'kg/m³','Rohdichte']}],
    ['GL24c','GL24c – BSH kombiniert',3,{f_m_k:[24,'N/mm²','Biegefestigkeit'],f_t_0_k:[14,'N/mm²','Zug ‖'],f_c_0_k:[21.5,'N/mm²','Druck ‖'],f_t_90_k:[0.5,'N/mm²','Zug ⊥'],f_c_90_k:[2.5,'N/mm²','Druck ⊥'],f_v_k:[3.5,'N/mm²','Schub'],E_0_mean:[11000,'N/mm²','E-Modul'],rho_k:[350,'kg/m³','Rohdichte']}],
    ['GL28h','GL28h – BSH homogen',4,{f_m_k:[28,'N/mm²','Biegefestigkeit'],f_t_0_k:[19.5,'N/mm²','Zug ‖'],f_c_0_k:[26.5,'N/mm²','Druck ‖'],f_t_90_k:[0.5,'N/mm²','Zug ⊥'],f_c_90_k:[3.0,'N/mm²','Druck ⊥'],f_v_k:[3.5,'N/mm²','Schub'],E_0_mean:[12600,'N/mm²','E-Modul'],rho_k:[410,'kg/m³','Rohdichte']}],
    ['GL28c','GL28c – BSH kombiniert',5,{f_m_k:[28,'N/mm²','Biegefestigkeit'],f_t_0_k:[16.5,'N/mm²','Zug ‖'],f_c_0_k:[24,'N/mm²','Druck ‖'],f_t_90_k:[0.5,'N/mm²','Zug ⊥'],f_c_90_k:[2.7,'N/mm²','Druck ⊥'],f_v_k:[3.5,'N/mm²','Schub'],E_0_mean:[12500,'N/mm²','E-Modul'],rho_k:[380,'kg/m³','Rohdichte']}],
    ['GL32h','GL32h – BSH hochfest',6,{f_m_k:[32,'N/mm²','Biegefestigkeit'],f_t_0_k:[21.3,'N/mm²','Zug ‖'],f_c_0_k:[29.3,'N/mm²','Druck ‖'],f_t_90_k:[0.5,'N/mm²','Zug ⊥'],f_c_90_k:[3.0,'N/mm²','Druck ⊥'],f_v_k:[3.5,'N/mm²','Schub'],E_0_mean:[14200,'N/mm²','E-Modul'],rho_k:[440,'kg/m³','Rohdichte']}],
  ];
  for(const[n,l,o,p]of bshKlassen){iWC.run(n,'bsh',n,l,o);for(const[k,[v,u,lb]]of Object.entries(p))iProp.run(n,k,lb,v,u);}
}

const chapCount = db.prepare("SELECT COUNT(*) as n FROM chapters").get().n;
if (chapCount === 0) {
  const iC = db.prepare('INSERT INTO chapters (id, norm_id, parent_id, number, title, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
  const iV = db.prepare('INSERT INTO verifications (id, norm_id, chapter_id, title, formula_latex, formula_description, compute_expr, graph_json, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const iVr= db.prepare('INSERT INTO variables (id, verification_id, name, label, unit, type, default_value, description, sort_order, table_ref, table_col) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const iO = db.prepare('INSERT INTO variable_options (variable_id, label, value, sort_order) VALUES (?, ?, ?, ?)');

  // SIA 265 Kapitel
  seedChapters.forEach(([id, parent_id, number, title], i) =>
    iC.run(id, 'sia265', parent_id, number, title, i));

  // SIA 265 Nachweise — ENTFERNT: nur noch aus JSON-Dateien laden

  // SIA 261 Kapitel
  sia261.chapters.forEach(([id, parent_id, number, title], i) =>
    iC.run(id, 'sia261', parent_id, number, title, i));

  // SIA 261 Nachweise — ENTFERNT: nur noch aus JSON-Dateien laden

  // Lignum Erdbeben Kapitel
  lignumErdbeben.chapters.forEach(([id, parent_id, number, title], i) =>
    iC.run(id, 'lignum_erdbeben', parent_id, number, title, i));

  // Lignum Erdbeben Nachweise — ENTFERNT: nur noch aus JSON-Dateien laden

  // Lignum Brandschutz Kapitel
  lignumBrandschutz.chapters.forEach(([id, parent_id, number, title], i) =>
    iC.run(id, 'lignum_brandschutz', parent_id, number, title, i));

  // Lignum Brandschutz Nachweise
  lignumBrandschutz.verifications.forEach((v, i) => {
    iV.run(v.id, 'lignum_brandschutz', v.chapter_id, v.title, v.formula_latex, v.formula_description, v.compute_expr, v.graph_json || null, i);
    v.variables.forEach((vr, j) => {
      const vid = v.id + '__' + vr.name;
      iVr.run(vid, v.id, vr.name, vr.label, vr.unit||'', vr.type||'number', vr.default_value, vr.description||'', j, vr.table_ref||null, vr.table_col||null);
      (vr.options||[]).forEach((o, k) => iO.run(vid, o.label, o.value, k));
    });
  });

  // Baustatik Kapitel
  baustatik.chapters.forEach(([id, parent_id, number, title], i) =>
    iC.run(id, 'baustatik', parent_id, number, title, i));

  // Baustatik Nachweise — ENTFERNT: nur noch aus JSON-Dateien laden

  // ─── Normtabellen (sauber mit Kategorie) ─────────────────────────────────
  const iT = db.prepare('INSERT INTO db_tables (id, norm_id, category, title, description, headers, rows) VALUES (?, ?, ?, ?, ?, ?, ?)');

  // SIA 265 Tabellen
  iT.run('tab8_vollholz','sia265','Baustoffe',
    'Tab. 8 — Vollholz Nadelholz (SIA 265)',
    'Kennzeichnende Eigenschaften und Bemessungswerte für Vollholz sowie keilgezinktes Vollholz und Balkenschichtholz aus Nadelholz',
    JSON.stringify(['Eigenschaft','Einheit','C16','C24','C30','D30']),
    JSON.stringify([
      ['fm,k','N/mm²','16','24','30','30'],
      ['fm,d','N/mm²','9.4 (10.4)','14.1 (15.4)','17.6 (19.2)','17.6'],
      ['ft,0,d','N/mm²','5.0','8.5','11.2','10.6'],
      ['fc,0,d','N/mm²','10.0','12.4','14.1','14.1'],
      ['fc,90,d','N/mm²','1.5–2.0','1.8–2.3','2.0–2.7','5.3'],
      ['fv,d','N/mm²','1.5','1.5','1.5','1.8'],
      ['E0,mean','N/mm²','8000','11000','12000','11000'],
      ['E90,mean','N/mm²','270','370','400','730'],
      ['Gmean','N/mm²','500','690','750','690'],
      ['ρk','kg/m³','310','350','380','530'],
    ]));

  iT.run('tab9_bsh','sia265','Baustoffe',
    'Tab. 9 — Brettschichtholz Nadelholz (SIA 265)',
    'Kennzeichnende Eigenschaften und Bemessungswerte für BSH aus Nadelholz',
    JSON.stringify(['Eigenschaft','Einheit','GL20h','GL24c','GL24h','GL28c','GL28h','GL32c','GL32h']),
    JSON.stringify([
      ['fm,k','N/mm²','20','24','24','28','28','32','32'],
      ['fm,d','N/mm²','13.3','16.0','16.0','18.7','18.7','21.3','21.3'],
      ['ft,0,d','N/mm²','10.7','11.3','12.8','13.0','14.9','13.0','17.1'],
      ['fc,0,d','N/mm²','13.3','14.3','16.0','16.0','18.7','16.3','21.3'],
      ['fv,d','N/mm²','1.8','1.8','1.8','1.8','1.8','1.8','1.8'],
      ['E0,mean','N/mm²','8400','11000','11500','12500','12600','13500','14200'],
      ['ρk','kg/m³','≈340','≈350','≈380','≈380','≈410','≈410','≈440'],
    ]));

  iT.run('kmod_tab3','sia265','Sicherheit',
    'Tab. 3 — Modifikationsbeiwert kmod (SIA 265)',
    'kmod in Funktion von Feuchteklasse (FK) und Lasteinwirkungsdauer',
    JSON.stringify(['Lasteinwirkungsdauer','FK 1','FK 2','FK 3']),
    JSON.stringify([
      ['permanent (> 10 Jahre)','0.60','0.60','0.50'],
      ['langfristig (6 Mon – 10 J)','0.70','0.70','0.55'],
      ['mittelfristig (1 Wo – 6 Mon)','0.80','0.80','0.65'],
      ['kurz (< 1 Woche)','0.90','0.90','0.70'],
      ['sehr kurz (Stösse)','1.10','1.10','0.90'],
    ]));

  iT.run('kdef_tab4','sia265','Sicherheit',
    'Tab. 4 — Kriechbeiwert kdef (SIA 265)',
    'Verformungsbeiwert für die Berechnung der Endverformungen',
    JSON.stringify(['Material','FK 1','FK 2','FK 3']),
    JSON.stringify([
      ['Vollholz, Balkenschichtholz','0.60','0.80','2.00'],
      ['Brettschichtholz','0.60','0.80','2.00'],
      ['Furniersperrholz','0.80','1.00','2.50'],
      ['OSB','1.50','2.25','–'],
    ]));

  iT.run('gamma_M_sia265','sia265','Sicherheit',
    'Teilsicherheitsbeiwerte γM (SIA 265)',
    'Materialteilsicherheitsbeiwerte für den Tragsicherheitsnachweis',
    JSON.stringify(['Material / Verbindung','γM']),
    JSON.stringify([
      ['Holz und Holzwerkstoffe','1.30'],
      ['Verbindungen (allgemein)','1.30'],
      ['Klebungen','1.30'],
      ['Stahlteile (Streckgrenze)','1.05'],
    ]));

  // SIA 261 Tabellen
  iT.run('tab4_gelande','sia261','Wind',
    'Tab. 4 — Gradientenhöhe und Rauigkeitsexponent (SIA 261)',
    'Geländekategorien für die Windberechnung nach §6.2.1',
    JSON.stringify(['Geländekategorie','Beschreibung','zg [m]','r']),
    JSON.stringify([
      ['II','Seeufer','300','0.16'],
      ['IIa','Grosse Ebene','380','0.19'],
      ['III','Ortschaften, freies Feld','450','0.23'],
      ['IV','Grossflächige Stadtgebiete','526','0.30'],
    ]));

  iT.run('tab8_nutzlasten','sia261','Nutzlasten',
    'Tab. 8 — Nutzlasten Gebäudenutzung (SIA 261)',
    'Kategorien von Nutzflächen und charakteristische Werte der Nutzlasten nach §8.2',
    JSON.stringify(['Kat.','Nutzungsart','qk [kN/m²]','Qk [kN]']),
    JSON.stringify([
      ['A1','Wohnen','2.0','2.0'],
      ['B','Büro, Verwaltung','3.0','2.0'],
      ['C1','Versammlungsräume mit Tischen','3.0','4.0'],
      ['C2','Zuschauerbereiche mit fester Bestuhlung','4.0','4.0'],
      ['C3','Flächen ohne Hindernisse (Museen, Ausstellungen)','5.0','4.0'],
      ['C4','Sportflächen','5.0','7.0'],
      ['C5','Grossveranstaltungen (Konzerte, Bahnhöfe)','5.0','4.5'],
      ['D','Einkauf, Detailhandel','5.0','4.0'],
      ['E','Lager, Industrie (projektspezifisch)','nach Projekt','nach Projekt'],
      ['F','Fahrzeuge ≤ 30 kN','2.5','10.0'],
      ['G','Fahrzeuge 30–160 kN','5.0','45.0'],
      ['H','Dächer (Zugang nur Wartung)','1.0','1.0'],
      ['I','Begehbare Dächer (wie A–D)','3.0','–'],
    ]));

  iT.run('temperatur_t1k','sia261','Temperatur',
    'Tab. 6 — Gleichmässige Temperaturänderung T1k (SIA 261)',
    'Charakteristische Werte der gleichmässigen Temperaturänderung für Tragwerke im Freien',
    JSON.stringify(['Bauweise','T1k [°C]']),
    JSON.stringify([
      ['Unbewehrter Beton','± 15'],
      ['Stahlbeton, Spannbeton','± 20'],
      ['Stahl','± 30'],
      ['Stahl-Beton-Verbund','± 25'],
      ['Holz','± 20'],
      ['Mauerwerk','± 15'],
      ['Aluminium','± 30'],
    ]));

  console.log('✓ DB initialisiert:');
  console.log(`  SIA 265: ${seedChapters.length} Kap., ${seedVerifications.length} Nachweise`);
  console.log(`  SIA 261: ${sia261.chapters.length} Kap., ${sia261.verifications.length} Nachweise`);
  console.log(`  Lignum Brandschutz: ${lignumBrandschutz.chapters.length} Kap., ${lignumBrandschutz.verifications.length} Nachweise`);
  console.log(`  Lignum Erdbeben: ${lignumErdbeben.chapters.length} Kap., ${lignumErdbeben.verifications.length} Nachweise`);
  console.log(`  Baustatik: ${baustatik.chapters.length} Kap., ${baustatik.verifications.length} Nachweise`);
}

const staticExport = ensureStaticDataFiles(db);
if (staticExport.created) {
  console.log('✓ Stammdaten-JSON initial erstellt');
}

const staticSync = importStaticData(db);
if (!staticSync.skipped) {
  console.log(`✓ Stammdaten aus JSON synchronisiert: ${staticSync.norms} Normen, ${staticSync.chapters} Kapitel, ${staticSync.tables} Tabellen`);
}

// ─── Nachweise nur noch aus JSON-Dateien laden (keine Seed-Daten) ─────────────
const verificationJsonSync = importActiveVerificationExports(db, { pruneMissing: false, forceActive: true });
if (verificationJsonSync.files > 0) {
  console.log(`✓ Nachweise aus JSON synchronisiert: ${verificationJsonSync.imported}/${verificationJsonSync.files}`);
  if (verificationJsonSync.errors.length) {
    console.warn('⚠ JSON-Nachweise mit Fehlern:', verificationJsonSync.errors);
  }
}

module.exports = db;
