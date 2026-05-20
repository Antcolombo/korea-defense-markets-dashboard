import type { ReactNode } from 'react'

type CardProps = {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`workbench-card ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ title, eyebrow, action }: { title: string; eyebrow?: string; action?: ReactNode }) {
  return (
    <div className="workbench-card-title">
      <div className="min-w-0">
        {eyebrow ? <p className="workbench-kicker">{eyebrow}</p> : null}
        <h2 className="truncate text-sm font-bold text-ink">{title}</h2>
      </div>
      {action}
    </div>
  )
}

export function CardBody({ children, className = '' }: CardProps) {
  return <div className={`workbench-card-body ${className}`}>{children}</div>
}
