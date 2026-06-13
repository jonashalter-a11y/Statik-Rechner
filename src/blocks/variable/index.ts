import { BlockDefinition } from '../types';

export const variableBlock: BlockDefinition = {
  type: 'variable',
  icon: '🟪',
  label: 'Variabel',
  color: '#7c3aed',
  createDefaultData: () => ({ kind: 'variable', name: '', label: '', unit: '', default_value: '0', inputKind: 'number', options: [] }),
};
