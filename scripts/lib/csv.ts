export type CsvRow = Record<string, string>

export function parseCsvLine(line: string) {
  const cells: string[] = []
  let cell = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]
    if (char === '"' && quoted && next === '"') {
      cell += '"'
      index += 1
      continue
    }
    if (char === '"') {
      quoted = !quoted
      continue
    }
    if (char === ',' && !quoted) {
      cells.push(cell.trim())
      cell = ''
      continue
    }
    cell += char
  }
  cells.push(cell.trim())
  return cells
}

export function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0)
  if (lines.length === 0) return []
  const headers = parseCsvLine(lines[0]).map(header => header.trim())
  return lines.slice(1).map(line => {
    const cells = parseCsvLine(line)
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']))
  })
}

export function parseCsvWithHeaders(text: string) {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0)
  if (lines.length === 0) return { headers: [], rows: [] as CsvRow[] }
  const headers = parseCsvLine(lines[0]).map(header => header.trim())
  const rows = lines.slice(1).map(line => {
    const cells = parseCsvLine(line)
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']))
  })
  return { headers, rows }
}

export function parseNumeric(value: string, label: string) {
  const parsed = Number(value.replace(/,/g, ''))
  if (!Number.isFinite(parsed)) throw new Error(`${label}: value must be numeric`)
  return parsed
}

export function assertIsoDate(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label}: date must be YYYY-MM-DD`)
  const time = Date.parse(`${value}T00:00:00Z`)
  if (!Number.isFinite(time)) throw new Error(`${label}: invalid date`)
}
