// Anhang C der SIA 261:2020 — Kraft- und Druckbeiwerte bei Wind
// Tabellen 31–39 für die häufigsten Gebäudeformen
// SVG-Skizzen als ASCII-Beschreibung (werden im Frontend als SVG gerendert)

const db = require('./db');

const iT = db.prepare(
  'INSERT OR REPLACE INTO db_tables (id, norm_id, category, title, description, headers, rows) VALUES (?, ?, ?, ?, ?, ?, ?)'
);

const tables = [
  // ─── Tab. 31: Flachdach, niedriges Gebäude ─────────────────────────────────
  {
    id: 'anhc_tab31',
    norm_id: 'sia261',
    category: 'Wind Anh. C',
    title: 'Tab. 31 — Flachdach, h:b:d ≤ 0.3:1:1',
    description: 'shape:flachdach_niedrig|Globale Kraftbeiwerte cf und lokale Druckbeiwerte cpe für Flachdach bei niedrigen Gebäuden (h/b ≤ 0.3)',
    headers: ['θ [°]', 'A Luv', 'B Lee', 'C Seite', 'D Dach-F', 'E Dach-G', 'F Dach-H', 'cf1', 'cf2', 'Innendr. cpi'],
    rows: [
      ['0°', '+0.70', '−0.25', '−0.35', '−0.35', '−0.50', '−0.50', '0.95', '0', '±0.15 / −0.21'],
      ['15°', '+0.55', '−0.25', '−0.20', '−0.35', '−0.50', '−0.50', '0.80', '0.15', '±0.15'],
      ['45°', '+0.40', '−0.40', '+0.40', '−0.40', '−0.40', '−0.40', '0.80', '0.80', '±0.15'],
      ['90°', '−0.35', '−0.35', '+0.70', '−0.25', '−0.50', '−0.50', '0.95', '0', '±0.15'],
    ],
  },

  // ─── Tab. 32: Flachdach, h:b:d = 1:1:1 ─────────────────────────────────────
  {
    id: 'anhc_tab32',
    norm_id: 'sia261',
    category: 'Wind Anh. C',
    title: 'Tab. 32 — Flachdach, h:b:d = 1:1:1',
    description: 'shape:flachdach_mitte|Globale Kraftbeiwerte cf und lokale Druckbeiwerte cpe für Flachdach bei mittelhohen Gebäuden (h/b = 1)',
    headers: ['θ [°]', 'A Luv', 'B Lee', 'C Seite', 'D Dach-F', 'E Dach-G', 'F Dach-H', 'cf1', 'cf2', 'Innendr. cpi'],
    rows: [
      ['0°', '+0.75', '−0.30', '−0.50', '−0.80', '−0.80', '−0.35', '1.05', '0', '−0.25'],
      ['15°', '+0.60', '−0.35', '−0.60', '−1.20', '−1.00', '−0.35', '0.95', '0.05', '−0.25'],
      ['45°', '+0.35', '−0.45', '+0.35', '−0.45', '−1.05', '−0.60', '0.65', '0.65', '−0.25'],
      ['90°', '−0.25', '−0.25', '+0.65', '−0.65', '−0.70', '−0.65', '1.05', '0', '±0.10'],
    ],
  },

  // ─── Tab. 33: Flachdach, h:b:d = 3:1:1 ─────────────────────────────────────
  {
    id: 'anhc_tab33',
    norm_id: 'sia261',
    category: 'Wind Anh. C',
    title: 'Tab. 33 — Flachdach, h:b:d = 3:1:1',
    description: 'shape:flachdach_hoch|Globale Kraftbeiwerte cf und lokale Druckbeiwerte cpe für Flachdach bei hohen Gebäuden (h/b = 3)',
    headers: ['θ [°]', 'A Luv', 'B Lee', 'C Seite', 'D Dach', 'E Dach-G', 'cf1', 'cf2', 'Innendr. cpi'],
    rows: [
      ['0°', '+0.85', '−0.50', '−0.70', '−0.80', '−0.80', '1.35', '0', '−0.25'],
      ['15°', '+0.75', '−0.50', '−0.70', '−1.00', '−0.90', '1.20', '0.05', '−0.25'],
      ['45°', '+0.45', '−0.55', '+0.45', '−0.55', '−1.20', '0.80', '0.80', '−0.25'],
      ['90°', '−0.30', '−0.30', '+0.80', '−0.80', '−0.80', '1.35', '0', '±0.10'],
    ],
  },

  // ─── Tab. 35: Satteldach, h:b:d = 0.5:1:1, α=10°–30° ──────────────────────
  {
    id: 'anhc_tab35',
    norm_id: 'sia261',
    category: 'Wind Anh. C',
    title: 'Tab. 35/36 — Satteldach α=30°, h:b:d = 0.5:2:1 / 2.5:2:1',
    description: 'shape:satteldach|Druckbeiwerte cpe für Satteldach mit Neigung 30° (luvseitige Dachfläche positiver Druck möglich)',
    headers: ['θ [°]', 'A Luv', 'B Lee', 'D Dach luvs.', 'E Dach lees.', 'F', 'G', 'H', 'cf1', 'cpi glm.'],
    rows: [
      ['0°',  '+0.60', '−0.35', '+0.30 / −0.30', '−0.30', '−0.55', '−0.65', '−0.55', '0.71 / 0.89', '±0.10'],
      ['15°', '+0.35', '−0.35', '+0.30 / −0.20', '−0.30', '−0.55', '−0.85', '−0.60', '0.76', '±0.10'],
      ['45°', '+0.30', '−0.35', '+0.30 / −0.35', '±0.20', '−0.15', '−0.80', '−0.55', '0.68', '±0.10'],
      ['90°', '−0.20', '−0.20', '+0.65 / −0.25', '−0.45', '−0.20', '−1.20', '−0.50', '0.90', '±0.10'],
    ],
  },

  // ─── Tab. 38: Satteldach/Pultdach, h:b:d = 2:2.5:1, α=30° ─────────────────
  {
    id: 'anhc_tab38',
    norm_id: 'sia261',
    category: 'Wind Anh. C',
    title: 'Tab. 38 — Satteldach α=30°, h:b:d = 2:2.5:1 (Hochhaus)',
    description: 'shape:satteldach_hoch|Druckbeiwerte für hohes Gebäude mit Satteldach α=30°. cf1 Bezugsfläche: b·h (0.93·d·b)',
    headers: ['θ [°]', 'A Luv', 'B Lee', 'C Seite', 'D-F Dach', 'cf1', 'cf2', 'cf3', 'cpi glm.'],
    rows: [
      ['0°',  '+0.80', '−0.60', '−0.95', '−0.45 bis −0.65', '1.21', '0',   '−0.50', '±0.10'],
      ['15°', '+0.60', '−0.55', '−0.65', '−0.25 bis −0.65', '1.02', '0.1', '−0.48', '±0.10'],
      ['45°', '+0.40', '−0.55', '+0.40', '−0.30 bis −0.80', '0.87', '1.0', '−0.55', '±0.10'],
      ['90°', '−0.60', '−0.60', '+0.85', '−0.25 bis −1.10', '1.10', '0',   '−0.55', '±0.10'],
    ],
  },

  // ─── Tab. Pultdach 30° ──────────────────────────────────────────────────────
  {
    id: 'anhc_pultdach',
    norm_id: 'sia261',
    category: 'Wind Anh. C',
    title: 'Pultdach α=30°, h:b:d = 1:4:1',
    description: 'shape:pultdach|Druckbeiwerte cpe für Pultdach mit Neigung 30°. Bei θ=0° (Wind auf hohe Seite) kann auf der Dachfläche Druck entstehen.',
    headers: ['θ [°]', 'A Luv', 'B Lee', 'C Seite', 'F Dach', 'G Dach', 'H Dach', 'cf1', 'cpi glm.'],
    rows: [
      ['0°',   '+0.90', '−0.45', '−0.75', '+0.20 / −0.60', '+0.20 / −0.60', '+0.20 / −0.60', '1.05', '±0.10'],
      ['180°', '−0.45', '+0.55', '−0.75', '−0.80', '−0.60', '−0.20', '0.80', '±0.10'],
      ['90°',  '−0.30', '−0.30', '+0.70', '−0.60', '−0.80', '−0.80', '1.00', '±0.10'],
    ],
  },

  // ─── Innendruckbeiwerte cpi ──────────────────────────────────────────────────
  {
    id: 'anhc_cpi',
    norm_id: 'sia261',
    category: 'Wind Anh. C',
    title: 'Innendruckbeiwerte cpi (SIA 261 Anh. C)',
    description: 'shape:none|Innendruckbeiwert cpi in Abhängigkeit der vorherrschenden Undichtheit. Ungünstigsten Wert mit Aussendrücken überlagern.',
    headers: ['Undichtheit vorherrschend auf', 'cpi'],
    rows: [
      ['Luv-Fläche A (Winddruck)',  '+0.15 bis +0.25'],
      ['Lee-Fläche B (Windsog)',    '−0.25 bis −0.45'],
      ['Gleichmässig (ohne Öffnungen)', '±0.10 bis ±0.15'],
      ['Offen auf Luvseite (> 30% offene Fläche)', '+0.70'],
    ],
  },

  // ─── Kraftbeiwerte cf Gesamt ──────────────────────────────────────────────
  {
    id: 'anhc_cf_gesamt',
    norm_id: 'sia261',
    category: 'Wind Anh. C',
    title: 'Kraftbeiwerte cf für Gesamtgebäude (Anh. C)',
    description: 'shape:none|Globale Kraftbeiwerte cf für die Windkraftermittlung nach Gl. 15 (SIA 261 §6.2.3). Bezugsfläche Aref = b·h (Windrichtung ⊥ b).',
    headers: ['Gebäudeform', 'h:b:d', 'Dachneig.', 'cf1 (θ=0°)', 'cf2 (θ=45°)', 'cf3 (θ=90°)'],
    rows: [
      ['Flachdach niedrig', '≤0.3:1:1', '0°', '0.95', '0.80', '0.95'],
      ['Flachdach mittel',  '1:1:1',    '0°', '1.05', '0.65', '1.05'],
      ['Flachdach hoch',   '3:1:1',    '0°', '1.35', '0.80', '1.35'],
      ['Satteldach',       '0.5:2:1', '30°', '0.71', '0.68', '0.90'],
      ['Satteldach hoch',  '2:2.5:1', '30°', '1.21', '0.87', '1.10'],
      ['Pultdach',         '1:4:1',   '30°', '1.05', '—',    '1.00'],
    ],
  },
];

// Eintragen
const tx = db.transaction(() => {
  for (const t of tables) {
    iT.run(t.id, t.norm_id, t.category, t.title, t.description, JSON.stringify(t.headers), JSON.stringify(t.rows));
  }
});
tx();
console.log(`✓ ${tables.length} Anhang-C-Tabellen eingefügt`);
