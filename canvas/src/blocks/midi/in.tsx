import { useCallback, useEffect, useReducer, useRef, useState } from "react"
import cx from "classnames"
import { NodeProps } from "reactflow"
import { MidiInputEvent as _MidiInputEvent } from "machine-wasm"

import { MidiInProps } from "../../types/blocks"
import { RightClickMenu } from "../components/RightClickMenu"

import { useStore } from "@nanostores/react"
import { $midi } from "../../store/midi"
import { engine } from "../../engine"

import {
  MidiEvent,
  isControlChangeEvent,
  isNoteEvent,
  midiManager,
} from "../../services/midi"

import { $status } from "../../store/status"
import { updateNodeData } from "../../store/blocks"
import { MidiTransportForm } from "./transport"

import { MidiInputEvent } from "../../types/enums"
import { BlockHandle } from "../components/BlockHandle"
import { RadixSelect } from "../../ui/select"

const events = Object.keys(_MidiInputEvent).filter(
  (key) => !isNaN(Number(_MidiInputEvent[key as MidiInputEvent])),
) as MidiInputEvent[]

const eventOptions = events.map((value) => ({ value, label: value }))

export const MidiInBlock = (props: NodeProps<MidiInProps>) => {
  const { id, on, port, channels } = props.data

  const midi = useStore($midi)
  const status = useStore($status)
  const key = useRef("")

  const [last, setLast] = useState<[number, number, number] | null>(null)
  const [showSettings, toggle] = useReducer((n) => !n, false)

  function update(input: Partial<MidiInProps>) {
    updateNodeData(id, input)

    if (typeof input.on === "string") {
      engine.send(id, { SetMidiInputEvent: { event: input.on } })
    }

    if (typeof input.port === "number") {
      engine.send(id, { SetMidiPort: { port: input.port } })
    }

    if ("channels" in input) {
      engine.send(id, { SetMidiChannels: { channels: input.channels ?? [] } })
    }
  }

  const handle = useCallback(
    (e: MidiEvent) => {
      let note = 0
      let value = 0
      const channel = e.message.channel ?? 0

      if (isControlChangeEvent(e)) {
        note = e.controller.number
        if (e.rawValue) value = e.rawValue
      }

      if (isNoteEvent(e)) {
        note = e.note.number
        value = e.note.rawAttack
      }

      setLast([note, value, channel])
      engine.send(id, { Midi: { event: on, value, note, channel, port } })

      if (!status.running) engine.stepSlow()
    },
    [id, on, port, status.running],
  )

  useEffect(() => {
    const currKey = `${id}-${on}-${port}-${channels}`
    if (key.current === currKey) return

    midiManager.on(id, { type: on, handle, channels, port }).then()

    key.current = currKey
  }, [id, on, port, channels])

  const reset = () => setLast(null)

  return (
    <div className="group">
      <div>
        <RightClickMenu
          id={id}
          show={showSettings}
          toggle={toggle}
          onReset={reset}
        >
          <div
            className={cx(
              "px-4 py-2 border-2 border-crimson-9 font-mono text-crimson-11 space-y-2",
            )}
          >
            {last ? (
              <div className="text-1">
                {on}(n = {last[0]}, v = {last[1]}, ch = {last[2]})
              </div>
            ) : (
              <div className="text-1">{on}</div>
            )}

            {showSettings && (
              <div className="max-w-[200px] space-y-3">
                <div
                  className="grid items-center gap-4 w-full text-gray-11"
                  style={{
                    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr)",
                  }}
                >
                  <p className="text-[10px]">Event</p>

                  <RadixSelect
                    value={on}
                    onChange={(v) => update({ on: v as MidiInputEvent })}
                    options={eventOptions}
                  />
                </div>

                <MidiTransportForm
                  port={port}
                  channels={channels}
                  ports={midi.inputs}
                  mode="in"
                  onChange={update}
                />
              </div>
            )}
          </div>
        </RightClickMenu>
      </div>

      <BlockHandle port={0} side="right" type="source" />
    </div>
  )
}
