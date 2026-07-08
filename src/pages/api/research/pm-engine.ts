import { createResearchApiHandler } from '@/lib/research/apiRoute'
import { buildPmEngineView } from '@/lib/research/pm'

export default createResearchApiHandler(async () => ({ pmEngine: await buildPmEngineView() }))
