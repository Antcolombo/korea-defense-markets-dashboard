import { getDailyNote } from '@/lib/research/repository'
import { createResearchApiHandler } from '@/lib/research/apiRoute'

export default createResearchApiHandler(async () => ({ note: await getDailyNote() }))
