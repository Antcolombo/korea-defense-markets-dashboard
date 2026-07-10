import { useEffect, useMemo, useRef, useState } from 'react'
import { AreaSeries, createChart, LineStyle } from 'lightweight-charts'
import { Button } from '@/components/ui/button'
import type { ChartPricePoint } from '@/features/pitches/contracts'
import type { OptionsStrikeSignalView, StockPitch } from '@/types/pitch'

export function PitchTargetChart({ pitch, prices }: { pitch: StockPitch; prices: ChartPricePoint[] }) {
  const chartRef = useRef<HTMLDivElement | null>(null)
  const [range, setRange] = useState<ChartRange>('6M')
  const [levelMode, setLevelMode] = useState<LevelMode>('battlefield')
  const [hover, setHover] = useState<{ time: string; value: number } | null>(null)
  const [renderedRails, setRenderedRails] = useState<RenderedChartRail[]>([])
  const data = useMemo(() => {
    return prices
      .filter(point => point.ticker === pitch.setup.ticker)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(point => ({ time: point.date, value: point.price }))
  }, [prices, pitch.setup.ticker])
  const visibleData = useMemo(() => filterChartRange(data, range), [data, range])
  const levels = useMemo(() => targetLevels(pitch, levelMode), [levelMode, pitch])
  const overlayRails = useMemo(() => chartOverlayRails(pitch, levelMode), [levelMode, pitch])
  const battlefieldRequested = levelMode === 'battlefield' || levelMode === 'all'
  const battlefieldUnavailable = battlefieldRequested && pitch.sourceSnapshot?.optionsBattlefield && !overlayRails.some(rail => rail.group === 'battlefield')

  useEffect(() => {
    if (!chartRef.current || visibleData.length === 0) return
    const element = chartRef.current
    let active = true
    const chart = createChart(element, {
      width: element.clientWidth,
      height: element.clientHeight,
      layout: { background: { color: 'transparent' }, textColor: 'rgba(255,255,255,0.66)' },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.06)' },
        horzLines: { color: 'rgba(255,255,255,0.08)' }
      },
      crosshair: {
        vertLine: { color: 'rgba(116,242,206,0.45)', labelBackgroundColor: '#1f6f69' },
        horzLine: { color: 'rgba(116,242,206,0.35)', labelBackgroundColor: '#1f6f69' }
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, rightOffset: 6 }
    })
    const series = chart.addSeries(AreaSeries, {
      lineColor: '#50d2c1',
      topColor: 'rgba(80, 210, 193, 0.24)',
      bottomColor: 'rgba(80, 210, 193, 0.02)',
      lineWidth: 2,
      priceLineVisible: false
    })
    series.setData(visibleData as never)
    function updateRenderedRails() {
      if (!active) return
      const height = element.clientHeight
      const rails = overlayRails.flatMap(rail => {
        const y = series.priceToCoordinate(rail.price)
        if (y === null || y < -12 || y > height + 12) return []
        return [{
          ...rail,
          y: Math.max(0, Math.min(height, y)),
          labelOffset: 0
        }]
      })
      setRenderedRails(assignRailLabelOffsets(rails))
    }
    for (const level of levels) {
      series.createPriceLine({
        price: level.price,
        color: level.color,
        lineWidth: 1,
        lineStyle: level.style,
        axisLabelVisible: true,
        title: level.label
      })
    }
    chart.subscribeCrosshairMove(param => {
      if (!param.time) {
        setHover(null)
        return
      }
      const point = param.seriesData.get(series) as { value?: number } | undefined
      if (typeof point?.value === 'number') setHover({ time: String(param.time), value: point.value })
    })
    chart.timeScale().fitContent()
    requestAnimationFrame(updateRenderedRails)
    const resize = new ResizeObserver(entries => {
      const entry = entries[0]
      if (!entry) return
      chart.applyOptions({
        width: Math.max(1, Math.floor(entry.contentRect.width)),
        height: Math.max(1, Math.floor(entry.contentRect.height))
      })
      requestAnimationFrame(updateRenderedRails)
    })
    resize.observe(element)
    return () => {
      active = false
      resize.disconnect()
      chart.remove()
      setRenderedRails([])
    }
  }, [levels, overlayRails, visibleData])

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {chartRanges.map(option => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={range === option ? 'secondary' : 'outline'}
              onClick={() => setRange(option)}
              className="h-8 px-2 font-mono text-xs"
            >
              {option}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {levelModes.map(option => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={levelMode === option ? 'secondary' : 'outline'}
              onClick={() => setLevelMode(option)}
              className="h-8 px-2 font-mono text-xs capitalize"
            >
              {option}
            </Button>
          ))}
        </div>
      </div>
      <div className="relative h-[520px] min-h-[420px] w-full overflow-hidden rounded-md border border-border bg-background/35">
        {visibleData.length === 0 ? (
          <div className="absolute inset-0 z-10 grid place-items-center">
            <p className="font-mono text-sm text-muted-foreground">No sourced price series or current price.</p>
          </div>
        ) : null}
        <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-md border border-border bg-card/90 px-3 py-2 backdrop-blur">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">Crosshair</p>
          <p className="mt-1 font-mono text-sm font-semibold">{hover ? `${hover.time} / ${money(hover.value)}` : `${pitch.setup.date} / ${money(pitch.setup.currentPrice)}`}</p>
        </div>
        {battlefieldUnavailable ? (
          <div className="pointer-events-none absolute right-20 top-3 z-10 max-w-[320px] rounded-md border border-amber-300/35 bg-card/90 px-3 py-2 backdrop-blur">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-amber-200">No verified battlefield rails</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">No option strike rows from Massive proxy or true snapshot yet. Scenario targets are not used as battlefield levels.</p>
          </div>
        ) : null}
        <div ref={chartRef} className="h-full w-full" />
        <div className="pointer-events-none absolute inset-y-0 left-0 right-16 z-10">
          {renderedRails.map(rail => (
            <div
              key={rail.id}
              className="absolute left-0 right-0"
              style={{ top: rail.y, transform: 'translateY(-50%)' }}
            >
              <div
                className="absolute left-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full"
                style={{
                  width: `${rail.lineWidthPct}%`,
                  background: rail.lineGradient,
                  boxShadow: `0 0 18px ${rail.glowColor}`
                }}
              />
              <span
                className="absolute left-3 top-1/2 max-w-[136px] truncate rounded border px-2 py-0.5 font-mono text-[0.58rem] uppercase tracking-[0.1em] shadow-sm backdrop-blur"
                style={{
                  backgroundColor: rail.labelBackground,
                  borderColor: rail.borderColor,
                  color: rail.textColor,
                  transform: `translateY(calc(-50% + ${rail.labelOffset}px))`
                }}
              >
                {rail.label}
              </span>
              <div
                className="absolute right-4 top-1/2 flex h-2 w-[118px] -translate-y-1/2 overflow-hidden rounded-full border bg-background/80 shadow-[0_0_14px_rgba(0,0,0,0.3)] backdrop-blur"
                style={{ borderColor: rail.borderColor }}
                aria-label={`${rail.label} volume stack`}
              >
                {rail.segments.map(segment => (
                  <div
                    key={`${rail.id}-${segment.label}`}
                    title={`${segment.label}: ${compactNumber(segment.value)}`}
                    style={{ width: `${segment.widthPct}%`, background: segment.color }}
                    className="min-w-[3px]"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <TargetLevelDeck levels={levels} currentPrice={pitch.setup.currentPrice} />
    </div>
  )
}

const chartRanges = ['1M', '3M', '6M', 'ALL'] as const
type ChartRange = typeof chartRanges[number]
const levelModes = ['scenario', 'battlefield', 'day', 'risk', 'all'] as const
type LevelMode = typeof levelModes[number]

type TargetLevel = {
  label: string
  price: number
  color: string
  style: LineStyle
  group: LevelMode
}

type CandidateTargetLevel = Omit<TargetLevel, 'price'> & {
  price?: number | null
}

type ChartRailSegment = {
  label: string
  value: number | null
  color: string
  widthPct: number
}

type ChartOverlayRail = {
  id: string
  label: string
  price: number
  lineWidthPct: number
  lineGradient: string
  glowColor: string
  borderColor: string
  labelBackground: string
  textColor: string
  stackLabel: string
  segments: ChartRailSegment[]
  group: LevelMode
}

type RenderedChartRail = ChartOverlayRail & {
  y: number
  labelOffset: number
}

function assignRailLabelOffsets(rails: RenderedChartRail[]): RenderedChartRail[] {
  const offsets = [0, -18, 18, -34, 34, -50, 50]
  const placed: RenderedChartRail[] = []
  for (const rail of [...rails].sort((a, b) => a.y - b.y)) {
    const labelOffset = offsets.find(offset => {
      const y = rail.y + offset
      return placed.every(row => Math.abs((row.y + row.labelOffset) - y) >= 15)
    }) ?? 0
    placed.push({ ...rail, labelOffset })
  }
  return placed
}

function targetLevels(pitch: StockPitch, mode: LevelMode): TargetLevel[] {
  const scenarioColors: Record<string, string> = { bear: '#ff7777', base: '#e5e7eb', bull: '#50d2c1' }
  const levels: CandidateTargetLevel[] = [
    { label: 'Current', price: pitch.setup.currentPrice, color: '#ffffff', style: LineStyle.Solid, group: 'all' as const },
    { label: 'Base Target', price: pitch.setup.targetPrice, color: '#50d2c1', style: LineStyle.Dashed, group: 'scenario' },
    { label: 'Downside', price: pitch.setup.downsidePrice, color: '#ff7777', style: LineStyle.Dotted, group: 'risk' },
    { label: 'Stop', price: pitch.tradeStructure.stopLevel, color: '#ff9f43', style: LineStyle.Dotted, group: 'risk' },
    { label: 'Take Profit', price: pitch.tradeStructure.takeProfitLevel, color: '#74f2ce', style: LineStyle.Dashed, group: 'risk' },
    ...pitch.valuation.scenarios.map(scenario => ({
      label: scenario.name,
      price: scenario.priceTarget,
      color: scenarioColors[scenario.name],
      style: LineStyle.Dashed,
      group: 'scenario' as const
    }))
  ]
  const seen = new Set<string>()
  return levels.filter((level): level is TargetLevel => {
    if (!level.price || level.price <= 0) return false
    if (mode !== 'all' && level.group !== mode && level.label !== 'Current') return false
    const key = `${level.label}-${level.price}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function chartOverlayRails(pitch: StockPitch, mode: LevelMode): ChartOverlayRail[] {
  const current = pitch.setup.currentPrice
  const battlefield = pitch.sourceSnapshot?.optionsBattlefield
  const dayMap = pitch.sourceSnapshot?.dayMap
  const rails: ChartOverlayRail[] = []
  if ((mode === 'battlefield' || mode === 'all') && battlefield) {
    if (battlefield.strikes.length && battlefield.expectedMove && current > 0) {
      rails.push(chartRail({
        id: 'expected-move-high',
        label: 'EM High',
        price: current + battlefield.expectedMove,
        group: 'battlefield',
        color: '#f4d35e',
        widthPct: 76,
        stackLabel: 'iv range',
        segments: singleSegment('em', battlefield.expectedMove, '#f4d35e')
      }))
      rails.push(chartRail({
        id: 'expected-move-low',
        label: 'EM Low',
        price: current - battlefield.expectedMove,
        group: 'battlefield',
        color: '#f4d35e',
        widthPct: 76,
        stackLabel: 'iv range',
        segments: singleSegment('em', battlefield.expectedMove, '#f4d35e')
      }))
    }
    if (battlefield.strikes.length) {
      const byStrike = new Map(battlefield.strikes.map(strike => [strike.strikePrice, strike]))
      if (battlefield.callWall) {
        const strike = byStrike.get(battlefield.callWall)
        if (strike) rails.push(optionRail('call-wall', 'Call Wall', battlefield.callWall, strike, 96, '#5eead4'))
      }
      if (battlefield.putWall) {
        const strike = byStrike.get(battlefield.putWall)
        if (strike) rails.push(optionRail('put-wall', 'Put Wall', battlefield.putWall, strike, 96, '#fb7185'))
      }
      const seen = new Set([battlefield.callWall, battlefield.putWall].filter((value): value is number => typeof value === 'number'))
      for (const strike of [...battlefield.strikes].sort((a, b) => (b.magnetScore ?? 0) - (a.magnetScore ?? 0)).slice(0, 4)) {
        if (seen.has(strike.strikePrice)) continue
        seen.add(strike.strikePrice)
        rails.push(optionRail(`magnet-${strike.expirationDate}-${strike.strikePrice}`, `Magnet ${money(strike.strikePrice)}`, strike.strikePrice, strike, Math.max(40, strike.magnetScore ?? 40), '#50d2c1'))
      }
    }
  }
  if ((mode === 'day' || mode === 'all') && dayMap) {
    const dayRails = [
      { id: 'prior-high', label: 'Prior High', price: dayMap.priorHigh, color: '#93c5fd', stack: 'daily high' },
      { id: 'prior-low', label: 'Prior Low', price: dayMap.priorLow, color: '#93c5fd', stack: 'daily low' },
      { id: 'atr-high', label: 'ATR High', price: dayMap.upperAtrBand, color: '#fbbf24', stack: 'atr' },
      { id: 'atr-low', label: 'ATR Low', price: dayMap.lowerAtrBand, color: '#fbbf24', stack: 'atr' },
      { id: 'volume-shelf', label: 'Volume Shelf', price: dayMap.volumeShelf, color: '#c4b5fd', stack: 'vol shelf' }
    ]
    for (const level of dayRails) {
      if (!level.price) continue
      rails.push(chartRail({
        id: level.id,
        label: level.label,
        price: level.price,
        group: 'day',
        color: level.color,
        widthPct: level.id === 'volume-shelf' ? 88 : 66,
        stackLabel: level.stack,
        segments: singleSegment(level.stack, level.price, level.color)
      }))
    }
  }
  return rails.filter(rail => rail.price > 0)
}

function chartRail(input: {
  id: string
  label: string
  price: number
  group: LevelMode
  color: string
  widthPct: number
  stackLabel: string
  segments: ChartRailSegment[]
}): ChartOverlayRail {
  return {
    id: input.id,
    label: input.label,
    price: input.price,
    lineWidthPct: Math.max(28, Math.min(98, input.widthPct)),
    lineGradient: `linear-gradient(90deg, ${input.color} 0%, ${input.color}cc 34%, ${input.color}55 72%, transparent 100%)`,
    glowColor: `${input.color}66`,
    borderColor: `${input.color}88`,
    labelBackground: 'rgba(2, 17, 15, 0.86)',
    textColor: input.color,
    stackLabel: input.stackLabel,
    segments: input.segments.length ? normalizeSegments(input.segments) : singleSegment(input.stackLabel, 1, input.color),
    group: input.group
  }
}

function optionRail(id: string, label: string, price: number, strike: OptionsStrikeSignalView | undefined, widthPct: number, color: string): ChartOverlayRail {
  const segments = optionSegments(strike)
  return chartRail({
    id,
    label,
    price,
    group: 'battlefield',
    color,
    widthPct,
    stackLabel: strike ? compactNumber((strike.callVolume ?? 0) + (strike.putVolume ?? 0) + (strike.openInterest ?? 0) + (strike.gammaProxy ?? 0)) : 'level',
    segments
  })
}

function optionSegments(strike: OptionsStrikeSignalView | undefined): ChartRailSegment[] {
  if (!strike) return singleSegment('level', 1, '#50d2c1')
  const call = Math.max(0, strike.callVolume ?? 0)
  const put = Math.max(0, strike.putVolume ?? 0)
  const oi = Math.max(0, strike.openInterest ?? 0)
  const proxy = Math.max(0, strike.gammaProxy ?? 0)
  const gamma = Math.max(0, Math.abs(strike.gammaExposure ?? 0))
  return normalizeSegments([
    { label: 'call vol', value: call, color: '#34d399', widthPct: 0 },
    { label: 'put vol', value: put, color: '#fb7185', widthPct: 0 },
    { label: 'open interest', value: oi, color: '#60a5fa', widthPct: 0 },
    { label: strike.gammaExposure !== null ? 'gex' : 'proxy', value: gamma || proxy || (strike.magnetScore ?? 0), color: '#f4d35e', widthPct: 0 }
  ])
}

function singleSegment(label: string, value: number | null, color: string): ChartRailSegment[] {
  return [{ label, value, color, widthPct: 100 }]
}

function normalizeSegments(segments: ChartRailSegment[]): ChartRailSegment[] {
  const positives = segments.filter(segment => (segment.value ?? 0) > 0)
  const rows = positives.length ? positives : segments.slice(0, 1)
  const total = rows.reduce((sum, segment) => sum + Math.max(0, segment.value ?? 0), 0)
  if (total <= 0) return rows.map(segment => ({ ...segment, widthPct: 100 / rows.length }))
  return rows.map(segment => ({
    ...segment,
    widthPct: Math.max(4, Math.max(0, segment.value ?? 0) / total * 100)
  }))
}

function filterChartRange(data: { time: string; value: number }[], range: ChartRange) {
  if (range === 'ALL' || data.length <= 1) return data
  const days = range === '1M' ? 31 : range === '3M' ? 93 : 186
  const last = Date.parse(data[data.length - 1]?.time ?? '')
  if (!Number.isFinite(last)) return data
  const cutoff = last - days * 24 * 60 * 60 * 1000
  const filtered = data.filter(point => {
    const time = Date.parse(point.time)
    return Number.isFinite(time) && time >= cutoff
  })
  return filtered.length ? filtered : data
}

function TargetLevelDeck({ levels, currentPrice }: { levels: TargetLevel[]; currentPrice?: number }) {
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
      {levels.map(level => {
        const distance = currentPrice && currentPrice > 0 ? ((level.price / currentPrice) - 1) * 100 : null
        return (
          <div key={`${level.label}-${level.price}`} className="rounded-md border border-border bg-background/45 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: level.color }} />
              <p className="truncate font-mono text-[0.65rem] uppercase text-muted-foreground">{level.group === 'all' ? 'spot' : level.group}</p>
            </div>
            <p className="mt-2 font-mono text-sm font-semibold">{level.label}</p>
            <p className="mt-1 font-mono text-lg font-semibold">{money(level.price)}</p>
            <p className={distance !== null && distance >= 0 ? 'mt-1 font-mono text-xs text-emerald-300' : 'mt-1 font-mono text-xs text-red-300'}>
              {distance === null ? 'N/A' : percent(distance)}
            </p>
          </div>
        )
      })}
    </div>
  )
}


function money(value?: number) {
  if (!value || !Number.isFinite(value)) return 'N/A'
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  return `$${value.toFixed(value >= 100 ? 0 : 2)}`
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

function percent(value?: number) {
  if (value === undefined || value === null || !Number.isFinite(value)) return 'N/A'
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}
