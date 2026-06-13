import { BlockData, BlockType } from '../types/graph';
import { beamvisualBlock } from './beamvisual';
import { calcBlock } from './calc';
import { chartlookupBlock } from './chartlookup';
import { checkBlock } from './check';
import { commentBlock } from './comment';
import { conditionBlock } from './condition';
import { dropdownBlock } from './dropdown';
import { frameBlock } from './frame';
import { groupcalcBlock } from './groupcalc';
import { imageBlock } from './image';
import { loopblockBlock } from './loopblock';
import { matrixBlock } from './matrix';
import { minmaxBlock } from './minmax';
import { outputBlock } from './output';
import { refBlock } from './ref';
import { sectionBlock } from './section';
import { stdcalcBlock } from './stdcalc';
import { tablecalcBlock } from './tablecalc';
import { tablevalueBlock } from './tablevalue';
import { titleBlock } from './title';
import { variableBlock } from './variable';
import { woodclassBlock } from './woodclass';

export const BLOCK_DEFINITIONS = [
  variableBlock,
  dropdownBlock,
  woodclassBlock,
  tablevalueBlock,
  calcBlock,
  stdcalcBlock,
  tablecalcBlock,
  chartlookupBlock,
  conditionBlock,
  checkBlock,
  minmaxBlock,
  imageBlock,
  titleBlock,
  frameBlock,
  refBlock,
  matrixBlock,
  beamvisualBlock,
  sectionBlock,
  commentBlock,
  groupcalcBlock,
  loopblockBlock,
  outputBlock,
] as const;

export const PALETTE = BLOCK_DEFINITIONS.map(({ type, icon, label, color }) => ({ type, icon, label, color }));

export function createDefaultBlockData(type: BlockType): BlockData {
  const definition = BLOCK_DEFINITIONS.find(block => block.type === type);
  if (!definition) throw new Error(`Unbekannter Blocktyp: ${type}`);
  return definition.createDefaultData();
}
