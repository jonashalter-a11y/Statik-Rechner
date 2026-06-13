import { BlockData } from '../../types/graph';

export function minmaxDefaults(): BlockData {
  return { kind: 'minmax', name: '', label: '', unit: '', latex: '', expr: '' };
}
