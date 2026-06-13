import { BlockData } from '../../types/graph';

export function variableDefaults(): BlockData {
  return { kind: 'variable', name: '', label: '', unit: '', default_value: '0', inputKind: 'number', options: [] };
}
