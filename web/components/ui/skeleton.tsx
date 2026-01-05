import { cn } from "@/lib/utils"

/**
 * @param className - Additional CSS classes
 * @returns Skeleton loading component
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
