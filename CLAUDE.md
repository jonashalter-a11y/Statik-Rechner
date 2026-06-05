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

### Datenbank neu aufbauen (nach Änderungen an seed-*.js oder db.js)
```bash
rm -f server/sia265.db server/sia265.db-wal server/sia265.db-shm
node server/db.js                  # Schema + SIA 265 + SIA 261 Basis-Seed
node server/seed-anhangc-full.js   # Anhang C Windtabellen Tab. 31–45
```

`db.js` seedet nur wenn die DB leer ist (`chapCount === 0`). Datei liegt unter `server/sia265.db`.

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
Der Norm-Switcher im Header schaltet zwischen `sia265` und `sia261`. Alle DB-Tabellen haben eine `norm_id`-Spalte als FK. Beim Wechsel:
1. `setNormId(id)` → baut sofort den Kapitelbaum aus dem Cache
2. `loadNormData(id)` → lädt Kapitel + Verifikationen frisch aus der API

Verifikationen werden pro Norm gecacht in `_verifsByNorm: Record<string, Verification[]>`.

### Berechnungsformel-Pipeline
1. `compute_expr` in DB = JavaScript-String (darf `Math.*` verwenden)
2. `evalFormula(expr, vars)` → `new Function(...varNames, expr)` 
3. SIA 265: Ergebnis ist η (≤ 1.0 = bestanden)
4. SIA 261: Ergebnis ist kN/m² oder kN (kein η-Vergleich)

Variablen vom Typ `dropdown` speichern den Wert als String (z.B. `'III'` für Geländekategorie), der compute_expr muss das intern auflösen.

### Seed-Struktur
- `seed-chapters.js` → SIA 265 Kapitel (exportiert Array)
- `seed-sia261.js` → SIA 261 Kapitel + Verifikationen (exportiert `{ chapters, verifications }`)
- `seed-anhangc-full.js` → Windtabellen Tab. 31–45; **direkt ausführbar**, löscht vorher alle `anhc_*` Einträge
- `db.js` importiert die Seed-Module und führt sie beim ersten Start aus

### DB-Schema (wichtigste Tabellen)
```
chapters        id, norm_id, parent_id, number, title, sort_order
verifications   id, norm_id, chapter_id, title, formula_latex, formula_description, compute_expr, active
variables       id, verification_id, name, label, unit, type, default_value, description, sort_order
variable_options variable_id, label, value, sort_order
db_tables       id, norm_id, category, title, description, headers(JSON), rows(JSON)
```

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

1. In `seed-sia261.js` (oder `seed-verifications.js` für SIA 265) ein Objekt ergänzen:
   ```javascript
   {
     id: 'eindeutiger_snake_case_name',
     chapter_id: '261.6.2.2',
     title: 'Titel (Gl.-Nr.)',
     formula_latex: 'LaTeX-String',
     formula_description: 'Beschreibung',
     compute_expr: 'JavaScript-Ausdruck mit Variablennamen',
     variables: [
       { name: 'var_name', label: 'Anzeigename', unit: 'kN/m²',
         type: 'number' | 'dropdown', default_value: '1.0',
         description: '...', options: [{ label: '...', value: '...' }] }
     ]
   }
   ```
2. DB neu aufbauen (siehe oben)
3. SIA 261-Ergebnisse: `result` zeigt Zahlenwert, kein η-Pass/Fail
4. SIA 265-Ergebnisse: `result` ist η, `passed = eta ≤ 1.0`

---

## Debugging

| Problem | Prüfen |
|---------|--------|
| Leere Kapitel nach Normwechsel | `rawChapterDataByNorm` im Zustand; API `/api/chapters?norm=sia261` |
| Formel ergibt `null` | `evalFormula` gibt `null` bei Fehler → Browser-Konsole |
| DB-Tabellen fehlen | `node server/seed-anhangc-full.js` erneut ausführen |
| Variablenwert wird nicht übernommen | Typ `dropdown` speichert String – compute_expr muss String-Vergleich machen |
