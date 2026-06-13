import { BlockDefinition } from '../types';

export const sectionBlock: BlockDefinition = {
  type: 'section',
  icon: '⊕',
  label: 'Querschnitt',
  color: '#9333ea',
  createDefaultData: () => ({ kind: 'section', label: 'Querschnitt' }),
};
