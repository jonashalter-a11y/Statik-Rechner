# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## README aktuell halten

**Nach jeder Änderung die eine dieser Kategorien betrifft, README.md aktualisieren:**
- Neue Verifikationen oder Berechnungen
- Neue DB-Tabellen (Anhang C, Norm-Daten)
- Geänderte API-Endpunkte
- Neue Komponenten oder Features
- Versionsnummer (Abschnitt "Version History" im README)

---

## Entwicklungsumgebung starten

```bash
# Terminal 1 – Backend
cd server && PORT=3002 node index.js

# Terminal 2 – Frontend
npm run dev          # http://localhost:5173
```

### Datenbank neu aufbauen (nach Änderungen an db.js oder seed-anhangc-full.js)
```bash
rm -f server/sia265.db server/sia265.db-wal server/sia265.db-shm
node server/db.js                  # Schema + Kapitel-Seeds (SIA 265 + SIA 261)
node server/seed-anhangc-full.js   # Windtabellen Anhang C
```

`db.js` seedet nur wenn die DB leer ist (`chapCount === 0`). Datei liegt unter `server/sia265.db`.
**Verifikationen werden nicht mehr automatisch eingepflanzt** — nur per JSON-Import im Admin-UI.

### Frontend bauen
```bash
npm run build   # TypeScript check + Vite bundle → dist/
```

---

## Architektur

### Stack
- **Backend**: Node.js + Express (CommonJS, `server/`) auf Port 3002
- **Frontend**: React 18 + TypeScript + Vite (`src/`), Proxy auf `/api` → `:3002`
- **State**: Zustand (`src/store/useStore.ts`)
- **DB**: SQLite via `better-sqlite3` (`server/sia265.db`)
- **Formeln**: KaTeX für LaTeX-Rendering, `evalFormula.ts` für Auswertung

### Dual-Norm-System
Der Norm-Switcher im Header schaltet zwischen `sia265` und `sia261`. Beim Wechsel:
1. `setNormId(id)` → baut sofort den Kapitelbaum aus dem Cache
2. `loadNormData(id)` → lädt Kapitel + Verifikationen frisch aus der API

Verifikationen werden pro Norm gecacht in `_verifsByNorm: Record<string, Verification[]>`.

### Verifikations-Architektur: JSON statt DB-Seeding
**Verifikationen werden nicht mehr in der DB persistent gespeichert**, sondern als JSON importiert:
- Admin erstellt Nachweis im Node-Editor (Block-Graph)
- Export → JSON-Datei oder direkt per JSON-Import in Admin-UI
- Import speichert die Verifikation in `verifications` Tabelle mit `graph_json`-Spalte
- Beim API-Abruf (`/api/verifications`) werden alle DB-Einträge ausgegeben
- **Kapitel und Referenztabellen** (Anhang C) sind weiterhin in der DB gespeichert

### Berechnungsformel-Pipeline
1. `compute_expr` in DB = JavaScript-String (darf `Math.*` verwenden)
2. `evalFormula(expr, vars)` → `new Function(...varNames, expr)` 
3. SIA 265: Ergebnis ist η (≤ 1.0 = bestanden)
4. SIA 261: Ergebnis ist kN/m² oder kN (kein η-Vergleich)

Variablen vom Typ `dropdown` speichern den Wert als String (z.B. `'III'` für Geländekategorie), der compute_expr muss das intern auflösen.

### Seed-Struktur
- `seed-chapters.js` → SIA 265 Kapitel (exportiert Array)
- `seed-sia261.js` → SIA 261 Kapitel (exportiert Array) — **keine Verifikationen mehr**
- `seed-anhangc-full.js` → Windtabellen Tab. 31–45; **direkt ausführbar**, löscht vorher alle `anhc_*` Einträge
- `db.js` importiert die Seed-Module und führt sie beim ersten Start aus
- **Verifikationen** müssen per JSON-Import eingefügt werden (Admin → Nachweise → JSON importieren)

### DB-Schema (wichtigste Tabellen)
```
chapters        id, norm_id, parent_id, number, title, sort_order
verifications   id, norm_id, chapter_id, title, formula_latex, formula_description, graph_json, active
db_tables       id, norm_id, category, title, description, headers(JSON), rows(JSON)
```
**Anmerkung:** `variables` und `variable_options` sind Legacy — neue Verifikationen speichern alles in `graph_json` (Blöcke + Kanten). Alte `compute_expr`-Nachweise rendern noch via Adapter in `legacyToGraph.ts`.

### Node-Editor / Block-System (Nachweis-Erstellung)
Neue Nachweise werden im Backend als **Graph aus Blöcken** gebaut (React Flow, `@xyflow/react`)
und in `verifications.graph_json` gespeichert. Das Frontend rendert denselben Graphen als
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

## Neue Block-Typen hinzufügen

**Neue Blöcke werden automatisch registriert!**

1. Erstelle einen Ordner in `src/blocks/myblock/` mit 5 Dateien:
   ```
   src/blocks/myblock/
   ├── definition.ts      # Block-Definition (type, icon, label, color)
   ├── defaults.ts        # Funktion: createDefaultData() → BlockData
   ├── BackendNode.tsx    # React-Komponente für Admin-Editor UI
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
| Leere Kapitel nach Normwechsel | `rawChapterDataByNorm` im Zustand; API `/api/chapters?norm=sia261` |
| Formel ergibt `null` | `evalFormula` gibt `null` bei Fehler → Browser-Konsole |
| DB-Tabellen fehlen | `node server/seed-anhangc-full.js` erneut ausführen |
| Variablenwert wird nicht übernommen | Typ `dropdown` speichert String – compute_expr muss String-Vergleich machen |
