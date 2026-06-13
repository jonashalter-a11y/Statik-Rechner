import { BlockData } from '../../types/graph';

export function commentDefaults(): BlockData {
  return { kind: 'comment', text: '', extra: 'none' };
}
