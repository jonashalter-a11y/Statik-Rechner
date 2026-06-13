const fs = require('fs');
const path = require('path');

// Theme-Farben für alle Blöcke (aus dem aktuellen THEME)
const THEMES = {
  variable:   { bg: '#f5f3ff', border: '#7c3aed' },
  dropdown:   { bg: '#fff7ed', border: '#ea580c' },
  woodclass:  { bg: '#fefce8', border: '#ca8a04' },
  tablevalue: { bg: '#f0fdf4', border: '#16a34a' },
  calc:       { bg: '#fef2f2', border: '#dc2626' },
  stdcalc:    { bg: '#f5f0e8', border: '#92400e' },
  tablecalc:  { bg: '#eff6ff', border: '#2563eb' },
  chartlookup: { bg: '#ecfdf5', border: '#059669' },
  condition:  { bg: '#fefce8', border: '#ca8a04' },
  check:      { bg: '#f0fdf4', border: '#059669' },
  minmax:     { bg: '#fff1f2', border: '#be123c' },
  image:      { bg: '#fdf4ff', border: '#a855f7' },
  title:      { bg: '#f0f9ff', border: '#0284c7' },
  frame:      { bg: '#f8fafc', border: '#94a3b8' },
  ref:        { bg: '#e0f2fe', border: '#0369a1' },
  cases:      { bg: '#faf5ff', border: '#7c3aed' },
  matrix:     { bg: '#ecfeff', border: '#0891b2' },
  beamvisual: { bg: '#f0fdf4', border: '#15803d' },
  section:    { bg: '#fdf4ff', border: '#9333ea' },
  comment:    { bg: '#fffbeb', border: '#d97706' },
  groupcalc:  { bg: '#f0fdfa', border: '#0f766e' },
  loopblock:  { bg: '#fff7f0', border: '#c2410c' },
  summenblock: { bg: '#f0fdf4', border: '#16a34a' },
  output:     { bg: '#f9fafb', border: '#6b7280' },
};

const blocksDir = path.resolve(__dirname, '../src/blocks');
const items = fs.readdirSync(blocksDir, { withFileTypes: true });

let count = 0;

items
  .filter(item => item.isDirectory() && !item.name.startsWith('.'))
  .forEach(item => {
    const defPath = path.join(blocksDir, item.name, 'definition.ts');
    if (!fs.existsSync(defPath)) return;

    let content = fs.readFileSync(defPath, 'utf-8');

    // Check if theme already exists
    if (content.includes('theme:')) {
      console.log(`⏭️  ${item.name} - already has theme`);
      return;
    }

    // Get type from definition
    const typeMatch = content.match(/type:\s*['"](\w+)['"]/);
    if (!typeMatch) return;

    const type = typeMatch[1];
    const theme = THEMES[type];

    if (!theme) {
      console.log(`⚠️  ${item.name} - no theme found for type '${type}'`);
      return;
    }

    // Find closing brace of BlockDefinition object
    const blockMatch = content.match(/export const \w+Block: BlockDefinition = \{[\s\S]*?\};/);
    if (!blockMatch) return;

    const oldDefinition = blockMatch[0];
    const newDefinition = oldDefinition.replace(
      /,?\s*\};$/,
      `,
  theme: {
    bg: '${theme.bg}',
    border: '${theme.border}',
  },
};`
    );

    content = content.replace(oldDefinition, newDefinition);
    fs.writeFileSync(defPath, content, 'utf-8');

    console.log(`✅ ${item.name} - added theme`);
    count++;
  });

console.log(`\n✨ Updated ${count} blocks with theme data`);
