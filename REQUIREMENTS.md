# Requirements - SIA 265/261 Holzbau Rechner

## Projektübersicht

Der SIA 265/261 Holzbau Rechner ist eine interaktive Web-Anwendung zur Verifikation von Holzbau-Konstruktionen nach den Schweizer Normen **SIA 265** (Holzbau) und **SIA 261** (Schneelast und Windlast).

**Zielgruppe:** Strukturingenieure, Architekten und Planer im Holzbau

---

## 1. Funktionale Anforderungen

### 1.1 Norm-Management
- [ ] Benutzer kann zwischen **SIA 265** und **SIA 261** umschalten
- [ ] Bei Normwechsel laden sich automatisch passende Kapitel und Tabellen
- [ ] Alle Verifikationsmethoden sind norm-spezifisch implementiert

### 1.2 Verifikationssystem (Nachweise)
- [ ] Verifikationen basieren auf **Graph-Struktur** (Blöcke + Kanten)
- [ ] Legacy-Verifikationen (mit `compute_expr`) werden mit Adapter unterstützt
- [ ] Import/Export von Nachweisen als JSON
- [ ] Nachweise speichern sich in `nachweise/<norm>/*.json`

### 1.3 Block-System (Node-Editor)
Verfügbare Block-Typen:
- [ ] **Variable** 🟪 — Benutzer-Input (Zahlenwert)
- [ ] **Dropdown** 🟧 — Kategorienauswahl (z.B. Geländekategorie)
- [ ] **Tablevalue** 🟩 — Tabellenwert-Lookup
- [ ] **Calc** 🟥 — Einfache Berechnung (LaTeX → JS)
- [ ] **StdCalc** 🟫 — Standard-Berechnung (vordefinierte Formeln)
- [ ] **TableCalc** 🟦 — Tabellen-basierte Berechnung
- [ ] **SwitchCalc** 🟧 — Bedingte Berechnung (Dropdown → verschiedene Formeln)
- [ ] **Condition** 🔶 — Verzweigungslogik
- [ ] **Output** ⬜ — Ergebnis-Darstellung
- [ ] **Check** — Vergleich (η ≤ 1.0 für SIA 265)
- [ ] Weitere: Cases, Matrix, ChartLookup, Comment, Frame, Image, etc.

### 1.4 Berechnungen

#### SIA 265 (Holzbau)
- [ ] Ergebnis als **η** (Auslastungsgrad, η ≤ 1.0 = bestanden)
- [ ] Unterstützt Material-Kombinationen (Holzart + Holzklasse)
- [ ] Unterstützt Einwirkungskombinationen

#### SIA 261 (Lasten)
- [ ] **Schneelast (§5.2):** `sk = max(0.9, 0.4 * (1 + (h0/350)²))`
- [ ] **Windlast (§6.2.1):** Staudruck `qp` mit Geländekategorie-Lookup
- [ ] Ergebnis als **Kraft/Druck** (kN/m², kN) — kein η-Vergleich
- [ ] Unterstützt verschiedene Einheiten (SI)

### 1.5 Datenquellen
- [ ] JSON-Dateien in `data/` für Referenztabellen
  - `data/norms.json` — Norm-Metadaten
  - `data/chapters/<norm>.json` — Kapitelbaum
  - `data/tables/<norm>.json` — Tabellen und Diagramme
  - `data/wood.json` — Holzarten, Holzklassen, Materialwerte
  - `data/units.json` — Einheiten-Definitionen
- [ ] Nachweise in `nachweise/<norm>/*.json` — Verifikations-Graph

### 1.6 UI/UX
- [ ] **Norm-Switcher** im Header (SIA 265 ↔ SIA 261)
- [ ] **Kapitel-Navigation** — hierarchische Struktur per Norm
- [ ] **Eingabemaske** — sequenzielle Anzeige der Block-Inputs
- [ ] **Inline-Rendering** von LaTeX-Formeln mit **KaTeX**
- [ ] **Gebäudeskizzen** — SVG-Visualisierung (Dachformen)
- [ ] **PDF-Export** — Nachweis als druckbar
- [ ] **Admin-UI** — Node-Editor zum Erstellen/Editieren von Nachweisen

---

## 2. Nicht-funktionale Anforderungen

### 2.1 Performance
- [ ] Frontend lädt sich in < 2 Sekunden
- [ ] Berechnungen laufen in Echtzeit (< 100 ms)
- [ ] Norm-Wechsel funktioniert ohne Reload

### 2.2 Zuverlässigkeit
- [ ] Formelauswertung toleriert fehlende Variablen (gibt `NaN` statt Crash)
- [ ] Zyklen in Graphen werden erkannt und abgefangen
- [ ] Fehlerhafte JSON-Daten brechen die App nicht

### 2.3 Wartbarkeit
- [ ] Block-Typen werden **automatisch registriert** (npm run generate-blocks)
- [ ] Neue Blöcke: einfach Ordner in `src/blocks/` erstellen
- [ ] Keine manuelle Registry-Verwaltung nötig

### 2.4 Datenschutz
- [ ] Alle Berechnungen laufen **lokal** im Browser
- [ ] Keine Daten-Übertragung auf Server
- [ ] Nachweise können lokal gespeichert/exportiert werden

### 2.5 Browser-Kompatibilität
- [ ] Funktioniert auf **Chrome, Firefox, Safari, Edge** (aktuelle Versionen)
- [ ] Mobile-Ansicht unterstützt (Responsive)

---

## 3. Technische Anforderungen

### 3.1 Stack
| Komponente | Anforderung |
|---|---|
| **Frontend** | React 18 + TypeScript |
| **Build** | Vite (Dev: http://localhost:5173) |
| **Styling** | CSS + Tailwind (optional) |
| **State Management** | Zustand |
| **Graph-Visualisierung** | React Flow (@xyflow/react) |
| **LaTeX-Rendering** | KaTeX |
| **Formeln** | JavaScript (eval-safe mit Function) |
| **PDF-Export** | html2pdf oder ähnlich |

### 3.2 Node.js & npm
- [ ] **Node.js:** ≥ 18.0.0
- [ ] **npm:** ≥ 9.0.0
- [ ] Dependencies müssen in `package.json` definiert sein

### 3.3 Build & Deployment
- [ ] **Entwicklung:** `npm run dev`
- [ ] **Production-Build:** `npm run build` → `dist/`
- [ ] **Type-Check:** `npm run build` (Vite führt TypeScript-Check durch)
- [ ] Deployable als **statische Website** (keine Server-Runtime nötig)

### 3.4 Code-Qualität
- [ ] **TypeScript:** Strict mode (`strict: true`)
- [ ] **Imports:** Absolute Paths unter `src/` unterstützt
- [ ] **Datei-Namen:** kebab-case für Komponenten und Utilities

---

## 4. Dokumentation

### 4.1 README aktualisieren nach Änderungen in:
- [ ] Neue Verifikationen/Berechnungen → README.md Section
- [ ] Neue Tabellen (Anhang C) → README.md
- [ ] Neue API-Endpunkte (falls vorhanden)
- [ ] Neue Komponenten/Features → Architektur-Section
- [ ] Versionsnummer → Version History

### 4.2 Inline-Dokumentation
- [ ] **CLAUDE.md:** Entwickler-Anleitung (Architektur, Debugging, Block-Erstellung)
- [ ] **Block-Kommentare:** Kurz halten (nur WHY, nicht WHAT)
- [ ] **JSON-Schema-Kommentare:** Erklärung komplexer Datenstrukturen

---

## 5. Testing

### 5.1 Benutzer-Verifikationen
- [ ] Alle Nachweise können vollständig ausgefüllt werden
- [ ] Berechnungen liefern erwartete Ergebnisse
- [ ] Norm-Wechsel behält aktuelle Daten bei oder warnt

### 5.2 Edge Cases
- [ ] Leere Inputs → Graceful Handling (NaN, kein Crash)
- [ ] Ungültige Formeln → Error-Meldung im UI
- [ ] Zirkuläre Abhängigkeiten → Erkannt und gemeldet

### 5.3 Regression-Tests
- [ ] Existierende Nachweise nach Update noch gültig
- [ ] LaTeX-Rendering unverändert
- [ ] Tabellenwerte stimmen noch überein

---

## 6. Sicherheit

### 6.1 Input-Validierung
- [ ] Zahlenwerte: nur Nummern zulässig
- [ ] Dropdown-Werte: nur aus vordefiniertem Set
- [ ] LaTeX: keine Bash-Injection oder XSS

### 6.2 Formula Evaluation
- [ ] **Keine `eval()`** — nutzt `new Function(...)`
- [ ] Nur Zugriff auf Math-Funktionen und übergebene Variablen
- [ ] Keine Filesystem- oder Network-Zugriffe

### 6.3 JSON-Import
- [ ] Validierung gegen JSON-Schema
- [ ] Größenlimit für Uploads (z.B. 10 MB)
- [ ] Keine externen Scripts aus importierten Nachweisen

---

## 7. Erweiterbarkeit

### 7.1 Neue Verifikationen
1. Im Node-Editor graphisch aufbauen
2. Export → JSON
3. Import in Admin-UI mit Norm + Kapitel-Auswahl

### 7.2 Neue Blöcke
1. Ordner in `src/blocks/myblock/` erstellen
2. 5 Dateien: `definition.ts`, `defaults.ts`, `BackendNode.tsx`, `evaluate.ts`, `index.ts`
3. `npm run generate-blocks` → Automatische Registrierung
4. Keine manuelle Änderung in `index.ts` oder `evaluators.ts` nötig

### 7.3 Neue Tabellen/Referenzdaten
1. JSON-Datei in `data/tables/<norm>.json` hinzufügen
2. Schema:
   ```json
   {
     "tableId": "...",
     "description": "...",
     "shape": "...",
     "rows": [...],
     "columns": [...]
   }
   ```
3. Im Nachweis via **TableValue**-Block verwenden

---

## 8. Known Limitations

- [ ] PDF-Export hat begrenzte Layoutkontrolle (via html2pdf)
- [ ] Sehr große Graphen (>100 Blöcke) können langsam werden
- [ ] Nur lokal speichbar (kein Cloud-Sync ohne Custom-Backend)
- [ ] Keine Mehrbenutzerverwaltung oder Versionskontrolle für Nachweise

---

## 9. Release Checklist

Vor jedem Release:
- [ ] README.md auf Stand bringen
- [ ] Version in `package.json` erhöht
- [ ] CLAUDE.md aktualisiert
- [ ] Alle Nachweise noch gültig
- [ ] TypeScript kompiliert ohne Fehler: `npm run build`
- [ ] Dev-Server läuft stabil: `npm run dev`
- [ ] Mindestens 5 Nachweise manuell durchgespielt
- [ ] Git tags erstellt: `v1.X.Y`

---

## 10. Kontakt & Support

**Maintainer:** [@filou992002](https://github.com/filou992002)

**Issues & Feedback:** GitHub Issues in diesem Repo
**Dokumentation:** Siehe `CLAUDE.md` und README.md
