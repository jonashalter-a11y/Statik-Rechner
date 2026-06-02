// ─── SIA 261:2020 — Einwirkungen auf Tragwerke ────────────────────────────────
// Kapitelstruktur + Berechnungen (Schnee, Wind, Nutzlasten, Erdruck, Kombinationen)

const chapters = [
  ['261.0',    null,     '0',     'Geltungsbereich'],
  ['261.0.1',  '261.0',  '0.1',   'Abgrenzung'],
  ['261.0.2',  '261.0',  '0.2',   'Normative Verweisungen'],
  ['261.0.3',  '261.0',  '0.3',   'Abweichungen'],

  ['261.1',    null,     '1',     'Verständigung'],
  ['261.1.1',  '261.1',  '1.1',   'Begriffe und Definitionen'],
  ['261.1.2',  '261.1',  '1.2',   'Symbole, Begriffe und Einheiten'],

  ['261.2',    null,     '2',     'Eigenlasten und Auflasten'],
  ['261.2.1',  '261.2',  '2.1',   'Allgemeines'],
  ['261.2.2',  '261.2',  '2.2',   'Charakteristische Werte von Eigenlasten'],
  ['261.2.3',  '261.2',  '2.3',   'Charakteristische Werte von Auflasten'],

  ['261.3',    null,     '3',     'Vorspannung'],
  ['261.3.1',  '261.3',  '3.1',   'Allgemeines'],
  ['261.3.2',  '261.3',  '3.2',   'Charakteristische Werte'],

  ['261.4',    null,     '4',     'Baugrund'],
  ['261.4.1',  '261.4',  '4.1',   'Allgemeines'],
  ['261.4.2',  '261.4',  '4.2',   'Eigenlast des Bodens'],
  ['261.4.3',  '261.4',  '4.3',   'Erddruck'],
  ['261.4.3.1','261.4.3','4.3.1', 'Allgemeines'],
  ['261.4.3.2','261.4.3','4.3.2', 'Charakteristische Werte'],
  ['261.4.3.3','261.4.3','4.3.3', 'Erddruckverteilung'],
  ['261.4.4',  '261.4',  '4.4',   'Wasserdruck'],
  ['261.4.5',  '261.4',  '4.5',   'Verschiebungen und Verformungen'],
  ['261.4.6',  '261.4',  '4.6',   'Weitere Einwirkungen'],

  ['261.5',    null,     '5',     'Schnee'],
  ['261.5.1',  '261.5',  '5.1',   'Allgemeines'],
  ['261.5.2',  '261.5',  '5.2',   'Charakteristische Werte'],
  ['261.5.3',  '261.5',  '5.3',   'Lastanordnung'],
  ['261.5.4',  '261.5',  '5.4',   'Raumlast von Schnee'],

  ['261.6',    null,     '6',     'Wind'],
  ['261.6.1',  '261.6',  '6.1',   'Allgemeines'],
  ['261.6.2',  '261.6',  '6.2',   'Charakteristische Werte'],
  ['261.6.2.1','261.6.2','6.2.1', 'Staudruck'],
  ['261.6.2.2','261.6.2','6.2.2', 'Winddrücke'],
  ['261.6.2.3','261.6.2','6.2.3', 'Windkräfte'],
  ['261.6.3',  '261.6',  '6.3',   'Reduktionsfaktor und dynamischer Faktor'],

  ['261.7',    null,     '7',     'Temperatur'],
  ['261.7.1',  '261.7',  '7.1',   'Allgemeines'],
  ['261.7.2',  '261.7',  '7.2',   'Charakteristische Werte'],

  ['261.8',    null,     '8',     'Gebäudenutzung'],
  ['261.8.1',  '261.8',  '8.1',   'Allgemeines'],
  ['261.8.2',  '261.8',  '8.2',   'Charakteristische Werte'],
  ['261.8.3',  '261.8',  '8.3',   'Lastanordnung'],
  ['261.8.4',  '261.8',  '8.4',   'Besondere Massnahmen'],

  ['261.9',    null,     '9',     'Nicht motorisierter Verkehr'],
  ['261.9.1',  '261.9',  '9.1',   'Allgemeines'],
  ['261.9.2',  '261.9',  '9.2',   'Charakteristische Werte'],
  ['261.9.3',  '261.9',  '9.3',   'Aussergewöhnliche Einwirkungen'],
  ['261.9.4',  '261.9',  '9.4',   'Dynamische Anregung'],

  ['261.10',    null,       '10',      'Strassenverkehr'],
  ['261.10.1',  '261.10',   '10.1',    'Allgemeines'],
  ['261.10.2',  '261.10',   '10.2',    'Lastmodelle und charakteristische Werte'],
  ['261.10.2.1','261.10.2', '10.2.1',  'Fiktive Fahrstreifen'],
  ['261.10.2.2','261.10.2', '10.2.2',  'Lastmodell 1'],
  ['261.10.2.3','261.10.2', '10.2.3',  'Lastmodell 3'],
  ['261.10.2.4','261.10.2', '10.2.4',  'Anfahr- und Bremskräfte'],
  ['261.10.3',  '261.10',   '10.3',    'Beiwerte'],
  ['261.10.4',  '261.10',   '10.4',    'Ermüdung'],

  ['261.11',    null,     '11',    'Normalspurbahnverkehr'],
  ['261.12',    null,     '12',    'Schmalspurbahnverkehr'],

  ['261.13',    null,     '13',    'Abschrankungen'],
  ['261.13.1',  '261.13', '13.1',  'Allgemeines'],
  ['261.13.2',  '261.13', '13.2',  'Charakteristische Werte'],

  ['261.14',    null,     '14',    'Anprall'],
  ['261.14.1',  '261.14', '14.1',  'Allgemeines'],
  ['261.14.2',  '261.14', '14.2',  'Anprall von Strassenfahrzeugen'],
  ['261.14.3',  '261.14', '14.3',  'Anprall von Schienenfahrzeugen'],

  ['261.15',    null,     '15',    'Brand'],
  ['261.15.1',  '261.15', '15.1',  'Allgemeines'],
  ['261.15.2',  '261.15', '15.2',  'Brandschutz'],
  ['261.15.3',  '261.15', '15.3',  'Thermische Einwirkung'],

  ['261.16',    null,     '16',    'Erdbeben'],
  ['261.16.1',  '261.16', '16.1',  'Allgemeines'],
  ['261.16.2',  '261.16', '16.2',  'Erdbebeneinwirkungen'],
  ['261.16.2.1','261.16.2','16.2.1','Erdbebenzonen'],
  ['261.16.2.2','261.16.2','16.2.2','Baugrund'],
  ['261.16.2.3','261.16.2','16.2.3','Elastisches Antwortspektrum'],
  ['261.16.2.4','261.16.2','16.2.4','Bemessungsspektrum'],
  ['261.16.3',  '261.16', '16.3',  'Bauwerksklassen'],
  ['261.16.5',  '261.16', '16.5',  'Tragwerksanalyse'],
  ['261.16.5.2','261.16.5','16.5.2','Ersatzkraftverfahren'],

  ['261.17',    null,     '17',    'Explosion'],

  ['261.A',     null,     'A',     'Anhang A: Erddruck-Lastfälle'],
  ['261.B',     null,     'B',     'Anhang B: Erddruckbeiwerte'],
  ['261.C',     null,     'C',     'Anhang C: Wind – Druckbeiwerte'],
  ['261.D',     null,     'D',     'Anhang D: Bezugshöhe Schneelasten'],
  ['261.E',     null,     'E',     'Anhang E: Referenzwert Staudruck qp0'],
  ['261.F',     null,     'F',     'Anhang F: Strassenverkehr – Beiwerte'],
  ['261.G',     null,     'G',     'Anhang G: Erdbebenzonen Schweiz'],
  ['261.H',     null,     'H',     'Anhang H: Baugrundklassen Erdbeben'],
];

const verifications = [
  // ─── 5.2 SCHNEE ────────────────────────────────────────────────────────────
  {
    id: 'schnee_dach',
    chapter_id: '261.5.2',
    title: '(9/10) Schneelast auf Dächern',
    formula_latex: 'q_k = \\mu_i \\cdot C_e \\cdot C_T \\cdot s_k, \\quad s_k = \\left(1 + \\frac{h_0^2}{350}\\right) \\cdot 0{,}4 \\geq 0{,}9 \\;\\text{kN/m}^2',
    formula_description: 'Charakteristischer Wert der Schneelast auf Dächern nach SIA 261 §5.2 (Gl. 9, 10)',
    compute_expr: '(function(){ var sk = Math.max(0.9, (1 + (h0*h0)/350) * 0.4); return mu_i * Ce * CT * sk; })()',
    variables: [
      { name: 'h0',   label: 'Bezugshöhe h₀', unit: 'm',     type: 'number',   default_value: '550', description: 'Bezugshöhe über Meer (aus Anhang D)' },
      { name: 'mu_i', label: 'μᵢ Dachformbeiwert', unit: '-', type: 'dropdown', default_value: '0.8',
        description: 'Dachformbeiwert (Fig. 2/3 SIA 261)',
        options: [
          { label: 'Flachdach / Satteldach α≤30° (0.80)', value: '0.8' },
          { label: 'Satteldach α=30-60° interpoliert (0.80→0)', value: '0.5' },
          { label: 'Ungleichmässige Ablagerung μ₂ (1.2)', value: '1.2' },
          { label: 'Erhöhung grosse Gebäude μ₁ (1.0)', value: '1.0' },
        ]},
      { name: 'Ce', label: 'Ce Expositionsbeiwert', unit: '-', type: 'dropdown', default_value: '1.0',
        description: 'Windexposition des Bauwerks',
        options: [
          { label: 'Normale Windexposition (1.00)', value: '1.0' },
          { label: 'Stark windexponiert (0.80)', value: '0.8' },
          { label: 'Windgeschützt (1.20)', value: '1.2' },
        ]},
      { name: 'CT', label: 'CT thermischer Beiwert', unit: '-', type: 'dropdown', default_value: '1.0',
        description: 'Thermischer Beiwert (i.d.R. 1.0)',
        options: [
          { label: 'Normal (1.00)', value: '1.0' },
          { label: 'Grosser Wärmedurchgang (0.80)', value: '0.8' },
        ]},
    ],
  },

  // ─── 6.2.1 WIND — STAUDRUCK ────────────────────────────────────────────────
  {
    id: 'wind_staudruck',
    chapter_id: '261.6.2.1',
    title: '(11/12) Staudruck qp',
    formula_latex: 'q_p = c_h \\cdot q_{p0}, \\quad c_h = 1{,}6 \\cdot \\left(\\frac{z}{z_g}\\right)^{2r} + 0{,}375',
    formula_description: 'Charakteristischer Staudruck nach SIA 261 §6.2.1 (Gl. 11, 12)',
    compute_expr: '(function(){ var zeff = Math.max(z_min, z); var ch = 1.6 * Math.pow(zeff/zg, 2*r) + 0.375; return ch * qp0; })()',
    variables: [
      { name: 'z',    label: 'z Bezugshöhe', unit: 'm',      type: 'number',   default_value: '10', description: 'Höhe über Gelände' },
      { name: 'qp0',  label: 'qp0 Referenzstaudruck', unit: 'kN/m²', type: 'number', default_value: '0.9', description: 'Referenzstaudruck (aus Anhang E, je nach Region)' },
      { name: 'zg',   label: 'zg Gradientenhöhe', unit: 'm', type: 'dropdown', default_value: '450',
        description: 'Gradientenhöhe nach Geländekategorie (Tab. 4)',
        options: [
          { label: 'GK II — Seeufer (zg=300, r=0.16)', value: '300' },
          { label: 'GK IIa — grosse Ebene (zg=380, r=0.19)', value: '380' },
          { label: 'GK III — Ortschaften (zg=450, r=0.23)', value: '450' },
          { label: 'GK IV — Stadtgebiete (zg=526, r=0.30)', value: '526' },
        ]},
      { name: 'r',    label: 'r Rauigkeitsexp.', unit: '-',  type: 'dropdown', default_value: '0.23',
        description: 'Bodenrauigkeitsexponent (Tab. 4)',
        options: [
          { label: 'GK II (r=0.16)', value: '0.16' },
          { label: 'GK IIa (r=0.19)', value: '0.19' },
          { label: 'GK III (r=0.23)', value: '0.23' },
          { label: 'GK IV (r=0.30)', value: '0.30' },
        ]},
      { name: 'z_min', label: 'z_min', unit: 'm', type: 'dropdown', default_value: '5',
        description: 'Mindesthöhe für Geländekategorie',
        options: [
          { label: 'GK II/IIa/III: 5 m', value: '5' },
          { label: 'GK IV: 10 m', value: '10' },
        ]},
    ],
  },

  // ─── 6.2.2 WIND — WINDDRUCK ───────────────────────────────────────────────
  {
    id: 'wind_druck_aussen',
    chapter_id: '261.6.2.2',
    title: '(13) Aussenwanddruck qek',
    formula_latex: 'q_{ek} = c_{pe} \\cdot q_p',
    formula_description: 'Charakteristischer Winddruck auf äussere Oberflächen (Gl. 13)',
    compute_expr: 'cpe * qp',
    variables: [
      { name: 'cpe', label: 'cpe Aussendruckbeiwert', unit: '-', type: 'number', default_value: '0.8', description: 'Aussendruckbeiwert (aus Anhang C)' },
      { name: 'qp',  label: 'qp Staudruck', unit: 'kN/m²', type: 'number', default_value: '0.9', description: 'Staudruck aus §6.2.1' },
    ],
  },

  // ─── 6.2.3 WIND — WINDKRAFT ───────────────────────────────────────────────
  {
    id: 'wind_kraft',
    chapter_id: '261.6.2.3',
    title: '(15) Windkraft Qk',
    formula_latex: 'Q_k = c_{red} \\cdot c_d \\cdot c_f \\cdot q_p \\cdot A_{ref}',
    formula_description: 'Charakteristischer Wert der Windkraft auf ein Bauwerk (Gl. 15)',
    compute_expr: 'cred * cd * cf * qp * Aref',
    variables: [
      { name: 'cred', label: 'cred Reduktionsfaktor', unit: '-', type: 'number', default_value: '1.0', description: 'Reduktionsfaktor (Fig. 9, i.d.R. < 1.0)' },
      { name: 'cd',   label: 'cd dynamischer Faktor', unit: '-', type: 'dropdown', default_value: '1.0',
        description: 'Dynamischer Faktor (i.d.R. 1.0 für h ≤ 15 m)',
        options: [{ label: 'cd = 1.0 (h ≤ 15 m, od. schlanke Gebäude)', value: '1.0' }] },
      { name: 'cf',   label: 'cf Kraftbeiwert', unit: '-', type: 'number', default_value: '1.3', description: 'Kraftbeiwert (aus Anhang C)' },
      { name: 'qp',   label: 'qp Staudruck', unit: 'kN/m²', type: 'number', default_value: '0.9', description: 'Staudruck aus §6.2.1' },
      { name: 'Aref', label: 'Aref Bezugsfläche', unit: 'm²', type: 'number', default_value: '50', description: 'Bezugsfläche (Windangriffsfläche)' },
    ],
  },

  // ─── 8.2 NUTZLASTEN GEBÄUDE ───────────────────────────────────────────────
  {
    id: 'nutzlast_flaeche',
    chapter_id: '261.8.2',
    title: 'Nutzlast qk nach Kategorie (Tab. 8)',
    formula_latex: 'q_k \\;[\\text{kN/m}^2], \\quad Q_k \\;[\\text{kN}]',
    formula_description: 'Charakteristische Nutzlasten nach Nutzungskategorie (Tab. 8 SIA 261)',
    compute_expr: 'qk * A_nutz',
    variables: [
      { name: 'qk', label: 'qk Flächenlast', unit: 'kN/m²', type: 'dropdown', default_value: '2.0',
        description: 'Charakteristischer Wert der Flächenlast nach Tab. 8',
        options: [
          { label: 'A1 – Wohnen (2.0 kN/m²)', value: '2.0' },
          { label: 'A2 – Hotels, Krankenhäuser (2.0 kN/m²)', value: '2.0' },
          { label: 'B – Büro, Verwaltung (3.0 kN/m²)', value: '3.0' },
          { label: 'C1 – Versammlungsräume (3.0 kN/m²)', value: '3.0' },
          { label: 'C2 – Zuschauerbereiche (4.0 kN/m²)', value: '4.0' },
          { label: 'C3 – Flächen ohne Tische (5.0 kN/m²)', value: '5.0' },
          { label: 'C4 – Sportstätten (5.0 kN/m²)', value: '5.0' },
          { label: 'C5 – Grossveranstaltungen (5.0 kN/m²)', value: '5.0' },
          { label: 'D – Einkaufsflächen (5.0 kN/m²)', value: '5.0' },
          { label: 'E – Lager, Industrie (projektspez.)', value: '7.5' },
          { label: 'F – Fahrzeuge ≤ 30 kN (2.5 kN/m²)', value: '2.5' },
          { label: 'G – Fahrzeuge 30-160 kN (5.0 kN/m²)', value: '5.0' },
          { label: 'H – Dächer (Zugang nur z. Wartung, 1.0 kN/m²)', value: '1.0' },
          { label: 'I – Begehbare Dächer, wie A–D', value: '3.0' },
        ]},
      { name: 'A_nutz', label: 'A Nutzfläche', unit: 'm²', type: 'number', default_value: '20', description: 'Berechnungsfläche' },
    ],
  },

  // ─── 4.3.2 ERDDRUCK (aktiv) ───────────────────────────────────────────────
  {
    id: 'erddruck_aktiv',
    chapter_id: '261.4.3.2',
    title: 'Aktiver Erddruck eah,k',
    formula_latex: 'e_{ah,k} = K_a \\cdot \\gamma_{Boden} \\cdot z',
    formula_description: 'Charakteristischer aktiver Erddruck in Tiefe z (vereinfacht, SIA 261 §4.3)',
    compute_expr: 'Ka * gamma_b * z_e',
    variables: [
      { name: 'Ka',      label: 'Ka Erddruckbeiwert', unit: '-',     type: 'number', default_value: '0.33', description: 'Aktiver Erddruckbeiwert Ka = tan²(45-φ/2)' },
      { name: 'gamma_b', label: 'γ Raumlast Boden', unit: 'kN/m³', type: 'number', default_value: '20',   description: 'Charakterist. Raumlast des Bodens' },
      { name: 'z_e',     label: 'z Tiefe', unit: 'm', type: 'number', default_value: '3.0', description: 'Tiefe unter Geländeoberkante' },
    ],
  },
];

module.exports = { chapters, verifications };
