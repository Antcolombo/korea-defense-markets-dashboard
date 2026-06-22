import { readFileSync } from 'node:fs'

type Boundary = {
  file: string
  maxLines: number
}

const boundaries: Boundary[] = [
  { file: 'src/styles/globals.css', maxLines: 180 },
  { file: 'src/styles/terminal-workspace.css', maxLines: 220 }
]

const allowedGlobalClassSelectors = [
  '.num',
  '.mark',
  '.display'
]

function countLines(content: string) {
  return content.trimEnd().split('\n').length
}

function read(file: string) {
  return readFileSync(file, 'utf8')
}

let failed = false

for (const boundary of boundaries) {
  const lines = countLines(read(boundary.file))
  if (lines > boundary.maxLines) {
    failed = true
    console.error(`${boundary.file}: ${lines} lines exceeds ${boundary.maxLines}`)
  }
}

const globalLines = read('src/styles/globals.css').split('\n')
for (const [index, line] of globalLines.entries()) {
  const trimmed = line.trim()
  const startsAllowedClass = allowedGlobalClassSelectors.some(selector => trimmed.startsWith(selector))
  const startsClassSelector = /^\.[A-Za-z0-9_-]+/.test(trimmed)
  if (trimmed === '@layer components {' || trimmed.includes('body:has(') || (startsClassSelector && !startsAllowedClass)) {
    failed = true
    console.error(`src/styles/globals.css:${index + 1}: page/component selector belongs in an owner stylesheet`)
  }
}

if (failed) {
  process.exit(1)
}

console.log('Style boundaries OK')
