import { readJson, requiredEnv } from './lib/io'
import { getMarketDataProvider } from './lib/priceProviders'

const required = [
  'ALPHA_VANTAGE_API_KEY',
  'FRED_API_KEY',
  'OPENDART_API_KEY',
  'SEC_USER_AGENT'
]

async function main() {
  const missing: string[] = []
  const present: string[] = []
  const warnings: string[] = []

  for (const name of required) {
    try {
      const value = requiredEnv(name)
      if (name === 'SEC_USER_AGENT' && value.includes('your-email@example.com')) {
        warnings.push('SEC_USER_AGENT still contains the example email; replace it with a real contact for SEC fair-access compliance.')
      }
      present.push(name)
    } catch {
      missing.push(name)
    }
  }

  if (process.env.EIA_API_KEY?.trim()) {
    present.push('EIA_API_KEY')
  } else {
    warnings.push('EIA_API_KEY is optional but recommended for petroleum inventory datasets.')
  }

  const audit = await readJson<{ status?: string; readinessFailures?: string[]; providers?: { provider: string; status: string; records: number }[] }>('src/generated/sourceAudit.json', {})

  console.log('Local provider setup')
  console.log(`Market data provider: ${getMarketDataProvider()}`)
  console.log(`Present env vars: ${present.length === 0 ? 'none' : present.join(', ')}`)
  console.log(`Missing env vars: ${missing.length === 0 ? 'none' : missing.join(', ')}`)
  if (warnings.length > 0) console.log(`Warnings: ${warnings.join(' ')}`)
  console.log(`Current audit status: ${audit.status ?? 'missing'}`)
  for (const provider of audit.providers ?? []) {
    console.log(`${provider.provider}: ${provider.status}, records=${provider.records}`)
  }

  if (missing.length > 0) {
    console.error(`Setup incomplete: add ${missing.join(', ')} to .env.local`)
    process.exit(1)
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
