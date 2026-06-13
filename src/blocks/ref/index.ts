import { BlockDefinition } from '../types';

export const refBlock: BlockDefinition = {
  type: 'ref',
  icon: '🔗',
  label: 'Referenz',
  color: '#0369a1',
  createDefaultData: () => ({ kind: 'ref', source_id: '' }),
};
