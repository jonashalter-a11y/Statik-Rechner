import { BlockData } from '../../types/graph';

export function polargridDefaults(): BlockData {
  return {
    kind: 'polargrid',
    name: 'I_p',
    label: 'Polares Flaechentraegheitsmoment mit Wänden',
    unit: 'mm^4',
    coord_unit: 'mm',
    point_area: '1',
    point_area_unit: 'mm^2',
    x_min: '-100',
    x_max: '100',
    x_step: '50',
    z_min: '-100',
    z_max: '100',
    z_step: '50',
    max_points: '200',
  };
}
