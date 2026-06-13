import { BlockDefinition } from '../types';

export const tablevalueBlock: BlockDefinition = {
  type: 'tablevalue',
  icon: '🟩',
  label: 'Tabellenwert',
  color: '#16a34a',
  createDefaultData: () => ({ kind: 'tablevalue', name: '', label: '', unit: '', table_col: 1 }),
};
