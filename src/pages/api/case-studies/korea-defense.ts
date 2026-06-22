import { getBasketDetail, getCrowdingRows, getDailyNote, getRotationRows } from '@/lib/research/repository'
import { createResearchApiHandler } from '@/lib/research/apiRoute'

export default createResearchApiHandler(async () => {
  const [basket, rotations, crowding, note] = await Promise.all([
    getBasketDetail('korea-indo-pacific'),
    getRotationRows(),
    getCrowdingRows(),
    getDailyNote()
  ])
  return { basket, rotations, crowding, note }
})
