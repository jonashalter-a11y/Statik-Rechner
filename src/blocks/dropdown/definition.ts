import { BlockDefinition } from '../types';
import { dropdownDefaults } from './defaults';

export const dropdownBlock: BlockDefinition = {
  type: 'dropdown',
  icon: '🟧',
  label: 'Dropdown',
  color: '#ea580c',
  createDefaultData: dropdownDefaults,
};
