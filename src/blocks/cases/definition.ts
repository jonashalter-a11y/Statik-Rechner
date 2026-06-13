import { BlockDefinition } from '../types';
import { casesDefaults } from './defaults';

export const casesBlock: BlockDefinition = {
  type: 'cases',
  icon: '⑂',
  label: 'Fallunterscheidung',
  color: '#7c3aed',
  createDefaultData: casesDefaults,
  theme: {
    bg: '#faf5ff',
    border: '#7c3aed',
  },
};
