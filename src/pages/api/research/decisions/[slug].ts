import type { NextApiRequest, NextApiResponse } from 'next'
import { deleteInvestmentDecision, getInvestmentDecision, refreshInvestmentDecisionSources, updateInvestmentDecision } from '@/lib/research/decisions'
import { decisionEditorTokenName, hasDecisionWriteAccess } from '@/lib/research/decisionAuth'
import { sendResearchResponse } from '@/lib/research/apiRoute'
import type { UpsertInvestmentDecisionInput } from '@/lib/research/decisions'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const slug = typeof req.query.slug === 'string' ? req.query.slug : ''
  if (!slug) return res.status(400).json({ error: 'Missing decision slug.' })

  if (req.method === 'GET') {
    const record = await getInvestmentDecision(slug)
    if (!record) return res.status(404).json({ error: 'Investment decision not found.' })
    return sendResearchResponse(res, { record })
  }

  if (req.method === 'PUT') {
    if (!hasDecisionWriteAccess(req)) {
      return res.status(401).json({ error: `${decisionEditorTokenName()} is required to update investment decisions in production.` })
    }
    try {
      const body = parseBody<{ decision?: UpsertInvestmentDecisionInput; refreshSources?: boolean }>(req.body)
      const record = body.refreshSources ? await refreshInvestmentDecisionSources(slug) : await updateInvestmentDecision(slug, body.decision ?? {})
      return sendResearchResponse(res, { record })
    } catch (error) {
      return res.status(400).json({ error: describeError(error) })
    }
  }

  if (req.method === 'DELETE') {
    if (!hasDecisionWriteAccess(req)) {
      return res.status(401).json({ error: `${decisionEditorTokenName()} is required to delete investment decisions in production.` })
    }
    try {
      return sendResearchResponse(res, await deleteInvestmentDecision(slug))
    } catch (error) {
      return res.status(400).json({ error: describeError(error) })
    }
  }

  res.setHeader('Allow', 'GET, PUT, DELETE')
  return res.status(405).json({ error: 'Method not allowed.' })
}

function parseBody<T>(body: unknown): T {
  if (typeof body === 'string') return JSON.parse(body) as T
  return (body ?? {}) as T
}

function describeError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
