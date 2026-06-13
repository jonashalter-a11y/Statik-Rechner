import { BlockData } from '../../types/graph';

export function casesDefaults(): BlockData {
  return { kind: 'cases', name: '', label: '', unit: '', mode: 'expr', cases: [] };
}
