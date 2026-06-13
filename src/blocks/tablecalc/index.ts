import { BlockDefinition } from '../types';

export const tablecalcBlock: BlockDefinition = {
  type: 'tablecalc',
  icon: '🟦',
  label: 'Tabellenberechnung',
  color: '#2563eb',
  createDefaultData: () => ({ kind: 'tablecalc', name: '', label: '', unit: '', zones: [], expr: 'cell' }),
};
