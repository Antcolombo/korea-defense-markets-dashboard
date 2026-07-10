import type { ReactNode } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'

export function ModuleFrame({
  title,
  kicker,
  description,
  children
}: {
  title: string
  kicker: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="flex h-full min-h-0 flex-col bg-background">
      <div className="border-b border-border bg-card/40 p-3">
        <p className="text-[0.68rem] font-medium tracking-[0.04em] text-muted-foreground">{kicker}</p>
        <h1 className="mt-1 truncate text-xl font-semibold">{title}</h1>
        {description ? <p className="mt-1 max-w-5xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="grid gap-3 p-3">{children}</div>
      </ScrollArea>
    </section>
  )
}
