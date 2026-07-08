import './lib/io'
import { buildPmEngineView } from '../src/lib/research/pm'

async function main() {
  const pm = await buildPmEngineView()
  console.log(JSON.stringify({
    decisions: pm.decisions.length,
    pmReady: pm.portfolio.pmReadyCount,
    grossPct: pm.portfolio.grossPct,
    netPct: pm.portfolio.netPct,
    costAdjustedEvPct: pm.portfolio.costAdjustedEvPct,
    gaps: pm.gaps.slice(0, 12)
  }, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
