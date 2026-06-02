// Nachweise nach SIA 265:2021, Kapitel 4.2 Tragsicherheit
// Jeder Nachweis hat:
//   - formula_latex: LaTeX-Anzeige
//   - compute_expr: JavaScript-Ausdruck der das η (Ausnutzung) berechnet
//                   Variablen werden über ihren `name` referenziert
//                   Math-Funktionen verfügbar (Math.sin, Math.PI, Math.sqrt, ...)

module.exports = [
  // ─── 4.2.1 ZUG ─────────────────────────────────────────────────────────────
  {
    id: 'zug_0',
    chapter_id: '4.2.1',
    title: '(6) Zug parallel zur Faserrichtung',
    formula_latex: '\\eta = \\frac{\\sigma_{t,0,d}}{f_{t,0,d}} = \\frac{N_d \\cdot 10^3 / (b \\cdot h)}{k_{mod} \\cdot f_{t,0,k} / \\gamma_M} \\leq 1.0',
    formula_description: 'Zugnachweis parallel zur Faserrichtung (Gl. 6)',
    compute_expr: '((N_d * 1000) / (b * h)) / ((k_mod * f_t_0_k) / gamma_M)',
    variables: [
      { name: 'N_d', label: 'Bemessungszugkraft', unit: 'kN', type: 'number', default_value: '50', description: 'Bemessungswert der Zugnormalkraft' },
      { name: 'b', label: 'Breite', unit: 'mm', type: 'number', default_value: '120', description: 'Querschnittsbreite' },
      { name: 'h', label: 'Höhe', unit: 'mm', type: 'number', default_value: '200', description: 'Querschnittshöhe' },
      { name: 'f_t_0_k', label: 'Zugfestigkeit ‖', unit: 'N/mm²', type: 'number', default_value: '14', description: 'Charakt. Zugfestigkeit parallel zur Faser' },
      { name: 'k_mod', label: 'kmod', unit: '-', type: 'dropdown', default_value: '0.8', description: 'Modifikationsbeiwert (Tab. 3)',
        options: [
          { label: 'FK1, permanent (0.60)', value: '0.6' },
          { label: 'FK1, langfristig (0.70)', value: '0.7' },
          { label: 'FK1, mittelfristig (0.80)', value: '0.8' },
          { label: 'FK1, kurz (0.90)', value: '0.9' },
          { label: 'FK1, sehr kurz (1.10)', value: '1.1' },
          { label: 'FK2, mittelfristig (0.80)', value: '0.8' },
          { label: 'FK3, mittelfristig (0.65)', value: '0.65' },
        ] },
      { name: 'gamma_M', label: 'γM', unit: '-', type: 'number', default_value: '1.3', description: 'Teilsicherheitsbeiwert' },
    ],
  },

  {
    id: 'zug_90',
    chapter_id: '4.2.1',
    title: '(7) Zug rechtwinklig zur Faserrichtung',
    formula_latex: '\\sigma_{t,90,d} \\leq f_{t,90,d}',
    formula_description: 'Querzugnachweis (Gl. 7)',
    compute_expr: 'sigma_t_90_d / ((k_mod * f_t_90_k) / gamma_M)',
    variables: [
      { name: 'sigma_t_90_d', label: 'σt,90,d', unit: 'N/mm²', type: 'number', default_value: '0.05', description: 'Bemessungswert der Querzugspannung' },
      { name: 'f_t_90_k', label: 'ft,90,k', unit: 'N/mm²', type: 'number', default_value: '0.4', description: 'Charakt. Querzugfestigkeit' },
      { name: 'k_mod', label: 'kmod', unit: '-', type: 'dropdown', default_value: '0.8', description: 'Modifikationsbeiwert',
        options: [{ label: 'FK1, mittelfristig (0.80)', value: '0.8' }, { label: 'FK1, kurz (0.90)', value: '0.9' }] },
      { name: 'gamma_M', label: 'γM', unit: '-', type: 'number', default_value: '1.3', description: 'Teilsicherheitsbeiwert' },
    ],
  },

  // ─── 4.2.2 DRUCK ──────────────────────────────────────────────────────────
  {
    id: 'druck_0',
    chapter_id: '4.2.2',
    title: '(9) Druck parallel zur Faserrichtung',
    formula_latex: '\\eta = \\frac{\\sigma_{c,0,d}}{k_c \\cdot f_{c,0,d}} = \\frac{N_d \\cdot 10^3 / (b \\cdot h)}{k_c \\cdot k_{mod} \\cdot f_{c,0,k} / \\gamma_M} \\leq 1.0',
    formula_description: 'Drucknachweis parallel zur Faser (Gl. 9). kc=1 für gedrungene Stäbe ohne Knickgefahr.',
    compute_expr: '((N_d * 1000) / (b * h)) / (k_c * (k_mod * f_c_0_k) / gamma_M)',
    variables: [
      { name: 'N_d', label: 'Bemessungsdruckkraft', unit: 'kN', type: 'number', default_value: '80', description: 'Bemessungswert der Drucknormalkraft' },
      { name: 'b', label: 'Breite', unit: 'mm', type: 'number', default_value: '120', description: 'Querschnittsbreite' },
      { name: 'h', label: 'Höhe', unit: 'mm', type: 'number', default_value: '160', description: 'Querschnittshöhe' },
      { name: 'f_c_0_k', label: 'fc,0,k', unit: 'N/mm²', type: 'number', default_value: '21', description: 'Charakt. Druckfestigkeit parallel zur Faser' },
      { name: 'k_c', label: 'kc Knickbeiwert', unit: '-', type: 'number', default_value: '1.0', description: 'Knickbeiwert (1.0 ohne Knicken)' },
      { name: 'k_mod', label: 'kmod', unit: '-', type: 'dropdown', default_value: '0.8', description: 'Modifikationsbeiwert',
        options: [{ label: 'FK1, mittelfristig (0.80)', value: '0.8' }, { label: 'FK1, kurz (0.90)', value: '0.9' }, { label: 'FK1, permanent (0.60)', value: '0.6' }] },
      { name: 'gamma_M', label: 'γM', unit: '-', type: 'number', default_value: '1.3', description: 'Teilsicherheitsbeiwert' },
    ],
  },

  {
    id: 'druck_90',
    chapter_id: '4.2.2',
    title: '(11) Druck rechtwinklig zur Faserrichtung',
    formula_latex: '\\eta = \\frac{\\sigma_{c,90,d}}{f_{c,90,d}} = \\frac{F_d \\cdot 10^3 / A_{ef}}{k_{mod} \\cdot f_{c,90,k} / \\gamma_M} \\leq 1.0',
    formula_description: 'Querdrucknachweis, z.B. Auflagerpressung (Gl. 11)',
    compute_expr: '((F_d * 1000) / A_ef) / ((k_mod * f_c_90_k) / gamma_M)',
    variables: [
      { name: 'F_d', label: 'Auflagerkraft', unit: 'kN', type: 'number', default_value: '30', description: 'Bemessungswert der Querdruckkraft' },
      { name: 'A_ef', label: 'Aef', unit: 'mm²', type: 'number', default_value: '14400', description: 'Effektive Auflagerfläche (b × Lef)' },
      { name: 'f_c_90_k', label: 'fc,90,k', unit: 'N/mm²', type: 'number', default_value: '3.5', description: 'Charakt. Druckfestigkeit ⊥ zur Faser' },
      { name: 'k_mod', label: 'kmod', unit: '-', type: 'dropdown', default_value: '0.8', description: 'Modifikationsbeiwert',
        options: [{ label: 'FK1, mittelfristig (0.80)', value: '0.8' }, { label: 'FK1, kurz (0.90)', value: '0.9' }] },
      { name: 'gamma_M', label: 'γM', unit: '-', type: 'number', default_value: '1.3', description: 'Teilsicherheitsbeiwert' },
    ],
  },

  // ─── 4.2.3 BIEGUNG ────────────────────────────────────────────────────────
  {
    id: 'biegung_einachsig',
    chapter_id: '4.2.3',
    title: '(14) Biegung einachsig',
    formula_latex: '\\eta = \\frac{\\sigma_{m,d}}{f_{m,d}} = \\frac{M_d \\cdot 10^6 / W_y}{k_{mod} \\cdot f_{m,k} / \\gamma_M} \\leq 1.0',
    formula_description: 'Biegenachweis bei einachsiger Biegung (Gl. 14, σ_m,z = 0)',
    compute_expr: '((M_d * 1e6) / ((b * h * h) / 6)) / ((k_mod * f_m_k) / gamma_M)',
    variables: [
      { name: 'M_d', label: 'Bemessungsmoment', unit: 'kNm', type: 'number', default_value: '10', description: 'Bemessungswert des Biegemoments' },
      { name: 'b', label: 'Breite', unit: 'mm', type: 'number', default_value: '120', description: 'Querschnittsbreite' },
      { name: 'h', label: 'Höhe', unit: 'mm', type: 'number', default_value: '240', description: 'Querschnittshöhe' },
      { name: 'f_m_k', label: 'fm,k', unit: 'N/mm²', type: 'number', default_value: '24', description: 'Charakt. Biegefestigkeit' },
      { name: 'k_mod', label: 'kmod', unit: '-', type: 'dropdown', default_value: '0.8', description: 'Modifikationsbeiwert',
        options: [{ label: 'FK1, mittelfristig (0.80)', value: '0.8' }, { label: 'FK1, kurz (0.90)', value: '0.9' }, { label: 'FK1, permanent (0.60)', value: '0.6' }] },
      { name: 'gamma_M', label: 'γM', unit: '-', type: 'number', default_value: '1.3', description: 'Teilsicherheitsbeiwert' },
    ],
  },

  {
    id: 'biegung_zweiachsig',
    chapter_id: '4.2.3',
    title: '(14) Biegung zweiachsig',
    formula_latex: '\\eta = \\frac{\\sigma_{m,y,d}}{f_{m,y,d}} + \\frac{\\sigma_{m,z,d}}{f_{m,z,d}} \\leq 1.0',
    formula_description: 'Biegenachweis bei zweiachsiger Biegung (Gl. 14)',
    compute_expr: '((M_y_d * 1e6) / ((b * h * h) / 6)) / ((k_mod * f_m_k) / gamma_M) + ((M_z_d * 1e6) / ((h * b * b) / 6)) / ((k_mod * f_m_k) / gamma_M)',
    variables: [
      { name: 'M_y_d', label: 'My,d (um starke Achse)', unit: 'kNm', type: 'number', default_value: '8', description: 'Biegemoment um die y-Achse' },
      { name: 'M_z_d', label: 'Mz,d (um schwache Achse)', unit: 'kNm', type: 'number', default_value: '2', description: 'Biegemoment um die z-Achse' },
      { name: 'b', label: 'Breite', unit: 'mm', type: 'number', default_value: '120', description: 'Querschnittsbreite' },
      { name: 'h', label: 'Höhe', unit: 'mm', type: 'number', default_value: '240', description: 'Querschnittshöhe' },
      { name: 'f_m_k', label: 'fm,k', unit: 'N/mm²', type: 'number', default_value: '24', description: 'Charakt. Biegefestigkeit' },
      { name: 'k_mod', label: 'kmod', unit: '-', type: 'dropdown', default_value: '0.8', description: 'Modifikationsbeiwert',
        options: [{ label: 'FK1, mittelfristig (0.80)', value: '0.8' }, { label: 'FK1, kurz (0.90)', value: '0.9' }] },
      { name: 'gamma_M', label: 'γM', unit: '-', type: 'number', default_value: '1.3', description: 'Teilsicherheitsbeiwert' },
    ],
  },

  // ─── 4.2.4 BIEGUNG MIT NORMALKRAFT ────────────────────────────────────────
  {
    id: 'biegung_zug',
    chapter_id: '4.2.4',
    title: '(21) Biegung + Zug',
    formula_latex: '\\eta = \\frac{\\sigma_{t,0,d}}{f_{t,0,d}} + \\frac{\\sigma_{m,y,d}}{f_{m,y,d}} + \\frac{\\sigma_{m,z,d}}{f_{m,z,d}} \\leq 1.0',
    formula_description: 'Kombinierter Nachweis Biegung mit Zug (Gl. 21)',
    compute_expr: '((N_d * 1000) / (b * h)) / ((k_mod * f_t_0_k) / gamma_M) + ((M_y_d * 1e6) / ((b * h * h) / 6)) / ((k_mod * f_m_k) / gamma_M) + ((M_z_d * 1e6) / ((h * b * b) / 6)) / ((k_mod * f_m_k) / gamma_M)',
    variables: [
      { name: 'N_d', label: 'Bemessungszugkraft', unit: 'kN', type: 'number', default_value: '20', description: 'Bemessungswert der Zugkraft' },
      { name: 'M_y_d', label: 'My,d', unit: 'kNm', type: 'number', default_value: '5', description: 'Biegemoment um y-Achse' },
      { name: 'M_z_d', label: 'Mz,d', unit: 'kNm', type: 'number', default_value: '0', description: 'Biegemoment um z-Achse' },
      { name: 'b', label: 'Breite', unit: 'mm', type: 'number', default_value: '120', description: 'Querschnittsbreite' },
      { name: 'h', label: 'Höhe', unit: 'mm', type: 'number', default_value: '240', description: 'Querschnittshöhe' },
      { name: 'f_t_0_k', label: 'ft,0,k', unit: 'N/mm²', type: 'number', default_value: '14', description: 'Charakt. Zugfestigkeit ‖' },
      { name: 'f_m_k', label: 'fm,k', unit: 'N/mm²', type: 'number', default_value: '24', description: 'Charakt. Biegefestigkeit' },
      { name: 'k_mod', label: 'kmod', unit: '-', type: 'dropdown', default_value: '0.8', description: 'Modifikationsbeiwert',
        options: [{ label: 'FK1, mittelfristig (0.80)', value: '0.8' }, { label: 'FK1, kurz (0.90)', value: '0.9' }] },
      { name: 'gamma_M', label: 'γM', unit: '-', type: 'number', default_value: '1.3', description: 'Teilsicherheitsbeiwert' },
    ],
  },

  {
    id: 'biegung_druck',
    chapter_id: '4.2.4',
    title: '(22) Biegung + Druck',
    formula_latex: '\\eta = \\left(\\frac{\\sigma_{c,0,d}}{f_{c,0,d}}\\right)^2 + \\frac{\\sigma_{m,y,d}}{f_{m,y,d}} + \\frac{\\sigma_{m,z,d}}{f_{m,z,d}} \\leq 1.0',
    formula_description: 'Kombinierter Nachweis Biegung mit Druck (Gl. 22)',
    compute_expr: 'Math.pow(((N_d * 1000) / (b * h)) / ((k_mod * f_c_0_k) / gamma_M), 2) + ((M_y_d * 1e6) / ((b * h * h) / 6)) / ((k_mod * f_m_k) / gamma_M) + ((M_z_d * 1e6) / ((h * b * b) / 6)) / ((k_mod * f_m_k) / gamma_M)',
    variables: [
      { name: 'N_d', label: 'Bemessungsdruckkraft', unit: 'kN', type: 'number', default_value: '50', description: 'Bemessungswert der Druckkraft' },
      { name: 'M_y_d', label: 'My,d', unit: 'kNm', type: 'number', default_value: '5', description: 'Biegemoment um y-Achse' },
      { name: 'M_z_d', label: 'Mz,d', unit: 'kNm', type: 'number', default_value: '0', description: 'Biegemoment um z-Achse' },
      { name: 'b', label: 'Breite', unit: 'mm', type: 'number', default_value: '120', description: 'Querschnittsbreite' },
      { name: 'h', label: 'Höhe', unit: 'mm', type: 'number', default_value: '240', description: 'Querschnittshöhe' },
      { name: 'f_c_0_k', label: 'fc,0,k', unit: 'N/mm²', type: 'number', default_value: '21', description: 'Charakt. Druckfestigkeit ‖' },
      { name: 'f_m_k', label: 'fm,k', unit: 'N/mm²', type: 'number', default_value: '24', description: 'Charakt. Biegefestigkeit' },
      { name: 'k_mod', label: 'kmod', unit: '-', type: 'dropdown', default_value: '0.8', description: 'Modifikationsbeiwert',
        options: [{ label: 'FK1, mittelfristig (0.80)', value: '0.8' }, { label: 'FK1, kurz (0.90)', value: '0.9' }] },
      { name: 'gamma_M', label: 'γM', unit: '-', type: 'number', default_value: '1.3', description: 'Teilsicherheitsbeiwert' },
    ],
  },

  // ─── 4.2.5 SCHUB ──────────────────────────────────────────────────────────
  {
    id: 'schub',
    chapter_id: '4.2.5',
    title: '(23) Schub parallel zur Faserrichtung',
    formula_latex: '\\eta = \\frac{\\tau_d}{f_{v,d}} = \\frac{3 \\cdot V_d \\cdot 10^3 / (2 \\cdot b \\cdot h)}{k_{mod} \\cdot f_{v,k} / \\gamma_M} \\leq 1.0',
    formula_description: 'Schubnachweis bei Rechteckquerschnitt (Gl. 23)',
    compute_expr: '((1.5 * V_d * 1000) / (b * h)) / ((k_mod * f_v_k) / gamma_M)',
    variables: [
      { name: 'V_d', label: 'Bemessungsquerkraft', unit: 'kN', type: 'number', default_value: '15', description: 'Bemessungswert der Querkraft' },
      { name: 'b', label: 'Breite', unit: 'mm', type: 'number', default_value: '120', description: 'Querschnittsbreite' },
      { name: 'h', label: 'Höhe', unit: 'mm', type: 'number', default_value: '240', description: 'Querschnittshöhe' },
      { name: 'f_v_k', label: 'fv,k', unit: 'N/mm²', type: 'number', default_value: '2.5', description: 'Charakt. Scherfestigkeit' },
      { name: 'k_mod', label: 'kmod', unit: '-', type: 'dropdown', default_value: '0.8', description: 'Modifikationsbeiwert',
        options: [{ label: 'FK1, mittelfristig (0.80)', value: '0.8' }, { label: 'FK1, kurz (0.90)', value: '0.9' }, { label: 'FK1, permanent (0.60)', value: '0.6' }] },
      { name: 'gamma_M', label: 'γM', unit: '-', type: 'number', default_value: '1.3', description: 'Teilsicherheitsbeiwert' },
    ],
  },

  // ─── 4.2.8 KNICKEN ────────────────────────────────────────────────────────
  {
    id: 'knicken_vh',
    chapter_id: '4.2.8',
    title: '(29) Knicken — Vollholz/Balkenschichtholz',
    formula_latex: '\\eta = \\frac{\\sigma_{c,0,d}}{k_c \\cdot f_{c,0,d}}, \\quad \\lambda_{rel} = \\frac{\\lambda}{57}, \\quad k_c = \\frac{1}{k + \\sqrt{k^2 - \\lambda_{rel}^2}}',
    formula_description: 'Knicknachweis Vollholz (Gl. 29-35, βc=0.2). Berechnet λrel, k, kc automatisch.',
    compute_expr: '(function() { var lambda_rel = lambda / 57; if (lambda_rel <= 0.3) return ((N_d * 1000) / (b * h)) / ((k_mod * f_c_0_k) / gamma_M); var k = 0.5 * (1 + 0.2 * (lambda_rel - 0.3) + lambda_rel * lambda_rel); var k_c = 1 / (k + Math.sqrt(k * k - lambda_rel * lambda_rel)); return ((N_d * 1000) / (b * h)) / (k_c * (k_mod * f_c_0_k) / gamma_M); })()',
    variables: [
      { name: 'N_d', label: 'Druckkraft', unit: 'kN', type: 'number', default_value: '80', description: 'Bemessungswert der Druckkraft' },
      { name: 'b', label: 'Breite', unit: 'mm', type: 'number', default_value: '120', description: 'Querschnittsbreite' },
      { name: 'h', label: 'Höhe', unit: 'mm', type: 'number', default_value: '160', description: 'Querschnittshöhe' },
      { name: 'lambda', label: 'λ Schlankheit', unit: '-', type: 'number', default_value: '80', description: 'Geometrische Schlankheit = lk/i' },
      { name: 'f_c_0_k', label: 'fc,0,k', unit: 'N/mm²', type: 'number', default_value: '21', description: 'Charakt. Druckfestigkeit ‖' },
      { name: 'k_mod', label: 'kmod', unit: '-', type: 'dropdown', default_value: '0.8', description: 'Modifikationsbeiwert',
        options: [{ label: 'FK1, mittelfristig (0.80)', value: '0.8' }, { label: 'FK1, kurz (0.90)', value: '0.9' }] },
      { name: 'gamma_M', label: 'γM', unit: '-', type: 'number', default_value: '1.3', description: 'Teilsicherheitsbeiwert' },
    ],
  },

  {
    id: 'knicken_bsh',
    chapter_id: '4.2.8',
    title: '(29) Knicken — Brettschichtholz',
    formula_latex: '\\eta = \\frac{\\sigma_{c,0,d}}{k_c \\cdot f_{c,0,d}}, \\quad \\lambda_{rel} = \\frac{\\lambda}{60}, \\quad \\beta_c = 0.1',
    formula_description: 'Knicknachweis Brettschichtholz (Gl. 29-36, βc=0.1)',
    compute_expr: '(function() { var lambda_rel = lambda / 60; if (lambda_rel <= 0.3) return ((N_d * 1000) / (b * h)) / ((k_mod * f_c_0_k) / gamma_M); var k = 0.5 * (1 + 0.1 * (lambda_rel - 0.3) + lambda_rel * lambda_rel); var k_c = 1 / (k + Math.sqrt(k * k - lambda_rel * lambda_rel)); return ((N_d * 1000) / (b * h)) / (k_c * (k_mod * f_c_0_k) / gamma_M); })()',
    variables: [
      { name: 'N_d', label: 'Druckkraft', unit: 'kN', type: 'number', default_value: '100', description: 'Bemessungswert der Druckkraft' },
      { name: 'b', label: 'Breite', unit: 'mm', type: 'number', default_value: '140', description: 'Querschnittsbreite' },
      { name: 'h', label: 'Höhe', unit: 'mm', type: 'number', default_value: '200', description: 'Querschnittshöhe' },
      { name: 'lambda', label: 'λ Schlankheit', unit: '-', type: 'number', default_value: '80', description: 'Geometrische Schlankheit = lk/i' },
      { name: 'f_c_0_k', label: 'fc,0,k', unit: 'N/mm²', type: 'number', default_value: '24', description: 'Charakt. Druckfestigkeit ‖' },
      { name: 'k_mod', label: 'kmod', unit: '-', type: 'dropdown', default_value: '0.8', description: 'Modifikationsbeiwert',
        options: [{ label: 'FK1, mittelfristig (0.80)', value: '0.8' }, { label: 'FK1, kurz (0.90)', value: '0.9' }] },
      { name: 'gamma_M', label: 'γM', unit: '-', type: 'number', default_value: '1.3', description: 'Teilsicherheitsbeiwert' },
    ],
  },

  // ─── 4.2.9 KIPPEN ─────────────────────────────────────────────────────────
  {
    id: 'kippen_vh',
    chapter_id: '4.2.9',
    title: '(38) Kippen — Vollholz',
    formula_latex: '\\eta = \\frac{\\sigma_{m,d}}{k_m \\cdot f_{m,d}}, \\quad \\lambda_{rel,m} = 0.07 \\cdot \\sqrt{\\frac{a \\cdot h}{b}}',
    formula_description: 'Kippnachweis Vollholz (Gl. 38, 43)',
    compute_expr: '(function() { var lambda_rel_m = 0.07 * Math.sqrt((a * h) / b); var k_m; if (lambda_rel_m <= 0.75) k_m = 1; else if (lambda_rel_m <= 1.4) k_m = 1.56 - 0.75 * lambda_rel_m; else k_m = 1 / (lambda_rel_m * lambda_rel_m); var sigma_m_d = (M_d * 1e6) / ((b * h * h) / 6); var f_m_d = (k_mod * f_m_k) / gamma_M; return sigma_m_d / (k_m * f_m_d); })()',
    variables: [
      { name: 'M_d', label: 'Biegemoment', unit: 'kNm', type: 'number', default_value: '10', description: 'Bemessungswert des Biegemoments' },
      { name: 'a', label: 'Kipplänge a', unit: 'mm', type: 'number', default_value: '3000', description: 'Abstand der seitlichen Abstützungen' },
      { name: 'b', label: 'Breite', unit: 'mm', type: 'number', default_value: '120', description: 'Querschnittsbreite' },
      { name: 'h', label: 'Höhe', unit: 'mm', type: 'number', default_value: '240', description: 'Querschnittshöhe' },
      { name: 'f_m_k', label: 'fm,k', unit: 'N/mm²', type: 'number', default_value: '24', description: 'Charakt. Biegefestigkeit' },
      { name: 'k_mod', label: 'kmod', unit: '-', type: 'dropdown', default_value: '0.8', description: 'Modifikationsbeiwert',
        options: [{ label: 'FK1, mittelfristig (0.80)', value: '0.8' }, { label: 'FK1, kurz (0.90)', value: '0.9' }] },
      { name: 'gamma_M', label: 'γM', unit: '-', type: 'number', default_value: '1.3', description: 'Teilsicherheitsbeiwert' },
    ],
  },

  {
    id: 'kippen_bsh',
    chapter_id: '4.2.9',
    title: '(38) Kippen — Brettschichtholz',
    formula_latex: '\\eta = \\frac{\\sigma_{m,d}}{k_m \\cdot f_{m,d}}, \\quad \\lambda_{rel,m} = 0.06 \\cdot \\sqrt{\\frac{a \\cdot h}{b}}',
    formula_description: 'Kippnachweis Brettschichtholz (Gl. 38, 44)',
    compute_expr: '(function() { var lambda_rel_m = 0.06 * Math.sqrt((a * h) / b); var k_m; if (lambda_rel_m <= 0.75) k_m = 1; else if (lambda_rel_m <= 1.4) k_m = 1.56 - 0.75 * lambda_rel_m; else k_m = 1 / (lambda_rel_m * lambda_rel_m); var sigma_m_d = (M_d * 1e6) / ((b * h * h) / 6); var f_m_d = (k_mod * f_m_k) / gamma_M; return sigma_m_d / (k_m * f_m_d); })()',
    variables: [
      { name: 'M_d', label: 'Biegemoment', unit: 'kNm', type: 'number', default_value: '30', description: 'Bemessungswert des Biegemoments' },
      { name: 'a', label: 'Kipplänge a', unit: 'mm', type: 'number', default_value: '5000', description: 'Abstand der seitlichen Abstützungen' },
      { name: 'b', label: 'Breite', unit: 'mm', type: 'number', default_value: '140', description: 'Querschnittsbreite' },
      { name: 'h', label: 'Höhe', unit: 'mm', type: 'number', default_value: '400', description: 'Querschnittshöhe' },
      { name: 'f_m_k', label: 'fm,k', unit: 'N/mm²', type: 'number', default_value: '24', description: 'Charakt. Biegefestigkeit BSH' },
      { name: 'k_mod', label: 'kmod', unit: '-', type: 'dropdown', default_value: '0.8', description: 'Modifikationsbeiwert',
        options: [{ label: 'FK1, mittelfristig (0.80)', value: '0.8' }, { label: 'FK1, kurz (0.90)', value: '0.9' }] },
      { name: 'gamma_M', label: 'γM', unit: '-', type: 'number', default_value: '1.3', description: 'Teilsicherheitsbeiwert' },
    ],
  },
];
