import type { ReactNode } from 'react'
import { SourceDataBadge } from '@/components/ui/Badge'

type PageHeaderProps = {
  eyebrow?: string
  title: string
  description: string
  children?: ReactNode
}

export function PageHeader({ eyebrow, title, description, children }: PageHeaderProps) {
  return (
    <div className="mx-auto w-full max-w-[1080px] px-4 pb-1 pt-4">
      <div className="workbench-card flex flex-wrap items-start justify-between gap-4 px-4 py-3">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            {eyebrow ? <p className="workbench-kicker text-steel">{eyebrow}</p> : null}
            <SourceDataBadge />
          </div>
          <h1 className="mt-2 text-xl font-bold leading-tight text-ink sm:text-2xl">{title}</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-muted">{description}</p>
        </div>
        {children}
      </div>
    </div>
  )
}
