import { BlockDefinition } from '../types';
import { titleDefaults } from './defaults';

export const titleBlock: BlockDefinition = {
  type: 'title',
  icon: '📌',
  label: 'Titel',
  color: '#0284c7',
  createDefaultData: titleDefaults,
  theme: {
    bg: '#f0f9ff',
    border: '#0284c7',
  },
};
