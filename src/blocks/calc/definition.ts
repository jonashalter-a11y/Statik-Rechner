import { BlockDefinition } from '../types';
import { calcDefaults } from './defaults';

export const calcBlock: BlockDefinition = {
  type: 'calc',
  icon: '🟥',
  label: 'Rechnung',
  color: '#dc2626',
  createDefaultData: calcDefaults,
  theme: {
    bg: '#fef2f2',
    border: '#dc2626',
  },
};
