import { BlockDefinition } from '../types';
import { conditionDefaults } from './defaults';

export const conditionBlock: BlockDefinition = {
  type: 'condition',
  icon: '🔶',
  label: 'Bedingung',
  color: '#ca8a04',
  createDefaultData: conditionDefaults,
};
