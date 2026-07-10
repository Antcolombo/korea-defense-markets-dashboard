import type { NextApiRequest, NextApiResponse } from 'next'
import { methodAllowed, parseJsonObject, sendApiError, sendResearchResponse, validationApiError } from '@/lib/research/apiRoute'
import { editorTokenName, hasEditorWriteAccess } from '@/lib/research/editorAuth'
import { createStockPitch, listStockPitchSummaries } from '@/lib/research/pitches'
import type { StockPitch } from '@/types/pitch'
import { createPitchBodySchema } from '@/features/pitches/application/schemas'

type CreatePitchBody = {
  ticker?: string
  companyName?: string
  analyst?: string
  pitch?: StockPitch
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return sendResearchResponse(res, { pitches: await listStockPitchSummaries() })
  }

  if (req.method === 'POST') {
    if (!hasEditorWriteAccess(req, 'pitch')) {
      return sendApiError(res, 401, 'unauthorized', `${editorTokenName('pitch')} is required to create stock pitches in production.`)
    }

    try {
      const body = createPitchBodySchema.parse(parseJsonObject<CreatePitchBody>(req.body))
      const record = await createStockPitch({
        ticker: body.ticker,
        companyName: body.companyName,
        analyst: body.analyst,
        pitch: body.pitch
      })
      return sendResearchResponse(res, {
        record,
        sourceSnapshot: record.pitch.sourceSnapshot
      }, 201)
    } catch (error) {
      const validation = validationApiError(error)
      return validation
        ? sendApiError(res, 400, 'validation', validation)
        : sendApiError(res, 503, 'unavailable', 'Stock pitch persistence is temporarily unavailable.')
    }
  }

  methodAllowed(req, res, ['GET', 'POST'])
}
