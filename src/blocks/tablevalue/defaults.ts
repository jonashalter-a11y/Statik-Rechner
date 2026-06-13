import { BlockData } from '../../types/graph';

export function tablevalueDefaults(): BlockData {
  return { kind: 'tablevalue', name: '', label: '', unit: '', table_col: 1 };
}
