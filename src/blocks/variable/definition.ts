import { BlockDefinition } from '../types';
import { variableDefaults } from './defaults';

export const variableBlock: BlockDefinition = {
  type: 'variable',
  icon: '🟪',
  label: 'Variabel',
  color: '#7c3aed',
  createDefaultData: variableDefaults,
  theme: {
    bg: '#f5f3ff',
    border: '#7c3aed',
  },
};
