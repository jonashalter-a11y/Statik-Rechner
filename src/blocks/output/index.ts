import { BlockDefinition } from '../types';

export const outputBlock: BlockDefinition = {
  type: 'output',
  icon: '⬜',
  label: 'PDF / Ausgabe',
  color: '#6b7280',
  createDefaultData: () => ({ kind: 'output', label: 'PDF', blocks: [] }),
};
