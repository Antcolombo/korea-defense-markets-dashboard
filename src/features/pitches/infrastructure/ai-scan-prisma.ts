import type { Prisma } from '@prisma/client'
import { buildStockPitchSourceSnapshot, stockPitchSourceHash } from '@/lib/research/stockPitchSources'
import { getStockReport, isValidTickerSymbol, normalizeTickerSymbol } from '@/lib/research/repository'
import { getPrisma } from '@/lib/server/prisma'
import type { AiScanPayload, AiScanView, PitchSourceSnapshot, StockPitch } from '@/types/pitch'

export type RunAiScanInput = {
  ticker: string
  mode?: string
  forceRefresh?: boolean
  sourceSnapshot?: PitchSourceSnapshot
}

type AiScanRow = {
  id: string
  ticker: string
  mode: string
  inputHash: string
  model: string
  status: string
  payload: unknown
  sourceSnapshot: unknown
  errorMessage: string | null
  createdAt: Date | string
}

export async function runAiScan(input: RunAiScanInput): Promise<{ aiScan: AiScanView; sourceSnapshot: PitchSourceSnapshot }> {
  const ticker = normalizeTickerSymbol(input.ticker)
  if (!isValidTickerSymbol(ticker)) {
    throw new Error('Valid ticker is required for AI scan.')
  }

  const sourceSnapshot = input.sourceSnapshot ?? await loadSourceSnapshot(ticker)
  const mode = input.mode || 'stock-pitch'
  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4.1-mini'
  const inputHash = stockPitchSourceHash(sourceSnapshot)
  const prisma = getPrisma()
  const aiConfigured = process.env.AI_SCAN_ENABLED !== 'false' && Boolean(process.env.OPENAI_API_KEY?.trim())

  if (!aiConfigured) {
    return {
      sourceSnapshot,
      aiScan: {
        ticker,
        mode,
        inputHash,
        model,
        status: 'unavailable',
        createdAt: new Date().toISOString(),
        errorMessage: 'OPENAI_API_KEY is not configured or AI_SCAN_ENABLED=false.'
      }
    }
  }

  if (prisma && !input.forceRefresh) {
    try {
      const cached = await prisma.aiScan.findUnique({
        where: { ticker_mode_inputHash: { ticker, mode, inputHash } }
      })
      if (cached) return { aiScan: aiScanFromRow(cached), sourceSnapshot }
    } catch (error) {
      console.warn(`AI scan cache lookup skipped. ${describeError(error)}`)
    }
  }

  try {
    const payload = await callOpenAi({ ticker, mode, model, sourceSnapshot })
    const scan: AiScanView = {
      ticker,
      mode,
      inputHash,
      model,
      status: 'completed',
      createdAt: new Date().toISOString(),
      payload
    }
    if (!prisma) return { aiScan: scan, sourceSnapshot }
    try {
      const row = await prisma.aiScan.upsert({
        where: { ticker_mode_inputHash: { ticker, mode, inputHash } },
        create: {
          ticker,
          mode,
          inputHash,
          model,
          status: 'completed',
          payload: payload as unknown as Prisma.InputJsonValue,
          sourceSnapshot: sourceSnapshot as unknown as Prisma.InputJsonValue
        },
        update: {
          model,
          status: 'completed',
          payload: payload as unknown as Prisma.InputJsonValue,
          sourceSnapshot: sourceSnapshot as unknown as Prisma.InputJsonValue,
          errorMessage: null
        }
      })
      return { aiScan: aiScanFromRow(row), sourceSnapshot }
    } catch (error) {
      console.warn(`AI scan cache write skipped. ${describeError(error)}`)
      return { aiScan: scan, sourceSnapshot }
    }
  } catch (error) {
    const errorMessage = describeError(error)
    if (prisma) {
      try {
      const row = await prisma.aiScan.upsert({
        where: { ticker_mode_inputHash: { ticker, mode, inputHash } },
        create: {
          ticker,
          mode,
          inputHash,
          model,
          status: 'error',
          payload: {},
          sourceSnapshot: sourceSnapshot as unknown as Prisma.InputJsonValue,
          errorMessage
        },
        update: {
          model,
          status: 'error',
          payload: {},
          sourceSnapshot: sourceSnapshot as unknown as Prisma.InputJsonValue,
          errorMessage
        }
      })
      return { aiScan: aiScanFromRow(row), sourceSnapshot }
      } catch (cacheError) {
        console.warn(`AI scan error cache write skipped. ${describeError(cacheError)}`)
      }
    }
    return {
      sourceSnapshot,
      aiScan: {
        ticker,
        mode,
        inputHash,
        model,
        status: 'error',
        createdAt: new Date().toISOString(),
        errorMessage
      }
    }
  }
}

export function applyAiScanToPitch(pitch: StockPitch, aiScan: AiScanView, sourceSnapshot: PitchSourceSnapshot): StockPitch {
  return {
    ...pitch,
    sourceSnapshot,
    newsTape: sourceSnapshot.newsTape,
    priceProvenance: sourceSnapshot.price ?? undefined,
    aiScanId: aiScan.id,
    aiScan
  }
}

async function loadSourceSnapshot(ticker: string) {
  const report = await getStockReport(ticker)
  return buildStockPitchSourceSnapshot(ticker, report)
}

async function callOpenAi(input: { ticker: string; mode: string; model: string; sourceSnapshot: PitchSourceSnapshot }): Promise<AiScanPayload> {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: input.model,
      input: [
        {
          role: 'system',
          content: 'You are a buy-side equity reviewer. Review only the finished sourced bundle. Do not generate price targets, source data, catalysts, or facts. Do not override deterministic target confidence. Return strict JSON matching schema.'
        },
        {
          role: 'user',
          content: JSON.stringify({
            task: 'Review the stock pitch source bundle for variant read quality, evidence gaps, catalyst relevance, bear case, invalidation, missing data, PM questions, and citations. Treat scenario targets, options battlefield, day map, and confidence as inputs to audit, not outputs to create.',
            ticker: input.ticker,
            mode: input.mode,
            sourceSnapshot: input.sourceSnapshot
          })
        }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'stock_pitch_ai_scan',
          strict: true,
          schema: aiScanJsonSchema()
        }
      }
    })
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`OpenAI scan failed ${response.status}: ${text.slice(0, 500)}`)
  const parsed = JSON.parse(text) as Record<string, unknown>
  const outputText = responseOutputText(parsed)
  if (!outputText) throw new Error('OpenAI response did not include JSON output text.')
  return normalizePayload(JSON.parse(outputText))
}

function responseOutputText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === 'string') return payload.output_text
  const output = Array.isArray(payload.output) ? payload.output : []
  for (const item of output) {
    const content = item && typeof item === 'object' ? (item as Record<string, unknown>).content : undefined
    if (!Array.isArray(content)) continue
    for (const part of content) {
      if (!part || typeof part !== 'object') continue
      const text = (part as Record<string, unknown>).text
      if (typeof text === 'string') return text
    }
  }
  return ''
}

function normalizePayload(value: unknown): AiScanPayload {
  const raw = value && typeof value === 'object' ? value as Partial<AiScanPayload> : {}
  return {
    variantThesis: stringOr(raw.variantThesis),
    nonConsensusRead: stringOr(raw.nonConsensusRead),
    evidenceMap: stringArray(raw.evidenceMap),
    catalystMap: Array.isArray(raw.catalystMap) ? raw.catalystMap.map(item => {
      const row = item && typeof item === 'object' ? item as Record<string, unknown> : {}
      return {
        headline: stringOr(row.headline),
        relevance: stringOr(row.relevance),
        whyMatters: stringOr(row.whyMatters),
        materiality: numberOr(row.materiality, 0)
      }
    }) : [],
    bearCase: stringOr(raw.bearCase),
    invalidation: stringOr(raw.invalidation),
    missingData: stringArray(raw.missingData),
    pmQuestions: stringArray(raw.pmQuestions),
    citations: Array.isArray(raw.citations) ? raw.citations.map(item => {
      const row = item && typeof item === 'object' ? item as Record<string, unknown> : {}
      return { label: stringOr(row.label), url: optionalString(row.url) }
    }) : []
  }
}

function aiScanFromRow(row: AiScanRow): AiScanView {
  return {
    id: row.id,
    ticker: row.ticker,
    mode: row.mode,
    inputHash: row.inputHash,
    model: row.model,
    status: row.status === 'completed' ? 'completed' : row.status === 'error' ? 'error' : 'unavailable',
    payload: row.status === 'completed' ? normalizePayload(row.payload) : undefined,
    errorMessage: row.errorMessage ?? undefined,
    createdAt: toIso(row.createdAt)
  }
}

function aiScanJsonSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['variantThesis', 'nonConsensusRead', 'evidenceMap', 'catalystMap', 'bearCase', 'invalidation', 'missingData', 'pmQuestions', 'citations'],
    properties: {
      variantThesis: { type: 'string' },
      nonConsensusRead: { type: 'string' },
      evidenceMap: { type: 'array', items: { type: 'string' } },
      catalystMap: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['headline', 'relevance', 'whyMatters', 'materiality'],
          properties: {
            headline: { type: 'string' },
            relevance: { type: 'string' },
            whyMatters: { type: 'string' },
            materiality: { type: 'number' }
          }
        }
      },
      bearCase: { type: 'string' },
      invalidation: { type: 'string' },
      missingData: { type: 'array', items: { type: 'string' } },
      pmQuestions: { type: 'array', items: { type: 'string' } },
      citations: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['label', 'url'],
          properties: {
            label: { type: 'string' },
            url: { type: ['string', 'null'] }
          }
        }
      }
    }
  }
}

function stringOr(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(item => String(item)).filter(Boolean) : []
}

function numberOr(value: unknown, fallback: number) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function describeError(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error'
}
