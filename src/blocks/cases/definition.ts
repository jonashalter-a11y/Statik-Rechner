import { BlockDefinition } from '../types';
import { casesDefaults } from './defaults';

export const casesBlock: BlockDefinition = {
  type: 'cases',
  icon: '⑂',
  label: 'Fallunterscheidung',
  color: '#7c3aed',
  createDefaultData: casesDefaults,
};
