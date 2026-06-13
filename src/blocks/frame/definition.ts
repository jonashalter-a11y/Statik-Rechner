import { BlockDefinition } from '../types';
import { frameDefaults } from './defaults';

export const frameBlock: BlockDefinition = {
  type: 'frame',
  icon: '🔲',
  label: 'Rahmen',
  color: '#94a3b8',
  createDefaultData: frameDefaults,
  theme: {
    bg: '#f8fafc',
    border: '#94a3b8',
  },
};
