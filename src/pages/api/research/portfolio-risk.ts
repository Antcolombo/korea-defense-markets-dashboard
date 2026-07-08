import { createResearchApiHandler } from '@/lib/research/apiRoute'
import { buildPmEngineView } from '@/lib/research/pm'

export default createResearchApiHandler(async () => {
  const pmEngine = await buildPmEngineView()
  return {
    portfolio: pmEngine.portfolio,
    decisions: pmEngine.decisions.map(decision => ({
      ticker: decision.ticker,
      factorExposures: decision.factorExposures,
      stressScenarios: decision.stressScenarios,
      riskContributionPct: decision.riskContributionPct,
      liquidityDays: decision.liquidityDays,
      sourceGaps: decision.sourceGaps
    }))
  }
})
