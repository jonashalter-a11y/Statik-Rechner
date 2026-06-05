// SIA 261:2020 Anhang C — Tabellen 31–45 (Excel-verifiziert)
// Kraft- und Druckbeiwerte bei Wind
// Quelle: Schneelast_Windlast.xlsm — Sheets "Daten Windlast" + "lokale Windruckbeiwerte"
// Nur Tabellen mit Flag=True (Tab. 31–45). Tab. 46–49 (offene Gebäude) ausgelassen.
//
// Zonen-Legende (konsistent für alle Tabellen):
//   A = Luvseitige Wand   B = Leeseitige Wand   C = Seitenwand
//   D = Dach Luv-Seite*   E = Dach Lee-Seite*   F/G = weitere Dachzonen
//   H = Firstbereich / Dach Mitte
//   cf1 = globaler Kraftbeiwert für Bezugsfläche b·h
//   cf2 = globaler Kraftbeiwert für Bezugsfläche d·h
//   cpi = Innendruckbeiwert (glm. = gleichmässig undicht)
//   * Für Flachdach (Tab. 31/32): D=Seitenwand 2, E-H = Dachflächen

const db = require('./db');
const iT = db.prepare(
  'INSERT OR REPLACE INTO db_tables (id, norm_id, category, title, description, headers, rows) VALUES (?, ?, ?, ?, ?, ?, ?)'
);

// Einheitliche Spaltenköpfe für alle Tabellen
const HDR = ['θ°', 'A Luv', 'B Lee', 'C Seite', 'D', 'E', 'F', 'G', 'H', 'cf1 b·h', 'cf2 d·h', 'cpi'];

const tables = [

  // ══════════════════════════════════════════════════════════════════════════
  // FLACHDACH (Tab. 31–32)
  // Zonen A–D = Wandflächen, E–H = Dachflächen (E=Ecke, F=Rand, G=Rand, H=Mitte)
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'anhc_t31',
    title: 'Tab. 31 — Flachdach, h:b:d ≤ 0.3:1:1',
    desc: 'shape:flachdach_niedrig|Niedriges Gebäude mit Flachdach (h:b:d ≤ 0.3:1:1 bis 0.05:1:1). Typisch: eingeschossige Hallen, Flachdachbau. Zonen A-D = Wände, E-H = Dachflächen. ĉpe(lokal) = −2.0.',
    headers: HDR,
    rows: [
      ['0°',   '+0.70', '−0.25', '−0.35', '−0.35', '−0.50', '−0.50', '−0.25', '−0.25', '+0.95', '+0.00', '+0.15/−0.21'],
      ['15°',  '+0.55', '−0.25', '−0.20', '−0.35', '−0.50', '−0.55', '−0.25', '−0.30', '+0.80', '+0.15', '±0.15'],
      ['45°',  '+0.40', '−0.40', '+0.40', '−0.40', '−0.45', '−0.45', '−0.45', '−0.25', '+0.80', '+0.80', '±0.10'],
      ['90°',  '−0.35', '−0.35', '−0.25', '−0.25', '−0.50', '−0.25', '−0.50', '−0.25', '+0.00', '+0.95', '±0.15'],
    ],
  },

  {
    id: 'anhc_t32',
    title: 'Tab. 32 — Flachdach, h:b:d = 1:1:1',
    desc: 'shape:flachdach_mitte|Mittelhohe Würfelform mit Flachdach (h:b:d = 1:1:1). Häufige Bürogebäude-Proportion. Erhöhte Dachsogwerte im Eckbereich. ĉpe(lokal) = −2.0.',
    headers: HDR,
    rows: [
      ['0°',   '+0.75', '−0.30', '−0.75', '−0.75', '−1.05', '−1.05', '−0.45', '−0.45', '+1.05', '+0.00', '−0.35'],
      ['15°',  '+0.60', '−0.35', '−0.50', '−0.55', '−1.05', '−0.80', '−0.30', '−0.40', '+0.95', '+0.05', '−0.25'],
      ['45°',  '+0.35', '−0.45', '+0.35', '−0.45', '−1.05', '−0.60', '−0.60', '−0.25', '+0.80', '+0.80', '±0.10'],
      ['90°',  '−0.75', '−0.75', '+0.75', '−0.30', '−1.05', '−0.45', '−1.05', '−0.45', '+0.00', '+1.05', '−0.35'],
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SATTELDACH / GENEIGTE DÄCHER (Tab. 33–39)
  // Zonen A–C = Wände, D = Dach Luv, E = Dach Lee, F/G/H = weitere Dachzonen
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'anhc_t33',
    title: 'Tab. 33 — Satteldach α = 10°, h:b:d = 1:1:1',
    desc: 'shape:satteldach|Würfelform mit Satteldach α = 10° (h:b:d = 1:1:1). D = Luvseitiges Dach, E = Leeseitiges Dach. Bei θ=0° kann luvs. Dachfläche D sowohl Druck (+) als auch Sog (−) haben. ĉpe = −2.0.',
    headers: HDR,
    rows: [
      ['0°',   '+0.75', '−0.30', '−0.75', '−0.75', '−1.05', '−1.05', '−0.40', '−0.40', '+0.90', '+0.00', '−0.30'],
      ['15°',  '+0.60', '−0.40', '−0.50', '−0.55', '−1.05', '−0.90', '−0.35', '−0.40', '+0.86', '+0.05', '−0.20'],
      ['45°',  '+0.40', '−0.45', '+0.40', '−0.45', '−1.05', '−0.60', '−0.60', '−0.35', '+0.74', '+0.85', '±0.10'],
      ['90°',  '−0.75', '−0.75', '+0.75', '−0.30', '−1.05', '−0.40', '−1.05', '−0.40', '+0.00', '+1.05', '−0.30'],
    ],
  },

  {
    id: 'anhc_t34',
    title: 'Tab. 34 — Satteldach α = 10°, h:b:d = 2.5:1:1',
    desc: 'shape:flachdach_hoch|Hohes schlankes Gebäude mit Satteldach α = 10° (h:b:d = 2.5:1:1). Erhöhte Wanddrücke an Luv (A bis 0.85). D = Dach Luv, E = Dach Lee. ĉpe = −2.0.',
    headers: HDR,
    rows: [
      ['0°',   '+0.85', '−0.50', '−1.00', '−1.00', '−1.30', '−1.30', '−0.50', '−0.50', '+1.27', '+0.00', '−0.50'],
      ['15°',  '+0.60', '−0.50', '−0.70', '−0.80', '−1.05', '−1.00', '−0.45', '−0.50', '+1.04', '+0.10', '−0.40'],
      ['45°',  '+0.35', '−0.60', '+0.35', '−0.60', '−1.50', '−0.65', '−0.75', '−0.45', '+0.90', '+0.95', '−0.15'],
      ['90°',  '−1.00', '−1.00', '+0.85', '−0.50', '−1.30', '−0.70', '−1.30', '−0.70', '+0.00', '+1.35', '−0.50'],
    ],
  },

  {
    id: 'anhc_t35',
    title: 'Tab. 35 — Satteldach α = 10°, h:b:d = 1.5:2:1',
    desc: 'shape:satteldach|Längliches Gebäude mit Satteldach α = 10° (h:b:d = 1.5:2:1). D = Dach Luv, E = Dach Lee. cf2 bei θ=15° leicht negativ (−0.05) wegen Gebäudegeometrie. ĉpe = −2.0.',
    headers: HDR,
    rows: [
      ['0°',   '+0.80', '−0.40', '−0.85', '−0.85', '−1.10', '−1.10', '−0.50', '−0.50', '+1.09', '+0.00', '−0.35'],
      ['15°',  '+0.55', '−0.40', '−0.80', '−0.75', '−1.05', '−0.95', '−0.50', '−0.55', '+0.87', '−0.05', '−0.35'],
      ['45°',  '+0.35', '−0.50', '+0.35', '−0.55', '−1.00', '−0.70', '−0.70', '−0.40', '+0.78', '+0.90', '−0.15'],
      ['90°',  '−0.55', '−0.55', '+0.85', '−0.25', '−1.05', '−0.20', '−1.05', '−0.20', '+0.00', '+1.10', '±0.10'],
    ],
  },

  {
    id: 'anhc_t36',
    title: 'Tab. 36 — Satteldach α = 30°, h:b:d = 0.5:2:1',
    desc: 'shape:satteldach|Niedriges längliches Gebäude mit Satteldach α = 30° (h:b:d = 0.5:2:1). D = Dach Luv: bei θ=0°/15° kann Luvseitige Dachfläche auch Druck (+0.30) erhalten! E = Dach Lee. ĉpe = −2.0.',
    headers: HDR,
    rows: [
      ['0°',   '+0.60', '−0.35', '−0.30', '−0.30', '+0.30', '+0.30', '−0.55', '−0.55', '+0.89', '+0.00', '±0.10'],
      ['15°',  '+0.35', '−0.35', '−0.20', '−0.30', '+0.30', '±0.20', '−0.55', '−0.55', '+0.76', '+0.10', '±0.15'],
      ['45°',  '+0.30', '−0.35', '+0.30', '−0.35', '±0.20', '−0.15', '−0.80', '−0.55', '+0.68', '+0.65', '±0.10'],
      ['90°',  '−0.20', '−0.20', '+0.65', '−0.25', '−0.45', '−0.20', '−0.45', '−0.20', '+0.00', '+0.90', '±0.10'],
    ],
  },

  {
    id: 'anhc_t37',
    title: 'Tab. 37 — Satteldach α = 30°, h:b:d = 2.5:2:1',
    desc: 'shape:satteldach_hoch|Hohes längliches Gebäude mit Satteldach α = 30° (h:b:d = 2.5:2:1). Erhöhte Wanddrücke und Dachsogwerte verglichen mit Tab. 36. D = Dach Luv, E = Dach Lee. ĉpe = −2.0.',
    headers: HDR,
    rows: [
      ['0°',   '+0.80', '−0.70', '−1.10', '−1.10', '−0.80', '−0.80', '−0.55', '−0.55', '+1.30', '+0.00', '−0.55'],
      ['15°',  '+0.60', '−0.55', '−0.90', '−1.00', '−0.75', '−0.80', '−0.55', '−0.65', '+1.00', '+0.10', '−0.50'],
      ['45°',  '+0.40', '−0.55', '+0.50', '−0.80', '−0.45', '−0.65', '−0.70', '−0.80', '+0.86', '+1.30', '−0.10'],
      ['90°',  '−0.60', '−0.60', '+0.85', '−0.30', '−0.90', '−0.30', '−0.90', '−0.30', '+0.00', '+1.15', '−0.20'],
    ],
  },

  {
    id: 'anhc_t38',
    title: 'Tab. 38 — Satteldach α = 30°, h:b:d = 2:2.5:1',
    desc: 'shape:satteldach_hoch|Hohes breites Gebäude mit Satteldach α = 30° (h:b:d = 2:2.5:1). D = Dach Luv (nur Sog), E = Dach Lee (flach, geringer Sog). Bezugsfläche: cf1 für b·h, cf2 für d·h. ĉpe = −2.0.',
    headers: HDR,
    rows: [
      ['0°',   '+0.80', '−0.60', '−0.95', '−0.95', '−0.45', '−0.45', '−0.55', '−0.55', '+1.21', '+0.00', '−0.40'],
      ['15°',  '+0.60', '−0.55', '−0.65', '−0.75', '−0.25', '−0.45', '−0.55', '−0.65', '+1.02', '+0.10', '−0.30'],
      ['45°',  '+0.40', '−0.55', '+0.40', '−0.60', '−0.30', '−0.40', '−0.80', '−0.70', '+0.87', '+1.00', '±0.10'],
      ['90°',  '−0.60', '−0.60', '+0.85', '−0.25', '−0.80', '−0.30', '−0.80', '−0.30', '+0.00', '+1.10', '−0.15'],
    ],
  },

  {
    id: 'anhc_t39',
    title: 'Tab. 39 — Satteldach α = 50°, h:b:d = 2:2:1',
    desc: 'shape:satteldach|Hohes quadratisches Gebäude mit steilem Satteldach α = 50° (h:b:d = 2:2:1). Luvseitige Dachfläche D erhält bei θ=0°/15° Winddruck (+0.50/+0.55) statt Sog! E = Dach Lee (Sog). ĉpe = −2.0.',
    headers: HDR,
    rows: [
      ['0°',   '+0.80', '−0.85', '−0.95', '−0.95', '+0.50', '+0.50', '−0.60', '−0.60', '+1.49', '+0.00', '−0.50'],
      ['15°',  '+0.60', '−0.70', '−0.70', '−0.80', '+0.55', '+0.40', '−0.65', '−0.60', '+1.24', '+0.10', '−0.35'],
      ['45°',  '+0.35', '−0.65', '+0.30', '−0.60', '+0.30', '±0.10', '−0.60', '−0.60', '+0.94', '+0.90', '±0.10'],
      ['90°',  '−0.55', '−0.55', '+0.85', '−0.25', '−0.70', '−0.30', '−0.70', '−0.30', '+0.00', '+1.10', '−0.30'],
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PULTDACH (Tab. 40)
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'anhc_t40',
    title: 'Tab. 40 — Pultdach α = 30°, h:b:d = 1:4:1',
    desc: 'shape:pultdach|Pultdach α = 30°, schlank (h:b:d = 1:4:1). θ=0° = Wind von hoher Seite, θ=180° = Wind von niedriger Seite. D-H = Dachflächen. cf1/cf2 können negativ sein (Windsog überwiegt). ĉpe = −2.0.',
    headers: HDR,
    rows: [
      ['0° (hoch)',    '+0.80', '−0.70', '−0.80', '−0.80', '−0.65', '−0.65', '−0.75', '−0.75', '+1.50', '+0.00', '−0.20'],
      ['45°',          '+0.40', '−0.40', '±0.10', '−0.40', '−1.15', '−0.60', '−0.55', '−0.65', '+0.99', '+0.50', '±0.10'],
      ['90°',          '+0.55', '−0.25', '+0.65', '−0.20', '−0.20', '−0.80', '−0.30', '−0.55', '−0.18', '+0.85', '±0.10'],
      ['180° (nieder)', '−0.50', '+0.60', '−0.55', '−0.55', '−0.15', '−0.15', '+0.35', '+0.35', '−0.81', '+0.00', '±0.10'],
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // STEILE SATTELDÄCHER (Tab. 41)
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'anhc_t41',
    title: 'Tab. 41 — Satteldach α = 60° / 30°, h:b:d = 1.5:4:1',
    desc: 'shape:satteldach|Kombiniertes Dach mit Neigungen 60° und 30°, schlank (h:b:d = 1.5:4:1). D = Luv-Dach, E = Lee-Dach. Bei α=60°: Luvseitige Dachfläche erhält Winddruck (+0.50). cpi-Werte erhöht durch Gebäudegeometrie. ĉpe = −2.0.',
    headers: HDR,
    rows: [
      ['0°',    '+0.80', '−0.70', '−0.80', '−0.80', '+0.50', '+0.50', '−0.70', '−0.70', '+1.41', '+0.00', '+1.00/−0.20'],
      ['15°',   '+0.50', '−0.55', '−0.70', '−0.80', '+0.50', '+0.40', '−0.80', '−0.80', '+1.11', '+0.10', '−0.30'],
      ['45°',   '+0.30', '−0.60', '+0.20', '−0.40', '+0.30', '−0.20', '−0.80', '−0.80', '+0.89', '+0.60', '±0.10'],
      ['90°',   '−0.55', '−0.55', '+0.65', '−0.20', '−0.20', '−0.20', '−0.20', '−0.20', '+0.00', '+0.85', '±0.20'],
      ['180°',  '−0.85', '+0.60', '−0.60', '−0.60', '−0.70', '−0.70', '±0.20', '±0.20', '−1.29', '+0.00', '−0.25'],
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SHEDDACH-REIHEN (Tab. 42–43)
  // cf1/cf2 nicht im Excel vorhanden (projektspezifisch)
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'anhc_t42',
    title: 'Tab. 42 — Sheddach-Reihe h:b:d = 2:7:6',
    desc: 'shape:satteldach|Sägeförmiges Sheddach, 2-reihig (h:b:d = 2:7:6), Dachneigung gemäss Figur. Zonen D–H = Dachflächen der Einzelfelder. Keine globalen Kraftbeiwerte cf (projektspezifisch). ĉpe = −2.0, cfr = 0.03.',
    headers: HDR,
    rows: [
      ['0°',    '+0.80', '−0.30', '−0.30', '−0.30', '+0.50', '−0.60', '−0.30', '−0.30', '—', '—', '—'],
      ['45°',   '+0.30', '−0.30', '+0.30', '−0.30', '+0.30', '−0.70', '−0.40', '−0.20', '—', '—', '—'],
      ['90°',   '−0.20', '−0.20', '+0.85', '−0.30', '−0.50', '−0.40', '−0.40', '−0.40', '—', '—', '—'],
      ['180°',  '−0.30', '+0.80', '−0.30', '−0.30', '−0.30', '−0.30', '−0.30', '−0.30', '—', '—', '—'],
    ],
  },

  {
    id: 'anhc_t43',
    title: 'Tab. 43 — Sheddach-Reihe h:b:d = 1:20:10',
    desc: 'shape:satteldach|Sägeförmiges Sheddach, mehrreihig (h:b:d = 1:20:10), flache Neigung gemäss Figur. Winkel 22.5° statt 15°. Keine globalen cf-Werte. ĉpe = −2.0, cfr = 0.03.',
    headers: HDR,
    rows: [
      ['0°',     '+0.80', '−0.40', '−0.30', '−0.30', '+0.30', '−0.50', '−0.50', '−0.60', '—', '—', '—'],
      ['22.5°',  '+0.30', '−0.50', '−0.10', '−0.40', '−0.70', '−0.80', '−0.70', '−0.40', '—', '—', '—'],
      ['45°',    '+0.10', '−0.60', '+0.25', '−0.50', '−0.70', '−0.70', '−0.60', '−0.40', '—', '—', '—'],
      ['90°',    '−0.20', '−0.20', '+0.85', '−0.40', '−0.15', '−0.20', '−0.30', '−0.20', '—', '—', '—'],
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SONDERBAUFORMEN (Tab. 44–45)
  // cf1/cf2 nicht im Excel vorhanden
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'anhc_t44',
    title: 'Tab. 44 — Gebrochenes Dach α = 30°, h:b:d = 2:6:5',
    desc: 'shape:satteldach|Gebrochenes Dach (Mansarddach o.ä.) α = 30°, h:b:d = 2:6:5. D = obere/luvs. Dachfläche, E = untere Dachfläche. Keine globalen cf-Werte. ĉpe = −2.0.',
    headers: HDR,
    rows: [
      ['0°',   '+0.80', '−0.25', '−0.30', '−0.30', '−0.70', '−0.70', '−0.20', '−0.20', '—', '—', '—'],
      ['15°',  '+0.50', '−0.25', '−0.15', '−0.35', '−0.70', '−0.70', '−0.20', '−0.20', '—', '—', '—'],
      ['45°',  '+0.30', '−0.30', '+0.30', '−0.30', '−0.40', '−0.35', '−0.35', '−0.30', '—', '—', '—'],
      ['90°',  '−0.30', '−0.30', '+0.80', '−0.25', '−0.70', '−0.20', '−0.70', '−0.20', '—', '—', '—'],
    ],
  },

  {
    id: 'anhc_t45',
    title: 'Tab. 45 — Dach mit Dachlüftung α = 30°, h:b:d = 2:7:4',
    desc: 'shape:satteldach|Dach mit Dachlüftungsöffnung α = 30°, h:b:d = 2:7:4. F-Wert bei θ=0°/15° positiv (+0.40): Lüftungsöffnung erzeugt lokalen Überdruck am Dach. Keine globalen cf-Werte. ĉpe = −2.0.',
    headers: HDR,
    rows: [
      ['0°',   '+0.80', '−0.40', '−0.60', '−0.60', '−0.20', '+0.40', '−0.70', '−0.50', '—', '—', '—'],
      ['15°',  '+0.50', '−0.35', '−0.50', '−0.55', '−0.20', '+0.40', '−0.70', '−0.50', '—', '—', '—'],
      ['45°',  '+0.40', '−0.50', '+0.50', '−0.40', '−0.30', '+0.20', '−0.90', '−0.90', '—', '—', '—'],
      ['90°',  '−0.50', '−0.50', '+0.80', '−0.40', '−0.50', '−0.30', '−0.40', '−0.40', '—', '—', '—'],
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // GELÄNDEKATEGORIEN (Tab. 4 SIA 261) — Referenztabelle
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'anhc_gk',
    title: 'Tab. 4 — Geländekategorien (SIA 261 §6.2.1)',
    desc: 'shape:none|Geländekategorien nach SIA 261 Tab. 4. Bestimmen Gradientenhöhe zg und Bodenrauigkeitsexponent αr für die Berechnung des Profilbeiwertes ch = 1.6·(z/zg)^(2αr) + 0.375.',
    headers: ['GK', 'Beschreibung / Beispiele', 'zg [m]', 'αr [−]', 'z_min [m]'],
    rows: [
      ['II',  'Seeufer, offshore, offenes flaches Gelände', '300', '0.16', '5'],
      ['IIa', 'Grosse Ebene, landwirtschaftliches Flachland', '380', '0.19', '5'],
      ['III', 'Ortschaften, freies Feld mit Hecken und Bäumen', '450', '0.23', '5'],
      ['IV',  'Grossflächige Stadtgebiete, dichte Bebauung', '526', '0.30', '10'],
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // LOKALE MAXIMALDRUCK-BEIWERTE ĉpe
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'anhc_cpe_lokal',
    title: 'Lokale Maximaldrücke ĉpe — Anhang C SIA 261',
    desc: 'shape:none|Lokale Maximalsogwerte an Gebäudekanten und Ecken (ĉpe). Massgebend für die Bemessung von Fassadenverankerungen, Glasscheiben, Dacheindeckung und Attiken. Nicht mit globalen Kraftbeiwerten überlagern.',
    headers: ['Gebäudeform / Bereich', 'ĉpe lokal', 'Massgebende Zone', 'Anmerkung'],
    rows: [
      ['Alle Gebäude (Tab. 31–45)', '−2.0', 'Kantenbereich A–H', 'Standardwert ĉpe für alle Tabellen 31–45'],
      ['Flachdach (Tab. 31/32) — Traufkante', '−2.0', 'Zonen E, F (Ecken)', 'Höchster Sog an der luvs. Traufkante'],
      ['Satteldach 10°, Firstbereich', '−2.0', 'Zone m, n', 'Hohe Sogspitzen am First'],
      ['Satteldach 30°, Traufe/First', '−2.0', 'Zonen m, n', 'Luvseitige Randstreifen'],
      ['Satteldach 50°, Grat/Traufe', '−2.0', 'Randzone', 'Gleichmässig hoher Sog'],
      ['Pultdach α=30°, Kanten', '−2.0', 'Alle Zonen', 'Kanten- und Eckbereiche'],
      ['Sheddach, Firstbereich', '−2.0', 'Dachkanten', 'Höhenzuschlag cfr = 0.03'],
      ['Tab. 42/43: Randkorrekturfaktor', 'cfr = 0.03', '—', 'Firstbeiwert für Sheddach-Reihen'],
    ],
  },
];

// Bestehende Tabellen löschen und neu einfügen
db.prepare("DELETE FROM db_tables WHERE id LIKE 'anhc_t%' OR id LIKE 'anhc_cpe%' OR id = 'anhc_gk'").run();

const tx = db.transaction(() => {
  for (const t of tables) {
    iT.run(t.id, 'sia261', 'Wind Anh. C', t.title, t.desc,
      JSON.stringify(t.headers), JSON.stringify(t.rows));
  }
});
tx();
console.log(`✓ ${tables.length} Anhang-C-Tabellen (Tab. 31–45 + GK + ĉpe) eingefügt`);
