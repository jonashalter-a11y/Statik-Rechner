import { BlockDefinition } from '../types';
import { checkDefaults } from './defaults';

export const checkBlock: BlockDefinition = {
  type: 'check',
  icon: '✅',
  label: 'Nachweis',
  color: '#059669',
  createDefaultData: checkDefaults,
};
