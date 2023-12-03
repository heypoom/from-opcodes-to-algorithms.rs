import { useStore } from "@nanostores/react"
import cn from "classnames"
import { NodeProps } from "reactflow"

import { BlockHandle } from "@/blocks/components"
import { MachineEditor } from "@/editor"
import { $output } from "@/store/results"
import { MachineProps } from "@/types/blocks"

import { MachineValueViewer } from "./components/MachineValueViewer"

export function MachineBlock(props: NodeProps<MachineProps>) {
  const { data } = props
  const { id } = data

  const outputs = useStore($output)
  const state = outputs[id] ?? {}

  const errored = state.status === "Invalid"
  const awaiting = state.status === "Awaiting"
  const halted = state.status === "Halted"
  const backpressuring = state.inboxSize > 50
  const sending = state.outboxSize >= 1

  return (
    <div className="font-mono bg-slate-1 relative group">
      <BlockHandle port={5} type="target" side="left" />

      <div
        className={cn(
          "px-3 py-3 border-2 rounded-2 hover:border-cyan-11",
          errored && "!border-red-9",
          awaiting && "!border-purple-11",
          halted && "border-gray-9",
          backpressuring && "!border-orange-9",
          sending && "border-crimson-11",
        )}
      >
        <div className="flex flex-col space-y-2 text-gray-50">
          <div className="min-h-[100px]">
            <div className="nodrag">
              <MachineEditor {...data} />
            </div>
          </div>

          <MachineValueViewer id={id} state={state} />
        </div>
      </div>

      <BlockHandle port={0} type="source" side="right" className="mt-[-30px]" />
      <BlockHandle port={1} type="source" side="right" />
      <BlockHandle port={2} type="source" side="right" className="mt-[30px]" />
    </div>
  )
}
