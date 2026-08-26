import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-[var(--theme-badge-border,var(--primary-color))] bg-[var(--theme-badge-bg,var(--primary-glow))] text-[var(--theme-badge-text,var(--primary-color))] hover:opacity-90 shadow-sm",
        secondary:
          "border-purple-500/40 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30",
        destructive:
          "border-red-500/40 bg-red-500/20 text-red-300 hover:bg-red-500/30",
        outline: "border-[#1F293D] text-slate-300 hover:bg-[#1F293D]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
