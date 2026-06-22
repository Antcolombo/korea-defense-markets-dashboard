import { existsSync } from 'node:fs'
import { readJson, requiredEnv } from './lib/io'
import { getMarketDataProvider } from './lib/priceProviders'

async function main() {
  const missing: string[] = []
  const present: string[] = []
  const warnings: string[] = []
  const marketProvider = getMarketDataProvider()
  const required = [
    ...(marketProvider === 'alpha_vantage' ? ['ALPHA_VANTAGE_API_KEY'] : []),
    'FRED_API_KEY',
    'OPENDART_API_KEY',
    'SEC_USER_AGENT'
  ]

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

  const koreaOptional = [
    ['DATA_GO_KR_SERVICE_KEY', Boolean(process.env.DATA_GO_KR_SERVICE_KEY?.trim() || process.env.KOREA_STOCK_API_KEY?.trim())],
    ['BOK_ECOS_API_KEY', Boolean(process.env.BOK_ECOS_API_KEY?.trim())],
    ['BOK_BASE_RATE mapping', Boolean(process.env.BOK_BASE_RATE_STAT_CODE?.trim() && process.env.BOK_BASE_RATE_ITEM_CODE?.trim())],
    ['BOK_CURRENT_ACCOUNT mapping', Boolean(process.env.BOK_CURRENT_ACCOUNT_STAT_CODE?.trim() && process.env.BOK_CURRENT_ACCOUNT_ITEM_CODE?.trim())],
    ['BOK_TRADE_BALANCE mapping', Boolean(process.env.BOK_TRADE_BALANCE_STAT_CODE?.trim() && process.env.BOK_TRADE_BALANCE_ITEM_CODE?.trim())],
    ['data/private/korea-index-prices.json', existsSync('data/private/korea-index-prices.json')],
    ['data/private/korea-macro-flows.json', existsSync('data/private/korea-macro-flows.json')]
  ] as const

  const koreaReady = koreaOptional.filter(([, ready]) => ready).map(([name]) => name)
  const koreaMissing = koreaOptional.filter(([, ready]) => !ready).map(([name]) => name)
  if (koreaMissing.length > 0) {
    warnings.push(`Korea optional inputs not configured: ${koreaMissing.join(', ')}.`)
  }

  const audit = await readJson<{ status?: string; readinessFailures?: string[]; providers?: { provider: string; status: string; records: number }[] }>('src/generated/sourceAudit.json', {})

  console.log('Local provider setup')
  console.log(`Market data provider: ${marketProvider}`)
  console.log(`Present env vars: ${present.length === 0 ? 'none' : present.join(', ')}`)
  console.log(`Missing env vars: ${missing.length === 0 ? 'none' : missing.join(', ')}`)
  console.log(`Korea optional ready: ${koreaReady.length === 0 ? 'none' : koreaReady.join(', ')}`)
  console.log(`Korea optional missing: ${koreaMissing.length === 0 ? 'none' : koreaMissing.join(', ')}`)
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
