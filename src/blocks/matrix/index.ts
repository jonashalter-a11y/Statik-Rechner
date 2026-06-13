import { BlockDefinition } from '../types';

export const matrixBlock: BlockDefinition = {
  type: 'matrix',
  icon: '⊞',
  label: 'Materialtabelle',
  color: '#0891b2',
  createDefaultData: () => ({ kind: 'matrix', label: '', row_label: 'Material / Schicht', columns: [], rows: [] }),
};
