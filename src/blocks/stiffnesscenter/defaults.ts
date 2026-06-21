import { BlockData } from '../../types/graph';

export function stiffnesscenterDefaults(): BlockData {
  return {
    kind: 'stiffnesscenter',
    name: 'S',
    label: 'Steifigkeitszentrum',
    method: 'EKV',
    b_x: '10',
    b_y: '8',
    walls: [],
  };
}
