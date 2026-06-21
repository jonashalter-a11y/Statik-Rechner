# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## README aktuell halten

**Nach jeder Änderung die eine dieser Kategorien betrifft, README.md aktualisieren:**
- Neue Verifikationen oder Berechnungen
- Neue Tabellen (Anhang C, Norm-Daten)
- Geänderte API-Endpunkte
- Neue Komponenten oder Features
- Versionsnummer (Abschnitt "Version History" im README)

---

## Entwicklungsumgebung starten

```bash
npm run dev          # http://localhost:5173
```

Die App laeuft statisch ueber Vite und lokale JSON-Daten.

### Frontend bauen
```bash
npm run build   # TypeScript check + Vite bundle → dist/
```

---

## Architektur

### Stack
- **Datenquelle**: JSON-Dateien in `data/` und `nachweise/`
- **Frontend**: React 18 + TypeScript + Vite (`src/`)
- **State**: Zustand (`src/store/useStore.ts`)
- **Formeln**: KaTeX für LaTeX-Rendering, `evalFormula.ts` für Auswertung

### Dual-Norm-System
Der Norm-Switcher im Header schaltet zwischen `sia265` und `sia261`. Beim Wechsel:
1. `setNormId(id)` → baut sofort den Kapitelbaum aus dem Cache
2. `loadNormData(id)` → lädt Kapitel + Verifikationen aus der lokalen JSON-API

Verifikationen werden pro Norm gecacht in `_verifsByNorm: Record<string, Verification[]>`.

### Verifikations-Architektur: JSON-Dateien
**Verifikationen werden als JSON-Dateien verwaltet**:
- Admin erstellt Nachweis im Node-Editor (Block-Graph)
- Export → JSON-Datei oder JSON-Import in Admin-UI
- Admin-Aenderungen landen im Browser-`localStorage`
- Dauerhafte Nachweise liegen unter `nachweise/<norm>/*.json`
- Kapitel und Referenztabellen liegen unter `data/chapters/` und `data/tables/`

### Berechnungsformel-Pipeline
1. Formel im Nachweis-Graph oder Legacy-`compute_expr` = JavaScript-String (darf `Math.*` verwenden)
2. `evalFormula(expr, vars)` → `new Function(...varNames, expr)` 
3. SIA 265: Ergebnis ist η (≤ 1.0 = bestanden)
4. SIA 261: Ergebnis ist kN/m² oder kN (kein η-Vergleich)

Variablen vom Typ `dropdown` speichern den Wert als String (z.B. `'III'` für Geländekategorie), der compute_expr muss das intern auflösen.

### JSON-Struktur
- `data/norms.json` → Normen und Navigation
- `data/chapters/<norm>.json` → Kapitelbaum pro Norm
- `data/tables/<norm>.json` → Tabellen und Diagramm-Daten pro Norm
- `data/wood.json` → Holzarten, Holzklassen und Materialwerte
- `data/units.json` → Einheiten
- `nachweise/<norm>/*.json` → Nachweise mit `graph_json`

**Anmerkung:** `variables` und `compute_expr` sind Legacy — neue Verifikationen speichern alles in `graph_json` (Blöcke + Kanten). Alte `compute_expr`-Nachweise rendern noch via Adapter in `legacyToGraph.ts`.

### Node-Editor / Block-System (Nachweis-Erstellung)
Neue Nachweise werden als **Graph aus Blöcken** gebaut (React Flow, `@xyflow/react`)
und in `graph_json` gespeichert. Das Frontend rendert denselben Graphen als
sequentielle Eingabemaske mit Live-Berechnung.

**Block-Typen** (`src/types/graph.ts`):
`variable` 🟪 · `dropdown` 🟧 · `tablevalue` 🟩 · `calc` 🟥 · `stdcalc` 🟫 ·
`tablecalc` 🟦 · `condition` 🔶 · `output` ⬜. Kanten: `workflow` (Standard) und `condition`.

**Schlüsseldateien:**
- `src/types/graph.ts` — Graph-/Block-Datentypen, `graph_json = {version,nodes,edges}`
- `src/utils/evalGraph.ts` — Auswertung (topo-sort über Workflow-Kanten, reuse `evalFormula`)
- `src/utils/legacyToGraph.ts` — `getGraph(v)`: nutzt `graph_json`, sonst Adapter aus
  `variables`+`compute_expr` (bestehende Nachweise rendern ohne Migration weiter)
- `src/components/admin/graph/` — `GraphEditor.tsx` (Canvas+Palette), `BlockNodes.tsx`
  (Custom Nodes), `graphContext.ts`
- `src/components/GraphVerificationView.tsx` — Frontend-Rendering + Live-Eval (Prop `readOnly`
  für die PDF-Ansicht in `PrintPanel`)

`evalGraph` toleriert Fehler/Zyklen (gibt `NaN`/null statt Crash). Ergebnis = letzter
`calc`/`stdcalc`-Block; SIA 265 → η (≤1 bestanden), SIA 261 → Wert.

### Gebäudeskizzen (SVG)
`db_tables.description` kann das Format `shape:KEY|Beschreibungstext` enthalten.  
`BuildingShape.tsx` rendert SVGs für Keys: `flachdach_niedrig`, `flachdach_mitte`, `flachdach_hoch`, `satteldach`, `satteldach_hoch`, `pultdach`.

---

## Wichtige Berechnungen

### Schneelast (SIA 261 §5.2)
```javascript
// KORREKTE Formel — sk in kN/m², h0 in Metern
var sk = Math.max(0.9, 0.4 * (1 + Math.pow(h0/350, 2)));
// FALSCH wäre: (1 + h0*h0/350) * 0.4  ← dividiert durch 350 statt 350²
```

### Wind-Staudruck (SIA 261 §6.2.1)
```javascript
var gk = {"II":[300,0.16,5], "IIa":[380,0.19,5], "III":[450,0.23,5], "IV":[526,0.30,10]};
var [zg, r, zmin] = gk[GK];
var ch = 1.6 * Math.pow(Math.max(zmin, z) / zg, 2*r) + 0.375;
var qp = ch * qp0;
```
`GK` ist ein String-Dropdown (`'II'`, `'IIa'`, `'III'`, `'IV'`) — nicht als Zahl übergeben.

---

## Neue Verifikation hinzufügen

**Verifikationen werden per JSON-Import eingefügt** (Admin → Nachweise → JSON importieren):

1. Im **Node-Editor** einen Nachweis grafisch aufbauen (Admin → Nachweise → Neuer Nachweis)
   - Blöcke: Variable 🟪, Dropdown 🟧, Tabellenwert 🟩, Berechnung 🟥, Std-Berechnung 🟫, etc.
   - Workflow-Kanten verbinden Blöcke (Ausführungsreihenfolge), Bedingung-Kanten für Verzweigungen
   
2. Nachweis speichern → Export als JSON
   ```json
   {
     "id": "eindeutiger_snake_case_name",
     "title": "Titel (Gl.-Nr.)",
     "formula_latex": "\\eta = ...",
     "formula_description": "Beschreibung",
     "graph_json": {
       "version": 1,
       "nodes": [ ... ],
       "edges": [ ... ]
     }
   }
   ```

3. JSON importieren: Admin → Nachweise → JSON importieren
   - Norm (SIA 265/261) und Kapitel auswählen
   - Verifikation wird mit gewähltem Kontext eingefügt

**Legacy-Nachweise** (alte `compute_expr`-basierte Formeln) rendern noch immer, nutzen aber den Adapter in `legacyToGraph.ts`.

---

## Block `stiffnesscenter` — Steifigkeitszentrum & Torsion (SIA 261)

**2D-CAD-Tool für Erdbebenauslegung nach SIA 261:2020 §4.3.3**

Das interaktive Canvas-System mit zwei Komponenten:

### Admin-Teil (BackendNode.tsx)
- Minimal: b_x (Grundrissbreite), b_y (Grundrisstiefe), Rasterweite, Verfahren-Auswahl (EKV/ASV)
- Info-Text weist auf das User-Frontend hin

### Benutzer-Frontend (StiffnesscenterPanel.tsx) — Vollständiger Editor
1. **Zeichen-Modi**
   - 🏛️ "Grundrissrand": Rechteck-Drag setzt b_x, b_y automatisch
   - 🧱 "Wände zeichnen": 1. Klick (Start) + 2. Klick (Ende) → Auto-Erkennung: hor. Wand (k_x) oder vert. Wand (k_y)

2. **Navigation**
   - 🔍 Zoom: Mausrad (Cursor-zentriert), skaliert 2–400 px/m
   - 🔄 Pan: Mittlere Maustaste + ziehen
   - ⤢ Zentrieren: Auto-Fit auf b_x × b_y

3. **Live-Visualisierung**
   - **M** (Kreuz): Geometrischer Massenmittelpunkt (b_x/2, b_y/2)
   - **S** (Punkt): Berechnetes Steifigkeitszentrum aus Wand-Lagen + k-Werten
   - **e_x, e_y** (gelb/grün): Tatsächliche Exzentrizitäten (M → S)
   - **e_d,sup/inf** (orange/violett, gestrichelt): Design-Exzentrizitäten um M (SIA 261 §4.3.3.2.4)

4. **Wand-Tabelle**
   - Spalten: ID, Achse (k_x/k_y), Koordinaten, Hebelarm, editierbar k
   - 🗑️ Delete-Button pro Wand

### Berechnung (`evaluate.ts`)
```typescript
// x_S = Summe(k_y,i · x_i) / Summe(k_y)      // Steifigkeitszentrum in x (resistiert Erdbeben y)
// y_S = Summe(k_x,i · y_i) / Summe(k_x)      // Steifigkeitszentrum in y (resistiert Erdbeben x)
// e_x = x_S - b_x/2, e_y = y_S - b_y/2
// e_d,x,sup = factor · e_y + 0.05·b_y  (Erdbeben x-Richtung, obere Ausmitte)
// e_d,x,inf = e_y - 0.05·b_y           (untere Ausmitte)
// factor: EKV = 1.5 (Ersatzkraftverfahren), ASV = 1.0 (räumliches Modell)
```

**Zugehörige Dateien:**
- `src/blocks/stiffnesscenter/` (definition, defaults, BackendNode, evaluate, index)
- `src/components/StiffnesscenterPanel.tsx` (Benutzer-UI)
- `src/types/graph.ts` (StiffnesscenterData, StiffnessWall Interfaces)

---

## Neue Block-Typen hinzufügen

**Neue Blöcke werden automatisch registriert!**

1. Erstelle einen Ordner in `src/blocks/myblock/` mit 5 Dateien:
   ```
   src/blocks/myblock/
   ├── definition.ts      # Block-Definition (type, icon, label, color)
   ├── defaults.ts        # Funktion: createDefaultData() → BlockData
   ├── BackendNode.tsx    # React-Komponente für den Node-Editor
   ├── evaluate.ts        # Funktion: evaluate(node, runtime) → void
   └── index.ts           # Exports
   ```

2. Registriere den Block automatisch:
   ```bash
   npm run generate-blocks
   ```
   Das Script scannt `src/blocks/` und aktualisiert `index.ts` + `evaluators.ts` automatisch.

3. Der Block ist sofort einsatzbereit! Keine manuelle Registrierung nötig.

**Beispiel definition.ts:**
```typescript
import { BlockDefinition } from '../types';
import { myblockDefaults } from './defaults';

export const myblockBlock: BlockDefinition = {
  type: 'myblock',
  icon: '🟪',
  label: 'Mein Block',
  color: '#9333ea',
  createDefaultData: myblockDefaults,
};
```

**Beispiel defaults.ts:**
```typescript
import { BlockData } from '../../types/graph';

export function myblockDefaults(): BlockData {
  return { kind: 'myblock', name: '', label: '', value: 0 };
}
```

---

## Debugging

| Problem | Prüfen |
|---------|--------|
| Leere Kapitel nach Normwechsel | `rawChapterDataByNorm` im Zustand; `data/chapters/<norm>.json`; `api.getChapters(norm)` |
| Formel ergibt `null` | `evalFormula` gibt `null` bei Fehler → Browser-Konsole |
| Tabellen fehlen | `data/tables/<norm>.json` und `api.getTables(norm)` prüfen |
| Variablenwert wird nicht übernommen | Typ `dropdown` speichert String – compute_expr muss String-Vergleich machen |
