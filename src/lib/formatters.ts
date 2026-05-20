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

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
