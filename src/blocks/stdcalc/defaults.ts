import { BlockData } from '../../types/graph';

export function stdcalcDefaults(): BlockData {
  return { kind: 'stdcalc', name: '', label: '', unit: '', latex: '', expr: '', picker_name: '' };
}
