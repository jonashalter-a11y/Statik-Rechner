# Complete Block Guide - Produktionsreife Blöcke

## Standard-Features die IMMER dabei sein sollten

Jeder gute Block hat diese Features:

✅ **Variable-Insertion via NameChips** (Knopfklick für vorherige Variablen)  
✅ **Einheiten aus Datenbank** (nicht hardcodiert!)  
✅ **Kapitel-spezifische Daten** (nur CSV/JSON/Diagramme aus diesem Kapitel)  
✅ **LaTeX Preview** (zeigt wie es aussieht)  
✅ **Fehlerbehandlung** (keine Crashes bei ungültigen Eingaben)  
✅ **Hilfetext** (Tooltip oder Info für Nutzer)  

---

## PRODUKTION-Block: Vollständiges Beispiel

Ein **echter, produktionsreifer Block** mit allen Best-Practices:

### definition.ts
```typescript
import { BlockDefinition } from '../types';
import { windpressureDefaults } from './defaults';

export const windpressureBlock: BlockDefinition = {
  type: 'windpressure',
  icon: '💨',
  label: 'Wind-Staudruck',
  color: '#0891b2',
  createDefaultData: windpressureDefaults,
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
    ch_ref: '',        // Node-ID von c_h
    q0_ref: '',        // Node-ID von q_0
  };
}
```

### BackendNode.tsx (PRODKTION - mit allen Features!)
```typescript
import React, { useRef, useMemo } from 'react';
import { NodeProps } from '@xyflow/react';
import { useGraphCtx, DbTableFull } from '../../components/admin/graph/graphContext';
import { 
  Shell, F, LatexArea, NameChips, lbl, inp, UnitField 
} from '../../components/admin/graph/BlockNodeShared';
import MathDisplay from '../../components/MathDisplay';
import { nameToLatex } from '../../utils/formatName';
import { latexToJs } from '../../utils/latexToJs';

export function WindpressureNode({ id, data, selected }: NodeProps) {
  const d = data as any;
  const { updateNodeData, allNames, unitOptions } = useGraphCtx();
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
      const pos = start + token.length;
      textareaRef.current?.setSelectionRange(pos, pos);
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
        allNames={allNames}
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

## Checkliste für produktionsreife Blöcke

Wenn du einen Block erstellst, überprüf diese Punkte:

- ✅ **NameChips implementiert?** → Nutzer kann Variablen durch Klick einfügen
- ✅ **UnitField verwendet?** → Einheiten aus Datenbank, nicht hardcodiert
- ✅ **LaTeX Preview?** → `<MathDisplay />` zeigt wie es aussieht
- ✅ **Fehlerbehandlung?** → `evalFormula` kann `null` zurückgeben → prüfen!
- ✅ **Hilfetext?** → Info/Tooltip für Nutzer (Norm-Referenz, Erklärung)
- ✅ **Beschreibung?** → Optional, aber sinnvoll
- ✅ **Validierung?** → Min/Max, required fields, etc.

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
  // Focus zurücksetzen
  window.setTimeout(() => {
    textareaRef.current?.focus();
    textareaRef.current?.setSelectionRange(start + name.length, start + name.length);
  }, 0);
};

// Im UI:
<NameChips targetId={id} onInsert={insertVariableName} />
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
const { unitOptions } = useGraphCtx(); // aus Store oder API

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

## Was du manuell nach Block-Erstellung hinzufügen musst

Nach dem `npm run generate-blocks` müssen diese 3 Dateien updatet werden:

### 1. BlockNodes.tsx
```typescript
import { WindpressureNode } from '../../../blocks/windpressure/BackendNode';

export const nodeTypes = {
  // ...
  windpressure: WindpressureNode,  // ← HINZUFÜGEN
  // ...
};
```

### 2. types/graph.ts
```typescript
export type BlockType = 
  | 'variable' | 'dropdown' | '...'
  | 'windpressure'  // ← HINZUFÜGEN
  | 'output';

export interface WindpressureData {  // ← HINZUFÜGEN
  kind: 'windpressure';
  name: string;
  label: string;
  unit: string;
  latex: string;
  expr: string;
  description?: string;
}

export type BlockData = 
  | VariableData | DropdownData | '...'
  | WindpressureData  // ← HINZUFÜGEN
  | OutputData;
```

### 3. BlockNodeShared.tsx
```typescript
export const THEME = {
  // ...
  windpressure: { bg: '#ecfdf5', border: '#0f766e', icon: '💨', label: 'Wind-Staudruck' },  // ← HINZUFÜGEN
  // ...
};
```

---

## Beispiel: So gibst du mir den Code

```
Ich habe einen Block "myblock" erstellt:

[hier alle 5 Dateien des Blocks einfügen]

Bitte füge ihn in diese 3 Dateien ein:
- BlockNodes.tsx
- types/graph.ts
- BlockNodeShared.tsx

Hier sind die Details:
- Icon: 🟦
- Label: Mein Block
- Color: #3b82f6
- Theme bg: #eff6ff
```

Dann mach ich das automatisch! ✨

---

## Noch fehlende Features? Denkst du an...

- 📊 **Diagramm-Anzeige im Block?** (um live zu sehen wie Kurven aussehen)
- 📋 **Vorlagen/Templates?** (häufig verwendete Formeln vorausfüllen)
- 🔍 **Formel-Validierung?** (warnt wenn Variablen nicht vorhanden sind)
- 📈 **Variable-Abhängigkeits-Baum?** (zeigt welche Variablen den Block brauchen)
- 💾 **Block-Speichern als Template?** (um häufige Blöcke wiederzuverwenden)

---

**Du gibst mir Code → Ich integriere → Alle 3 Dateien werden aktualisiert!** 🚀
