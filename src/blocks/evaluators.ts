import { GraphNode } from '../types/graph';
import { BlockEvalRuntime } from '../utils/evalGraphShared';
import { evaluateVariable } from './variable/evaluate';
import { evaluateDropdown } from './dropdown/evaluate';
import { evaluateWoodClass } from './woodclass/evaluate';
import { evaluateTableValue } from './tablevalue/evaluate';
import { evaluateCalc } from './calc/evaluate';
import { evaluateTableCalc } from './tablecalc/evaluate';
import { evaluateStdCalc } from './stdcalc/evaluate';
import { evaluateChartLookup } from './chartlookup/evaluate';
import { evaluateCondition } from './condition/evaluate';
import { evaluateCheck } from './check/evaluate';
import { evaluateMinMax } from './minmax/evaluate';
import { evaluateCases } from './cases/evaluate';
import { evaluateTitle } from './title/evaluate';
import { evaluateFrame } from './frame/evaluate';
import { evaluateMatrix } from './matrix/evaluate';
import { evaluateRef } from './ref/evaluate';
import { evaluateBeamVisual } from './beamvisual/evaluate';
import { evaluateLoopBlock } from './loopblock/evaluate';
import { evaluateGroupCalc } from './groupcalc/evaluate';
import { evaluateSection } from './section/evaluate';
import { evaluateComment } from './comment/evaluate';
import { evaluateImage } from './image/evaluate';
import { evaluateOutput } from './output/evaluate';

export type BlockEvaluator = (node: GraphNode, runtime: BlockEvalRuntime) => void;

export const BLOCK_EVALUATORS: Record<string, BlockEvaluator> = {
  variable: evaluateVariable,
  dropdown: evaluateDropdown,
  woodclass: evaluateWoodClass,
  tablevalue: evaluateTableValue,
  calc: evaluateCalc,
  tablecalc: evaluateTableCalc,
  stdcalc: evaluateStdCalc,
  chartlookup: evaluateChartLookup,
  condition: evaluateCondition,
  check: evaluateCheck,
  minmax: evaluateMinMax,
  cases: evaluateCases,
  title: evaluateTitle,
  frame: evaluateFrame,
  matrix: evaluateMatrix,
  ref: evaluateRef,
  beamvisual: evaluateBeamVisual,
  loopblock: evaluateLoopBlock,
  groupcalc: evaluateGroupCalc,
  section: evaluateSection,
  comment: evaluateComment,
  image: evaluateImage,
  output: evaluateOutput,
};
