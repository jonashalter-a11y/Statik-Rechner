import { BlockDefinition } from '../types';
import { refDefaults } from './defaults';

export const refBlock: BlockDefinition = {
  type: 'ref',
  icon: '🔗',
  label: 'Referenz',
  color: '#0369a1',
  createDefaultData: refDefaults,
};
