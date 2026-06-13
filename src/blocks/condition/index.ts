import { BlockDefinition } from '../types';

export const conditionBlock: BlockDefinition = {
  type: 'condition',
  icon: '🔶',
  label: 'Bedingung',
  color: '#ca8a04',
  createDefaultData: () => ({ kind: 'condition', label: '', conditions: [] }),
};
