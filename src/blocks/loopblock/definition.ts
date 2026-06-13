import { BlockDefinition } from '../types';
import { loopblockDefaults } from './defaults';

export const loopblockBlock: BlockDefinition = {
  type: 'loopblock',
  icon: '⟳',
  label: 'Schleifenblock',
  color: '#c2410c',
  createDefaultData: loopblockDefaults,
};
