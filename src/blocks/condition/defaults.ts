import { BlockData } from '../../types/graph';

export function conditionDefaults(): BlockData {
  return { kind: 'condition', label: '', conditions: [] };
}
