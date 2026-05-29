import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors focus:outline-none focus:ring-1 focus:ring-asas-gold",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-asas-gold/10 text-asas-gold",
        secondary:
          "border-transparent bg-white/10 text-asas-sand",
        destructive:
          "border-transparent bg-rose-500/10 text-rose-500",
        success:
          "border-transparent bg-emerald-500/10 text-emerald-500",
        outline: "text-asas-silver border-asas-silver/20",
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
