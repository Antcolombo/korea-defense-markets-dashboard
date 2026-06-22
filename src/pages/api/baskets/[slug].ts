import type { NextApiRequest, NextApiResponse } from 'next'
import { getBasketDetail } from '@/lib/research/repository'
import { sendResearchResponse } from '@/lib/research/apiRoute'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const slug = typeof req.query.slug === 'string' ? req.query.slug : ''
  const detail = await getBasketDetail(slug)
  if (!detail.summary) {
    res.status(404).json({ error: 'Basket not found' })
    return
  }
  sendResearchResponse(res, detail)
}
