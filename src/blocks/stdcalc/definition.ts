import { BlockDefinition } from '../types';
import { stdcalcDefaults } from './defaults';

export const stdcalcBlock: BlockDefinition = {
  type: 'stdcalc',
  icon: '🟫',
  label: 'Std-Berechnung',
  color: '#92400e',
  createDefaultData: stdcalcDefaults,
  theme: {
    bg: '#f5f0e8',
    border: '#92400e',
  },
};
