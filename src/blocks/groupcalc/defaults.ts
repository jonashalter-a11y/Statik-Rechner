import { BlockData } from '../../types/graph';

export function groupcalcDefaults(): BlockData {
  return { kind: 'groupcalc', label: 'Berechnung', dropdown_label: 'Material / Schicht', vars: [], options: [], outputs: [] };
}
