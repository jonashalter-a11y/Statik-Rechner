import { BlockDefinition } from '../types';
import { chartlookupDefaults } from './defaults';

export const chartlookupBlock: BlockDefinition = {
  type: 'chartlookup',
  icon: '📉',
  label: 'Diagramm-Wert',
  color: '#059669',
  createDefaultData: chartlookupDefaults,
};
