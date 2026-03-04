import * as React from "react"
import { cn }      from "@/lib/utils"

function ButtonGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center [&>button:not(:first-child):not(:last-child)]:rounded-none [&>button:first-child]:rounded-r-none [&>button:last-child]:rounded-l-none", className)}
      {...props}
    />
  )
}

function ButtonGroupSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("w-px self-stretch bg-border shrink-0", className)}
      {...props}
    />
  )
}

export { ButtonGroup, ButtonGroupSeparator }
