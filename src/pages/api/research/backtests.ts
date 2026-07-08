import { createResearchApiHandler } from '@/lib/research/apiRoute'
import { buildPmEngineView } from '@/lib/research/pm'

export default createResearchApiHandler(async () => {
  const pmEngine = await buildPmEngineView()
  return {
    portfolioBacktest: pmEngine.portfolio.backtest,
    decisionBacktests: pmEngine.decisions.map(decision => ({
      ticker: decision.ticker,
      decisionSlug: decision.decisionSlug,
      backtest: decision.backtest,
      sourceGaps: decision.sourceGaps
    }))
  }
})
