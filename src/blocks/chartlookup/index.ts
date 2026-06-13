import { BlockDefinition } from '../types';

export const chartlookupBlock: BlockDefinition = {
  type: 'chartlookup',
  icon: '📉',
  label: 'Diagramm-Wert',
  color: '#059669',
  createDefaultData: () => ({ kind: 'chartlookup', chart_ref: '', series_index: 0, x_name: '', name: '', label: '', unit: '' }),
};
