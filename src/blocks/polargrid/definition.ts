import { BlockDefinition } from '../types';
import { polargridDefaults } from './defaults';

export const polargridBlock: BlockDefinition = {
  type: 'polargrid',
  icon: '⊙',
  label: 'Polar-Raster',
  color: '#0f766e',
  createDefaultData: polargridDefaults,
  theme: {
    bg: '#ecfdf5',
    border: '#0f766e',
  },
};
