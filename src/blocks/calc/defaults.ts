import { BlockData } from '../../types/graph';

export function calcDefaults(): BlockData {
  return { kind: 'calc', name: '', label: '', unit: '', latex: '', expr: '' };
}
