import { Node, NodeProps } from "reactflow"

import {
  MachineProps,
  MidiInProps,
  MidiOutProps,
  OscProps,
  PixelProps,
  PlotterProps,
  TapProps,
} from "./blocks"

export interface BlockTypeMap {
  Machine: MachineProps
  Pixel: PixelProps
  Tap: TapProps
  Plot: PlotterProps
  Osc: OscProps
  MidiIn: MidiInProps
  MidiOut: MidiOutProps
}

export type BlockTypes = keyof BlockTypeMap
export type BlockValues = BlockTypeMap[BlockTypes]

export type BlockNode = Node<BlockValues, BlockTypes>
export type TNode<T extends BlockTypes> = Node<BlockTypeMap[T], T>

export type BlockComponentMap = {
  [N in BlockTypes]: (props: NodeProps<BlockTypeMap[N]>) => React.ReactNode
}
