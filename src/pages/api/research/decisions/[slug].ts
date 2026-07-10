import type { NextApiRequest, NextApiResponse } from 'next'
import { deleteInvestmentDecision, getInvestmentDecision, refreshInvestmentDecisionSources, updateInvestmentDecision } from '@/lib/research/decisions'
import { domainValidationApiError, methodAllowed, parseJsonObject, sendApiError, sendResearchResponse } from '@/lib/research/apiRoute'
import { editorTokenName, hasEditorWriteAccess } from '@/lib/research/editorAuth'
import type { UpsertInvestmentDecisionInput } from '@/lib/research/decisions'
import { updateDecisionBodySchema } from '@/features/decisions/application/schemas'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const slug = typeof req.query.slug === 'string' ? req.query.slug : ''
  if (!slug) return sendApiError(res, 400, 'validation', 'Missing decision slug.')

  if (req.method === 'GET') {
    const record = await getInvestmentDecision(slug)
    if (!record) return sendApiError(res, 404, 'not_found', 'Investment decision not found.')
    return sendResearchResponse(res, { record })
  }

  if (req.method === 'PUT') {
    if (!hasEditorWriteAccess(req, 'decision')) {
      return sendApiError(res, 401, 'unauthorized', `${editorTokenName('decision')} is required to update investment decisions in production.`)
    }
    try {
      const body = updateDecisionBodySchema.parse(parseJsonObject<{ decision?: UpsertInvestmentDecisionInput; refreshSources?: boolean }>(req.body))
      const record = body.refreshSources ? await refreshInvestmentDecisionSources(slug) : await updateInvestmentDecision(slug, body.decision ?? {})
      return sendResearchResponse(res, { record })
    } catch (error) {
      const validation = domainValidationApiError(error, [
        'Decision cannot', 'Investment decision not found.', 'Save this decision before'
      ])
      return validation
        ? sendApiError(res, 400, 'validation', validation)
        : sendApiError(res, 503, 'unavailable', 'Investment decision persistence is temporarily unavailable.')
    }
  }

  if (req.method === 'DELETE') {
    if (!hasEditorWriteAccess(req, 'decision')) {
      return sendApiError(res, 401, 'unauthorized', `${editorTokenName('decision')} is required to delete investment decisions in production.`)
    }
    try {
      return sendResearchResponse(res, await deleteInvestmentDecision(slug))
    } catch (error) {
      const validation = domainValidationApiError(error, [
        'Only blank non-public watch drafts', 'Investment decision not found.'
      ])
      return validation
        ? sendApiError(res, 400, 'validation', validation)
        : sendApiError(res, 503, 'unavailable', 'Investment decision persistence is temporarily unavailable.')
    }
  }

  methodAllowed(req, res, ['GET', 'PUT', 'DELETE'])
}
