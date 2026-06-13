import { BlockDefinition } from '../types';

export const calcBlock: BlockDefinition = {
  type: 'calc',
  icon: '🟥',
  label: 'Rechnung',
  color: '#dc2626',
  createDefaultData: () => ({ kind: 'calc', name: '', label: '', unit: '', latex: '', expr: '' }),
};
