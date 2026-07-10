import type { ColumnDef } from '@tanstack/react-table'
import { ResearchDataTable } from '@/components/workbench/research-data-table'
import { ModuleFrame } from '@/components/workbench/module-frame'
import { MetricCard, Panel, ProvenanceWarning, Rule } from '@/components/workbench/research-surfaces'
import type { ChartPricePoint, WorkspaceData } from '@/contracts/workspace'
import type { Event } from '@/types/event'
import type { EventReturn } from '@/types/market'

type EventStudyRow = {
  eventId: string
  title: string
  date: string
  ticker: string
  category: string
  pre5d: number | null
  post1d: number
  post5d: number
  post20d: number
  volumeChange: number | null
  volChange: number | null
  caveat: string
}

export function EventStudyModule({ data }: { data: WorkspaceData }) {
  const rows = buildEventStudyRows(data.events ?? [], data.eventReturns ?? [], data.prices ?? [])
  const summary = summarizeEventStudy(rows)
  const categoryRows = summarizeEventStudyByCategory(rows)
  return (
    <ModuleFrame title="Event Study Lab" kicker="Catalyst tests" description="Defense contracts, earnings, export controls, and geopolitical shocks mapped to static research fixtures. Correlation only; no causality claim.">
      <ProvenanceWarning
        title="Static research fixture"
        detail="This module uses checked-in event and return fixtures. Treat it as a lab dataset until events and returns are backed by live provider rows."
      />
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard label="Samples" value={summary.samples.toString()} />
        <MetricCard label="Hit Rate 20D" value={summary.hitRate === null ? 'N/A' : `${summary.hitRate.toFixed(1)}%`} />
        <MetricCard label="Avg 20D" value={summary.average20d === null ? 'N/A' : `${summary.average20d.toFixed(1)}%`} />
        <MetricCard label="Vol Rows" value={rows.filter(row => row.volChange !== null).length.toString()} />
      </div>
      <div className="grid gap-3 xl:grid-cols-[1fr_0.8fr]">
        <Panel title="Category Hit Rates" kicker={`${categoryRows.length} groups`}>
          <ResearchDataTable data={categoryRows} columns={eventCategoryColumns} />
        </Panel>
        <Panel title="Source Caveats" kicker="No hallucinated data">
          <div className="grid gap-2">
            <Rule label="Volume" text="Shown only when static price rows carry volume. Otherwise unavailable." />
            <Rule label="Volatility" text="Pre/post realized vol uses close-to-close daily rows; intraday shocks are out of scope." />
            <Rule label="Recent events" text="Static event windows may use available trailing rows until forward data matures." />
          </div>
        </Panel>
      </div>
      <Panel title="Event Return Tape" kicker={`${rows.length} rows`}>
        <ResearchDataTable data={rows} columns={eventStudyColumns} />
      </Panel>
    </ModuleFrame>
  )
}

const eventStudyColumns: ColumnDef<EventStudyRow, unknown>[] = [
  { accessorKey: 'date', header: 'Date', cell: ({ row }) => row.original.date },
  { accessorKey: 'ticker', header: 'Ticker', cell: ({ row }) => row.original.ticker },
  { accessorKey: 'category', header: 'Category', cell: ({ row }) => <span className="max-w-[180px] truncate">{row.original.category}</span> },
  { id: 'pre5d', header: 'Pre 5D', accessorFn: row => row.pre5d ?? -9999, cell: ({ row }) => formatMaybePct(row.original.pre5d) },
  { id: 'post1d', header: 'Post 1D', accessorFn: row => row.post1d, cell: ({ row }) => formatMaybePct(row.original.post1d) },
  { id: 'post5d', header: 'Post 5D', accessorFn: row => row.post5d, cell: ({ row }) => formatMaybePct(row.original.post5d) },
  { id: 'post20d', header: 'Post 20D', accessorFn: row => row.post20d, cell: ({ row }) => formatMaybePct(row.original.post20d) },
  { id: 'volume', header: 'Volume Chg', accessorFn: row => row.volumeChange ?? -9999, cell: ({ row }) => formatMaybePct(row.original.volumeChange) },
  { id: 'vol', header: 'Vol Chg', accessorFn: row => row.volChange ?? -9999, cell: ({ row }) => formatMaybePct(row.original.volChange) },
  { accessorKey: 'title', header: 'Event', cell: ({ row }) => <span className="max-w-[320px] truncate">{row.original.title}</span> }
]

type EventCategoryRow = {
  category: string
  samples: number
  hitRate: number | null
  average20d: number | null
}

const eventCategoryColumns: ColumnDef<EventCategoryRow, unknown>[] = [
  { accessorKey: 'category', header: 'Category', cell: ({ row }) => row.original.category },
  { accessorKey: 'samples', header: 'Samples', cell: ({ row }) => row.original.samples },
  { id: 'hitRate', header: 'Hit Rate', accessorFn: row => row.hitRate ?? -9999, cell: ({ row }) => formatMaybePct(row.original.hitRate) },
  { id: 'avg20d', header: 'Avg 20D', accessorFn: row => row.average20d ?? -9999, cell: ({ row }) => formatMaybePct(row.original.average20d) }
]

function buildEventStudyRows(events: Event[], eventReturns: EventReturn[], prices: ChartPricePoint[]): EventStudyRow[] {
  const eventById = new Map(events.map(event => [event.id, event]))
  const pricesByTicker = groupPricePoints(prices)
  return eventReturns.map(row => {
    const event = eventById.get(row.eventId)
    const tape = pricesByTicker.get(row.ticker) ?? []
    const pre5d = windowReturnBefore(tape, event?.date ?? '', 5)
    const volumeChange = volumeChangeAround(tape, event?.date ?? '', 5)
    const volChange = realizedVolChangeAround(tape, event?.date ?? '', 20)
    return {
      eventId: row.eventId,
      title: event?.title ?? row.eventId,
      date: event?.date ?? '',
      ticker: row.ticker,
      category: row.eventCategory,
      pre5d,
      post1d: row.return1d,
      post5d: row.return5d,
      post20d: row.return20d,
      volumeChange,
      volChange,
      caveat: row.interpretation
    }
  }).sort((a, b) => b.date.localeCompare(a.date))
}

function summarizeEventStudy(rows: EventStudyRow[]) {
  const values = rows.map(row => row.post20d).filter(Number.isFinite)
  return {
    samples: values.length,
    hitRate: values.length ? (values.filter(value => value > 0).length / values.length) * 100 : null,
    average20d: values.length ? average(values) : null
  }
}

function summarizeEventStudyByCategory(rows: EventStudyRow[]): EventCategoryRow[] {
  const map = new Map<string, EventStudyRow[]>()
  for (const row of rows) {
    const list = map.get(row.category) ?? []
    list.push(row)
    map.set(row.category, list)
  }
  return Array.from(map.entries()).map(([category, items]) => {
    const values = items.map(item => item.post20d)
    return {
      category,
      samples: values.length,
      hitRate: values.length ? (values.filter(value => value > 0).length / values.length) * 100 : null,
      average20d: values.length ? average(values) : null
    }
  }).sort((a, b) => b.samples - a.samples)
}

function groupPricePoints(prices: ChartPricePoint[]) {
  const map = new Map<string, ChartPricePoint[]>()
  for (const point of prices) {
    const list = map.get(point.ticker) ?? []
    list.push(point)
    map.set(point.ticker, list)
  }
  for (const [ticker, rows] of map) {
    map.set(ticker, rows.sort((a, b) => a.date.localeCompare(b.date)))
  }
  return map
}

function windowReturnBefore(rows: ChartPricePoint[], date: string, days: number) {
  const index = rows.findIndex(row => row.date >= date)
  if (index < days || index < 0) return null
  const start = rows[index - days]
  const end = rows[index]
  return start.price > 0 ? round(((end.price - start.price) / start.price) * 100, 1) : null
}

function volumeChangeAround(rows: ChartPricePoint[], date: string, days: number) {
  const index = rows.findIndex(row => row.date >= date)
  if (index < days || index < 0 || index + days >= rows.length) return null
  const before = average(rows.slice(index - days, index).map(row => row.volume ?? NaN).filter(Number.isFinite))
  const after = average(rows.slice(index, index + days).map(row => row.volume ?? NaN).filter(Number.isFinite))
  if (!Number.isFinite(before) || before <= 0 || !Number.isFinite(after)) return null
  return round(((after - before) / before) * 100, 1)
}

function realizedVolChangeAround(rows: ChartPricePoint[], date: string, days: number) {
  const index = rows.findIndex(row => row.date >= date)
  if (index < days || index < 0 || index + days >= rows.length) return null
  const before = realizedVolFromPrices(rows.slice(index - days, index + 1))
  const after = realizedVolFromPrices(rows.slice(index, index + days + 1))
  if (before === null || after === null) return null
  return round(after - before, 1)
}

function realizedVolFromPrices(rows: ChartPricePoint[]) {
  if (rows.length < 2) return null
  const returns = rows.slice(1).map((row, index) => rows[index].price > 0 ? Math.log(row.price / rows[index].price) : 0)
  const mean = average(returns)
  const variance = average(returns.map(value => Math.pow(value - mean, 2)))
  return Math.sqrt(variance) * Math.sqrt(252) * 100
}

function average(values: number[]) {
  if (!values.length) return NaN
  return values.reduce((sum, value) => sum + value, 0) / values.length
}


function formatMaybePct(value: number | null | undefined) {
  return value === null || value === undefined || !Number.isFinite(value) ? 'N/A' : `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}
