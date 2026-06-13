// Erstellt/aktualisiert einen Nachweis fuer Tabelle 231-1:
// Grundschutzzeit t_prot,0,i und Grundisolationszeit t_ins,0,n.
//
// Ausführen:
//   node server/seed-lignum-brandschutz-tab231-grundzeiten.js

const db = require('./db');
const { importVerificationExport } = require('./verification-export');

const normId = 'lignum_brandschutz';
const chapter = db.prepare('SELECT * FROM chapters WHERE norm_id=? AND number=?').get(normId, '3.1');
if (!chapter) throw new Error('Kapitel 3.1 in Lignum Brandschutz nicht gefunden');

const materialFormula = (id, label, tprot, tins, formulaCases = {}) => ({
  id,
  label,
  formulas: {
    tprot0: tprot,
    tins0: tins,
  },
  formulaCases,
});

const graph = {
  version: 1,
  nodes: [
    {
      id: 'title_tab231',
      type: 'title',
      position: { x: -80, y: 0 },
      data: {
        kind: 'title',
        label: 'Tabelle 231-1 - Grundzeiten der Schichten',
        color: '#c2410c',
      },
      style: { width: 430, height: 54 },
    },
    {
      id: 'comment_tab231',
      type: 'comment',
      position: { x: -80, y: 80 },
      data: {
        kind: 'comment',
        text: 'Dieser Nachweis berechnet die Werte aus Tab. 231-1: Grundschutzzeit t_prot,0,i und Grundisolationszeit t_ins,0,n. Der letzte Bauteilwert t_tab,231 wird als Summe der Grundschutzzeiten vor der letzten Schicht plus Grundisolationszeit der letzten Schicht gebildet.',
        extra: 'none',
      },
      style: { width: 430, height: 130 },
    },
    {
      id: 't_erf_tab231',
      type: 'variable',
      position: { x: -80, y: 250 },
      data: {
        kind: 'variable',
        name: 't_erf',
        label: 'erforderliche Feuerwiderstandsdauer',
        unit: 'min',
        default_value: '30',
        inputKind: 'number',
        options: [],
      },
      style: { width: 250, height: 140 },
    },
    {
      id: 'loop_tab231_layers',
      type: 'loopblock',
      position: { x: 420, y: 40 },
      data: {
        kind: 'loopblock',
        label: 'Schichten nach Tab. 231-1',
        count_label: 'Anzahl Schichten n',
        max_count: 16,
        dropdown_label: 'Material Schicht i bzw. n',
        vars: [
          { id: 'v_d', name: 'd', label: 'Dicke d_i / d_n', unit: 'mm', default_value: '20' },
          { id: 'v_rho', name: 'rho', label: 'Rohdichte rho_i / rho_n', unit: 'kg/m^3', default_value: '26' },
          { id: 'v_beta0', name: 'beta_0', label: 'Abbrandrate beta_0', unit: 'mm/min', default_value: '0.65' },
          { id: 'v_k_bonus', name: 'k_bonus', label: 'Erhöhungsfaktor Fussnoten', unit: '-', default_value: '1' },
        ],
        outputs: [
          { id: 'tprot0', name: 't_{prot,0,i}', label: 'Grundschutzzeit', unit: 'min' },
          { id: 'tins0', name: 't_{ins,0,n}', label: 'Grundisolationszeit', unit: 'min' },
        ],
        options: [
          materialFormula(
            'massivholz',
            'Massivholzschalung / Massivholzplatte',
            'Math.min(30 * Math.pow(d / 20, 1.1), d / beta_0) * k_bonus',
            '19 * Math.pow(d / 20, 1.4) * k_bonus',
          ),
          materialFormula(
            'furnier_osb',
            'Furniersperrholz / Furnierschichtholz / OSB-Platte',
            'Math.min(23 * Math.pow(d / 20, 1.1), d / beta_0) * k_bonus',
            '16 * Math.pow(d / 20, 1.4) * k_bonus',
          ),
          materialFormula(
            'span_faser',
            'Spanplatte / Faserplatte',
            'Math.min(33 * Math.pow(d / 20, 1.1), d / beta_0) * k_bonus',
            '22 * Math.pow(d / 20, 1.4) * k_bonus',
          ),
          materialFormula(
            'gips',
            'Gipsplatte / Gipsfaserplatte',
            '30 * Math.pow(d / 15, 1.2) * k_bonus',
            '24 * Math.pow(d / 15, 1.4) * k_bonus',
          ),
          materialFormula(
            'mineralwolle_ge_26',
            'Mineralwolle rho >= 26 kg/m3, Schmelzpunkt >= 1000 C',
            '0.3 * Math.pow(d, 0.75 * Math.log10(rho) - rho / 400) * k_bonus',
            '(0.01 * Math.pow(rho, 0.224) - 0.02) * d * d * k_bonus',
          ),
          materialFormula(
            'mineralwolle_ge_15',
            'Mineralwolle rho >= 15 kg/m3, Schmelzpunkt < 1000 C',
            '0',
            '0',
            {
              tprot0: [
                { id: 'mw_low_lt_40', cond_expr: 'd < 40', formula: '0' },
                { id: 'mw_low_ge_40', cond_expr: 'd >= 40', formula: 'Math.min((0.0007 * rho + 0.046) * d + 13, 30) * k_bonus' },
              ],
            },
          ),
        ],
        aggregations: [
          {
            output_id: 'sum_tprot0_before_last',
            method: 'expr',
            expr: 'sum_tprot0_before_last',
            name: 'sum_tprot0_before_last',
            label: 'Summe Grundschutzzeiten vor letzter Schicht',
            unit: 'min',
          },
          {
            output_id: 'last_tins0',
            method: 'expr',
            expr: 'last_tins0',
            name: 'last_tins0',
            label: 'Grundisolationszeit letzte Schicht',
            unit: 'min',
          },
          {
            output_id: 't_tab_231',
            method: 'expr',
            expr: 'sum_tprot0_before_last + last_tins0',
            name: 't_tab_231',
            label: 'vereinfachte Zeit nach Tab. 231-1',
            unit: 'min',
          },
        ],
      },
      style: { width: 560, height: 620 },
    },
    {
      id: 'calc_t_tab231',
      type: 'calc',
      position: { x: 1060, y: 115 },
      data: {
        kind: 'calc',
        name: 't_tab_231_result',
        label: 'Zeit nach Tabelle 231-1',
        unit: 'min',
        latex: '',
        expr: 't_tab_231',
      },
      style: { width: 270, height: 180 },
    },
    {
      id: 'check_tab231',
      type: 'check',
      position: { x: 1060, y: 340 },
      data: {
        kind: 'check',
        label: 'Vergleich mit Anforderung',
        latex: '',
        expr: 't_tab_231 >= t_erf ? 1 : 0',
        unit: 'min',
      },
      style: { width: 300, height: 140 },
    },
    {
      id: 'comment_tab231_notes',
      type: 'comment',
      position: { x: 1060, y: 530 },
      data: {
        kind: 'comment',
        text: 'Fussnoten aus Tab. 231-1: beta_0 = 0.65 mm/min. Fuer zementgebundene Spanplatten oder RF2-Baustoffe kann k_bonus = 1.10 eingetragen werden. Fuer einlagige Massivholzplatten gelten die Formeln direkt.',
        extra: 'none',
      },
      style: { width: 360, height: 150 },
    },
  ],
  edges: [
    { id: 'e_title_comment', source: 'title_tab231', target: 'comment_tab231', sourceHandle: null, targetHandle: null, data: { kind: 'workflow' } },
    { id: 'e_comment_loop', source: 'comment_tab231', target: 'loop_tab231_layers', sourceHandle: null, targetHandle: null, data: { kind: 'workflow' } },
    { id: 'e_req_check', source: 't_erf_tab231', target: 'check_tab231', sourceHandle: null, targetHandle: null, data: { kind: 'workflow' } },
    { id: 'e_loop_calc', source: 'loop_tab231_layers', target: 'calc_t_tab231', sourceHandle: null, targetHandle: null, data: { kind: 'workflow' } },
    { id: 'e_calc_check', source: 'calc_t_tab231', target: 'check_tab231', sourceHandle: null, targetHandle: null, data: { kind: 'workflow' } },
    { id: 'e_loop_check', source: 'loop_tab231_layers', target: 'check_tab231', sourceHandle: null, targetHandle: null, data: { kind: 'workflow' } },
    { id: 'e_notes_loop', source: 'comment_tab231_notes', target: 'loop_tab231_layers', sourceHandle: null, targetHandle: null, data: { kind: 'workflow' } },
  ],
  display_order: [
    'title_tab231',
    'comment_tab231',
    't_erf_tab231',
    'loop_tab231_layers',
    'calc_t_tab231',
    'check_tab231',
    'comment_tab231_notes',
  ],
};

const existingMax = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM verifications WHERE norm_id=?').get(normId).m;
const payload = {
  version: 1,
  verification: {
    id: 'tab_231_1_grundzeiten',
    norm_id: normId,
    chapter_id: chapter.id,
    title: 'Tab. 231-1 Grundschutzzeit und Grundisolationszeit',
    formula_latex: 't_{tab,231} = \\sum_{i=1}^{n-1} t_{prot,0,i} + t_{ins,0,n}',
    formula_description: 'Berechnet die Grundschutzzeit und Grundisolationszeit gemaess Tabelle 231-1 je Schicht.',
    compute_expr: '',
    sort_order: existingMax + 1,
    active: 1,
    graph_json: JSON.stringify(graph),
    notes: 'Automatisch erzeugter Loopblock fuer Tabelle 231-1.',
  },
  chapter,
  variables: [],
  tables: [],
  graph,
};

const result = importVerificationExport(db, payload);
console.log(`OK: ${result.id} importiert -> ${result.file}`);
