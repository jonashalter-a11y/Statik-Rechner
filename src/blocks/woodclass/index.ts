import { BlockDefinition } from '../types';

export const woodclassBlock: BlockDefinition = {
  type: 'woodclass',
  icon: '🟨',
  label: 'Holzklasse',
  color: '#ca8a04',
  createDefaultData: () => ({ kind: 'woodclass', label: 'Aktuelle Holzklasse' }),
};
