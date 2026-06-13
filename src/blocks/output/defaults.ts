import { BlockData } from '../../types/graph';

export function outputDefaults(): BlockData {
  return { kind: 'output', label: 'PDF', blocks: [] };
}
