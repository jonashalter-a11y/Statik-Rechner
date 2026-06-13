#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const blockName = process.argv[2];

if (!blockName) {
  console.error('❌ Usage: npm run create-block -- myblockname');
  console.error('   (blockname muss lowercase sein, z.B. myblock, windpressure)');
  process.exit(1);
}

// Validierung
if (!/^[a-z][a-z0-9_]*$/.test(blockName)) {
  console.error('❌ Blockname muss lowercase sein und mit Buchstabe anfangen!');
  console.error('   Erlaubt: a-z, 0-9, _');
  process.exit(1);
}

const blockDir = path.resolve(__dirname, `../src/blocks/${blockName}`);

// Ordner existiert bereits?
if (fs.existsSync(blockDir)) {
  console.error(`❌ Block "${blockName}" existiert bereits!`);
  process.exit(1);
}

// Ordner erstellen
fs.mkdirSync(blockDir, { recursive: true });

// Capitalized Name für Function-Namen
const blockNameCapitalized = blockName
  .split('_')
  .map(w => w.charAt(0).toUpperCase() + w.slice(1))
  .join('');

// 1. definition.ts
const definitionContent = `import { BlockDefinition } from '../types';
import { ${blockName}Defaults } from './defaults';

export const ${blockName}Block: BlockDefinition = {
  type: '${blockName}',
  icon: '🟪',
  label: '${blockNameCapitalized}',
  color: '#7c3aed',
  createDefaultData: ${blockName}Defaults,
  theme: {
    bg: '#f5f3ff',
    border: '#7c3aed',
  },
};
`;

// 2. defaults.ts
const defaultsContent = `import { BlockData } from '../../types/graph';

export function ${blockName}Defaults(): BlockData {
  return {
    kind: '${blockName}',
    name: 'x',
    label: '${blockNameCapitalized}',
    unit: '',
    latex: 'x = a',
    expr: 'a',
    description: '',
  };
}
`;

// 3. evaluate.ts
const evaluateContent = `import { GraphNode } from '../../types/graph';
import { BlockEvalRuntime, setSymbol, evalFormula } from '../../utils/evalGraphShared';

export function evaluate${blockNameCapitalized}(node: GraphNode, runtime: BlockEvalRuntime) {
  const d: any = node.data;
  const { symbols, results } = runtime;

  const expr = d.expr || '';
  const v = evalFormula(expr, symbols);

  if (v === null || isNaN(v)) {
    results[node.id] = {
      value: NaN,
      error: 'Berechnung fehlgeschlagen',
    };
  } else {
    results[node.id] = { value: v };
    if (d.name) {
      setSymbol(symbols, d.name, v);
    }
  }
}
`;

// 4. BackendNode.tsx
const backendNodeContent = `import React, { useRef } from 'react';
import { NodeProps } from '@xyflow/react';
import { useGraphCtx } from '../../components/admin/graph/graphContext';
import {
  Shell,
  F,
  LatexArea,
  NameChips,
  lbl,
  inp,
  UnitField,
} from '../../components/admin/graph/BlockNodeShared';
import MathDisplay from '../../components/MathDisplay';
import { nameToLatex } from '../../utils/formatName';
import { latexToJs } from '../../utils/latexToJs';

export function ${blockNameCapitalized}Node({ id, data, selected }: NodeProps) {
  const d = data as any;
  const { updateNodeData } = useGraphCtx();
  const set = (p: Partial<typeof d>) => updateNodeData(id, p);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const setLatex = (latex: string) => {
    set({ latex, expr: latexToJs(latex) });
  };

  const insertVariableName = (name: string) => {
    const token = name;
    const base = d.latex || 'x = ';
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
    <Shell id={id} type="${blockName}" selected={selected}>
      <div style={lbl}>Name (LaTeX)</div>
      <F
        value={d.name}
        placeholder="x"
        onChange={e => set({ name: e.target.value })}
      />
      {d.name && (
        <div style={{ fontSize: 10, marginTop: 1, padding: 4, background: '#f8fafc', borderRadius: 3 }}>
          <MathDisplay latex={nameToLatex(d.name)} />
        </div>
      )}

      <div style={lbl}>Bezeichnung</div>
      <F
        value={d.label}
        placeholder="Beschreibung"
        onChange={e => set({ label: e.target.value })}
      />

      <div style={lbl}>Einheit</div>
      <UnitField
        value={d.unit}
        onChange={unit => set({ unit })}
        placeholder="z.B. kN/m²"
      />

      <div style={lbl}>Beschreibung (optional)</div>
      <textarea
        value={d.description || ''}
        onChange={e => set({ description: e.target.value })}
        placeholder="Erklärung für Nutzer..."
        style={{ ...inp, minHeight: 30, fontFamily: 'inherit', resize: 'vertical' }}
      />

      <div style={lbl}>Formel (LaTeX)</div>
      <LatexArea
        elRef={textareaRef}
        value={d.latex}
        placeholder="x = a"
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
          fontSize: 10,
        }}>
          <MathDisplay latex={d.latex} display />
        </div>
      )}

      <div style={{ fontSize: 9, color: '#6b7280', marginTop: 4, marginBottom: 2 }}>
        💡 Variablen einfügen:
      </div>
      <NameChips targetId={id} onInsert={insertVariableName} />
    </Shell>
  );
}
`;

// 5. index.ts
const indexContent = `export { ${blockName}Block } from './definition';
export { ${blockName}Defaults } from './defaults';
`;

// Schreibe alle Dateien
fs.writeFileSync(path.join(blockDir, 'definition.ts'), definitionContent);
fs.writeFileSync(path.join(blockDir, 'defaults.ts'), defaultsContent);
fs.writeFileSync(path.join(blockDir, 'evaluate.ts'), evaluateContent);
fs.writeFileSync(path.join(blockDir, 'BackendNode.tsx'), backendNodeContent);
fs.writeFileSync(path.join(blockDir, 'index.ts'), indexContent);

console.log(`✅ Block "${blockName}" erstellt!`);
console.log(`   📁 ${blockDir}`);
console.log(`   📝 5 Dateien generiert`);
console.log(`\n🚀 Jetzt: npm run generate-blocks`);
