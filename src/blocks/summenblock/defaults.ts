import { BlockData } from '../../types/graph';

export function summenblockDefaults(): BlockData {
  return {
    kind: 'summenblock',
    name: 'summe',
    label: 'Summe',
    unit: '',
    expr: '',
  };
}
