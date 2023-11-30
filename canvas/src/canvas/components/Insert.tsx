import { useCallback, useEffect, useMemo, useState } from "react"
import { getMatchedCommands, useCommandRunner } from "../commands/commands"
import { useHotkeys } from "react-hotkeys-hook"
import cn from "classnames"

type Pos = { x: number; y: number } | null

export function Insert() {
  const [command, setCommand] = useState("")
  const [cursor, setCursor] = useState<Pos>(null)
  const [active, setActive] = useState(false)
  const [selected, setSelected] = useState(0)

  const { run } = useCommandRunner()

  const matches = useMemo(() => getMatchedCommands(command), [command])

  useHotkeys("/", () => {
    setActive((active) => !active)
  })

  function hide() {
    setActive(false)
    setCommand("")
  }

  const onMouseMove = useCallback((event: MouseEvent) => {
    return setCursor({ x: event.clientX, y: event.clientY })
  }, [])

  const destroy = useCallback(() => {
    window.removeEventListener("mousemove", onMouseMove)
  }, [])

  const register = useCallback(() => {
    window.addEventListener("mousemove", onMouseMove)
  }, [])

  useEffect(() => {
    register()

    return () => {
      destroy()
    }
  }, [active])

  if (!cursor) return null
  if (!active) return null

  const top = cursor.y - 25
  const left = cursor.x - 20

  return (
    <div>
      <div
        className="flex flex-col fixed font-mono px-4 py-3 bg-gray-5 rounded-3 gap-y-2"
        style={{ top: `${top}px`, left: `${left}px` }}
      >
        <input
          className="bg-transparent text-4 outline-none"
          value={command}
          autoFocus
          onChange={(e) => {
            setSelected(0)
            setCommand(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault()
              setSelected((s) => Math.min(s + 1, matches.length - 1))
              return
            }

            if (e.key === "ArrowUp") {
              e.preventDefault()
              setSelected((s) => Math.max(s - 1, 0))
              return
            }

            if (e.key === "Enter") {
              if (matches.length === 0) return

              const ok = run(matches[selected], { position: cursor })
              if (ok) hide()

              return
            }

            if (e.key === "Escape") {
              hide()
              return
            }
          }}
        />

        {matches.length > 0 && (
          <div>
            {matches.map((preview, i) => (
              <div
                key={preview.prefix}
                className={cn("flex gap-x-2", selected === i && "text-red-11")}
              >
                <div className="text-2">/{preview.prefix}</div>
                <div className="text-2">{preview.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
