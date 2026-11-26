import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

const stackVariants = cva("flex flex-col", {
  variants: {
    gap: {
      xs: "gap-1.5",
      sm: "gap-3",
      md: "gap-4",
      lg: "gap-6",
    },
  },
  defaultVariants: {
    gap: "md",
  },
})

function Stack({
  className,
  gap,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof stackVariants>) {
  return <div data-slot="stack" className={cn(stackVariants({ gap }), className)} {...props} />
}

const clusterVariants = cva("flex items-center", {
  variants: {
    justify: {
      start: "justify-start",
      between: "justify-between",
      end: "justify-end",
    },
    gap: {
      xs: "gap-1.5",
      sm: "gap-2",
      md: "gap-3",
      lg: "gap-4",
    },
    wrap: {
      true: "flex-wrap",
      false: "flex-nowrap",
    },
  },
  defaultVariants: {
    justify: "start",
    gap: "sm",
    wrap: true,
  },
})

function Cluster({
  className,
  justify,
  gap,
  wrap,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof clusterVariants>) {
  return (
    <div
      data-slot="cluster"
      className={cn(clusterVariants({ justify, gap, wrap }), className)}
      {...props}
    />
  )
}

function SplitGrid({
  variant = "asymmetric",
  className,
  ...props
}: React.ComponentProps<"div"> & { variant?: "equal" | "asymmetric" }) {
  return (
    <div
      data-slot="split-grid"
      className={cn(
        "grid grid-cols-1 gap-6",
        variant === "equal" ? "md:grid-cols-2" : "lg:grid-cols-12",
        className,
      )}
      {...props}
    />
  )
}

function SplitAside({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="split-aside"
      className={cn("flex min-w-0 flex-col gap-6 lg:col-span-5", className)}
      {...props}
    />
  )
}

function SplitMain({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="split-main"
      className={cn("flex min-w-0 flex-col gap-6 lg:col-span-7", className)}
      {...props}
    />
  )
}

const iconTileVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-lg transition-colors",
  {
    variants: {
      tone: {
        brand: "bg-primary-subtle text-primary-subtle-foreground ring-1 ring-primary/15",
        logo: "brand-mark-surface font-bold tracking-tight text-primary-foreground shadow-xs ring-1 ring-white/15",
        folder: "border border-warning-border bg-warning-subtle text-warning-foreground",
        file: "border border-border bg-card text-primary",
        muted: "bg-muted text-muted-foreground",
      },
      size: {
        sm: "size-8 text-xs [&_svg]:size-4",
        md: "size-10 text-sm [&_svg]:size-5",
      },
    },
    defaultVariants: {
      tone: "brand",
      size: "md",
    },
  },
)

function IconTile({
  className,
  tone,
  size,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof iconTileVariants>) {
  return (
    <span
      data-slot="icon-tile"
      className={cn(iconTileVariants({ tone, size }), className)}
      {...props}
    />
  )
}

function TopCommandBar({ className, ...props }: React.ComponentProps<"header">) {
  return (
    <header
      data-slot="top-command-bar"
      className={cn(
        "sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-card/95 px-4 backdrop-blur sm:px-6",
        className,
      )}
      {...props}
    />
  )
}

function WorkspaceBody({
  flush = false,
  className,
  ...props
}: React.ComponentProps<"div"> & { flush?: boolean }) {
  return (
    <div
      data-slot="workspace-body"
      className={cn(
        flush
          ? "flex min-h-0 flex-1 flex-col overflow-hidden p-0"
          : "min-h-0 flex-1 overflow-y-auto p-4 sm:p-6",
        className,
      )}
      {...props}
    />
  )
}

function PresenceAvatar({
  src,
  alt,
  initials,
  online = false,
  size = "md",
}: {
  src?: string | null
  alt?: string
  initials: string
  online?: boolean
  size?: "sm" | "md" | "lg"
}) {
  const sizeClass = size === "lg" ? "size-14" : size === "sm" ? "size-8" : "size-10"
  return (
    <span data-slot="presence-avatar" className="relative inline-flex shrink-0">
      <Avatar className={cn(sizeClass, "border border-primary/20")}>
        {src && <AvatarImage src={src} alt={alt ?? initials} />}
        <AvatarFallback className="bg-primary-subtle text-xs font-semibold text-primary-subtle-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>
      {online && (
        <span
          aria-hidden="true"
          className="absolute right-0 bottom-0 size-2.5 rounded-full bg-success ring-2 ring-card"
        />
      )}
    </span>
  )
}

export {
  Stack,
  Cluster,
  SplitGrid,
  SplitAside,
  SplitMain,
  IconTile,
  TopCommandBar,
  WorkspaceBody,
  PresenceAvatar,
}
