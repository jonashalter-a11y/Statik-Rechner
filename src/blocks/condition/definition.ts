import { BlockDefinition } from '../types';
import { conditionDefaults } from './defaults';

export const conditionBlock: BlockDefinition = {
  type: 'condition',
  icon: '🔶',
  label: 'Bedingung',
  color: '#ca8a04',
  createDefaultData: conditionDefaults,
  theme: {
    bg: '#fefce8',
    border: '#ca8a04',
  },
};
