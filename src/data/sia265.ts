import { Chapter, WoodClass } from '../types';

export const woodClasses: WoodClass[] = [
  {
    id: 'C24',
    name: 'C24',
    label: 'C24 – Vollholz Nadelholz',
    properties: {
      f_m_k: 24,   // Biegefestigkeit [N/mm²]
      f_t_0_k: 14, // Zugfestigkeit parallel [N/mm²]
      f_c_0_k: 21, // Druckfestigkeit parallel [N/mm²]
      f_v_k: 2.5,  // Scherfestigkeit [N/mm²]
      E_0_mean: 11000, // E-Modul [N/mm²]
      rho_k: 350,  // Rohdichte [kg/m³]
    },
  },
  {
    id: 'C30',
    name: 'C30',
    label: 'C30 – Vollholz Nadelholz',
    properties: {
      f_m_k: 30,
      f_t_0_k: 18,
      f_c_0_k: 23,
      f_v_k: 2.7,
      E_0_mean: 12000,
      rho_k: 380,
    },
  },
  {
    id: 'GL24h',
    name: 'GL24h',
    label: 'GL24h – Brettschichtholz homogen',
    properties: {
      f_m_k: 24,
      f_t_0_k: 16.5,
      f_c_0_k: 24,
      f_v_k: 2.7,
      E_0_mean: 11600,
      rho_k: 380,
    },
  },
  {
    id: 'GL28h',
    name: 'GL28h',
    label: 'GL28h – Brettschichtholz homogen',
    properties: {
      f_m_k: 28,
      f_t_0_k: 19.5,
      f_c_0_k: 26.5,
      f_v_k: 2.7,
      E_0_mean: 12600,
      rho_k: 410,
    },
  },
];

export const kmod_table: Record<string, Record<string, number>> = {
  // [Feuchteklasse][Lasteinwirkungsdauer]
  '1': { 'permanent': 0.60, 'lang': 0.70, 'mittel': 0.80, 'kurz': 0.90, 'sehr_kurz': 1.10 },
  '2': { 'permanent': 0.60, 'lang': 0.70, 'mittel': 0.80, 'kurz': 0.90, 'sehr_kurz': 1.10 },
  '3': { 'permanent': 0.50, 'lang': 0.55, 'mittel': 0.65, 'kurz': 0.70, 'sehr_kurz': 0.90 },
};

export const chapters: Chapter[] = [
  {
    id: '0',
    number: '0',
    title: 'Geltungsbereich',
    expanded: false,
  },
  {
    id: '1',
    number: '1',
    title: 'Verständigung',
    expanded: false,
    children: [
      { id: '1.1', number: '1.1', title: 'Fachausdrücke' },
      { id: '1.2', number: '1.2', title: 'Bezeichnungen' },
      { id: '1.3', number: '1.3', title: 'Abkürzungen' },
    ],
  },
  {
    id: '2',
    number: '2',
    title: 'Grundsätze',
    expanded: false,
    children: [
      { id: '2.1', number: '2.1', title: 'Allgemeines' },
      { id: '2.2', number: '2.2', title: 'Tragsicherheit' },
      {
        id: '2.3',
        number: '2.3',
        title: 'Gebrauchstauglichkeit',
        children: [
          { id: '2.3.1', number: '2.3.1', title: 'Verformungen' },
          { id: '2.3.2', number: '2.3.2', title: 'Schwingungen' },
        ],
      },
      { id: '2.4', number: '2.4', title: 'Robustheit' },
      { id: '2.5', number: '2.5', title: 'Dauerhaftigkeit' },
    ],
  },
  {
    id: '3',
    number: '3',
    title: 'Baustoffe',
    expanded: true,
    children: [
      {
        id: '3.1',
        number: '3.1',
        title: 'Allgemeines',
        children: [
          { id: '3.1.1', number: '3.1.1', title: 'Charakteristische Werte' },
          { id: '3.1.2', number: '3.1.2', title: 'Stoffgesetze' },
        ],
      },
      {
        id: '3.2',
        number: '3.2',
        title: 'Einfluss von Holzfeuchte',
        children: [
          { id: '3.2.1', number: '3.2.1', title: 'Holzfeuchte und Feuchteklassen' },
          { id: '3.2.2', number: '3.2.2', title: 'Einfluss der Einwirkungsdauer' },
          { id: '3.2.3', number: '3.2.3', title: 'Einfluss der Temperatur' },
        ],
      },
      {
        id: '3.3',
        number: '3.3',
        title: 'Vollholz',
        children: [
          { id: '3.3.1', number: '3.3.1', title: 'Allgemeines' },
          { id: '3.3.2', number: '3.3.2', title: 'Kennzeichnende Eigenschaften' },
        ],
      },
      {
        id: '3.4',
        number: '3.4',
        title: 'Brettschichtholz',
        children: [
          { id: '3.4.1', number: '3.4.1', title: 'Allgemeines' },
          { id: '3.4.2', number: '3.4.2', title: 'Kennzeichnende Eigenschaften' },
        ],
      },
    ],
  },
  {
    id: '4',
    number: '4',
    title: 'Einwirkungen',
    expanded: false,
    children: [
      { id: '4.1', number: '4.1', title: 'Allgemeines' },
      { id: '4.2', number: '4.2', title: 'Lastannahmen' },
    ],
  },
  {
    id: '5',
    number: '5',
    title: 'Tragsicherheit',
    expanded: false,
    children: [
      { id: '5.1', number: '5.1', title: 'Allgemeines' },
      {
        id: '5.2',
        number: '5.2',
        title: 'Biegung',
        verifications: ['biegung_nachweis'],
      },
      {
        id: '5.3',
        number: '5.3',
        title: 'Zug parallel zur Faser',
        verifications: ['zug_nachweis'],
      },
      {
        id: '5.4',
        number: '5.4',
        title: 'Druck parallel zur Faser',
        verifications: ['druck_nachweis'],
      },
      {
        id: '5.5',
        number: '5.5',
        title: 'Schub',
        verifications: ['schub_nachweis'],
      },
      {
        id: '5.6',
        number: '5.6',
        title: 'Biegung und Druck',
        verifications: ['biegung_druck_nachweis'],
      },
    ],
  },
  {
    id: '6',
    number: '6',
    title: 'Gebrauchstauglichkeit',
    expanded: false,
    children: [
      { id: '6.1', number: '6.1', title: 'Verformungen' },
      { id: '6.2', number: '6.2', title: 'Schwingungen' },
    ],
  },
];
