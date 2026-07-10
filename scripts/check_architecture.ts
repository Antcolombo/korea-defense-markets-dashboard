import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const srcRoot = path.join(root, 'src')
const sourceExtensions = ['.ts', '.tsx']
const files = walk(srcRoot).filter(file => sourceExtensions.includes(path.extname(file)))
const fileSet = new Set(files)
const graph = new Map(files.map(file => [file, importsFor(file)]))

const failures: string[] = []
const cycles = findCycles(graph)
for (const cycle of cycles) {
  failures.push(`Dependency cycle: ${cycle.map(relative).join(' -> ')}`)
}

for (const [file, imports] of graph) {
  const source = relative(file)
  const sourceText = fs.readFileSync(file, 'utf8')
  const isDomain = source.includes('/domain/')
  const isApplication = source.includes('/application/')
  const isNeutralContract = source.startsWith('src/types/') || source.startsWith('src/contracts/')
  const persistenceOwner = source.includes('/infrastructure/')
    || source.startsWith('src/platform/')
    || source.startsWith('src/lib/server/')
  if (!persistenceOwner && sourceText.includes("@prisma/client")) {
    failures.push(`Prisma client imported outside persistence layer: ${source}`)
  }
  if (isDomain && /(?:from\s+|import\s*\()['"](?:react|next(?:\/|['"]))/m.test(sourceText)) {
    failures.push(`Domain imports React/Next: ${source}`)
  }
  if (isDomain && /\b(?:window|document|localStorage|sessionStorage|navigator)\s*\./.test(sourceText)) {
    failures.push(`Domain uses browser runtime API: ${source}`)
  }
  for (const imported of imports) {
    const target = relative(imported)
    if (isNeutralContract
      && (target.startsWith('src/lib/') || target.startsWith('src/components/') || target.startsWith('src/pages/')
        || target.startsWith('src/features/') || target.startsWith('src/platform/') || target.startsWith('src/shell/'))) {
      failures.push(`Neutral contract imports implementation: ${source} -> ${target}`)
    }
    if (isDomain
      && (target.startsWith('src/pages/') || target.startsWith('src/components/') || target.startsWith('src/lib/server/')
        || target.startsWith('src/platform/') || target.startsWith('src/shell/'))) {
      failures.push(`Domain imports delivery/infrastructure: ${source} -> ${target}`)
    }
    if ((isDomain || isApplication) && target.includes('/infrastructure/')) {
      failures.push(`Domain/application imports infrastructure: ${source} -> ${target}`)
    }
    if (isApplication && (target.startsWith('src/pages/') || target.startsWith('src/components/')
      || target.startsWith('src/shell/') || target.startsWith('src/platform/persistence/prisma/'))) {
      failures.push(`Application imports delivery/adapter: ${source} -> ${target}`)
    }
    if (source.startsWith('src/features/') && source.includes('/components/')
      && (target.startsWith('src/shell/terminal/') || target.startsWith('src/components/terminal/'))) {
      failures.push(`Feature UI imports terminal shell implementation: ${source} -> ${target}`)
    }
    if (source.startsWith('src/features/') && target === 'src/components/terminal/terminal-workspace.tsx') {
      failures.push(`Feature imports terminal implementation types: ${source} -> ${target}`)
    }
    if (!persistenceOwner && target === 'src/lib/server/prisma.ts') {
      failures.push(`Prisma runtime imported outside persistence layer: ${source} -> ${target}`)
    }
  }
}

for (const file of files.filter(file => relative(file).startsWith('src/pages/api/'))) {
  const source = relative(file)
  const sourceText = fs.readFileSync(file, 'utf8')
  if (!/\b(?:createResearchApiHandler|methodAllowed)\b/.test(sourceText)) {
    failures.push(`API route bypasses shared method boundary: ${source}`)
  }
  if (/\.json\(\s*\{\s*error\s*:/.test(sourceText)) {
    failures.push(`API route emits unclassified error payload: ${source}`)
  }
}

if (failures.length) {
  console.error(`Architecture check failed:\n- ${failures.join('\n- ')}`)
  process.exitCode = 1
} else {
  console.log(`Architecture boundaries OK (${files.length} source files, ${edgeCount(graph)} internal imports, zero cycles)`)
}

function walk(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(file) : [file]
  })
}

function importsFor(file: string) {
  const source = fs.readFileSync(file, 'utf8')
  const specifiers = [
    ...source.matchAll(/\b(?:import|export)\s+(?:type\s+)?(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g)
  ].map(match => match[1])
  return Array.from(new Set(specifiers.flatMap(specifier => {
    const resolved = resolveImport(file, specifier)
    return resolved ? [resolved] : []
  })))
}

function resolveImport(from: string, specifier: string) {
  const base = specifier.startsWith('@/')
    ? path.join(srcRoot, specifier.slice(2))
    : specifier.startsWith('.')
      ? path.resolve(path.dirname(from), specifier)
      : null
  if (!base) return null
  const candidates = [
    base,
    ...sourceExtensions.map(extension => `${base}${extension}`),
    ...sourceExtensions.map(extension => path.join(base, `index${extension}`))
  ]
  return candidates.find(candidate => fileSet.has(candidate)) ?? null
}

function findCycles(input: Map<string, string[]>) {
  const state = new Map<string, 'visiting' | 'visited'>()
  const stack: string[] = []
  const unique = new Map<string, string[]>()

  function visit(file: string) {
    state.set(file, 'visiting')
    stack.push(file)
    for (const dependency of input.get(file) ?? []) {
      if (!state.has(dependency)) visit(dependency)
      else if (state.get(dependency) === 'visiting') {
        const start = stack.indexOf(dependency)
        const cycle = [...stack.slice(start), dependency]
        const key = canonicalCycle(cycle)
        unique.set(key, cycle)
      }
    }
    stack.pop()
    state.set(file, 'visited')
  }

  for (const file of input.keys()) {
    if (!state.has(file)) visit(file)
  }
  return [...unique.values()]
}

function canonicalCycle(cycle: string[]) {
  const nodes = cycle.slice(0, -1).map(relative)
  const rotations = nodes.map((_, index) => [...nodes.slice(index), ...nodes.slice(0, index)].join('|'))
  return rotations.sort()[0]
}

function edgeCount(input: Map<string, string[]>) {
  return [...input.values()].reduce((sum, imports) => sum + imports.length, 0)
}

function relative(file: string) {
  return path.relative(root, file).split(path.sep).join('/')
}
