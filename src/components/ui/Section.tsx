import type { ReactNode } from 'react'

type SectionProps = {
  children: ReactNode
  className?: string
}

export function Section({ children, className = '' }: SectionProps) {
  return <section className={`mx-auto w-full max-w-[1080px] px-4 py-3 ${className}`}>{children}</section>
}
