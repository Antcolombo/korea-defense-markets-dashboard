import type { NextApiRequest, NextApiResponse } from 'next'
import { methodAllowed, parseJsonObject, sendApiError, sendResearchResponse, validationApiError } from '@/lib/research/apiRoute'
import { editorTokenName, hasEditorWriteAccess } from '@/lib/research/editorAuth'
import { getStockPitch, updateStockPitch } from '@/lib/research/pitches'
import type { StockPitch, StockPitchStatus } from '@/types/pitch'
import { updatePitchBodySchema } from '@/features/pitches/application/schemas'

type UpdatePitchBody = {
  pitch?: StockPitch
  status?: StockPitchStatus
  shareEnabled?: boolean
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const slug = Array.isArray(req.query.slug) ? req.query.slug[0] : req.query.slug
  if (!slug) return sendApiError(res, 400, 'validation', 'Missing pitch slug.')

  if (req.method === 'GET') {
    const record = await getStockPitch(slug)
    if (!record) return sendApiError(res, 404, 'not_found', 'Stock pitch not found.')
    return sendResearchResponse(res, { record })
  }

  if (req.method === 'PUT') {
    if (!hasEditorWriteAccess(req, 'pitch')) {
      return sendApiError(res, 401, 'unauthorized', `${editorTokenName('pitch')} is required to update stock pitches in production.`)
    }

    try {
      const body = updatePitchBodySchema.parse(parseJsonObject<UpdatePitchBody>(req.body))
      const record = await updateStockPitch(slug, {
        pitch: body.pitch,
        status: body.status,
        shareEnabled: body.shareEnabled
      })
      return sendResearchResponse(res, { record })
    } catch (error) {
      const validation = validationApiError(error)
      return validation
        ? sendApiError(res, 400, 'validation', validation)
        : sendApiError(res, 503, 'unavailable', 'Stock pitch persistence is temporarily unavailable.')
    }
  }

  methodAllowed(req, res, ['GET', 'PUT'])
}
