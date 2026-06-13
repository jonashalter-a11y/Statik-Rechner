import { BlockDefinition } from '../types';
import { matrixDefaults } from './defaults';

export const matrixBlock: BlockDefinition = {
  type: 'matrix',
  icon: '⊞',
  label: 'Materialtabelle',
  color: '#0891b2',
  createDefaultData: matrixDefaults,
};
