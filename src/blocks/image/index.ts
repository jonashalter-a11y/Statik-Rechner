import { BlockDefinition } from '../types';

export const imageBlock: BlockDefinition = {
  type: 'image',
  icon: '🖼',
  label: 'Bild',
  color: '#a855f7',
  createDefaultData: () => ({ kind: 'image', label: '' }),
};
