import assert from 'node:assert/strict'
import { loadWorkspacePage, resolveWorkspaceModule, workspaceLoaders } from '../src/features/workspace/loaders'
import { researchSnapshotCutoff, resolveResearchDataMode } from '../src/platform/data/data-mode'
import type { RuntimeRepositories } from '../src/platform/runtime/repositories'
import { getPrisma } from '../src/lib/server/prisma'
import { buildPitchFromTemplate } from '../src/features/pitches/domain/builder'
import type { WorkspaceModule } from '../src/contracts/workspace'
import { createApiResponse } from '../src/lib/research/api'

async function main() {
  testModuleResolution()
  testDataModes()
  await testSourceAuditLoader()
  await testMethodologyLoader()
  await testEveryLoaderInIsolation()
  console.log('Workspace loader and data-mode regression tests passed')
}

async function testEveryLoaderInIsolation() {
  const pitch = buildPitchFromTemplate({ ticker: 'NVDA', now: () => new Date('2026-07-10T00:00:00.000Z') })
  const pitchRecord = {
    id: pitch.id, slug: 'nvda-pitch', ticker: 'NVDA', companyName: 'NVIDIA',
    recommendation: 'watchlist', status: 'draft', shareEnabled: false, shareToken: '',
    date: pitch.setup.date, oneLineThesis: pitch.setup.oneLineThesis,
    createdAt: '2026-07-10T00:00:00.000Z', updatedAt: '2026-07-10T00:00:00.000Z', pitch
  }
  const sourceAudit = { generatedAt: '2026-07-10T00:00:00.000Z', status: 'ready', recordsChecked: 0, missingProvenance: [], notes: [] }
  const repositories = {
    research: {
      getHomeSummary: async () => ({ rotations: [], baskets: [], crowding: [], validation: [], demoAsOfDate: null }),
      getRotationRows: async () => [],
      getBasketSummaries: async () => [],
      getBasketDetail: async () => ({ summary: null, members: [] }),
      getPositioningRows: async () => [],
      getCrowdingRows: async () => [],
      getValidationRows: async () => [],
      getStockReport: async () => ({ ticker: 'NVDA', companyName: 'NVIDIA' })
    },
    generated: {
      getEvents: () => [], getEventReturns: () => [], getAssets: () => [], getPrices: () => [], getSourceAudit: () => sourceAudit
    },
    pitches: {
      getDefaultStockPitch: async () => pitchRecord,
      getStockPitch: async () => null,
      listStockPitchSummaries: async () => [],
      buildStockPitchSourceSnapshot: async () => ({ ticker: 'NVDA', generatedAt: '2026-07-10T00:00:00.000Z', reportAsOf: '', price: null, newsTape: [], providerNotes: [], gaps: [], sourceQuality: {} }),
      getSourcedPriceSeries: async () => [],
      buildTargetConfidence: () => ({ score: 0, label: 'low', drivers: [], blockers: [], nextDataNeeded: [] })
    },
    decisions: {
      buildInvestmentDecisionTemplate: async () => ({ ticker: 'NVDA', slug: 'nvda-decision-template' }),
      getInvestmentDecision: async () => null,
      listInvestmentDecisions: async () => [],
      listInvestmentDecisionSummaries: async () => []
    },
    pm: { buildPmEngineView: async () => ({}) },
    risk: { buildRiskLensRows: async () => [] },
    providerRuns: { getAudit: async () => ({ latestAttemptAt: null, lastSuccessfulAt: null, latestStatus: 'unavailable', provider: null, dataset: null, rowsIngested: 0, errorCategory: null }) }
  } as unknown as RuntimeRepositories

  const queries: Partial<Record<WorkspaceModule, Record<string, string>>> = {
    'basket-detail': { slug: 'korea-indo-pacific' },
    'stock-report': { ticker: 'NVDA' },
    'stock-pitch': { ticker: 'NVDA' },
    'decision-log': { ticker: 'NVDA' },
    'risk-lens': { ticker: 'NVDA' }
  }
  for (const [module, loader] of Object.entries(workspaceLoaders) as [WorkspaceModule, (typeof workspaceLoaders)[WorkspaceModule]][]) {
    const result = await loader({ query: queries[module] ?? {}, dataMode: 'generated', repositories })
    assert.ok(result.data, `${module} returns workspace data`)
    assert.notEqual(result.responseData, undefined, `${module} returns response data`)
  }
}

function testModuleResolution() {
  assert.equal(resolveWorkspaceModule({}), 'overview')
  assert.equal(resolveWorkspaceModule({ module: 'rotation' }), 'rotation')
  assert.equal(resolveWorkspaceModule({ module: 'baskets', slug: 'korea-indo-pacific' }), 'basket-detail')
  assert.equal(resolveWorkspaceModule({ module: 'unknown' }), 'overview')
  assert.equal(resolveWorkspaceModule({ module: ['rotation'] }), 'overview')
}

function testDataModes() {
  assert.deepEqual(resolveResearchDataMode({} as NodeJS.ProcessEnv), { mode: 'live', asOfDate: null })
  assert.deepEqual(resolveResearchDataMode({ DEMO_AS_OF_DATE: '2026-06-30' } as unknown as NodeJS.ProcessEnv), {
    mode: 'snapshot',
    asOfDate: '2026-06-30'
  })
  assert.deepEqual(resolveResearchDataMode({ RESEARCH_DATA_MODE: 'generated' } as unknown as NodeJS.ProcessEnv), {
    mode: 'generated',
    asOfDate: null
  })
  assert.throws(
    () => resolveResearchDataMode({ RESEARCH_DATA_MODE: 'snapshot' } as unknown as NodeJS.ProcessEnv),
    /requires DEMO_AS_OF_DATE/
  )
  assert.equal(
    researchSnapshotCutoff({ RESEARCH_DATA_MODE: 'snapshot', DEMO_AS_OF_DATE: '2026-06-30' } as unknown as NodeJS.ProcessEnv)?.toISOString(),
    '2026-06-30T23:59:59.999Z'
  )
  assert.throws(
    () => resolveResearchDataMode({ RESEARCH_DATA_MODE: 'unknown' } as unknown as NodeJS.ProcessEnv),
    /Invalid RESEARCH_DATA_MODE/
  )
  assert.throws(
    () => resolveResearchDataMode({ DEMO_AS_OF_DATE: '2026-02-30' } as unknown as NodeJS.ProcessEnv),
    /valid calendar date/
  )

  const previousMode = process.env.RESEARCH_DATA_MODE
  const previousDatabaseUrl = process.env.DATABASE_URL
  try {
    process.env.RESEARCH_DATA_MODE = 'generated'
    process.env.DATABASE_URL = 'postgresql://should-not-be-used.invalid/example'
    assert.equal(getPrisma(), null)
    assert.equal(createApiResponse({ ok: true }).dataMode, 'generated')
  } finally {
    if (previousMode === undefined) delete process.env.RESEARCH_DATA_MODE
    else process.env.RESEARCH_DATA_MODE = previousMode
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = previousDatabaseUrl
  }
}

async function testSourceAuditLoader() {
  const sourceAudit = {
    generatedAt: '2026-07-10T00:00:00.000Z',
    status: 'ready',
    recordsChecked: 12,
    missingProvenance: [],
    notes: []
  }
  const repositories = {
    generated: { getSourceAudit: () => sourceAudit },
    providerRuns: {
      getAudit: async () => ({
        latestAttemptAt: '2026-07-10T00:00:00.000Z',
        lastSuccessfulAt: '2026-07-10T00:00:01.000Z',
        latestStatus: 'succeeded' as const,
        provider: 'Massive',
        dataset: 'daily-prices',
        rowsIngested: 12,
        errorCategory: null
      })
    }
  } as unknown as RuntimeRepositories
  const result = await loadWorkspacePage({ module: 'source-audit' }, repositories)
  assert.equal(result.module, 'source-audit')
  assert.equal(result.data.sourceAudit?.lastSuccessfulRefreshAt, '2026-07-10T00:00:01.000Z')
  assert.match(result.data.sourceAudit?.notes[0] ?? '', /succeeded; 12 rows/)
  assert.equal(result.shell.coveragePercent, 100)
  assert.deepEqual(result.unavailableFields, [])
}

async function testMethodologyLoader() {
  const result = await loadWorkspacePage(
    { module: 'methodology' },
    {} as RuntimeRepositories
  )
  assert.equal(result.module, 'methodology')
  assert.deepEqual(result.data, {})
  assert.equal(result.shell.coveragePercent, 100)
}

void main()
