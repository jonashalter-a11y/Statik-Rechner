# SIA 265/261 Holzbau Rechner

Interaktiver Statik-Rechner für Schweizer Baunormen. Unterstützt **SIA 265 (Holzbau)** und **SIA 261 (Einwirkungen auf Tragwerke)** mit automatischer Berechnungsformel-Auswertung, Anhang-C-Windtabellen und PDF-Export.

---

## Features

**SIA 265:2021 — Holzbau**
- 138 Kapitel, 13 Nachweise (Biegung, Schub, Knicken, Kippen, Torsion, Querzug)
- Automatische Materialkennwert-Einfüllung nach Holzart und Holzklasse (C24, GL24h, …)
- η-Berechnung (Ausnutzungsgrad) mit Pass/Fail-Anzeige

**SIA 261:2020 — Einwirkungen**
- Schneelast: `qk = μ₁ · Ce · CT · sk(h₀)` — korrekte Formel mit `sk = 0.4 · [1 + (h₀/350)²]`
- Windlast: Staudruck `qp = ch · qp0` mit Geländekategorie (GK II–IV)
- Lokaler Winddruck `qk = (cpe − cpi) · qp · cd`
- Globale Windkraft `Qk = cred · cd · cf · qp · Aref`
- Nutzlasten (Tab. 8), aktiver Erddruck
- Anhang C: Windtabellen Tab. 31–45 mit Druck- und Kraftbeiwerten (Excel-verifiziert)

**Allgemein**
- Dual-Norm-Switcher (SIA 265 | SIA 261 | EC5 vorbereitet)
- Resizable Columns (Sidebar, Nachweis-Panel, Ausdruckprotokoll)
- PDF-Export (jsPDF + html2canvas)
- SVG-Gebäudeskizzen für 6 Grundformen (Flachdach, Satteldach, Pultdach)
- **Node-Editor zum Erstellen von Nachweisen** (React Flow): Blöcke per Drag & Drop + Kanten statt Formular
- Admin-UI zum Bearbeiten von Kapiteln, Tabellen und Verifikationen

---

## Quick Start

```bash
# Terminal 1 – Backend (Port 3002)
cd server
PORT=3002 node index.js

# Terminal 2 – Frontend (Port 5173)
npm run dev
```

Browser: **http://localhost:5173**

---

## Architektur

### Stack
| Schicht | Technologie |
|---------|-------------|
| Backend | Node.js, Express 5, CommonJS |
| Datenbank | SQLite (`better-sqlite3`) |
| Frontend | React 18, TypeScript, Vite |
| State | Zustand |
| Editor | React Flow (Node-Editor) |
| Formeln | KaTeX (Rendering), `new Function()` (Auswertung) |
| Export | jsPDF, html2canvas |

### Datenspeicher: JSON-basierte Verifikationen
**Verifikationen werden NICHT in der DB persistent gespeichert**, sondern als JSON-Objekte verwaltet:

1. **Admin erstellt Nachweis** im Node-Editor (Block-Graph mit 8 Block-Typen)
2. **Export → JSON** oder direkter **JSON-Import** im Admin-UI
3. **Speicherung in `verifications` Tabelle** mit `graph_json`-Spalte
4. **Beim API-Abruf** (`/api/verifications`) werden alle Einträge ausgegeben

**Kapitel und Referenztabellen** (Anhang C) bleiben in der DB.

### Block-Typen (Node-Editor)
`variable` 🟪 · `dropdown` 🟧 · `tablevalue` 🟩 · `calc` 🟥 · `stdcalc` 🟫 · `tablecalc` 🟦 · `condition` 🔶 · `output` ⬜

Kanten: `workflow` (Standard) und `condition` (bedingte Ausführung)

### Dual-Norm-System
Der Norm-Switcher im Header schaltet zwischen SIA 265 und SIA 261:
- `setNormId(id)` → Kapitelbaum aus Cache
- `loadNormData(id)` → frischer API-Abruf (Kapitel + Verifikationen)
- Verifikationen pro Norm gecacht in `_verifsByNorm`

---

## Datenbank

### Neu aufbauen

Nach Änderungen an `db.js` oder `seed-anhangc-full.js`:

```bash
rm -f server/sia265.db server/sia265.db-wal server/sia265.db-shm
node server/db.js                  # Schema + Kapitel-Seeds
node server/seed-anhangc-full.js   # Windtabellen Anhang C (Tab. 31–45)
```

`db.js` seedet nur beim ersten Start (wenn DB leer: `chapCount === 0`).

### Schema (wichtigste Tabellen)
```
chapters        id, norm_id, parent_id, number, title, sort_order
verifications   id, norm_id, chapter_id, title, formula_latex, formula_description, graph_json, active
db_tables       id, norm_id, category, title, description, headers(JSON), rows(JSON)
```

**Legacy-Spalten** (`variables`, `variable_options`, `compute_expr`):
- Alt-Nachweise rendern weiterhin via Adapter in `legacyToGraph.ts`
- Neue Verifikationen speichern alles in `graph_json`

---

## Nachweise erstellen

### Workflow

1. **Admin-UI öffnen** → Nachweise → **Neuer Nachweis**
2. **Node-Editor**: Blöcke aus Palette ziehen → mit Workflow-Kanten verbinden
3. **Speichern** → JSON-Export oder direkt in DB importieren
4. **JSON-Import**: Admin → Nachweise → **JSON importieren** → Norm + Kapitel wählen

### JSON-Format
```json
{
  "id": "eindeutiger_snake_case_name",
  "title": "Nachweis-Titel (Gl.-Nr.)",
  "formula_latex": "\\eta = ...",
  "formula_description": "Beschreibung der Formel",
  "graph_json": {
    "version": 1,
    "nodes": [
      { "id": "n1", "type": "variable", "position": [0,0], "data": { "name": "var1", "label": "..." } },
      { "id": "n2", "type": "calc", "position": [200,0], "data": { "formula": "..." } }
    ],
    "edges": [
      { "id": "e1", "source": "n1", "target": "n2", "type": "workflow" }
    ]
  }
}
```

**Batch-Import**: Array von Verifikationen oder einzelnes Objekt.

---

## API-Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| GET | `/api/chapters?norm=sia261` | Kapitelstruktur einer Norm |
| GET | `/api/verifications?norm=sia261` | Nachweise mit Variablen (graph + legacy) |
| GET | `/api/db-tables?norm=sia261` | Referenztabellen (Wind, Schnee, …) |
| GET | `/api/db-tables/:id` | Einzelne Tabelle |
| GET | `/api/wood-types` | Holzarten |
| GET | `/api/wood-classes` | Holzklassen mit Materialkennwerten |

---

## Wichtige Berechnungen

### Schneelast — SIA 261 §5.2 Gl. 9/10
```
sk(h₀) = 0.4 · [1 + (h₀ / 350)²]   ≥ 0.9 kN/m²
qk = μ₁ · Ce · CT · sk
```
- h₀ = Bezugshöhe über Meer inkl. Höhenzuschlag aus Karte Anhang D (m)
- μ₁ = Dachformbeiwert (0.80 für α ≤ 30°, linear → 0 bis α = 60°)

**⚠️ Häufiger Fehler:** `(1 + h₀*h₀/350)` statt `(1 + Math.pow(h₀/350, 2))` dividiert falsch.

### Windlast — SIA 261 §6.2.1 Gl. 11/12
```
ch = 1.6 · (z / zg)^(2·αr) + 0.375
qp = ch · qp0
```

Geländekategorien (Tab. 4):
- GK II → zg=300, αr=0.16, zmin=5
- GK IIa → zg=380, αr=0.19, zmin=5
- GK III → zg=450, αr=0.23, zmin=5
- GK IV → zg=526, αr=0.30, zmin=10

### Lokaler Winddruck — SIA 261 §6.2.2
```
qk = (cpe − cpi) · qp · cd
```
cpe-Werte aus Anhang C Tab. 31–45 (nach Gebäudeform h:b:d und Windwinkel θ)

### Globale Windkraft — SIA 261 §6.2.3 Gl. 15
```
Qk = cred · cd · cf · qp · Aref
```

---

## Projektstruktur

```
server/
  index.js              API-Endpunkte (Express)
  db.js                 Schema + Kapitel-Seed
  seed-chapters.js      SIA 265 Kapitel (138)
  seed-sia261.js        SIA 261 Kapitel (90)
  seed-anhangc-full.js  Windtabellen Anhang C (Excel-verifiziert)
  sia265.db             SQLite

src/
  App.tsx               Layout, Norm-Switcher, Resizable Columns
  store/useStore.ts     Zustand (normId, chapters, verifications, Cache)
  components/
    Header.tsx          Norm-Switcher, Holzart/Klasse
    LeftSidebar.tsx     Inhaltsverzeichnis
    VerificationPanel.tsx  Nachweis-Hülle
    GraphVerificationView.tsx  Rendert Nachweis als Eingabemaske + Live-Eval
    PrintPanel.tsx      PDF-Export
    BuildingShape.tsx   SVG-Gebäudeskizzen
    admin/              Admin-UI
      graph/            Node-Editor (React Flow)
  utils/
    evalFormula.ts      JavaScript-Formel-Evaluator
    evalGraph.ts        Graph-Auswertung (topo-sort, Blocktypen)
    legacyToGraph.ts    Adapter: Alt-Nachweise → Graph
  types/
    graph.ts            Block-/Graph-Typen
```

---

## Anhang-C-Windtabellen (Tab. 31–45)

Alle Tabellen aus `Schneelast_Windlast.xlsm` verifiziert. Nur Tabellen mit Flag=True enthalten.

| Tabelle | Gebäudeform | h:b:d |
|---------|-------------|-------|
| Tab. 31 | Flachdach | ≤ 0.3:1:1 |
| Tab. 32 | Flachdach | 1:1:1 |
| Tab. 33–35 | Satteldach 10° | verschiedene |
| Tab. 36–38 | Satteldach 30° | verschiedene |
| Tab. 39 | Satteldach 50° | 2:2:1 |
| Tab. 40 | Pultdach 30° | 1:4:1 |
| Tab. 41 | Satteldach 60°/30° | 1.5:4:1 |
| Tab. 42–43 | Sheddach-Reihe | verschiedene |
| Tab. 44 | Gebrochenes Dach 30° | 2:6:5 |
| Tab. 45 | Dach mit Dachlüftung 30° | 2:7:4 |

---

## Offene Punkte / Nächste Schritte

- [ ] **Eurocode 5** — Badge aktiv, Kapitel/Verifikationen noch nicht implementiert
- [ ] **Kombinierte Lastfälle** — Schnee + Wind + Eigengewicht (Bemessungswerte QEd)
- [ ] **Dynamische Beiwert-Auswahl** — cpe aus Tab. 31–45 direkt im Windlast-Nachweis wählbar
- [ ] **Weitere SVG-Gebäudeformen** — Sheddach, offene Gebäude, Zylinder
- [ ] **Temperatur, Erdbeben** — SIA 261 §7 und §16

---

## Version History

| Version | Inhalt |
|---------|--------|
| v1.0 | SIA 265 Basis: 138 Kapitel, 13 Nachweise, Holzklassen, PDF-Export |
| v2.0 | SIA 261 hinzugefügt, Dual-Norm-System, Anhang-C-Windtabellen, SVG-Skizzen |
| v2.1 | 19 Anhang-C-Tabellen, 6 SVG-Formen, Grundberechnungen |
| v2.2 | Schneelast-Formel korrigiert, Wind-Geländekategorie Dropdown, Tab. 31–45 Excel-verifiziert |
| v3.0 | Node-Editor (React Flow) für Nachweis-Erstellung: Block-/Graph-System, Live-Auswertung, Legacy-Adapter |
| v3.1 | **Verifikationen nur noch JSON-basiert** — kein DB-Seeding mehr, Admin-UI mit JSON-Import |
