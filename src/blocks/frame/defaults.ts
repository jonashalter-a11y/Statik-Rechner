import { BlockData } from '../../types/graph';

export function frameDefaults(): BlockData {
  return { kind: 'frame', label: '', color: '#2563eb' };
}
