import type { NextApiRequest, NextApiResponse } from 'next'
import { createInvestmentDecision, listInvestmentDecisionSummaries } from '@/lib/research/decisions'
import { decisionEditorTokenName, hasDecisionWriteAccess } from '@/lib/research/decisionAuth'
import { sendResearchResponse } from '@/lib/research/apiRoute'
import type { UpsertInvestmentDecisionInput } from '@/lib/research/decisions'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return sendResearchResponse(res, { decisions: await listInvestmentDecisionSummaries() })
  }
  if (req.method === 'POST') {
    if (!hasDecisionWriteAccess(req)) {
      return res.status(401).json({ error: `${decisionEditorTokenName()} is required to create investment decisions in production.` })
    }
    try {
      const body = parseBody<{ decision?: UpsertInvestmentDecisionInput; ticker?: string; companyName?: string }>(req.body)
      const record = await createInvestmentDecision({
        ticker: body.ticker,
        companyName: body.companyName,
        ...body.decision
      })
      return sendResearchResponse(res, { record }, 201)
    } catch (error) {
      return res.status(400).json({ error: describeError(error) })
    }
  }
  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed.' })
}

function parseBody<T>(body: unknown): T {
  if (typeof body === 'string') return JSON.parse(body) as T
  return (body ?? {}) as T
}

function describeError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
