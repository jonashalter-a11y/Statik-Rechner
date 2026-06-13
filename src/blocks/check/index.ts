import { BlockDefinition } from '../types';

export const checkBlock: BlockDefinition = {
  type: 'check',
  icon: '✅',
  label: 'Nachweis',
  color: '#059669',
  createDefaultData: () => ({ kind: 'check', label: '', latex: '', expr: '' }),
};
