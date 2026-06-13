import { BlockDefinition } from '../types';
import { woodclassDefaults } from './defaults';

export const woodclassBlock: BlockDefinition = {
  type: 'woodclass',
  icon: '🟨',
  label: 'Holzklasse',
  color: '#ca8a04',
  createDefaultData: woodclassDefaults,
  theme: {
    bg: '#fefce8',
    border: '#ca8a04',
  },
};
