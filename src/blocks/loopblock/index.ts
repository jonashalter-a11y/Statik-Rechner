import { BlockDefinition } from '../types';

export const loopblockBlock: BlockDefinition = {
  type: 'loopblock',
  icon: '⟳',
  label: 'Schleifenblock',
  color: '#c2410c',
  createDefaultData: () => ({
    kind: 'loopblock',
    label: 'Brandschutz Schichten',
    count_label: 'Anzahl Schichten n',
    max_count: 8,
    dropdown_label: 'Material / Schicht i',
    vars: [
      { id: 'v_d', name: 'd', label: 'Schichtdicke', unit: 'mm', default_value: '15' },
      { id: 'v_rho', name: 'rho', label: 'Rohdichte (Mineralwolle)', unit: 'kg/m³', default_value: '26' },
    ],
    outputs: [
      { id: 'tprot', name: 't_{prot,0,i}', label: 'Brandschutzzeit', unit: 'min' },
      { id: 'tins', name: 't_{ins,0,n}', label: 'Isolationszeit n', unit: 'min' },
    ],
    options: [
      { id: 'mw_high', label: 'Mineralwolle (ρ ≥ 26 kg/m³, Schmp. ≥ 1000°C)', formulas: {
        tprot: '0.3 * Math.pow(d, 0.75 * Math.log10(rho) - rho/400)',
        tins: '(0.01 * Math.pow(rho, 0.224) - 0.02) * d * d',
      }},
      { id: 'mw_low', label: 'Mineralwolle (ρ ≥ 15 kg/m³, Schmp. < 1000°C)', formulas: {
        tprot: '0',
        tins: '(0.01 * Math.pow(rho, 0.224) - 0.02) * d * d',
      }},
      { id: 'hfp', label: 'Holzfaserplatte hart (ρ ≥ 250 kg/m³)', formulas: {
        tprot: '0.07 * Math.pow(d, 1.5)',
        tins: '0.019 * d * d',
      }},
      { id: 'osb', label: 'OSB-Platte / Spanplatte (ρ ≥ 550 kg/m³)', formulas: {
        tprot: 'd >= 10 ? 2.8 * d - 14 : 0',
        tins: '0.012 * d * d',
      }},
      { id: 'gkb', label: 'Gipskartonplatte GKB (d ≥ 8 mm)', formulas: {
        tprot: 'd >= 8 ? 2.8 * d - 14 : 0',
        tins: '0.015 * d * d',
      }},
      { id: 'gkf', label: 'Gipskartonplatte GKF / Feuerschutz (d ≥ 8 mm)', formulas: {
        tprot: 'd >= 8 ? 3.0 * d - 14 : 0',
        tins: '0.015 * d * d',
      }},
      { id: 'fermacell', label: 'Gipsfaserplatte Fermacell (d ≥ 10 mm)', formulas: {
        tprot: 'd >= 10 ? 2.8 * d - 14 : 0',
        tins: '0.015 * d * d',
      }},
      { id: 'holz_nf', label: 'Holzschalung Nut+Feder (ρ ≥ 450 kg/m³, d ≥ 15 mm)', formulas: {
        tprot: 'd >= 15 ? 0.1 * Math.pow(d, 1.5) : 0',
        tins: '0.019 * d * d',
      }},
    ],
    aggregations: [
      { output_id: 'tprot', method: 'sum', name: 't_{prot,0}', label: 'Σ Brandschutzzeit', unit: 'min' },
      { output_id: 'tins', method: 'last', name: 't_{ins,0,n}', label: 't_ins letzte Schicht', unit: 'min' },
    ],
  }),
};
