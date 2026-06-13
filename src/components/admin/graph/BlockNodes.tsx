import { VariableNode } from '../../../blocks/variable/BackendNode';
import { DropdownNode } from '../../../blocks/dropdown/BackendNode';
import { WoodClassNode } from '../../../blocks/woodclass/BackendNode';
import { TableValueNode } from '../../../blocks/tablevalue/BackendNode';
import { CalcNode } from '../../../blocks/calc/BackendNode';
import { StdCalcNode } from '../../../blocks/stdcalc/BackendNode';
import { TableCalcNode } from '../../../blocks/tablecalc/BackendNode';
import { ChartLookupNode } from '../../../blocks/chartlookup/BackendNode';
import { ConditionNode } from '../../../blocks/condition/BackendNode';
import { CheckNode } from '../../../blocks/check/BackendNode';
import { OutputNode } from '../../../blocks/output/BackendNode';
import { MinMaxNode } from '../../../blocks/minmax/BackendNode';
import { ImageNode } from '../../../blocks/image/BackendNode';
import { TitleNode } from '../../../blocks/title/BackendNode';
import { FrameNode } from '../../../blocks/frame/BackendNode';
import { RefNode } from '../../../blocks/ref/BackendNode';
import { CasesNode } from '../../../blocks/cases/BackendNode';
import { MatrixNode } from '../../../blocks/matrix/BackendNode';
import { BeamVisualNode } from '../../../blocks/beamvisual/BackendNode';
import { CommentNode } from '../../../blocks/comment/BackendNode';
import { SectionNode } from '../../../blocks/section/BackendNode';
import { GroupCalcNode } from '../../../blocks/groupcalc/BackendNode';
import { LoopBlockNode } from '../../../blocks/loopblock/BackendNode';
import { SummenblockNode } from '../../../blocks/summenblock/BackendNode';

export const nodeTypes = {
  variable: VariableNode,
  dropdown: DropdownNode,
  woodclass: WoodClassNode,
  tablevalue: TableValueNode,
  calc: CalcNode,
  stdcalc: StdCalcNode,
  tablecalc: TableCalcNode,
  chartlookup: ChartLookupNode,
  condition: ConditionNode,
  check: CheckNode,
  minmax: MinMaxNode,
  image: ImageNode,
  title: TitleNode,
  frame: FrameNode,
  ref: RefNode,
  cases: CasesNode,
  matrix: MatrixNode,
  beamvisual: BeamVisualNode,
  section: SectionNode,
  comment: CommentNode,
  groupcalc: GroupCalcNode,
  loopblock: LoopBlockNode,
  summenblock: SummenblockNode,
  output: OutputNode,
};
