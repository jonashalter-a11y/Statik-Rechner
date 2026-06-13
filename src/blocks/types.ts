import { BlockData, BlockType } from '../types/graph';

export interface BlockDefinition {
  type: BlockType;
  icon: string;
  label: string;
  color: string;
  createDefaultData: () => BlockData;
  theme?: {
    bg: string;
    border: string;
  };
}
