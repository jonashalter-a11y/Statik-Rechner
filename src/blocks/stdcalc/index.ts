import { BlockDefinition } from '../types';

export const stdcalcBlock: BlockDefinition = {
  type: 'stdcalc',
  icon: '🟫',
  label: 'Std-Berechnung',
  color: '#92400e',
  createDefaultData: () => ({ kind: 'stdcalc', name: '', label: '', unit: '', latex: '', expr: '', picker_name: '' }),
};
