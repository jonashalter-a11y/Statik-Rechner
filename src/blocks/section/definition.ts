import { BlockDefinition } from '../types';
import { sectionDefaults } from './defaults';

export const sectionBlock: BlockDefinition = {
  type: 'section',
  icon: '⊕',
  label: 'Querschnitt',
  color: '#9333ea',
  createDefaultData: sectionDefaults,
};
