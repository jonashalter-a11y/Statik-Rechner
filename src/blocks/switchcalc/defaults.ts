import { BlockData } from '../../types/graph';

export interface SwitchCalcOption {
  id: string;
  label: string;
  latex: string;
  expr: string;
}

export interface SwitchCalcData extends BlockData {
  kind: 'switchcalc';
  name: string;
  label: string;
  unit: string;
  dropdownLabel: string;
  options: SwitchCalcOption[];
  selectedOptionId: string;
}

export function switchcalcDefaults(): BlockData {
  return {
    kind: 'switchcalc',
    name: '',
    label: '',
    unit: '',
    dropdownLabel: 'Methode',
    options: [
      { id: 'opt1', label: 'Option 1', latex: '', expr: '' },
      { id: 'opt2', label: 'Option 2', latex: '', expr: '' },
    ],
    selectedOptionId: 'opt1',
  } as SwitchCalcData;
}
