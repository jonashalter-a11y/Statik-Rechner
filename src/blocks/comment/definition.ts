import { BlockDefinition } from '../types';
import { commentDefaults } from './defaults';

export const commentBlock: BlockDefinition = {
  type: 'comment',
  icon: '💬',
  label: 'Kommentar',
  color: '#d97706',
  createDefaultData: commentDefaults,
  theme: {
    bg: '#fffbeb',
    border: '#d97706',
  },
};
