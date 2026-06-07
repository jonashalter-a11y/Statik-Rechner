# SIA 265/261 Holzbau Rechner

Interaktiver Statik-Rechner für Schweizer Baunormen. Unterstützt SIA 265 (Holzbau) und SIA 261 (Einwirkungen auf Tragwerke) mit automatischer Berechnungsformel-Auswertung, Anhang-C-Windtabellen und PDF-Export.

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
- **Node-Editor zum Erstellen von Nachweisen** (React Flow): Blöcke per Drag &
  Verbindungen statt Formular — Variabel, Dropdown, Tabellenwert, Rechnung,
  Std-Berechnung, Tabellenberechnung, Bedingung, PDF-Ausgabe
- Admin-UI zum Bearbeiten von Kapiteln, Tabellen und (als Graph) Verifikationen

---

## Starten

```bash
# Terminal 1 – Backend (Port 3002)
cd server
PORT=3002 node index.js

# Terminal 2 – Frontend (Port 5173)
npm run dev
```

Browser: **http://localhost:5173**

---

## Datenbank neu aufbauen

Notwendig nach Änderungen an `server/db.js`, `server/seed-*.js` oder `server/seed-anhangc-full.js`:

```bash
rm -f server/sia265.db server/sia265.db-wal server/sia265.db-shm
node server/db.js                  # Schema + SIA 265 + SIA 261
node server/seed-anhangc-full.js   # Windtabellen Anhang C
```

---

## Stack

| Schicht | Technologie |
|---------|-------------|
| Backend | Node.js, Express 5, CommonJS |
| Datenbank | SQLite (`better-sqlite3`) — `server/sia265.db` |
| Frontend | React 18, TypeScript, Vite |
| State | Zustand |
| Formeln | KaTeX (Rendering), `new Function()` (Auswertung) |
| Export | jsPDF, html2canvas |

---

## Projektstruktur

```
server/
  index.js              API-Endpunkte (Express)
  db.js                 Schema + Auto-Seed beim ersten Start
  seed-chapters.js      SIA 265 Kapitel (138 Stück)
  seed-sia261.js        SIA 261 Kapitel + Verifikationen (90 Kap., 6 Nachweise)
  seed-anhangc-full.js  Anhang-C-Windtabellen Tab. 31–45 (Excel-verifiziert)
  sia265.db             SQLite-Datenbankdatei

src/
  App.tsx               Layout, Norm-Wechsel-Logik, Resizable Columns
  store/useStore.ts     Zustand-Store (normId, chapters, verifications, Cache)
  components/
    Header.tsx          Norm-Switcher, Holzart/Klasse
    LeftSidebar.tsx     Inhaltsverzeichnis + Statistik
    VerificationPanel.tsx  Hülle: Titel + Graph-Ansicht + Kommentar
    GraphVerificationView.tsx  Rendert Nachweis-Graph als Eingabemaske (Live-Eval)
    PrintPanel.tsx      Ausdruckprotokoll, PDF-Export (graph + legacy)
    BuildingShape.tsx   SVG-Gebäudeskizzen
    admin/              Backend-UI (Kapitel/Tabellen-Editor)
      graph/            Node-Editor (React Flow): GraphEditor, BlockNodes, graphContext
  utils/
    evalFormula.ts      JavaScript-Formel-Evaluator (new Function)
    evalGraph.ts        Graph-Auswertung (topo-sort, Blocktypen)
    legacyToGraph.ts    Adapter: alte Nachweise → Graph (getGraph)
  types/
    index.ts            TypeScript-Interfaces
    graph.ts            Graph-/Block-Datentypen
```

---

## API-Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| GET | `/api/chapters?norm=sia261` | Kapitelstruktur einer Norm |
| GET | `/api/verifications?norm=sia261` | Nachweise mit Variablen und Formeln |
| GET | `/api/db-tables?norm=sia261` | Referenztabellen (Wind, Schnee, …) |
| GET | `/api/db-tables/:id` | Einzelne Tabelle |
| GET | `/api/wood-types` | Holzarten |
| GET | `/api/wood-classes` | Holzklassen mit Materialkennwerten |

---

## Berechnungsformeln

### Schneelast — SIA 261 §5.2 Gl. 9/10
```
sk(h₀) = 0.4 · [1 + (h₀ / 350)²]   ≥ 0.9 kN/m²
qk = μ₁ · Ce · CT · sk
```
- h₀ = Bezugshöhe über Meer inkl. Höhenzuschlag aus Karte Anhang D (m)
- μ₁ = Dachformbeiwert (0.80 für α ≤ 30°, linear → 0 bis α = 60°)

### Windlast — SIA 261 §6.2.1 Gl. 11/12
```
ch = 1.6 · (z / zg)^(2·αr) + 0.375
qp = ch · qp0
```
Geländekategorien (Tab. 4): GK II → zg=300/αr=0.16, IIa → 380/0.19, III → 450/0.23, IV → 526/0.30

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

## Anhang-C-Windtabellen (Tab. 31–45)

Alle Tabellen aus `Schneelast_Windlast.xlsm` verifiziert. Nur Tabellen mit Flag=True enthalten (Tab. 46–49 offene Gebäude ausgelassen).

| Tabelle | Gebäudeform | h:b:d |
|---------|-------------|-------|
| Tab. 31 | Flachdach | ≤ 0.3:1:1 |
| Tab. 32 | Flachdach | 1:1:1 |
| Tab. 33 | Satteldach 10° | 1:1:1 |
| Tab. 34 | Satteldach 10° | 2.5:1:1 |
| Tab. 35 | Satteldach 10° | 1.5:2:1 |
| Tab. 36 | Satteldach 30° | 0.5:2:1 |
| Tab. 37 | Satteldach 30° | 2.5:2:1 |
| Tab. 38 | Satteldach 30° | 2:2.5:1 |
| Tab. 39 | Satteldach 50° | 2:2:1 |
| Tab. 40 | Pultdach 30° | 1:4:1 |
| Tab. 41 | Satteldach 60°/30° | 1.5:4:1 |
| Tab. 42 | Sheddach-Reihe | 2:7:6 |
| Tab. 43 | Sheddach-Reihe | 1:20:10 |
| Tab. 44 | Gebrochenes Dach 30° | 2:6:5 |
| Tab. 45 | Dach mit Dachlüftung 30° | 2:7:4 |

Spaltenbedeutung: A=Luv Wand, B=Lee Wand, C=Seite, D-H=Dachzonen, cf1=Kraftbeiwert b·h, cf2=Kraftbeiwert d·h

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
| v2.2 | Schneelast-Formel korrigiert (`h₀/350)²`), Wind-Geländekategorie als Einzel-Dropdown, Tabellen 31–45 Excel-verifiziert, Tabs 46–49 entfernt, neuer `wind_druck_lokal`-Nachweis |
| v3.0 | **Node-Editor (React Flow)** für die Nachweis-Erstellung: Block-/Graph-System (`graph_json`) mit 8 Block-Typen, Workflow-/Bedingungs-Kanten, Live-Auswertung (`evalGraph`), Legacy-Adapter für bestehende Nachweise, Graph-Ausgabe im PDF-Protokoll |
