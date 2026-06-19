# SIA 265/261 Holzbau Rechner

Interaktiver Statik-Rechner für Schweizer Baunormen. Die Anwendung laedt ihre Normen, Kapitel, Tabellen, Holzwerte und Nachweise direkt aus JSON-Dateien.

---

## Inhaltsverzeichnis

1. [Features](#1-features)
2. [Quick Start](#2-quick-start)
3. [Architektur](#3-architektur)
   - 3.1 [Stack](#31-stack)
   - 3.2 [Datenspeicher: JSON-first](#32-datenspeicher-json-first)
   - 3.3 [Block-Typen (Node-Editor)](#33-block-typen-node-editor)
   - 3.4 [Dual-Norm-System](#34-dual-norm-system)
4. [Statischer Betrieb](#4-statischer-betrieb)
5. [Nachweise erstellen](#5-nachweise-erstellen)
   - 5.1 [Workflow](#51-workflow)
   - 5.2 [JSON-Format](#52-json-format)
6. [Lokale API](#6-lokale-api)
7. [Wichtige Berechnungen](#7-wichtige-berechnungen)
   - 7.1 [Schneelast — SIA 261 §5.2 Gl. 9/10](#71-schneelast--sia-261-52-gl-910)
   - 7.2 [Windlast — SIA 261 §6.2.1 Gl. 11/12](#72-windlast--sia-261-621-gl-1112)
   - 7.3 [Lokaler Winddruck — SIA 261 §6.2.2](#73-lokaler-winddruck--sia-261-622)
   - 7.4 [Globale Windkraft — SIA 261 §6.2.3 Gl. 15](#74-globale-windkraft--sia-261-623-gl-15)
8. [Projektstruktur](#8-projektstruktur)
9. [Anhang C: Windtabellen (Tab. 31–45)](#9-anhang-c-windtabellen-tab-3145)
10. [Offene Punkte / Nächste Schritte](#10-offene-punkte--nächste-schritte)
11. [Version History](#11-version-history)

---

## 1. Features

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
- **Manuelle Werteingabe**: Haken im Block-Header erlaubt Überschreiben berechneter Werte (calc, stdcalc, tablecalc, minmax, cases, groupcalc) — Override-Wert wird an downstream Blöcke weitergegeben
- Admin-UI zum Bearbeiten von Kapiteln, Tabellen und Verifikationen

---

## 2. Quick Start

```bash
npm run dev
```

Browser: **http://localhost:5173**

Production-Build:

```bash
npm run build
```

`npm run build` erzeugt das statische Frontend in `dist/`.

---

## 3. Architektur

### 3.1 Stack
| Schicht | Technologie |
|---------|-------------|
| Datenquelle | JSON-Dateien im Repository |
| Frontend | React 18, TypeScript, Vite |
| State | Zustand |
| Editor | React Flow (Node-Editor) |
| Formeln | KaTeX (Rendering), `new Function()` (Auswertung) |
| Export | jsPDF, html2canvas |

### 3.2 Datenspeicher: JSON-first
Die dauerhafte Quelle sind JSON-Dateien:

- `data/norms.json`: Normen und Navigation
- `data/units.json`: globale Einheiten
- `data/wood.json`: Holzarten, Holzklassen und Materialwerte
- `data/chapters/<norm>.json`: Kapitel pro Norm
- `data/tables/<norm>.json`: Tabellen und Diagramm-Daten pro Norm
- `nachweise/<norm>/*.json`: Nachweise inklusive Block-Graph

Das Frontend laedt diese Dateien ueber `src/api.ts` direkt mit Vite.

Wichtig: Ein statisches Browser-Frontend kann nicht direkt in Projektdateien schreiben. Aenderungen im Admin werden deshalb im Browser-`localStorage` gehalten. Dauerhafte Aenderungen an Nachweisen machst du ueber JSON-Export/Import oder indem du die passende JSON-Datei im Repository ersetzt.

### 3.3 Block-Typen (Node-Editor)
`variable` 🟪 · `dropdown` 🟧 · `tablevalue` 🟩 · `calc` 🟥 · `stdcalc` 🟫 · `tablecalc` 🟦 · `condition` 🔶 · `output` ⬜

Kanten: `workflow` (Standard) und `condition` (bedingte Ausführung)

### 3.4 Dual-Norm-System
Der Norm-Switcher im Header schaltet zwischen SIA 265 und SIA 261:
- `setNormId(id)` → Kapitelbaum aus Cache
- `loadNormData(id)` → Laden aus JSON-API (Kapitel + Verifikationen)
- Verifikationen pro Norm gecacht in `_verifsByNorm`

---

## 4. Statischer Betrieb

Die App laeuft nur noch ueber Vite und liest lokale JSON-Dateien. Die Quelle der Wahrheit sind `data/` und `nachweise/`.

---

## 5. Nachweise erstellen

### 5.1 Workflow

1. **Admin-UI öffnen** → Nachweise → **Neuer Nachweis**
2. **Node-Editor**: Blöcke aus Palette ziehen → mit Workflow-Kanten verbinden
3. **Speichern** → bleibt lokal im Browser erhalten
4. **Export** → Nachweis als JSON sichern
5. **JSON-Import**: Admin → Nachweise → **JSON importieren** → Norm + Kapitel wählen

Wenn ein Nachweis dauerhaft in der App enthalten sein soll, lege die exportierte Datei unter `nachweise/<norm>/<id>.json` ab.

### 5.2 JSON-Format
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

**Import**: einzelnes Objekt oder Array von Nachweisen.

---

## 6. Lokale API

`src/api.ts` stellt zentrale Funktionen fuer die lokalen JSON-Daten bereit, zum Beispiel:

- `api.getNorms()`
- `api.getChapters(norm)`
- `api.getVerifications(norm)`
- `api.getTables(norm)`
- `api.getTableFull(id)`
- `api.getWoodTypes()`
- `api.getWoodClasses()`
- `api.getUnits()`

Diese Funktionen lesen aber direkt aus den JSON-Dateien und speichern Bearbeitungen lokal im Browser.

---

## 7. Wichtige Berechnungen

### 7.1 Schneelast — SIA 261 §5.2 Gl. 9/10
```
sk(h₀) = 0.4 · [1 + (h₀ / 350)²]   ≥ 0.9 kN/m²
qk = μ₁ · Ce · CT · sk
```
- h₀ = Bezugshöhe über Meer inkl. Höhenzuschlag aus Karte Anhang D (m)
- μ₁ = Dachformbeiwert (0.80 für α ≤ 30°, linear → 0 bis α = 60°)

**⚠️ Häufiger Fehler:** `(1 + h₀*h₀/350)` statt `(1 + Math.pow(h₀/350, 2))` dividiert falsch.

### 7.2 Windlast — SIA 261 §6.2.1 Gl. 11/12
```
ch = 1.6 · (z / zg)^(2·αr) + 0.375
qp = ch · qp0
```

Geländekategorien (Tab. 4):
- GK II → zg=300, αr=0.16, zmin=5
- GK IIa → zg=380, αr=0.19, zmin=5
- GK III → zg=450, αr=0.23, zmin=5
- GK IV → zg=526, αr=0.30, zmin=10

### 7.3 Lokaler Winddruck — SIA 261 §6.2.2
```
qk = (cpe − cpi) · qp · cd
```
cpe-Werte aus Anhang C Tab. 31–45 (nach Gebäudeform h:b:d und Windwinkel θ)

### 7.4 Globale Windkraft — SIA 261 §6.2.3 Gl. 15
```
Qk = cred · cd · cf · qp · Aref
```

---

## 8. Projektstruktur

```
data/
  norms.json
  units.json
  wood.json
  chapters/<norm>.json
  tables/<norm>.json

nachweise/<norm>/*.json

src/
  api.ts                Lokale JSON-Datenschicht
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

## 9. Anhang C: Windtabellen (Tab. 31–45)

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

## 10. Offene Punkte / Nächste Schritte

- [ ] **Eurocode 5** — Badge aktiv, Kapitel/Verifikationen noch nicht implementiert
- [ ] **Kombinierte Lastfälle** — Schnee + Wind + Eigengewicht (Bemessungswerte QEd)
- [ ] **Dynamische Beiwert-Auswahl** — cpe aus Tab. 31–45 direkt im Windlast-Nachweis wählbar
- [ ] **Weitere SVG-Gebäudeformen** — Sheddach, offene Gebäude, Zylinder
- [ ] **Temperatur, Erdbeben** — SIA 261 §7 und §16

---

## 11. Version History

| Version | Inhalt |
|---------|--------|
| v1.0 | SIA 265 Basis: 138 Kapitel, 13 Nachweise, Holzklassen, PDF-Export |
| v2.0 | SIA 261 hinzugefügt, Dual-Norm-System, Anhang-C-Windtabellen, SVG-Skizzen |
| v2.1 | 19 Anhang-C-Tabellen, 6 SVG-Formen, Grundberechnungen |
| v2.2 | Schneelast-Formel korrigiert, Wind-Geländekategorie Dropdown, Tab. 31–45 Excel-verifiziert |
| v3.0 | Node-Editor (React Flow) für Nachweis-Erstellung: Block-/Graph-System, Live-Auswertung, Legacy-Adapter |
| v3.1 | **Verifikationen JSON-basiert**, Admin-UI mit JSON-Import |
| v3.2 | **Override-Toggle für Rechenblöcke**: Manuelle Werteingabe im Frontend, propagiert an downstream Blöcke |
