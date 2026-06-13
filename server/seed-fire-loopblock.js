// Fügt einen fertig konfigurierten Schleifenblock für
// "Berechnungsverfahren für brandabschnittsbildende Bauteile" ein.
//
// Ausführen:
//   node server/seed-fire-loopblock.js
//
// Optional mit DB-Pfad:
//   node server/seed-fire-loopblock.js /pfad/zur/sia265.db

const path = require('path');
const Database = require('better-sqlite3');

const dbPath = process.argv[2] || path.join(__dirname, 'sia265.db');
const db = new Database(dbPath);

db.pragma('foreign_keys = ON');

try { db.exec(`ALTER TABLE verifications ADD COLUMN graph_json TEXT DEFAULT NULL`); } catch (_) {}
try { db.exec(`ALTER TABLE verifications ADD COLUMN notes TEXT DEFAULT ''`); } catch (_) {}

function calc(id, name, label, unit, formula, cond_expr = '') {
  return { id, name, label, unit, formula, cond_expr };
}

function baseCalcs(prefix, tprotFormula, tinsFormula, kposMode = 'std') {
  const tprotThreshold = kposMode === 'mw_low' ? 't_prot_0_i / 4' : 't_prot_0_i / 2';
  const firstFactor = kposMode === 'mw_low' ? '0.8' : '0.6';
  const highFormula = kposMode === 'mw_low'
    ? '(0.001 * rho + 0.27) * Math.pow(t_prot_0_i / sum_tprot_prev, 0.75 - 0.002 * rho)'
    : '0.5 * Math.sqrt(t_prot_0_i / sum_tprot_prev)';

  return [
    calc(`${prefix}_tprot0`, 't_{prot,0,i}', 'Grundschutzzeit', 'min', tprotFormula),
    calc(`${prefix}_tins0`, 't_{ins,0,i}', 'Grundisolationszeit', 'min', tinsFormula),

    calc(`${prefix}_kpos_i_zero`, 'k_{pos,exp,i}', 'Positionsbeiwert', '-', '1', 't_prot_0_i <= 0'),
    calc(`${prefix}_kpos_i_low`, 'k_{pos,exp,i}', 'Positionsbeiwert', '-', `1 - ${firstFactor} * sum_tprot_prev / t_prot_0_i`, `t_prot_0_i > 0 && sum_tprot_prev <= ${tprotThreshold}`),
    calc(`${prefix}_kpos_i_high`, 'k_{pos,exp,i}', 'Positionsbeiwert', '-', highFormula, `t_prot_0_i > 0 && sum_tprot_prev > ${tprotThreshold}`),

    calc(`${prefix}_kpos_n_zero`, 'k_{pos,exp,n}', 'Positionsbeiwert letzte Schicht', '-', '1', 't_ins_0_i <= 0'),
    calc(`${prefix}_kpos_n_low`, 'k_{pos,exp,n}', 'Positionsbeiwert letzte Schicht', '-', '1 - 0.6 * sum_tprot_prev / t_ins_0_i', 't_ins_0_i > 0 && sum_tprot_prev <= t_ins_0_i / 2'),
    calc(`${prefix}_kpos_n_high`, 'k_{pos,exp,n}', 'Positionsbeiwert letzte Schicht', '-', '0.5 * Math.sqrt(t_ins_0_i / sum_tprot_prev)', 't_ins_0_i > 0 && sum_tprot_prev > t_ins_0_i / 2'),
  ];
}

const graph = {
  version: 1,
  nodes: [
    {
      id: 'title_fire_loop',
      type: 'title',
      position: { x: 0, y: 0 },
      data: { kind: 'title', label: 'Brandabschnittsbildende Bauteile', color: '#c2410c' },
      style: { width: 360, height: 54 },
    },
    {
      id: 't_erf',
      type: 'variable',
      position: { x: 0, y: 90 },
      data: {
        kind: 'variable',
        name: 't_{erf}',
        label: 'Erforderliche Feuerwiderstandsdauer',
        unit: 'min',
        default_value: '30',
        inputKind: 'number',
        options: [],
      },
      style: { width: 250, height: 92 },
    },
    {
      id: 'fire_layers',
      type: 'loopblock',
      position: { x: 320, y: 90 },
      data: {
        kind: 'loopblock',
        label: 'Berechnung brandabschnittsbildendes Bauteil',
        count_label: 'Anzahl Schichten n',
        max_count: 12,
        dropdown_label: 'Material Schicht i bzw. n',
        vars: [
          { id: 'v_d', name: 'd', label: 'Schichtdicke d_i', unit: 'mm', default_value: '15' },
          { id: 'v_rho', name: 'rho', label: 'Rohdichte rho_i', unit: 'kg/m^3', default_value: '26' },
          { id: 'v_beta0', name: 'beta_0', label: 'Abbrandrate beta_0', unit: 'mm/min', default_value: '0.65' },
          { id: 'v_kpos_unexp', name: 'k_pos_unexp', label: 'k_pos,unexp (Tab. 233-1)', unit: '-', default_value: '1' },
          { id: 'v_delta_t', name: 'delta_t', label: 'Zeitdifferenz Delta t_i', unit: 'min', default_value: '0' },
          { id: 'v_kj', name: 'k_j', label: 'Fugenbeiwert k_j', unit: '-', default_value: '1' },
        ],
        outputs: [
          {
            id: 'tprot',
            name: 't_{prot,i}',
            label: 'Schutzzeit',
            unit: 'min',
          },
          {
            id: 'tins',
            name: 't_{ins,n}',
            label: 'Grundisolationsbeitrag',
            unit: 'min',
          },
        ],
        options: [
          {
            id: 'massivholz',
            label: 'Massivholzschalung / Massivholzplatte',
            formulas: {
              tprot: '((t_prot_0_i * k_pos_exp_i * k_pos_unexp) + delta_t) * k_j',
              tins: '((t_ins_0_i * k_pos_exp_n) + delta_t) * k_j',
            },
            calcs: baseCalcs(
              'massiv',
              'Math.min(30 * Math.pow(d / 20, 1.1), d / beta_0)',
              '19 * Math.pow(d / 20, 1.4)',
            ),
          },
          {
            id: 'furnier_osb',
            label: 'Furniersperrholz / Furnierschichtholz / OSB-Platte',
            formulas: {
              tprot: '((t_prot_0_i * k_pos_exp_i * k_pos_unexp) + delta_t) * k_j',
              tins: '((t_ins_0_i * k_pos_exp_n) + delta_t) * k_j',
            },
            calcs: baseCalcs(
              'furnier',
              'Math.min(23 * Math.pow(d / 20, 1.1), d / beta_0)',
              '16 * Math.pow(d / 20, 1.4)',
            ),
          },
          {
            id: 'span_faser',
            label: 'Spanplatte / Faserplatte',
            formulas: {
              tprot: '((t_prot_0_i * k_pos_exp_i * k_pos_unexp) + delta_t) * k_j',
              tins: '((t_ins_0_i * k_pos_exp_n) + delta_t) * k_j',
            },
            calcs: baseCalcs(
              'span',
              'Math.min(33 * Math.pow(d / 20, 1.1), d / beta_0)',
              '22 * Math.pow(d / 20, 1.4)',
            ),
          },
          {
            id: 'gips',
            label: 'Gipsplatte / Gipsfaserplatte',
            formulas: {
              tprot: '((t_prot_0_i * k_pos_exp_i * k_pos_unexp) + delta_t) * k_j',
              tins: '((t_ins_0_i * k_pos_exp_n) + delta_t) * k_j',
            },
            calcs: baseCalcs(
              'gips',
              '30 * Math.pow(d / 15, 1.2)',
              '24 * Math.pow(d / 15, 1.4)',
            ),
          },
          {
            id: 'mw_high',
            label: 'Mineralwolle rho >= 26 kg/m3, Schmelzpunkt >= 1000 C',
            formulas: {
              tprot: '((t_prot_0_i * k_pos_exp_i * k_pos_unexp) + delta_t) * k_j',
              tins: '((t_ins_0_i * k_pos_exp_n) + delta_t) * k_j',
            },
            calcs: baseCalcs(
              'mw_high',
              '0.3 * Math.pow(d, 0.75 * Math.log10(rho) - rho / 400)',
              '(0.01 * Math.pow(rho, 0.224) - 0.02) * d * d',
            ),
          },
          {
            id: 'mw_low',
            label: 'Mineralwolle rho >= 15 kg/m3, Schmelzpunkt < 1000 C, d_i >= 40 mm',
            formulas: {
              tprot: '((t_prot_0_i * k_pos_exp_i * k_pos_unexp) + delta_t) * k_j',
              tins: '((t_ins_0_i * k_pos_exp_n) + delta_t) * k_j',
            },
            calcs: baseCalcs(
              'mw_low',
              'd < 40 ? 0 : Math.min((0.0007 * rho + 0.046) * d + 13, 30)',
              '0',
              'mw_low',
            ),
          },
        ],
        aggregations: [
          {
            output_id: 'sum_tprot',
            method: 'expr',
            expr: 'sum_tprot_before_last',
            name: '\\sum t_{prot,i}',
            label: 'Summe Schutzzeiten vor letzter Schicht',
            unit: 'min',
          },
          {
            output_id: 'last_tins_value',
            method: 'expr',
            expr: 'last_tins',
            name: 't_{ins,n}',
            label: 'Isolationszeit letzte Schicht',
            unit: 'min',
          },
          {
            output_id: 'tins_total',
            method: 'expr',
            expr: 'sum_tprot_before_last + last_tins',
            name: 't_{ins}',
            label: 'Zeit bis zum Versagen der brandabschnittsbildenden Funktion',
            unit: 'min',
          },
        ],
      },
      style: { width: 520, height: 560 },
    },
    {
      id: 'check_fire',
      type: 'check',
      position: { x: 900, y: 120 },
      data: {
        kind: 'check',
        label: 'Nachweis brandabschnittsbildende Funktion',
        latex: 't_{ins} \\geq t_{erf}',
        expr: 't_ins >= t_erf ? 1 : 0',
        unit: 'min',
      },
      style: { width: 270, height: 110 },
    },
  ],
  edges: [
    { id: 'e_title_loop', source: 'title_fire_loop', target: 'fire_layers', sourceHandle: null, targetHandle: null, data: { kind: 'workflow' } },
    { id: 'e_req_check', source: 't_erf', target: 'check_fire', sourceHandle: null, targetHandle: null, data: { kind: 'workflow' } },
    { id: 'e_loop_check', source: 'fire_layers', target: 'check_fire', sourceHandle: null, targetHandle: null, data: { kind: 'workflow' } },
  ],
  display_order: ['title_fire_loop', 't_erf', 'fire_layers', 'check_fire'],
};

const chapterId = 'fire_2_berechnungsverfahren';
const verificationId = 'fire_brandabschnitt_loopblock';

const tx = db.transaction(() => {
  const existingChapter = db.prepare('SELECT id FROM chapters WHERE id=?').get(chapterId);
  if (!existingChapter) {
    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM chapters WHERE norm_id=?').get('sia265').m;
    db.prepare(`
      INSERT INTO chapters (id, norm_id, parent_id, number, title, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(chapterId, 'sia265', null, '2', 'Berechnungsverfahren für brandabschnittsbildende Bauteile', maxOrder + 1);
  }

  const existing = db.prepare('SELECT id FROM verifications WHERE id=?').get(verificationId);
  const graphJson = JSON.stringify(graph);
  if (existing) {
    db.prepare(`
      UPDATE verifications
      SET norm_id=?, chapter_id=?, title=?, formula_latex=?, formula_description=?, compute_expr=?, graph_json=?, active=1
      WHERE id=?
    `).run(
      'sia265',
      chapterId,
      'Brandabschnittsbildende Bauteile - Schleifenblock Test',
      't_{ins} = \\sum_{i=1}^{n-1} t_{prot,i} + t_{ins,n} \\geq t_{erf}',
      'Mehrschichtiger Nachweis nach Kapitel 2.2/2.3: Grundzeiten, Positionsbeiwerte, Zeitdifferenz und Fugenbeiwerte.',
      '',
      graphJson,
      verificationId,
    );
  } else {
    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM verifications WHERE norm_id=?').get('sia265').m;
    db.prepare(`
      INSERT INTO verifications
        (id, norm_id, chapter_id, title, formula_latex, formula_description, compute_expr, sort_order, active, graph_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      verificationId,
      'sia265',
      chapterId,
      'Brandabschnittsbildende Bauteile - Schleifenblock Test',
      't_{ins} = \\sum_{i=1}^{n-1} t_{prot,i} + t_{ins,n} \\geq t_{erf}',
      'Mehrschichtiger Nachweis nach Kapitel 2.2/2.3: Grundzeiten, Positionsbeiwerte, Zeitdifferenz und Fugenbeiwerte.',
      '',
      maxOrder + 1,
      1,
      graphJson,
    );
  }
});

tx();
console.log(`OK: ${verificationId} in Kapitel ${chapterId} eingefügt/aktualisiert.`);
