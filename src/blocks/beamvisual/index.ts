import { BlockDefinition } from '../types';

export const beamvisualBlock: BlockDefinition = {
  type: 'beamvisual',
  icon: '🏗',
  label: 'Träger',
  color: '#15803d',
  createDefaultData: () => ({ kind: 'beamvisual', label: 'Träger', span_var: 'L', span_unit: 'm', left_support: 'pin', right_support: 'roller', loads: [] }),
};
