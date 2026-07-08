import { getBasketDetail, getCrowdingRows, getRotationRows } from '@/lib/research/repository'
import { createResearchApiHandler } from '@/lib/research/apiRoute'

export default createResearchApiHandler(async () => {
  const [basket, rotations, crowding] = await Promise.all([
    getBasketDetail('korea-indo-pacific'),
    getRotationRows(),
    getCrowdingRows()
  ])
  return { basket, rotations, crowding }
})
