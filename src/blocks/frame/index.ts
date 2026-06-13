import { BlockDefinition } from '../types';

export const frameBlock: BlockDefinition = {
  type: 'frame',
  icon: '🔲',
  label: 'Rahmen',
  color: '#94a3b8',
  createDefaultData: () => ({ kind: 'frame', label: '', color: '#2563eb' }),
};
