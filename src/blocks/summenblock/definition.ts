import { BlockDefinition } from '../types';
import { summenblockDefaults } from './defaults';

export const summenblockBlock: BlockDefinition = {
  type: 'summenblock',
  icon: '➕',
  label: 'Summenblock',
  color: '#16a34a',
  createDefaultData: summenblockDefaults,
};
