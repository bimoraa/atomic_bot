"use client"

import * as React   from "react"
import { Checkbox } from "radix-ui"
import { Check }    from "lucide-react"

import { cn } from "@/lib/utils"

const CheckboxRoot = React.forwardRef<
  React.ElementRef<typeof Checkbox.Root>,
  React.ComponentPropsWithoutRef<typeof Checkbox.Root>
>(({ className, ...props }, ref) => (
  <Checkbox.Root
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-sm border border-input shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary",
      className
    )}
    {...props}
  >
    <Checkbox.Indicator className="flex items-center justify-center text-current">
      <Check className="h-3 w-3" strokeWidth={3} />
    </Checkbox.Indicator>
  </Checkbox.Root>
))
CheckboxRoot.displayName = "Checkbox"

export { CheckboxRoot as Checkbox }
