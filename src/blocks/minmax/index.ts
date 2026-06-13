import { BlockDefinition } from '../types';

export const minmaxBlock: BlockDefinition = {
  type: 'minmax',
  icon: '↕',
  label: 'Min / Max',
  color: '#be123c',
  createDefaultData: () => ({ kind: 'minmax', name: '', label: '', unit: '', latex: '', expr: '' }),
};
