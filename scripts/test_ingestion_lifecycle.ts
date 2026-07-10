import assert from 'node:assert/strict'
import { providerErrorCategory, providerRunLifecycle, providerRunMetadata, shouldPublishProviderResult } from './lib/provider_run_lifecycle'
import { isTransientPrismaError, withRetries } from './lib/retry'

const asOfDate = new Date('2026-07-10T12:00:00.000Z')

const running = providerRunMetadata({
  ticker: 'NVDA', dataset: 'daily-ohlcv', asOfDate, finished: false
})
assert.equal(running.lifecycle, 'running')
assert.equal(running.errorCategory, null)
assert.equal(running.freshnessDeadline, '2026-07-12T00:00:00.000Z')

assert.equal(providerRunLifecycle('AVAILABLE'), 'succeeded')
assert.equal(providerRunLifecycle('PARTIAL'), 'partial')
assert.equal(providerRunLifecycle('PROVIDER_ERROR'), 'failed')
assert.equal(providerRunLifecycle('ENTITLEMENT_MISSING'), 'failed')
assert.equal(providerErrorCategory('ENTITLEMENT_MISSING'), 'entitlement')
assert.equal(providerErrorCategory('PROVIDER_ERROR'), 'provider')
assert.equal(providerErrorCategory('STALE'), 'stale')
assert.equal(providerErrorCategory('UNAVAILABLE'), 'unavailable')
assert.equal(shouldPublishProviderResult('AVAILABLE', 12), true)
assert.equal(shouldPublishProviderResult('AVAILABLE', 0), false)
assert.equal(shouldPublishProviderResult('PARTIAL', 12), false)
assert.equal(shouldPublishProviderResult('PROVIDER_ERROR', 0), false)

const interrupted = { ...running }
assert.equal(interrupted.lifecycle, 'running', 'An interrupted run remains visibly running.')

const failed = providerRunMetadata({
  ticker: 'NVDA', dataset: 'daily-ohlcv', asOfDate,
  dataStatus: 'PROVIDER_ERROR', finished: true, hasError: true
})
assert.deepEqual(failed, {
  ticker: 'NVDA',
  dataset: 'daily-ohlcv',
  lifecycle: 'failed',
  errorCategory: 'provider',
  freshnessDeadline: '2026-07-12T00:00:00.000Z'
})

async function testRetries() {
  let attempts = 0
  const retried = await withRetries(async () => {
    attempts += 1
    if (attempts < 3) throw Object.assign(new Error('Server has closed the connection.'), { code: 'P1017' })
    return 'ok'
  }, {
    attempts: 3,
    delayMs: () => 0,
    shouldRetry: isTransientPrismaError
  })
  assert.equal(retried, 'ok')
  assert.equal(attempts, 3)
  assert.equal(isTransientPrismaError(Object.assign(new Error('fatal'), { code: 'P2002' })), false)
  console.log('Ingestion lifecycle tests passed')
}

void testRetries()
