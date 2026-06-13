import { BlockDefinition } from '../types';
import { stdcalcDefaults } from './defaults';

export const stdcalcBlock: BlockDefinition = {
  type: 'stdcalc',
  icon: '🟫',
  label: 'Std-Berechnung',
  color: '#92400e',
  createDefaultData: stdcalcDefaults,
};
