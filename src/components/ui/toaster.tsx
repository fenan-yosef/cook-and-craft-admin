

import { useToast } from "@/hooks/use-toast"
import * as React from "react"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  // keep a stable top-level state for which toast details are open
  const [openDetailsMap, setOpenDetailsMap] = React.useState<Record<string, boolean>>({})

  // cleanup map entries for toasts that were removed
  React.useEffect(() => {
    setOpenDetailsMap((prev) => {
      const copy = { ...prev }
      const ids = new Set(toasts.map((t) => t.id))
      let changed = false
      Object.keys(copy).forEach((k) => {
        if (!ids.has(k)) {
          delete copy[k]
          changed = true
        }
      })
      return changed ? copy : prev
    })
  }, [toasts])

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, details, ...props }) {
        const hasDetails = !!details
        const openDetails = !!openDetailsMap[id]

        return (
          <Toast key={id} {...props}>
            <div className="flex flex-col gap-1 w-full">
              <div className="flex items-start justify-between gap-2">
                <div className="grid gap-1 text-left">
                  {title && <ToastTitle>{title}</ToastTitle>}
                  {description && (
                    <ToastDescription>{description}</ToastDescription>
                  )}
                </div>
                {hasDetails && (
                  <button
                    onClick={() => setOpenDetailsMap((prev) => ({ ...prev, [id]: !prev[id] }))}
                    className="ml-auto text-xs rounded border px-2 py-1 hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {openDetails ? "Hide" : "Details"}
                  </button>
                )}
              </div>
              {hasDetails && openDetails && (
                <div
                  className={
                    "mt-1 max-h-40 overflow-auto rounded p-2 text-[11px] leading-snug font-mono whitespace-pre-wrap " +
                    // default readable background + foreground
                    "bg-muted text-muted-foreground " +
                    // when the parent toast has destructive styling, adjust contrast
                    "group-[.destructive]:bg-destructive/10 group-[.destructive]:text-destructive-foreground"
                  }
                >
                  {typeof details === "string" ? details : details}
                </div>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
