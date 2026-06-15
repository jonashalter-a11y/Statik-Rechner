import { BlockData } from '../../types/graph';

// Leerer Schleifenblock — beim Einfügen sind keine Beispielwerte vorbelegt.
// Felder/Listen werden im Editor-Node über die "+"-Buttons befüllt.
export function loopblockDefaults(): BlockData {
  return {
    kind: 'loopblock',
    label: '',
    count_label: '',
    max_count: 10,
    dropdown_label: '',
    option_categories: ['Bekleidung', 'Dämmung', 'Hohlraum'],
    vars: [],
    outputs: [],
    options: [],
    aggregations: [],
  } as unknown as BlockData;
}
