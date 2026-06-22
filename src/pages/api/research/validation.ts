import { getValidationRows } from '@/lib/research/repository'
import { createResearchApiHandler } from '@/lib/research/apiRoute'

export default createResearchApiHandler(async () => ({ rows: await getValidationRows() }))
