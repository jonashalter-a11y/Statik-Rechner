import { BlockDefinition } from '../types';

export const commentBlock: BlockDefinition = {
  type: 'comment',
  icon: '💬',
  label: 'Kommentar',
  color: '#d97706',
  createDefaultData: () => ({ kind: 'comment', text: '', extra: 'none' }),
};
