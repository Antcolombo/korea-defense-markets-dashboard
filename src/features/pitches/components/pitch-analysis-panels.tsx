import { Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ListBlock, MetricMini, Panel, TextBlock } from '@/features/pitches/components/pitch-surfaces'
import type { PitchNewsTapeItem, StockPitch } from '@/types/pitch'

export function TargetMethod({ pitch }: { pitch: StockPitch }) {
  const battlefield = pitch.sourceSnapshot?.optionsBattlefield
  const confidence = pitch.sourceSnapshot?.targetConfidence
  const rows = [
    { label: 'Line type', value: 'Scenario target map' },
    { label: 'Source', value: 'Sourced close + RS + crowding + catalyst + extension; options battlefield is separate evidence.' },
    { label: 'Options layer', value: battlefield ? `${battlefield.sourceLabel}: ${battlefield.pressureDirection}, call wall ${money(battlefield.callWall ?? undefined)}, put wall ${money(battlefield.putWall ?? undefined)}.` : 'No options battlefield attached.' },
    { label: 'Confidence', value: confidence ? `${confidence.score}/100 ${confidence.confidenceLabel}. See Confidence tab for drivers/blockers.` : 'No confidence score attached.' },
    { label: 'Horizon', value: pitch.setup.timeHorizon || '1-3 months' }
  ]
  return (
    <div className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map(row => (
          <div key={row.label} className="rounded-md border border-border bg-background/45 p-3">
            <p className="font-mono text-[0.65rem] uppercase text-muted-foreground">{row.label}</p>
            <p className="mt-2 text-sm leading-5 text-muted-foreground">{row.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-md border border-border bg-background/45 p-3">
        <p className="font-mono text-[0.65rem] uppercase text-muted-foreground">Formula Read</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{pitch.valuation.valuationConclusion}</p>
      </div>
    </div>
  )
}

export function ScenarioBars({ pitch }: { pitch: StockPitch }) {
  const scenarios = pitch.valuation.scenarios
  const max = Math.max(1, ...scenarios.map(item => Math.abs(item.impliedReturn)))
  return (
    <div className="grid gap-3">
      {scenarios.map(scenario => {
        const width = Math.max(4, Math.abs(scenario.impliedReturn) / max * 100)
        const positive = scenario.impliedReturn >= 0
        return (
          <div key={scenario.name} className="rounded-md border border-border bg-background/45 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-sm font-semibold uppercase">{scenario.name}</p>
              <p className={positive ? 'font-mono text-sm text-emerald-300' : 'font-mono text-sm text-red-300'}>
                {money(scenario.priceTarget)} / {percent(scenario.impliedReturn)}
              </p>
            </div>
            <div className="mt-3 h-2 rounded-full bg-muted">
              <div
                className={positive ? 'h-2 rounded-full bg-primary' : 'h-2 rounded-full bg-destructive'}
                style={{ width: `${width}%` }}
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">{scenario.method}</p>
          </div>
        )
      })}
    </div>
  )
}

export function RiskStructure({ pitch }: { pitch: StockPitch }) {
  const upside = pitch.setup.targetPrice && pitch.setup.currentPrice ? pitch.setup.targetPrice - pitch.setup.currentPrice : null
  const downside = pitch.setup.currentPrice && pitch.setup.downsidePrice ? pitch.setup.currentPrice - pitch.setup.downsidePrice : null
  const ratio = upside && downside && downside > 0 ? upside / downside : null
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2">
        <MetricMini label="Expression" value={pitch.tradeStructure.preferredExpression} />
        <MetricMini label="Sizing" value={pitch.tradeStructure.sizing} />
        <MetricMini label="Stop" value={money(pitch.tradeStructure.stopLevel)} />
        <MetricMini label="Take Profit" value={money(pitch.tradeStructure.takeProfitLevel)} />
      </div>
      <div className="rounded-md border border-border bg-background/45 p-3">
        <p className="font-mono text-[0.65rem] uppercase text-muted-foreground">Reward / Risk</p>
        <p className="mt-1 font-mono text-lg font-semibold">{ratio ? `${ratio.toFixed(1)}x` : 'N/A'}</p>
        <div className="mt-3 grid grid-cols-[1fr_1fr] gap-2">
          <div className="h-2 rounded-full bg-destructive/70" />
          <div className="h-2 rounded-full bg-primary/70" />
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">{pitch.tradeStructure.riskReward}</p>
      </div>
    </div>
  )
}

export function AiScanPanel({ pitch, onRunAiScan, aiScanning }: { pitch: StockPitch; onRunAiScan?: () => void; aiScanning: boolean }) {
  const scan = pitch.aiScan
  const payload = scan?.payload
  const status = scan?.status ?? 'unavailable'
  return (
    <Panel title="AI Reviewer" kicker={status}>
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant={status === 'completed' ? 'secondary' : status === 'error' ? 'destructive' : 'outline'} className="font-mono">{status}</Badge>
          {onRunAiScan ? (
            <Button type="button" variant="outline" size="sm" onClick={onRunAiScan} disabled={aiScanning}>
              <Sparkles className="h-4 w-4" />
              {aiScanning ? 'Reviewing' : 'Run AI Review'}
            </Button>
          ) : null}
        </div>
        {payload ? (
          <div className="grid gap-3">
            <TextBlock title="Variant Thesis" body={payload.variantThesis} />
            <TextBlock title="Non-Consensus Read" body={payload.nonConsensusRead} />
            <TextBlock title="Bear Case" body={payload.bearCase} />
            <TextBlock title="Invalidation" body={payload.invalidation} />
            <ListBlock title="Evidence Map" items={payload.evidenceMap} />
            <ListBlock title="PM Questions" items={payload.pmQuestions} />
          </div>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">{scan?.errorMessage ?? 'Reviewer waits for finished source bundle. Configure OPENAI_API_KEY, then run review manually.'}</p>
        )}
      </div>
    </Panel>
  )
}

export function NewsTapePanel({ items }: { items: PitchNewsTapeItem[] }) {
  return (
    <Panel title="News Tape" kicker={`${items.length} direct rows`}>
      {items.length ? (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-card text-muted-foreground">
              <tr>
                <th className="p-2 text-left">Time</th>
                <th className="p-2 text-left">Headline</th>
                <th className="p-2 text-left">Materiality</th>
                <th className="p-2 text-left">Why matters</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-t border-border align-top">
                  <td className="p-2 text-muted-foreground">{item.date}</td>
                  <td className="p-2">
                    {item.url ? <a className="font-semibold underline-offset-4 hover:underline" href={item.url} target="_blank" rel="noreferrer">{item.headline}</a> : <span className="font-semibold">{item.headline}</span>}
                    <p className="mt-1 text-muted-foreground">{item.sourceName ?? item.provider}</p>
                  </td>
                  <td className="p-2 font-mono text-muted-foreground">{item.materiality ?? 'N/A'}</td>
                  <td className="p-2 text-muted-foreground">{item.whyMatters}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm leading-6 text-muted-foreground">No direct ticker catalyst passed relevance filter. Broad theme headlines stay out of primary catalyst.</p>
      )}
    </Panel>
  )
}


function money(value?: number) {
  if (!value || !Number.isFinite(value)) return 'N/A'
  return `$${value.toFixed(value >= 100 ? 0 : 2)}`
}

function percent(value?: number) {
  if (value === undefined || value === null || !Number.isFinite(value)) return 'N/A'
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}
