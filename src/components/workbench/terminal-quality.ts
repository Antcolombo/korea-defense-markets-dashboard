import type { ShellMeta } from '@/lib/research/api'
import type { TerminalMetric } from '@/components/workbench/research-charts'

export function statusLabel(shell: ShellMeta) {
  return shell.qualityLabel
}

export function qualityTone(shell: ShellMeta): TerminalMetric['tone'] {
  if (shell.qualityStatus === 'fresh') return 'good'
  if (shell.qualityStatus === 'stale' || shell.qualityStatus === 'gaps') return 'warn'
  if (shell.qualityStatus === 'no_data') return 'danger'
  return 'neutral'
}

export function qualityBadgeClass(shell: ShellMeta) {
  if (shell.qualityStatus === 'fresh') return 'border-emerald-300/45 bg-emerald-300/10 text-emerald-100'
  if (shell.qualityStatus === 'stale' || shell.qualityStatus === 'gaps') return 'border-amber/50 bg-amber/10 text-amber'
  if (shell.qualityStatus === 'no_data') return 'border-destructive/50 bg-destructive/10 text-red-100'
  return ''
}
