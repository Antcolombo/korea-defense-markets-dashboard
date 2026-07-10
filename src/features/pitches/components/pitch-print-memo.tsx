import type { StockPitch, StockPitchRecord } from '@/types/pitch'

export function PitchPrintMemo({ record }: { record: StockPitchRecord }) {
  const pitch = record.pitch
  return (
    <main className="pitch-print">
      <div className="pitch-print__actions">
        <button type="button" onClick={() => window.print()}>Print / Save PDF</button>
      </div>
      <article className="pitch-print__page">
        <header className="pitch-print__header">
          <div>
            <p className="pitch-print__kicker">Positioning-Driven Catalyst Memo</p>
            <h1>{pitch.setup.ticker} / {pitch.setup.companyName}</h1>
            <p className="pitch-print__thesis">{pitch.setup.oneLineThesis}</p>
          </div>
          <div className="pitch-print__stamp">
            <span>{pitch.setup.recommendation}</span>
            <strong>{pitch.setup.date}</strong>
            <small>{pitch.setup.analyst}</small>
          </div>
        </header>

        <section className="pitch-print__metrics">
          <Metric label="Current" value={money(pitch.setup.currentPrice)} />
          <Metric label="Target" value={money(pitch.setup.targetPrice)} />
          <Metric label="Downside" value={money(pitch.setup.downsidePrice)} />
          <Metric label="Expected" value={percent(pitch.setup.expectedReturn)} />
          <Metric label="Expression" value={pitch.tradeStructure.preferredExpression} />
          <Metric label="Sizing" value={pitch.tradeStructure.sizing} />
        </section>

        <section className="pitch-print__grid">
          <Block title="Variant View" body={pitch.variantView.myView} />
          <Block title="Market Believes" body={pitch.variantView.marketBelieves} />
          <Block title="Why Now" body={pitch.variantView.whyNow} />
          <Block title="Mispricing" body={pitch.variantView.mispricing} />
        </section>

        <section className="pitch-print__row">
          <div>
            <h2>Valuation Range</h2>
            <ScenarioTable pitch={pitch} />
          </div>
          <div>
            <h2>Trade Structure</h2>
            <p>{pitch.tradeStructure.entryTrigger}</p>
            <p><strong>Invalidation:</strong> {pitch.tradeStructure.invalidation}</p>
            <p><strong>Risk/reward:</strong> {pitch.tradeStructure.riskReward}</p>
          </div>
        </section>

        <section className="pitch-print__row">
          <div>
            <h2>Catalysts</h2>
            <ul>
              {pitch.catalysts.slice(0, 4).map(catalyst => (
                <li key={catalyst.id}><strong>{catalyst.date}</strong> {catalyst.title}: {catalyst.expectedImpact}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2>Red Team</h2>
            <p>{pitch.redTeam.strongestCounterargument}</p>
            <p><strong>Wrong if:</strong> {pitch.redTeam.whatWouldMakeMeWrong}</p>
          </div>
        </section>

        <footer className="pitch-print__footer">
          <span>{record.slug}</span>
          <span>Source object: StockPitch.payload</span>
        </footer>
      </article>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function Block({ title, body }: { title: string; body: string }) {
  return (
    <div className="pitch-print__block">
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  )
}

function ScenarioTable({ pitch }: { pitch: StockPitch }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Case</th>
          <th>Target</th>
          <th>Return</th>
          <th>Method</th>
        </tr>
      </thead>
      <tbody>
        {pitch.valuation.scenarios.map(scenario => (
          <tr key={scenario.name}>
            <td>{scenario.name}</td>
            <td>{money(scenario.priceTarget)}</td>
            <td>{percent(scenario.impliedReturn)}</td>
            <td>{scenario.method}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function money(value?: number) {
  if (!value || !Number.isFinite(value)) return 'N/A'
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  return `$${value.toFixed(value >= 100 ? 0 : 2)}`
}

function percent(value?: number) {
  if (value === undefined || value === null || !Number.isFinite(value)) return 'N/A'
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}
