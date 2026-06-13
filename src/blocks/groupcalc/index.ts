import { BlockDefinition } from '../types';

export const groupcalcBlock: BlockDefinition = {
  type: 'groupcalc',
  icon: '⚙',
  label: 'Gruppenberechnung',
  color: '#0f766e',
  createDefaultData: () => ({ kind: 'groupcalc', label: 'Berechnung', dropdown_label: 'Material / Schicht', vars: [], options: [], outputs: [] }),
};
