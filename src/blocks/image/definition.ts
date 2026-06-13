import { BlockDefinition } from '../types';
import { imageDefaults } from './defaults';

export const imageBlock: BlockDefinition = {
  type: 'image',
  icon: '🖼',
  label: 'Bild',
  color: '#a855f7',
  createDefaultData: imageDefaults,
  theme: {
    bg: '#fdf4ff',
    border: '#a855f7',
  },
};
