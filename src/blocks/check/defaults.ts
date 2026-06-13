import { BlockData } from '../../types/graph';

export function checkDefaults(): BlockData {
  return { kind: 'check', label: '', latex: '', expr: '' };
}
