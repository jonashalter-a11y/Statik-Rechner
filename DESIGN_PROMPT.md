# Design-Vorlage für neuen Webrechner

## Layout (Kern-Struktur)

**3-spaltig, resizable:**
```
┌─────────────────────────────────────────────────┐
│  HEADER (48px, dunkelblau Gradient)             │
├─────────────────┬──────────────┬────────────────┤
│   SIDEBAR       │  MAIN PANEL  │  EXPORT/PRINT  │
│  (270px, light) │  (flex, weiß)│  (360px, grau) │
│                 │              │                │
│   Baum, TOC     │  Formel      │  PDF Export    │
│   Nachweise     │  Variablen   │  Vorschau      │
│   Stats         │  Ergebnis    │  Ausdrucklog   │
│                 │  Kommentar   │                │
└─────────────────┴──────────────┴────────────────┘
```

Splitter zwischen Spalten → Resize möglich (Min: 160px / 300px / 260px)

---

## Farbpalette

| Element | Farbe | Hex | Nutzung |
|---------|-------|-----|---------|
| Header | Dunkelblau Gradient | `#1e3a5f` → `#1d4ed8` | Top Bar |
| Text Primär | Dunkelgrau | `#1e40af` | Überschriften, aktive Items |
| Text Sekundär | Mittelgrau | `#6b7280` | Labels, Beschreibungen |
| Text Tertiär | Hellgrau | `#9ca3af` | Hints, schwache Info |
| Hintergrund Seite | Hellgrau | `#f1f5f9` | Page Background |
| Hintergrund Panel | Weiß | `#fff` | Haupt-Inhalte |
| Hintergrund Sidebar | Sehr hell | `#f8fafc` | TOC, Listen |
| Erfolg | Grün | `#10b981` / `#d1fae5` | Pass, erfüllt, ✓ |
| Fehler | Rot | `#ef4444` / `#fee2e2` | Fail, nicht erfüllt, ✗ |
| Info | Blau | `#3b82f6` / `#dbeafe` | SIA 261 Ergebnisse |
| Rand | Hell | `#e5e7eb` | Divider, Borders |

---

## Header (48px)

```
┌────────────────────────────────────────────────┐
│ 🔷 SIA Rechner    [Norm Pill] [Optionen...] ⚙️ │
└────────────────────────────────────────────────┘
```

- **Logo**: Fett, 14px, Weiß
- **Norm-Pill**: Buttons nebeneinander, `background: rgba(255,255,255,0.28)` wenn aktiv
  - "SIA 265 Holzbau"
  - "SIA 261 Einwirkungen"  
  - "EC5 Eurocode"
- **Dropdowns** (Holzart, Klasse): `background: rgba(255,255,255,0.15)`, Weiß Text, 11px
- **Admin Button**: Violett Badge rechts
- **Divider**: `rgba(255,255,255,0.2)` dünne vertikale Linie

---

## Sidebar (270px, `#f8fafc`)

```
┌──────────────────┐
│ INHALTSVERZEICHNIS│  ← Header (12px uppercase)
├──────────────────┤
│ ▼ 0 Geltungsber. │
│   ▶ 1 Verständ.  │
│   ▼ 2 Grundsätze │
│     • (1) Berech.│  ← Nachweis mit Punkt-Farbe
│     • (2) Ausnut.│
│       ✅ / ❌    │
│ ▼ 3 ...          │
├──────────────────┤
│ 13 Nachweise     │  ← Footer Stats
│ ● 10 erfüllt     │
│ ● 3 versagt      │
└──────────────────┘
```

- **Kapitel**: Chevron `▼ ▶`, bold wenn depth=0
- **Verifikation**: 11px, Blau `#1e40af`, indented +10px pro Level
- **Punkt**: Farbe je nach Status (⚪ undef, 🟢 pass, 🔴 fail), 6px Radius
- **Badge**: Kapitel mit Verifikationen zeigen Count `[2]` rechts
- **Stats Footer**: 11px, Grün/Rot Text, Divider oben

---

## Main Panel (Nachweis)

```
╔════════════════════════════════════╗
║ (1) Nachweis Titel          + Ausdruck║
╚════════════════════════════════════╝

┌─ FORMEL ─────────────────────────────┐
│ [LaTeX MathJax Rendering]           │
│ η = (f_m,d) / σ_m,d                 │
└─────────────────────────────────────┘

┌─ VARIABLEN ──────────────────────────┐
│ Variable Name [Unit]                │
│ Beschreibung kurz                   │
│ ┌──────────────────────────────────┐│
│ │ 24 [N/mm²]  ◀ Input oder Dropdown││
│ └──────────────────────────────────┘│
├─────────────────────────────────────┤
│ σ_m,d Bemessungsspannung            │
│ ┌──────────────────────────────────┐│
│ │ 12.5 [N/mm²]                     ││
│ └──────────────────────────────────┘│
└─────────────────────────────────────┘

┌─ ERGEBNIS ──────────────────────────┐
│ ✅ η = 0.456 ≤ 1.0 → erfüllt        │
│ Ausnutzung: 45.6%                   │
└─────────────────────────────────────┘

┌─ KOMMENTAR ─────────────────────────┐
│ [Textarea, frei beschreibbar]       │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

### Input-Elemente

**Zahlen-Input:**
- Border: `1px solid #d1d5db`
- Padding: `3px 8px`, 13px Font
- Border-radius: 4px
- Text-align: right, monospace
- Unit rechts: 11px, grau

**Dropdown:**
- Border: `1px solid #d1d5db`
- Padding: `3px 6px`, 12px Font
- Background: Weiß
- Option: Dunkelblau bg

**Result Badge:**
- Pass: `#d1fae5` bg, `#10b981` border, grüne Checkmark
- Fail: `#fee2e2` bg, `#fca5a5` border, rote X
- Padding: 12px, gap: 12px zwischen Icon + Text
- Font: 14px bold Titel, 12px Subtext

---

## Export/Print Panel (rechts, 360px)

```
┌─ Ausdruckprotokoll ────────────────┐
│ [PDF Export] [×]                   │
├────────────────────────────────────┤
│                                    │
│ 1. (1) Nachweis Titel              │
│    ┌──────────────────────────────┐│
│    │ Formel (LaTeX)              ││
│    │ Gegebene Werte (Tabelle)    ││
│    │ Berechnung (Werte eintrag.) ││
│    │ Ergebnis: η = 0.456         ││
│    └──────────────────────────────┘│
│                                    │
│ 2. (2) Nachweis 2 ...              │
│    [...]                          │
│                                    │
└────────────────────────────────────┘
```

- Hintergrund: `#f8fafc` 
- Items: `#fff` mit Border `1px #e5e7eb`
- Padding: 16px außen, 14px innen
- Border-radius: 6px
- Tabelle: 11px Font, Alternating Zeilen-Farben

---

## Typography

| Element | Font-Size | Font-Weight | Line-Height |
|---------|-----------|-------------|------------|
| Header Logo | 14px | 700 | 1 |
| Panel Titel | 16px | 600 | 1 |
| Section Label | 11px | 600 | 1 |
| Text Normal | 13px | 400 | 1.5 |
| Text Small | 11px | 400 | 1.4 |
| Monospace (Input) | 13px | 600 | 1 |

Alle Labels: **UPPERCASE**, `letter-spacing: 0.05–0.06em`

---

## Interaktionen

**Hover:**
- Kapitel/Nachweis in TOC: `background: #dbeafe`, `border-left: 3px solid #2563eb`
- Buttons: Opacity -10%, Cursor: pointer
- Inputs: Border-color: `#2563eb`

**Fokus:**
- Inputs: `outline: 2px solid #2563eb`
- Buttons: `box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1)`

**Active/Selected:**
- Nachweis in TOC: Blauer Hintergrund `#dbeafe` + dicke linke Border

---

## Responsive

- **Min-Breiten:** Sidebar 160px, Main 300px, Print 260px
- **Splitter:** 2px Breite, `cursor: col-resize` on Hover
- **Mobile:** Print-Panel wird über Button ausgeblendet (rechts Floating)

---

## Icons & Symbole

- ✅ Grüne Checkmark (Nachweis erfüllt)
- ❌ Rote X (Nachweis nicht erfüllt)
- ● Farbige Punkte (Status)
- ▼ / ▶ Chevrons (Expand/Collapse)
- 📐 Placeholder Icon (leere Nachweise-Panel)
- 📊 Einwirkungs-Wert-Icon (SIA 261)
- 📄 Ausdruck Button (rechts Floating)

---

## Code-Beispiel (CSS-in-JS / Tailwind)

```javascript
const panelStyle = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '16px',
  overflowX: 'auto',
};

const sectionLabelStyle = {
  fontSize: '11px',
  fontWeight: '600',
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '8px',
};

const resultBadgeStyle = (passed) => ({
  padding: '12px',
  borderRadius: '8px',
  marginBottom: '16px',
  background: passed ? '#d1fae5' : '#fee2e2',
  border: `1px solid ${passed ? '#6ee7b7' : '#fca5a5'}`,
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
});
```

---

## Weitere Key-Features

- **Resizable Columns**: Spalten-Breiten verschiebbar (Min-Limits)
- **SVG-Gebäudeskizzen**: In Tabellen eingebettet (shape:key Format)
- **LaTeX MathJax**: Formeln rendern automatisch
- **Dark Theme optional**: Aber primär Light Mode
- **Print-Optimiert**: A4 Format, `pageBreakInside: avoid`
- **Norm-Switcher**: Header-Pills für verschiedene Standards
- **Dropdowns aus Tabellen**: type="table_column" → Auto-Optionen laden

---

## Zusammenfassung für neuen Rechner

Kopiere diesen **Style-Guide** für:
- Konsistente Blaupalette (`#1e3a5f`, `#1e40af`, `#2563eb`)
- 3-Spalten Resizable Layout
- Material Design Prinzipien (Cards, Shadows, Spacing)
- Klein Typography (11–13px Standard)
- UPPERCASE Section Labels
- Grün/Rot Status Badges
- Monospace für Zahlen

✨ Resultat: Moderner, sauberer, technischer Webrechner
