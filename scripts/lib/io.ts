import { existsSync, readFileSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const envFiles = ['.env.local', '.env', '.env.development']
let envLoaded = false

function parseEnvLine(line: string) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return null
  const equalsIndex = trimmed.indexOf('=')
  if (equalsIndex < 0) return null
  const name = trimmed.slice(0, equalsIndex).trim()
  let value = trimmed.slice(equalsIndex + 1).trim()
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1)
  }
  return { name, value }
}

export function loadLocalEnv() {
  if (envLoaded) return
  envLoaded = true
  for (const file of envFiles) {
    if (!existsSync(file)) continue
    const text = readFileSync(file, 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const parsed = parseEnvLine(line)
      if (!parsed || process.env[parsed.name]) continue
      process.env[parsed.name] = parsed.value
    }
  }
}

loadLocalEnv()

export async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const text = await readFile(path, 'utf8')
    return JSON.parse(text) as T
  } catch {
    return fallback
  }
}

export async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`)
}

export function nowIso() {
  return new Date().toISOString()
}

export async function fetchJson(url: string, headers: Record<string, string> = {}) {
  const response = await fetch(url, { headers })
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`)
  }
  return response.json()
}

export async function fetchText(url: string, headers: Record<string, string> = {}) {
  const response = await fetch(url, { headers })
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`)
  }
  return response.text()
}

export function requiredEnv(name: string) {
  loadLocalEnv()
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export function assertNonEmpty<T>(value: T[], label: string) {
  if (value.length === 0) {
    throw new Error(`${label} returned zero records`)
  }
  return value
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
