import { BlockDefinition } from '../types';
import { stiffnesscenterDefaults } from './defaults';

export const stiffnesscenterBlock: BlockDefinition = {
  type: 'stiffnesscenter',
  icon: '🏛️',
  label: 'Steifigkeitszentrum & Torsion',
  color: '#0284c7',
  createDefaultData: stiffnesscenterDefaults,
  theme: {
    bg: '#f0f9ff',
    border: '#0284c7',
  },
};
