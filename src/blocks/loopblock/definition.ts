import { BlockDefinition } from '../types';
import { loopblockDefaults } from './defaults';

export const loopblockBlock: BlockDefinition = {
  type: 'loopblock',
  icon: '⟳',
  label: 'Schleifenblock',
  color: '#c2410c',
  createDefaultData: loopblockDefaults,
  theme: {
    bg: '#fff7f0',
    border: '#c2410c',
  },
};
