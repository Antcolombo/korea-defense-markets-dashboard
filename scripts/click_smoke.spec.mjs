import { expect, test } from '@playwright/test'

const baseURL = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000'
const visibleModules = [
  ['Overview', '/?module=overview'],
  ['Rotation', '/?module=rotation'],
  ['Baskets', '/?module=baskets'],
  ['Crowding', '/?module=crowding'],
  ['Signal Validation Lab', '/?module=validation'],
  ['Methodology', '/?module=methodology'],
  ['Korea Defense', '/?module=korea-defense'],
  ['Stock Report', '/?module=stock-report&ticker=NVDA'],
  ['Stock Pitch', '/?module=stock-pitch'],
  ['Decision Journal', '/?module=decision-log'],
  ['Event Study Lab', '/?module=event-study'],
  ['Paper Book', '/?module=paper-book'],
  ['Risk + Vol Regime', '/?module=risk-lens'],
  ['Data Quality / Source Audit', '/?module=source-audit']
]
const emptyStateModules = [
  ['Positioning', '/?module=positioning']
]

test.describe.configure({ mode: 'serial' })

let failures = []

test.beforeEach(async ({ page }) => {
  failures = []
  page.on('console', message => {
    if (message.type() === 'error' && !isIgnoredDevNoise(message.text())) failures.push(message.text())
  })
  page.on('pageerror', error => failures.push(error.message))
  page.on('requestfailed', request => {
    const failure = `${request.method()} ${request.url()} ${request.failure()?.errorText ?? 'failed'}`
    if (!isIgnoredDevNoise(failure)) failures.push(failure)
  })
})

function isIgnoredDevNoise(text) {
  const normalized = text.toLowerCase()
  return normalized.includes('/_next/webpack-hmr')
    || (normalized.includes('websocket') && normalized.includes('connection') && normalized.includes('failed'))
    || (normalized.includes('ws://') && normalized.includes('connection refused'))
}

test.afterEach(async () => {
  expect(failures, failures.join('\n')).toEqual([])
})

test('home and desktop module clicks do not break', async ({ page }) => {
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await expect(page.getByText('LIQUIDCHAIN').first()).toBeVisible()
  await expect(page.getByText('Build investment decision record').last()).toBeVisible()
  await expect(page.getByText('New Decision').last()).toBeVisible()
  await expect(page.getByText('Review Open Ideas').last()).toBeVisible()
  await expect(page.getByText('Post-Mortem Closed Ideas').last()).toBeVisible()

  for (const [label, href] of visibleModules) {
    await page.locator(`a[href="${href}"]:visible`).first().click()
    await expect(page.getByText('LIQUIDCHAIN').first(), label).toBeVisible()
  }

  await expect(page.locator('a[href="/?module=positioning"]'), 'Positioning hidden from main nav').toHaveCount(0)
})

test('hidden modules keep direct empty-state routes', async ({ page }) => {
  for (const [label, href] of emptyStateModules) {
    await page.goto(`${baseURL}${href}`, { waitUntil: 'networkidle' })
    await expect(page.getByText('Not enough sourced data yet').last(), label).toBeVisible()
    await expect(page.getByText('Options Proxy Table'), label).toHaveCount(0)
    await expect(page.getByText('Validation Results'), label).toHaveCount(0)
  }
})

test('decision log and detail route render PM discipline flow', async ({ page }) => {
  await page.goto(`${baseURL}/?module=decision-log`, { waitUntil: 'networkidle' })
  await expect(page.getByText('Investment Decision Audit Trail').last()).toBeVisible()
  await expect(page.getByText('PM Read').last()).toBeVisible()
  await expect(page.getByText('Three evidence drivers').last()).toBeVisible()

  await page.goto(`${baseURL}/decision/nvda-decision-template`, { waitUntil: 'networkidle' })
  await expect(page.getByText('PM Read').last()).toBeVisible()
  await expect(page.getByText('Market believes').last()).toBeVisible()
})

test('portfolio renders public-only empty state or decisions', async ({ page }) => {
  await page.goto(`${baseURL}/portfolio`, { waitUntil: 'networkidle' })
  await expect(page.getByText('Public Paper Book').last()).toBeVisible()
  await expect(page.getByText(/No public decisions yet|Investment Decision Audit Trail/).last()).toBeVisible()
})

test('decision API rejects invalid accepted and closed states', async ({ request }) => {
  const accepted = await request.post(`${baseURL}/api/research/decisions`, {
    data: {
      decision: {
        slug: 'smoke-invalid-accepted',
        ticker: 'NVDA',
        status: 'accepted',
        decision: 'long'
      }
    }
  })
  expect(accepted.status()).toBe(400)
  expect(await accepted.text()).toContain('Decision cannot be accepted yet')

  const closed = await request.post(`${baseURL}/api/research/decisions`, {
    data: {
      decision: {
        slug: 'smoke-invalid-closed',
        ticker: 'NVDA',
        status: 'closed',
        decision: 'long',
        marketBelief: 'Market belief',
        variantView: 'Variant view because API smoke needs a complete judgment path.',
        evidence: [
          { driver: 'Price', claim: 'Claim', sourcedEvidence: 'Evidence', sourceStatus: 'sourced', whyItMatters: 'Matters' },
          { driver: 'Flow', claim: 'Claim', sourcedEvidence: 'Evidence', sourceStatus: 'partial', whyItMatters: 'Matters' },
          { driver: 'Catalyst', claim: 'Claim', sourcedEvidence: 'Evidence', sourceStatus: 'partial', whyItMatters: 'Matters' }
        ],
        risk: {
          entry: 'Entry',
          sizing: 'small',
          stop: 'Stop',
          upside: 'Upside',
          downside: 'Downside',
          timeHorizon: '1-3 months',
          catalystDate: '',
          whatWouldChangeMind: 'Change mind'
        },
        invalidation: 'Invalidation'
      }
    }
  })
  expect(closed.status()).toBe(400)
  expect(await closed.text()).toContain('Decision cannot be closed yet')
})

test('basket detail slug route renders', async ({ page }) => {
  await page.goto(`${baseURL}/?module=baskets&slug=ai-infrastructure`, { waitUntil: 'networkidle' })
  await expect(page.getByText('AI Infrastructure').last()).toBeVisible()
})

test('direct NVDA report renders', async ({ page }) => {
  await page.goto(`${baseURL}/report/NVDA`, { waitUntil: 'networkidle' })
  await expect(page.locator('h1:visible').filter({ hasText: 'NVDA Stock Report' }).first()).toBeVisible()
})

test('ticker submit opens report route', async ({ page }) => {
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await page.getByLabel('Ticker command').fill('MRVL')
  await page.getByLabel('Open stock report').click()
  await expect(page).toHaveURL(/\/report\/MRVL/)
  await expect(page.locator('h1:visible').filter({ hasText: 'MRVL Stock Report' }).first()).toBeVisible()
})

test('mobile module select changes module', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await page.getByRole('combobox').click()
  await expect(page.getByRole('option', { name: 'Positioning' })).toHaveCount(0)
  await expect(page.getByRole('option', { name: 'Signal Validation Lab' })).toBeVisible()
  await expect(page.getByRole('option', { name: 'Stock Pitch' })).toBeVisible()
  await page.getByRole('option', { name: 'Crowding' }).click()
  await expect(page).toHaveURL(/module=crowding/)
  await expect(page.locator('h1', { hasText: 'Crowding Monitor' }).last()).toBeVisible()
})
