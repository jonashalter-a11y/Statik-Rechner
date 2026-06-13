import { BlockDefinition } from '../types';

export const dropdownBlock: BlockDefinition = {
  type: 'dropdown',
  icon: '🟧',
  label: 'Dropdown',
  color: '#ea580c',
  createDefaultData: () => ({ kind: 'dropdown', name: '', label: '', mode: 'custom', options: [] }),
};
