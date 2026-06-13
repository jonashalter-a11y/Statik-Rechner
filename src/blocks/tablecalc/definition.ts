import { BlockDefinition } from '../types';
import { tablecalcDefaults } from './defaults';

export const tablecalcBlock: BlockDefinition = {
  type: 'tablecalc',
  icon: '🟦',
  label: 'Tabellenberechnung',
  color: '#2563eb',
  createDefaultData: tablecalcDefaults,
};
