import { BlockDefinition } from '../types';
import { switchcalcDefaults } from './defaults';

export const switchcalcBlock: BlockDefinition = {
  type: 'switchcalc',
  icon: '🟧',
  label: 'Switch Rechnung',
  color: '#ea580c',
  createDefaultData: switchcalcDefaults,
  theme: {
    bg: '#fef3f2',
    border: '#ea580c',
  },
};
