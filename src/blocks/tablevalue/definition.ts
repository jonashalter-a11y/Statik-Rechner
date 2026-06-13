import { BlockDefinition } from '../types';
import { tablevalueDefaults } from './defaults';

export const tablevalueBlock: BlockDefinition = {
  type: 'tablevalue',
  icon: '🟩',
  label: 'Tabellenwert',
  color: '#16a34a',
  createDefaultData: tablevalueDefaults,
  theme: {
    bg: '#f0fdf4',
    border: '#16a34a',
  },
};
