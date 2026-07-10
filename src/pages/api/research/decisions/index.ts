import type { NextApiRequest, NextApiResponse } from 'next'
import { createInvestmentDecision, listInvestmentDecisionSummaries } from '@/lib/research/decisions'
import { domainValidationApiError, methodAllowed, parseJsonObject, sendApiError, sendResearchResponse } from '@/lib/research/apiRoute'
import { editorTokenName, hasEditorWriteAccess } from '@/lib/research/editorAuth'
import type { UpsertInvestmentDecisionInput } from '@/lib/research/decisions'
import { createDecisionBodySchema } from '@/features/decisions/application/schemas'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return sendResearchResponse(res, { decisions: await listInvestmentDecisionSummaries() })
  }
  if (req.method === 'POST') {
    if (!hasEditorWriteAccess(req, 'decision')) {
      return sendApiError(res, 401, 'unauthorized', `${editorTokenName('decision')} is required to create investment decisions in production.`)
    }
    try {
      const body = createDecisionBodySchema.parse(parseJsonObject<{ decision?: UpsertInvestmentDecisionInput; ticker?: string; companyName?: string }>(req.body))
      const record = await createInvestmentDecision({
        ticker: body.ticker,
        companyName: body.companyName,
        ...body.decision
      })
      return sendResearchResponse(res, { record }, 201)
    } catch (error) {
      const validation = domainValidationApiError(error, ['Decision cannot'])
      return validation
        ? sendApiError(res, 400, 'validation', validation)
        : sendApiError(res, 503, 'unavailable', 'Investment decision persistence is temporarily unavailable.')
    }
  }
  methodAllowed(req, res, ['GET', 'POST'])
}
