import type { NextApiRequest, NextApiResponse } from 'next'
import { getBasketDetail } from '@/lib/research/repository'
import { methodAllowed, sendApiError, sendResearchResponse } from '@/lib/research/apiRoute'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!methodAllowed(req, res, ['GET'])) return
  const slug = typeof req.query.slug === 'string' ? req.query.slug : ''
  const detail = await getBasketDetail(slug)
  if (!detail.summary) {
    return sendApiError(res, 404, 'not_found', 'Basket not found.')
  }
  sendResearchResponse(res, detail)
}
