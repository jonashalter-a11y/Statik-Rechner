import { BlockData } from '../../types/graph';

export function tablecalcDefaults(): BlockData {
  return { kind: 'tablecalc', name: '', label: '', unit: '', zones: [], expr: 'cell' };
}
