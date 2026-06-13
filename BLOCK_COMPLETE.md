# Complete Block Guide - Auto-Discovery System

## 🎉 NEW: Alles ist jetzt automatisch!

Du brauchst nur noch **5 Dateien im Block-Ordner** → `npm run generate-blocks` → FERTIG!

Keine manuellen Änderungen in BlockNodes.tsx, types/graph.ts oder BlockNodeShared.tsx mehr nötig! ✨

---

## Standard-Features die IMMER dabei sein sollten

Jeder gute Block hat diese Features:

✅ **THEME in definition.ts** (Farben, Icon, Label)  
✅ **Variable-Insertion via NameChips** (Knopfklick für vorherige Variablen)  
✅ **Einheiten aus Datenbank** (nicht hardcodiert!)  
✅ **Kapitel-spezifische Daten** (nur CSV/JSON/Diagramme aus diesem Kapitel)  
✅ **LaTeX Preview** (zeigt wie es aussieht)  
✅ **Fehlerbehandlung** (keine Crashes bei ungültigen Eingaben)  
✅ **Hilfetext** (Tooltip oder Info für Nutzer)  

---

## PRODUKTION-Block: Vollständiges Beispiel

Ein **echter, produktionsreifer Block** mit allen Best-Practices:

### definition.ts (MIT THEME!)
```typescript
import { BlockDefinition } from '../types';
import { windpressureDefaults } from './defaults';

export const windpressureBlock: BlockDefinition = {
  type: 'windpressure',
  icon: '💨',
  label: 'Wind-Staudruck',
  color: '#0891b2',
  createDefaultData: windpressureDefaults,
  // ← NEUE: THEME-Daten hier!
  theme: {
    bg: '#ecfdf5',      // Hintergrund (hell)
    border: '#0f766e',  // Border-Farbe (dunkel)
  },
};
```

### defaults.ts
```typescript
import { BlockData } from '../../types/graph';

export function windpressureDefaults(): BlockData {
  return {
    kind: 'windpressure',
    name: 'qp',
    label: 'Staudruck',
    unit: 'kN/m²',
    latex: 'q_p = c_h \\cdot q_0',
    expr: 'c_h * q_0',
    description: 'Böengeschwindigkeitsdruck nach SIA 261',
  };
}
```

### BackendNode.tsx (PRODUKTIV - mit allen Features!)
```typescript
import React, { useRef } from 'react';
import { NodeProps } from '@xyflow/react';
import { useGraphCtx } from '../../components/admin/graph/graphContext';
import { 
  Shell, F, LatexArea, NameChips, lbl, inp, UnitField 
} from '../../components/admin/graph/BlockNodeShared';
import MathDisplay from '../../components/MathDisplay';
import { nameToLatex } from '../../utils/formatName';
import { latexToJs } from '../../utils/latexToJs';

export function WindpressureNode({ id, data, selected }: NodeProps) {
  const d = data as any;
  const { updateNodeData, allNames } = useGraphCtx();
  const set = (p: Partial<typeof d>) => updateNodeData(id, p);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const setLatex = (latex: string) => {
    set({ latex, expr: latexToJs(latex) });
  };

  const insertVariableName = (name: string) => {
    const token = name;
    const base = d.latex || d.name;
    const input = textareaRef.current;
    const start = input?.selectionStart ?? base.length;
    const end = input?.selectionEnd ?? start;
    const next = base.slice(0, start) + token + base.slice(end);
    setLatex(next);
    window.setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  };

  return (
    <Shell id={id} type="windpressure" selected={selected}>
      {/* === NAME === */}
      <div style={lbl}>Ergebnis-Name (LaTeX)</div>
      <F
        value={d.name}
        placeholder="qp"
        onChange={e => set({ name: e.target.value })}
      />
      {d.name && (
        <div style={{ fontSize: 10, marginTop: 1, padding: 4, background: '#f8fafc', borderRadius: 3 }}>
          <MathDisplay latex={nameToLatex(d.name)} />
        </div>
      )}

      {/* === LABEL === */}
      <div style={lbl}>Bezeichnung</div>
      <F
        value={d.label}
        placeholder="z.B. Böengeschwindigkeitsdruck"
        onChange={e => set({ label: e.target.value })}
      />

      {/* === EINHEIT (aus Datenbank!) === */}
      <div style={lbl}>Einheit</div>
      <UnitField
        value={d.unit}
        onChange={unit => set({ unit })}
        placeholder="kN/m²"
      />

      {/* === BESCHREIBUNG === */}
      <div style={lbl}>Beschreibung (optional)</div>
      <textarea
        value={d.description || ''}
        onChange={e => set({ description: e.target.value })}
        placeholder="Hilfreiche Erklärung für Nutzer..."
        style={{ ...inp, minHeight: 30, fontFamily: 'inherit', resize: 'vertical' }}
      />

      {/* === FORMEL (LaTeX) === */}
      <div style={lbl}>Anzeige-Formel (LaTeX)</div>
      <LatexArea
        elRef={textareaRef}
        value={d.latex}
        placeholder="q_p = c_h \\cdot q_0"
        onChange={setLatex}
        style={{ ...inp, minHeight: 60, fontFamily: 'monospace', resize: 'vertical' }}
      />
      {d.latex && (
        <div style={{
          background: '#fff',
          borderRadius: 3,
          padding: 4,
          marginTop: 2,
          overflowX: 'auto',
          fontSize: 10
        }}>
          <MathDisplay latex={d.latex} display />
        </div>
      )}

      {/* === VARIABLE-Auswahl via NameChips (WICHTIG!) === */}
      <div style={{ fontSize: 9, color: '#6b7280', marginTop: 4, marginBottom: 2 }}>
        💡 Klick auf eine Variable um sie einzufügen:
      </div>
      <NameChips 
        targetId={id} 
        onInsert={insertVariableName}
      />

      {/* === HILFETEXT === */}
      <div style={{
        fontSize: 10,
        color: '#0f766e',
        background: '#ecfdf5',
        border: '1px solid #86efac',
        borderRadius: 3,
        padding: 6,
        marginTop: 6
      }}>
        ℹ️ <strong>SIA 261 §6.2.1:</strong> Staudruck = Höhenbeiwert × Referenzdruck
      </div>
    </Shell>
  );
}
```

### evaluate.ts (mit Fehlerbehandlung!)
```typescript
import { GraphNode } from '../../types/graph';
import { BlockEvalRuntime, setSymbol, evalFormula, latexToJs, substituteValues } from '../../utils/evalGraphShared';

export function evaluateWindpressure(node: GraphNode, runtime: BlockEvalRuntime) {
  const d: any = node.data;
  const { symbols, results } = runtime;

  // Formel evaluieren
  const expr = d.latex ? latexToJs(d.latex) : (d.expr || '');
  const v = evalFormula(expr, symbols);

  // Substitution für Anzeige (z.B. "1.6 * 0.4" statt "c_h * q_0")
  const substituted = substituteValues(expr, symbols);

  // Ergebnis speichern
  if (v === null || isNaN(v)) {
    results[node.id] = {
      value: NaN,
      error: 'Berechnung fehlgeschlagen - überprüfe die Eingaben',
      substituted: '',
    };
  } else {
    results[node.id] = { value: v, substituted };
    
    // Symbol verfügbar machen für nachfolgende Blöcke
    if (d.name) {
      setSymbol(symbols, d.name, v);
    }
  }
}
```

### index.ts
```typescript
export { windpressureBlock } from './definition';
export { windpressureDefaults } from './defaults';
```

---

## ⚡ SUPER EINFACHE Neue Workflow!

### SCHNELLSTART (nur 2 Schritte!)

**Schritt 1: Block auto-generieren**
```bash
npm run create-block -- myblockname
# z.B. npm run create-block -- windpressure
```

✅ Alle 5 Dateien werden **automatisch** erstellt:
- definition.ts (mit THEME!)
- defaults.ts (mit allen Feldern)
- evaluate.ts (mit Evaluations-Logic)
- BackendNode.tsx (mit UI)
- index.ts (mit Exports)

**Schritt 2: Registrieren + Starten**
```bash
Cmd+Shift+R    ← Das ist es! 🎉
```

Das ist alles! Der Block ist sofort funktional in:
- ✅ BlockNodes.tsx (auto-generiert)
- ✅ types/graph.ts (BlockType + Interface auto-generiert)
- ✅ BlockNodeShared.tsx (THEME auto-aktualisiert)
- ✅ BlockData Interface (auto-generiert aus defaults.ts)

---

## Alte Methode (falls du selbst Code schreiben möchtest)

Falls du die 5 Dateien lieber selbst schreibst:

1. Ordner erstellen: `mkdir -p src/blocks/windpressure`
2. 5 Dateien hinzufügen (siehe Beispiele unten)
3. THEME in definition.ts definieren
4. `Cmd+Shift+R` drücken → fertig!

---

## 🎯 Die Auto-Generation im Detail

Das `npm run generate-blocks` Script macht jetzt ALLES:

### 1. **BlockType Union aktualisieren** (types/graph.ts)
```typescript
export type BlockType = 
  | 'variable'
  | 'windpressure'  // ← NEU: Dein Block wird automatisch hinzugefügt!
  | 'output'
```

### 2. **BlockData Interface generieren** (types/graph.ts)
Das Script liest deine `defaults.ts` und generiert automatisch die Interface:
```typescript
// Aus deinem defaults.ts:
export function windpressureDefaults(): BlockData {
  return {
    kind: 'windpressure',
    name: 'qp',
    label: 'Staudruck',
    unit: 'kN/m²',
    latex: '...',
    expr: '...',
  };
}

// Script generiert automatisch:
export interface WindpressureData {
  kind: 'windpressure';
  name: string;
  label: string;
  unit: string;
  latex: string;
  expr: string;
}
```

### 3. **BlockData Union aktualisieren** (types/graph.ts)
```typescript
export type BlockData = 
  | VariableData
  | WindpressureData  // ← NEU!
  | OutputData
```

### 4. **Komponente registrieren** (BlockNodes.tsx)
```typescript
import { WindpressureNode } from '../../../blocks/windpressure/BackendNode';

export const nodeTypes = {
  windpressure: WindpressureNode,  // ← NEU!
  output: OutputNode,
};
```

### 5. **THEME aktualisieren** (BlockNodeShared.tsx)
```typescript
export const THEME = {
  windpressure: { 
    bg: '#ecfdf5', 
    border: '#0f766e', 
    icon: '💨', 
    label: 'Wind-Staudruck' 
  },  // ← NEU!
  output: { ... },
};
```

**Alles automatisch!** Du brauchst nur deine 5 Dateien hinzufügen + `npm run generate-blocks`!

---

## Checkliste für produktionsreife Blöcke

Wenn du einen Block erstellst, überprüf diese Punkte:

- ✅ **THEME in definition.ts?** → `bg` und `border` Farben definiert
- ✅ **NameChips implementiert?** → Nutzer kann Variablen durch Klick einfügen
- ✅ **UnitField verwendet?** → Einheiten aus Datenbank, nicht hardcodiert
- ✅ **LaTeX Preview?** → `<MathDisplay />` zeigt wie es aussieht
- ✅ **Fehlerbehandlung?** → `evalFormula` kann `null` zurückgeben → prüfen!
- ✅ **Hilfetext?** → Info/Tooltip für Nutzer (Norm-Referenz, Erklärung)
- ✅ **Beschreibung?** → Optional, aber sinnvoll
- ✅ **Validierung?** → Min/Max, required fields, etc.
- ✅ **Placeholders?** → Dynamisch, nicht statisch "einfach Feldname"

---

## Placeholders: Hilfreiche Beispiele im Feld

**WICHTIG:** Placeholders sollen Beispiele zeigen, aber sie dürfen **NICHT** statisch "einfach Summe" sein!

### ❌ FALSCH: Statischer Placeholder (wie beim Summenblock)
```typescript
// BAD - Das ist statisch und verwirrend!
placeholder="sum"
placeholder="Summe"
```
Problem: Der Nutzer sieht immer das gleiche, egal was er eingibt.

### ✅ RICHTIG: Dynamischer Placeholder

Placeholders sollten **auf die Block-Daten reagieren** und hilfreiche Beispiele geben:

```typescript
// GOOD - Dynamischer Placeholder basierend auf Block-Data
const placeholder = d.name 
  ? `${d.name} = 1.6 \\cdot (...)`  // Zeigt Beispiel mit seinem Namen
  : 'c_h = 1.6 \\cdot (...)';       // Generisches Beispiel

<LatexArea
  value={d.latex}
  placeholder={placeholder}
  onChange={setLatex}
/>
```

### ✅ Andere gute Placeholder-Beispiele:

**Für Input-Felder:**
```typescript
<F value={d.name} placeholder="q_0" />                    // Konkrete Variable
<F value={d.label} placeholder="z.B. Höhe in Metern" />   // Was gehört rein?
<F value={d.unit} placeholder="kN/m²" />                  // Format-Beispiel
```

**Für TextAreas/Beschreibungen:**
```typescript
<textarea 
  placeholder="z.B. Diese Variable repräsentiert die..."
  // vs. placeholder="description"  ← BAD!
/>
```

**Für Formeln mit dynamischem Beispiel:**
```typescript
// Pattern: Nutze den Block-Namen als Basis für das Beispiel
const formulaPlaceholder = d.name
  ? `${d.name} = a + b`              // Mit aktuellen Namen
  : 'z.B. eta = sigma_m / f_m';      // Generisches Fallback
```

### 📋 Placeholder-Richtlinien:

1. **Immer aussagekräftig** - nicht einfach nur "sum", "value", "input"
2. **Mit Beispiel** - zeige dem Nutzer **was konkret** rein soll
3. **Dynamisch** - pass dich an den aktuellen Block-Inhalt an (z.B. mit `d.name`)
4. **Kurz** - max 1-2 Worte oder 1 kurzes Beispiel
5. **Informativ** - präfixe wie "z.B. ...", "Bsp: ...", "Format: ..."

### 🎯 Allgemeine Placeholder-Patterns:

```typescript
// 1. Basis-Pattern für Formeln
const formulaPlaceholder = d.name 
  ? `${d.name} = ...`  // Mit Nutzer-Input
  : 'Bsp: c_h = 1.6 * q_0';

// 2. Pattern für Labels/Beschreibungen
placeholder="z.B. Wind-Staudruck berechnet nach SIA 261"

// 3. Pattern für Namen
placeholder={d.label ? 'z.B. q_0' : 'Variablenname'}

// 4. Pattern für Werte mit Einheiten
placeholder={d.unit ? `Bsp: 1.5 ${d.unit}` : 'Zahlenwert'}

// 5. Pattern für Auswahl/Dropdown
placeholder="Wähle aus der Liste..."
```

**Faustregel:** Ein guter Placeholder sieht **hilfreicher aus als der Feldname** und ändert sich mit den Block-Daten!

---

## Best-Practice Patterns

### Pattern 1: Variable durch NameChips einfügen
```typescript
const insertVariableName = (name: string) => {
  const base = d.latex || d.name;
  const input = textareaRef.current;
  const start = input?.selectionStart ?? base.length;
  const end = input?.selectionEnd ?? start;
  const next = base.slice(0, start) + name + base.slice(end);
  setLatex(next);
  window.setTimeout(() => {
    textareaRef.current?.focus();
    textareaRef.current?.setSelectionRange(start + name.length, start + name.length);
  }, 0);
};

// Im UI:
<NameChips targetId={id} onInsert={insertVariableName} allNames={allNames} />
```

### Pattern 2: Fehlerbehandlung
```typescript
export function evaluateMyblock(node: GraphNode, runtime: BlockEvalRuntime) {
  const v = evalFormula(expr, symbols);
  
  if (v === null || isNaN(v)) {
    results[node.id] = {
      value: NaN,
      error: 'Erklärung was falsch ist',
    };
    return; // Abbrechen!
  }
  
  // Weitermachen...
  results[node.id] = { value: v };
}
```

### Pattern 3: Einheiten aus Datenbank
```typescript
const { unitOptions } = useGraphCtx();

// Im UI:
<UnitField
  value={d.unit}
  onChange={unit => set({ unit })}
/>

// UnitField macht automatisch Dropdown mit verfügbaren Einheiten
```

### Pattern 4: Kapitel-spezifische Daten
```typescript
const { dbTables } = useGraphCtx();

// Nur Tabellen aus diesem Kapitel:
const tables = dbTables.filter(t => t.category === 'wind'); // oder 'snow', 'fire', etc.

// Im Dropdown:
<select onChange={e => set({ table_ref: e.target.value })}>
  {tables.map(t => <option value={t.id}>{t.title}</option>)}
</select>
```

---

## THEME-Farben Referenz

Wähle Hintergrund und Border-Farbe die zusammenpassen:

```javascript
// Grün (für Input/Variable)
{ bg: '#f0fdf4', border: '#16a34a' }

// Blau (für Berechnung)
{ bg: '#eff6ff', border: '#2563eb' }

// Rot (für Fehler/Check)
{ bg: '#fef2f2', border: '#dc2626' }

// Lila (für spezial)
{ bg: '#f5f3ff', border: '#7c3aed' }

// Orange (für Auswahl)
{ bg: '#fff7ed', border: '#ea580c' }
```

---

## So gibst du mir den Code

```
Ich habe einen Block "myblock" erstellt.

[Hier alle 5 Dateien des Blocks einfügen]

Bitte integrieren! 
Ich mach das selbst:
1. Ordner erstellen: src/blocks/myblock
2. Diese 5 Dateien reinkopieren
3. npm run generate-blocks
4. npm run dev
```

**Das war's! Auto-Discovery macht den Rest!** 🚀

---

## Was ändert sich für die Zukunft?

- ✨ **Kein manuelles Updaten mehr!** 
- ✨ **Alles zentralisiert in definition.ts**
- ✨ **THEME-Farben immer konsistent**
- ✨ **BlockNodes.tsx auto-generiert**
- ✨ **types/graph.ts auto-aktualisiert**
- ✨ **BlockNodeShared.tsx auto-aktualisiert**

---

**Das ist jetzt die beste Struktur!** 🎉

---

## VSCode Shortcuts

### 🎯 Cmd+Shift+R - Der Allrounder!
Drück einfach **Cmd+Shift+R** und es läuft:
```
✅ npm run generate-blocks  (alles registriert)
✅ npm run dev             (Frontend lädt nach)
```

Ein Terminal öffnet sich mit der kompletten Ausgabe. Perfekt für die tägliche Entwicklung!

**Wo ist das definiert?** → `.vscode/tasks.json` + `.vscode/keybindings.json`
