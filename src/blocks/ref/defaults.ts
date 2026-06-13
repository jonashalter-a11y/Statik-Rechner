import { BlockData } from '../../types/graph';

export function refDefaults(): BlockData {
  return { kind: 'ref', source_id: '' };
}
