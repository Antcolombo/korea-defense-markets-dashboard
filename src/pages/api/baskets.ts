import { getBasketSummaries } from '@/lib/research/repository'
import { createResearchApiHandler } from '@/lib/research/apiRoute'

export default createResearchApiHandler(async () => ({ baskets: await getBasketSummaries() }))
