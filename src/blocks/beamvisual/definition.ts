import { BlockDefinition } from '../types';
import { beamvisualDefaults } from './defaults';

export const beamvisualBlock: BlockDefinition = {
  type: 'beamvisual',
  icon: '🏗',
  label: 'Träger',
  color: '#15803d',
  createDefaultData: beamvisualDefaults,
};
