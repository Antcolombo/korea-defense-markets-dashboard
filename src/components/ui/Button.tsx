import Link from 'next/link'
import type { ReactNode } from 'react'

type ButtonProps = {
  children: ReactNode
  href?: string
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  type?: 'button' | 'submit'
}

export function Button({ children, href, onClick, variant = 'primary', type = 'button' }: ButtonProps) {
  const variants = {
    primary: 'border-[rgba(80,210,193,0.45)] bg-[rgba(80,210,193,0.18)] text-ink hover:bg-[rgba(80,210,193,0.28)]',
    secondary: 'border-line bg-[rgba(0,0,0,0.24)] text-ink hover:border-steel hover:bg-[rgba(0,0,0,0.38)]',
    ghost: 'border-transparent bg-transparent text-steel hover:bg-[rgba(255,255,255,0.06)]'
  }
  const className = `inline-flex min-h-8 items-center justify-center whitespace-nowrap rounded-md border px-3 text-sm font-semibold transition ${variants[variant]}`

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    )
  }

  return (
    <button type={type} onClick={onClick} className={className}>
      {children}
    </button>
  )
}
