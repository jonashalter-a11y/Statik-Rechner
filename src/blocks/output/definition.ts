import { BlockDefinition } from '../types';
import { outputDefaults } from './defaults';

export const outputBlock: BlockDefinition = {
  type: 'output',
  icon: '⬜',
  label: 'PDF / Ausgabe',
  color: '#6b7280',
  createDefaultData: outputDefaults,
};
