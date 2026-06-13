import { BlockData } from '../../types/graph';

export function dropdownDefaults(): BlockData {
  return { kind: 'dropdown', name: '', label: '', mode: 'custom', options: [] };
}
