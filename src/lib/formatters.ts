export function formatCategory(value: string) {
  return value
    .split('_')
    .map(part => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ')
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(`${value}T00:00:00`))
}

export function formatTime(
  value: string,
  options: { includeDate?: boolean; fallback?: string } = {}
) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return options.fallback ?? 'N/A'
  return new Intl.DateTimeFormat('en-US', {
    month: options.includeDate ? 'short' : undefined,
    day: options.includeDate ? 'numeric' : undefined,
    hour: 'numeric',
    minute: '2-digit'
  }).format(date)
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
