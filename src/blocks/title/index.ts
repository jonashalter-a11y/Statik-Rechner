import { BlockDefinition } from '../types';

export const titleBlock: BlockDefinition = {
  type: 'title',
  icon: '📌',
  label: 'Titel',
  color: '#0284c7',
  createDefaultData: () => ({ kind: 'title', label: '', color: '#2563eb' }),
};
