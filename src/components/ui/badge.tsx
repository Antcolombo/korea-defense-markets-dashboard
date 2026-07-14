import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex h-5 w-fit items-center justify-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'border-primary bg-primary text-primary-foreground',
        secondary: 'border-border bg-secondary text-secondary-foreground',
        outline: 'border-border bg-transparent text-foreground',
        destructive: 'border-destructive/40 bg-destructive/15 text-red-200',
        ghost: 'border-transparent text-muted-foreground',
        link: 'border-transparent text-primary underline-offset-4 hover:underline'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean
}) {
  const Comp = asChild ? Slot : 'span'
  return <Comp className={cn(badgeVariants({ variant, className }))} {...props} />
}

export { Badge, badgeVariants }
