import { BlockDefinition } from '../types';
import { minmaxDefaults } from './defaults';

export const minmaxBlock: BlockDefinition = {
  type: 'minmax',
  icon: '↕',
  label: 'Min / Max',
  color: '#be123c',
  createDefaultData: minmaxDefaults,
  theme: {
    bg: '#fff1f2',
    border: '#be123c',
  },
};
