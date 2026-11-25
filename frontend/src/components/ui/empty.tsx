import * as React from "react"
import { cn } from "@/lib/utils"

function Empty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/20 px-6 py-9 text-center",
        className,
      )}
      {...props}
    />
  )
}

function EmptyIcon({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-icon"
      className={cn(
        "mb-1 flex size-10 items-center justify-center rounded-lg bg-primary-subtle text-primary-subtle-foreground ring-1 ring-primary/15 [&_svg]:size-5",
        className,
      )}
      {...props}
    />
  )
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="empty-title"
      className={cn("text-sm font-semibold text-foreground", className)}
      {...props}
    />
  )
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="empty-description"
      className={cn("max-w-md text-xs leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  )
}

function EmptyActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-actions"
      className={cn("mt-2 flex flex-wrap items-center justify-center gap-2", className)}
      {...props}
    />
  )
}

export { Empty, EmptyIcon, EmptyTitle, EmptyDescription, EmptyActions }
