import { BlockData } from '../../types/graph';

export function beamvisualDefaults(): BlockData {
  return { kind: 'beamvisual', label: 'Träger', span_var: 'L', span_unit: 'm', left_support: 'pin', right_support: 'roller', loads: [] };
}
