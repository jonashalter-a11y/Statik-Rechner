import { BlockData } from '../../types/graph';

export function matrixDefaults(): BlockData {
  return { kind: 'matrix', label: '', row_label: 'Material / Schicht', columns: [], rows: [] };
}
