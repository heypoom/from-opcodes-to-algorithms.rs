import { useStore } from "@nanostores/react"
import cn from "classnames"
import { memo } from "react"

import { BaseBlock, createSchema } from "@/blocks"
import { engine } from "@/engine"
import { $remoteValues, updateValueViewers } from "@/store/remote-values"
import { BlockPropsOf } from "@/types/Node"

import { bitsToList } from "./utils/bits-to-list"
import { flipBit } from "./utils/flip-bit"

type Props = BlockPropsOf<"ValueView">

export const ValueViewBlock = memo((props: Props) => {
  const { id, target, offset, size, visual } = props.data
  const valueMap = useStore($remoteValues)
  const values = valueMap[id] ?? []

  const hx = (n: number) => n.toString(16).padStart(4, "0").toUpperCase()

  const display = () => {
    const { type } = visual

    if (values.length === 0) {
      return (
        <div className="px-4 py-2 font-mono text-gray-9">missing value</div>
      )
    }

    switch (type) {
      case "Bytes":
      case "Int": {
        const cols = Math.min(values.length, 8)

        const isHex = type === "Bytes"

        const show = (value: number) =>
          isHex ? value?.toString(16).padStart(4, "0").toUpperCase() : value

        return (
          <div
            className="grid font-mono gap-x-2 px-2 py-1 text-2"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            }}
          >
            {values.map((v, i) => (
              <div
                key={i}
                className={cn("text-center", v === 0 && "text-gray-7")}
              >
                {show(v)}
              </div>
            ))}
          </div>
        )
      }

      case "ColorGrid": {
        const size = "20px"
        const groups = bitsToList(values)

        return (
          <div className="flex flex-col items-start">
            {groups.map((group, i) => (
              <div
                key={i}
                className="grid"
                style={{ gridTemplateColumns: `repeat(8, minmax(0, ${size}))` }}
              >
                {group.map((bit, j) => (
                  <div
                    key={j}
                    style={{ width: size, height: size }}
                    className={cn(
                      "cursor-pointer",
                      bit
                        ? "bg-gray-12 hover:bg-gray-11"
                        : "bg-transparent hover:bg-gray-4",
                    )}
                    onClick={() => {
                      const value = values[i]
                      const next = flipBit(value, j)

                      engine.setMachineMemory(target, offset + i, [next])
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        )
      }

      case "String": {
        // do not read after null terminator (\0)
        const end = values.findIndex((x) => x === 0)

        const text = values
          .slice(0, end)
          .map((x) => String.fromCharCode(x))
          .join("")

        return <div className="px-3 py-1">{text}</div>
      }
    }

    return <div className="px-3 py-1 text-red-11">unknown visual: {type}</div>
  }

  return (
    <BaseBlock
      node={props}
      className="relative font-mono"
      schema={schema}
      settingsConfig={{ onUpdate: updateValueViewers, className: "px-3 pb-2" }}
    >
      {display()}

      <div className="text-[8px] text-gray-8 absolute font-mono bottom-[-16px] flex min-w-[100px]">
        o=0x{hx(offset)} s={size} t={target}
      </div>
    </BaseBlock>
  )
})

const schema = createSchema({
  type: "ValueView",
  fields: [
    {
      key: "visual",
      type: "select",
      options: [
        { key: "Int", title: "Number" },
        { key: "Bytes", title: "Hex" },
        { key: "Switches", title: "Switch", defaults: { bits: [] } },
        { key: "ColorGrid", title: "Binary Grid" },
        { key: "String" },
      ],
    },

    { key: "size", type: "number", min: 1 },
    { key: "offset", type: "number", min: 0 },
    { key: "target", type: "number", min: 0 },
  ],
})
