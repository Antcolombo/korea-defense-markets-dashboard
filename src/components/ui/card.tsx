import * as React from 'react'
import { cn } from '@/lib/utils'

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('rounded-md border border-border bg-card text-card-foreground shadow-sm', className)} {...props} />
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('grid gap-1.5 p-4', className)} {...props} />
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('text-base font-semibold leading-none tracking-tight', className)} {...props} />
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('text-sm text-muted-foreground', className)} {...props} />
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('p-4 pt-0', className)} {...props} />
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex items-center border-t border-border p-4', className)} {...props} />
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('ml-auto', className)} {...props} />
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent
}
