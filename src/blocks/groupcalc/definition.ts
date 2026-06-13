import { BlockDefinition } from '../types';
import { groupcalcDefaults } from './defaults';

export const groupcalcBlock: BlockDefinition = {
  type: 'groupcalc',
  icon: '⚙',
  label: 'Gruppenberechnung',
  color: '#0f766e',
  createDefaultData: groupcalcDefaults,
};
