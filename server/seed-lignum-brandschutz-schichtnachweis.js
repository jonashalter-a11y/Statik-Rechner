// Erstellt/aktualisiert einen vollständigen Schleifenblock-Nachweis unter
// Lignum Brandschutz > 3.1 Bauteile und Verbindungen.
//
// Ausführen:
//   node server/seed-lignum-brandschutz-schichtnachweis.js

const db = require('./db');
const { importVerificationExport } = require('./verification-export');

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
      id: 'title_bauteile_verbindungen',
      type: 'title',
      position: { x: -80, y: 0 },
      data: { kind: 'title', label: 'Bauteile und Verbindungen - Schichtnachweis', color: '#c2410c' },
      style: { width: 420, height: 54 },
    },
    {
      id: 'comment_norm_basis',
      type: 'comment',
      position: { x: -80, y: 80 },
      data: {
        kind: 'comment',
        text: 'Nachweis nach den Bildern/Kap. 2.2 bis 2.4: Schutzzeiten der vor der letzten Schicht liegenden Schichten plus Grundisolationszeit der letzten Schicht. Hohlraeume, Fugen, Delta t und k_pos,unexp koennen je Schicht eingegeben werden.',
        extra: 'none',
      },
      style: { width: 420, height: 130 },
    },
    {
      id: 't_erf_required',
      type: 'variable',
      position: { x: -80, y: 250 },
      data: {
        kind: 'variable',
        name: 't_{erf}',
        label: 'erforderliche Feuerwiderstandsdauer',
        unit: 'min',
        default_value: '30',
        inputKind: 'number',
        options: [],
      },
      style: { width: 250, height: 140 },
    },
    {
      id: 'layers_fire_resistance',
      type: 'loopblock',
      position: { x: 420, y: 40 },
      data: {
        kind: 'loopblock',
        label: 'Mehrschichtiger Bauteilaufbau',
        count_label: 'Anzahl Schichten n',
        max_count: 16,
        dropdown_label: 'Material Schicht i bzw. n',
        vars: [
          { id: 'v_d', name: 'd', label: 'Schichtdicke d_i', unit: 'mm', default_value: '15' },
          { id: 'v_rho', name: 'rho', label: 'Rohdichte rho_i', unit: 'kg/m^3', default_value: '26' },
          { id: 'v_beta0', name: 'beta_0', label: 'Abbrandrate beta_0', unit: 'mm/min', default_value: '0.65' },
          { id: 'v_kpos_unexp', name: 'k_pos_unexp', label: 'k_pos,unexp', unit: '-', default_value: '1' },
          { id: 'v_delta_t', name: 'delta_t', label: 'Zeitdifferenz Delta t_i', unit: 'min', default_value: '0' },
          { id: 'v_kj', name: 'k_j', label: 'Fugenbeiwert k_j', unit: '-', default_value: '1' },
          { id: 'v_kh', name: 'k_h', label: 'Hohlraum-/Sonderbeiwert', unit: '-', default_value: '1' },
        ],
        outputs: [
          { id: 'tprot', name: 't_{prot,i}', label: 'Schutzzeit Schicht i', unit: 'min' },
          { id: 'tins', name: 't_{ins,n}', label: 'Isolationsbeitrag letzte Schicht', unit: 'min' },
        ],
        options: [
          {
            id: 'massivholz',
            label: 'Massivholzschalung / Massivholzplatte',
            formulas: {
              tprot: '((t_prot_0_i * k_pos_exp_i * k_pos_unexp * k_h) + delta_t) * k_j',
              tins: '((t_ins_0_i * k_pos_exp_n * k_h) + delta_t) * k_j',
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
              tprot: '((t_prot_0_i * k_pos_exp_i * k_pos_unexp * k_h) + delta_t) * k_j',
              tins: '((t_ins_0_i * k_pos_exp_n * k_h) + delta_t) * k_j',
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
              tprot: '((t_prot_0_i * k_pos_exp_i * k_pos_unexp * k_h) + delta_t) * k_j',
              tins: '((t_ins_0_i * k_pos_exp_n * k_h) + delta_t) * k_j',
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
              tprot: '((t_prot_0_i * k_pos_exp_i * k_pos_unexp * k_h) + delta_t) * k_j',
              tins: '((t_ins_0_i * k_pos_exp_n * k_h) + delta_t) * k_j',
            },
            calcs: baseCalcs(
              'gips',
              '30 * Math.pow(d / 15, 1.2)',
              '24 * Math.pow(d / 15, 1.4)',
            ),
          },
          {
            id: 'mineralwolle_ge_26',
            label: 'Mineralwolle rho >= 26 kg/m3, Schmelzpunkt >= 1000 C',
            formulas: {
              tprot: '((t_prot_0_i * k_pos_exp_i * k_pos_unexp * k_h) + delta_t) * k_j',
              tins: '((t_ins_0_i * k_pos_exp_n * k_h) + delta_t) * k_j',
            },
            calcs: baseCalcs(
              'mw_high',
              '0.3 * Math.pow(d, 0.75 * Math.log10(rho) - rho / 400)',
              '(0.01 * Math.pow(rho, 0.224) - 0.02) * d * d',
            ),
          },
          {
            id: 'mineralwolle_ge_15',
            label: 'Mineralwolle rho >= 15 kg/m3, Schmelzpunkt < 1000 C, d_i >= 40 mm',
            formulas: {
              tprot: '((t_prot_0_i * k_pos_exp_i * k_pos_unexp * k_h) + delta_t) * k_j',
              tins: '((t_ins_0_i * k_pos_exp_n * k_h) + delta_t) * k_j',
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
            output_id: 'sum_tprot_before_last',
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
            label: 'Grundisolationszeit letzte Schicht',
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
      style: { width: 560, height: 650 },
    },
    {
      id: 'calc_result_tins',
      type: 'calc',
      position: { x: 1050, y: 100 },
      data: {
        kind: 'calc',
        name: 't_{ins,Nachweis}',
        label: 'Zeit bis zum Versagen',
        unit: 'min',
        latex: '',
        expr: 't_ins',
      },
      style: { width: 260, height: 180 },
    },
    {
      id: 'check_brandabschnitt',
      type: 'check',
      position: { x: 1050, y: 330 },
      data: {
        kind: 'check',
        label: 'Nachweis brandabschnittsbildende Funktion',
        latex: 't_{ins} \\geq t_{erf}',
        expr: 't_ins >= t_erf ? 1 : 0',
        unit: 'min',
      },
      style: { width: 300, height: 140 },
    },
    {
      id: 'comment_hollow_spaces',
      type: 'comment',
      position: { x: 1050, y: 520 },
      data: {
        kind: 'comment',
        text: 'Tab. 236-1 Hohlraeume: k_h = 1 ohne wirksamen Hohlraum. Bei Hohlraum >= 40 mm den passenden Einfluss als k_h bzw. Delta t je Schicht eintragen. Wenn du das automatisch per Auswahl willst, braucht der Loopblock noch eine Hohlraum-Option.',
        extra: 'none',
      },
      style: { width: 340, height: 150 },
    },
  ],
  edges: [
    { id: 'e_title_comment', source: 'title_bauteile_verbindungen', target: 'comment_norm_basis', sourceHandle: null, targetHandle: null, data: { kind: 'workflow' } },
    { id: 'e_comment_loop', source: 'comment_norm_basis', target: 'layers_fire_resistance', sourceHandle: null, targetHandle: null, data: { kind: 'workflow' } },
    { id: 'e_required_check', source: 't_erf_required', target: 'check_brandabschnitt', sourceHandle: null, targetHandle: null, data: { kind: 'workflow' } },
    { id: 'e_loop_result', source: 'layers_fire_resistance', target: 'calc_result_tins', sourceHandle: null, targetHandle: null, data: { kind: 'workflow' } },
    { id: 'e_result_check', source: 'calc_result_tins', target: 'check_brandabschnitt', sourceHandle: null, targetHandle: null, data: { kind: 'workflow' } },
    { id: 'e_loop_check_direct', source: 'layers_fire_resistance', target: 'check_brandabschnitt', sourceHandle: null, targetHandle: null, data: { kind: 'workflow' } },
    { id: 'e_hollow_loop', source: 'comment_hollow_spaces', target: 'layers_fire_resistance', sourceHandle: null, targetHandle: null, data: { kind: 'workflow' } },
  ],
  display_order: [
    'title_bauteile_verbindungen',
    'comment_norm_basis',
    't_erf_required',
    'layers_fire_resistance',
    'calc_result_tins',
    'check_brandabschnitt',
    'comment_hollow_spaces',
  ],
};

const chapter = db.prepare('SELECT * FROM chapters WHERE norm_id=? AND number=?').get('lignum_brandschutz', '3.1');
if (!chapter) throw new Error('Kapitel 3.1 in Lignum Brandschutz nicht gefunden');

const payload = {
  version: 1,
  verification: {
    id: 'bauteile_verbindungen_schichtnachweis',
    norm_id: 'lignum_brandschutz',
    chapter_id: chapter.id,
    title: 'Bauteile und Verbindungen - Schichtnachweis',
    formula_latex: 't_{ins} = \\sum_{i=1}^{n-1} t_{prot,i} + t_{ins,n} \\geq t_{erf}',
    formula_description: 'Mehrschichtiger Nachweis mit Grundschutzzeit, Grundisolationszeit, Positionsbeiwerten, Fugenbeiwert, Hohlraum-/Sonderbeiwert und Zeitdifferenz je Schicht.',
    compute_expr: '',
    sort_order: 1,
    active: 1,
    graph_json: JSON.stringify(graph),
    notes: 'Automatisch erzeugter Nachweis aus den Kapiteln 2.2 bis 2.4 fuer Bauteile und Verbindungen.',
  },
  chapter,
  variables: [],
  tables: [],
  graph,
};

const result = importVerificationExport(db, payload);
console.log(`OK: ${result.id} importiert -> ${result.file}`);
