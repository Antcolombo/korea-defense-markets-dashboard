import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PitchTargetChart } from '@/features/pitches/components/pitch-target-chart'
import { ListBlock, MetricMini, Panel, TextBlock } from '@/features/pitches/components/pitch-surfaces'
import type { ChartPricePoint } from '@/features/pitches/contracts'
import type { DayMapView, OptionsBattlefieldView, OptionsStrikeSignalView, StockPitch, TargetConfidenceView } from '@/types/pitch'

export function PitchSourceTabs({ pitch, prices }: { pitch: StockPitch; prices: ChartPricePoint[] }) {
  const battlefield = pitch.sourceSnapshot?.optionsBattlefield
  const dayMap = pitch.sourceSnapshot?.dayMap
  const confidence = pitch.sourceSnapshot?.targetConfidence
  return (
    <Panel title={`${pitch.setup.ticker} Target Workbench`} kicker={battlefield ? `${battlefield.sourceLabel} / ${dayMap?.sourceLabel ?? 'day map pending'}` : 'Source-conditioned'}>
      <Tabs defaultValue="scenario" className="min-w-0">
        <TabsList className="mb-3 flex-wrap">
          <TabsTrigger value="scenario">Scenario</TabsTrigger>
          <TabsTrigger value="battlefield">Options Battlefield</TabsTrigger>
          <TabsTrigger value="day-map">Day Map</TabsTrigger>
          <TabsTrigger value="confidence">Confidence</TabsTrigger>
        </TabsList>
        <TabsContent value="scenario">
          <PitchTargetChart pitch={pitch} prices={prices} />
        </TabsContent>
        <TabsContent value="battlefield">
          <OptionsBattlefieldPanel battlefield={battlefield} />
        </TabsContent>
        <TabsContent value="day-map">
          <DayMapPanel dayMap={dayMap} />
        </TabsContent>
        <TabsContent value="confidence">
          <TargetConfidencePanel confidence={confidence} />
        </TabsContent>
      </Tabs>
    </Panel>
  )
}

function OptionsBattlefieldPanel({ battlefield }: { battlefield?: OptionsBattlefieldView }) {
  if (!battlefield) {
    return <p className="text-sm leading-6 text-muted-foreground">No options battlefield attached. Run positioning ingest for this ticker.</p>
  }
  const maxMagnet = Math.max(1, ...battlefield.strikes.map(strike => strike.magnetScore ?? 0))
  const visibleStrikes = [...battlefield.strikes]
    .sort((a, b) => (b.magnetScore ?? 0) - (a.magnetScore ?? 0))
    .slice(0, 28)
  return (
    <div className="grid gap-3">
      <div className="grid gap-2 md:grid-cols-5">
        <MetricMini label="Source" value={battlefield.sourceLabel} />
        <MetricMini label="Call Wall" value={money(battlefield.callWall ?? undefined)} />
        <MetricMini label="Put Wall" value={money(battlefield.putWall ?? undefined)} />
        <MetricMini label="Zero Gamma" value={money(battlefield.zeroGamma ?? undefined)} />
        <MetricMini label="Exp Move" value={money(battlefield.expectedMove ?? undefined)} />
      </div>
      <div className="grid gap-3 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="overflow-hidden rounded-md border border-border">
          <div className="grid grid-cols-[0.9fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-2 border-b border-border bg-card p-2 font-mono text-[0.65rem] uppercase text-muted-foreground">
            <span>Strike</span>
            <span>Call Vol</span>
            <span>Put Vol</span>
            <span>GEX / Proxy</span>
            <span>Magnet</span>
          </div>
          <div className="max-h-[420px] overflow-auto">
            {visibleStrikes.length ? visibleStrikes.map(strike => (
              <BattlefieldStrikeRow key={`${strike.expirationDate}-${strike.strikePrice}`} strike={strike} maxMagnet={maxMagnet} />
            )) : (
              <p className="p-4 text-sm text-muted-foreground">No strike-level rows. Snapshot entitlement may be missing or ingest has not run.</p>
            )}
          </div>
        </div>
        <div className="grid gap-3">
          <TextBlock title="Read" body={battlefield.mode === 'true-gex'
            ? `True GEX view. Pressure is ${battlefield.pressureDirection}; walls and zero-gamma come from sourced OI/IV/Greeks.`
            : battlefield.mode === 'proxy'
              ? `Options Proxy view. Strike heat uses Massive Basic contract/aggregate samples. Good for interest, not dealer gamma.`
              : 'Plan locked. No true options wall or IV expected move yet.'}
          />
          <div className="rounded-md border border-border bg-background/45 p-3">
            <p className="font-mono text-[0.65rem] uppercase text-muted-foreground">Expiry Clusters</p>
            <div className="mt-2 grid gap-2">
              {battlefield.expiryClusters.length ? battlefield.expiryClusters.slice(0, 6).map(cluster => (
                <div key={cluster.expirationDate} className="rounded-md border border-border bg-card p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-xs font-semibold">{cluster.expirationDate}</p>
                    <Badge variant="outline" className="font-mono">{cluster.sourceQuality}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Vol {compactNumber(cluster.totalVolume)} / OI {compactNumber(cluster.openInterest)} / EM {money(cluster.expectedMove ?? undefined)}</p>
                </div>
              )) : <p className="text-sm text-muted-foreground">No expiry clusters.</p>}
            </div>
          </div>
          {battlefield.gaps.length ? <ListBlock title="Battlefield Limits" items={battlefield.gaps} /> : null}
        </div>
      </div>
    </div>
  )
}

function BattlefieldStrikeRow({ strike, maxMagnet }: { strike: OptionsStrikeSignalView; maxMagnet: number }) {
  const magnetPct = Math.max(4, ((strike.magnetScore ?? 0) / maxMagnet) * 100)
  const gex = strike.gammaExposure ?? strike.gammaProxy
  return (
    <div className="relative grid grid-cols-[0.9fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-2 border-b border-border/70 p-2 text-xs last:border-b-0">
      <div
        aria-hidden="true"
        className="absolute inset-y-1 left-1 rounded-sm bg-primary/15"
        style={{ width: `${magnetPct}%` }}
      />
      <p className="relative font-mono font-semibold">{money(strike.strikePrice)} <span className="text-muted-foreground">{strike.expirationDate}</span></p>
      <p className="relative font-mono text-emerald-300">{compactNumber(strike.callVolume)}</p>
      <p className="relative font-mono text-red-300">{compactNumber(strike.putVolume)}</p>
      <p className="relative font-mono text-muted-foreground">{compactNumber(gex)}</p>
      <p className="relative font-mono">{strike.magnetScore === null ? 'N/A' : strike.magnetScore.toFixed(0)}</p>
    </div>
  )
}

function DayMapPanel({ dayMap }: { dayMap?: DayMapView }) {
  if (!dayMap) {
    return <p className="text-sm leading-6 text-muted-foreground">No day map attached. Need DailyPrice rows.</p>
  }
  return (
    <div className="grid gap-3">
      <div className="grid gap-2 md:grid-cols-5">
        <MetricMini label="Source" value={dayMap.sourceLabel} />
        <MetricMini label="Prior High" value={money(dayMap.priorHigh ?? undefined)} />
        <MetricMini label="Prior Low" value={money(dayMap.priorLow ?? undefined)} />
        <MetricMini label="Prior Close" value={money(dayMap.priorClose ?? undefined)} />
        <MetricMini label="ATR20" value={money(dayMap.atr20 ?? undefined)} />
      </div>
      <div className="grid gap-3 xl:grid-cols-[1fr_0.7fr]">
        <div className="grid gap-2 md:grid-cols-2">
          {dayMap.levels.map(level => (
            <div key={`${level.label}-${level.type}`} className="rounded-md border border-border bg-background/45 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-sm font-semibold">{level.label}</p>
                <Badge variant="outline" className="font-mono">{level.type}</Badge>
              </div>
              <p className="mt-2 font-mono text-lg font-semibold">{level.type === 'gap' ? signedMoney(level.price) : money(level.price ?? undefined)}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{level.description}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-3">
          <TextBlock title="Use" body="Daily OHLCV map gives prior levels, ATR bands, gap delta, and volume-shelf proxy. This answers likely fight zones from sourced daily bars, not intraday VWAP." />
          {dayMap.gaps.length ? <ListBlock title="Day Map Limits" items={dayMap.gaps} /> : null}
        </div>
      </div>
    </div>
  )
}

function TargetConfidencePanel({ confidence }: { confidence?: TargetConfidenceView }) {
  if (!confidence) {
    return <p className="text-sm leading-6 text-muted-foreground">No target confidence attached. Create or refresh sourced pitch.</p>
  }
  return (
    <div className="grid gap-3">
      <div className="rounded-md border border-border bg-background/45 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">Target Confidence</p>
            <p className="mt-1 font-mono text-3xl font-semibold">{confidence.score}<span className="text-base text-muted-foreground">/100</span></p>
          </div>
          <Badge variant={confidence.score >= 50 ? 'secondary' : 'outline'} className="font-mono">{confidence.confidenceLabel}</Badge>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div className={scoreBarClass(confidence.score)} style={{ width: `${confidence.score}%` }} />
        </div>
      </div>
      <div className="grid gap-3 xl:grid-cols-3">
        <ListBlock title="Drivers" items={confidence.drivers} />
        <ListBlock title="Blockers" items={confidence.blockers} />
        <ListBlock title="Next Data Needed" items={confidence.nextDataNeeded} />
      </div>
    </div>
  )
}


function money(value?: number) {
  if (!value || !Number.isFinite(value)) return 'N/A'
  return `$${value.toFixed(value >= 100 ? 0 : 2)}`
}

function signedMoney(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'N/A'
  const sign = value > 0 ? '+' : ''
  return `${sign}$${Math.abs(value).toFixed(Math.abs(value) >= 100 ? 0 : 2)}`
}

function compactNumber(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'N/A'
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`
  return `${sign}${abs.toFixed(abs >= 100 ? 0 : 1)}`
}

function scoreBarClass(score: number) {
  const color = score >= 75 ? 'bg-primary' : score >= 50 ? 'bg-emerald-300' : score >= 25 ? 'bg-amber-300' : 'bg-destructive'
  return `h-2 rounded-full ${color}`
}
