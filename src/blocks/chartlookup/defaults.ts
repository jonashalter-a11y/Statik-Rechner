import { BlockData } from '../../types/graph';

export function chartlookupDefaults(): BlockData {
  return { kind: 'chartlookup', chart_ref: '', series_index: 0, x_name: '', name: '', label: '', unit: '' };
}
