import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/ui/Section'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { DataBuildFailure } from '@/components/ui/DataBuildFailure'
import { getEnergyResearch } from '@/lib/data/getEnergyResearch'

function dollars(value: number | null) {
  return value === null ? 'Unavailable' : `$${value.toFixed(2)}`
}

function barrels(value: number | null) {
  if (value === null) return 'Unavailable'
  return `${(value / 1000).toFixed(1)}M`
}

function flowStatusTone(observations: unknown[]) {
  return observations.length > 0 ? 'source' : 'elevated'
}

export function EnergyPage() {
  const records = getEnergyResearch()
  const energy = records[0]

  if (!energy || energy.seasonalBars.length === 0) {
    return (
      <>
        <PageHeader
          eyebrow="Energy research"
          title="Energy Research Tape"
          description="Strict source mode requires FRED gasoline observations before this page can render."
        />
        <Section><DataBuildFailure /></Section>
      </>
    )
  }

  const inventory = energy.inventorySeries.find(series => series.ticker === 'US_GASOLINE_STOCKS') ?? energy.inventorySeries[0] ?? null
  const currentYear = Math.max(...energy.seasonalBars.map(row => row.year))
  const currentBar = energy.seasonalBars.find(row => row.year === currentYear)
  const latestInventory = inventory?.observations.at(-1) ?? null
  const sourcedPaidFlows = energy.paidFlowSeries.filter(series => series.observations.length > 0)
  const inventoryColors = ['rgba(255,255,255,0.28)', 'rgba(255,255,255,0.42)', 'rgba(255,255,255,0.58)', 'rgb(147,197,253)', 'rgb(59,130,246)', 'rgb(239,68,68)']

  return (
    <>
      <PageHeader
        eyebrow="Energy research"
        title="Energy Research Tape"
        description="Retail gasoline seasonality from FRED plus EIA petroleum inventory coverage when configured. Paid flow datasets stay visibly backlogged."
      >
        <Badge tone="source">FRED GASREGW</Badge>
      </PageHeader>
      <Section>
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Latest gasoline" value={dollars(energy.latestObservation?.value ?? null)} detail={energy.latestObservation?.date ?? 'No observation'} tone="warning" />
          <StatCard label="5-year May-Aug avg" value={dollars(energy.fiveYearAverage)} detail="Prior complete May-Aug seasons" />
          <StatCard label="2026 sample avg" value={dollars(energy.currentAverage)} detail={energy.currentSampleLabel} tone="positive" />
          <StatCard label="Spread vs 5-year" value={dollars(energy.spreadToFiveYear)} detail="Current average minus prior 5-year average" tone={energy.spreadToFiveYear !== null && energy.spreadToFiveYear > 0 ? 'negative' : 'positive'} />
        </div>
      </Section>
      <Section className="pt-0">
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card>
            <CardHeader title="Retail Gasoline Seasonality" eyebrow="FRED source rows" />
            <CardBody>
              <div className="h-80">
                <ResponsiveContainer>
                  <BarChart data={energy.seasonalBars}>
                    <CartesianGrid stroke="rgba(255,255,255,0.14)" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={['dataMin - 0.2', 'dataMax + 0.2']} />
                    <Tooltip formatter={(value: number) => dollars(value)} labelFormatter={label => `${label}`} />
                    {energy.fiveYearAverage !== null ? <ReferenceLine y={energy.fiveYearAverage} stroke="rgba(255,255,255,0.55)" strokeDasharray="4 4" label={{ value: `5-year ${dollars(energy.fiveYearAverage)}`, fill: 'rgba(255,255,255,0.72)', fontSize: 11 }} /> : null}
                    <Bar dataKey="average" name="Gasoline average" radius={[4, 4, 0, 0]}>
                      {energy.seasonalBars.map(row => (
                        <Cell key={row.year} fill={row.year === currentYear ? 'rgb(239,68,68)' : 'rgb(59,130,246)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">
                Blue bars are complete May-Aug FRED averages. The red bar is only the current-year FRED observations from May 1-15, so it does not mix in later May data.
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="U.S. Gasoline Inventories" eyebrow={inventory ? 'EIA WGTSTUS1 public history' : 'Provider backlog'} />
            <CardBody>
              {inventory && energy.inventorySeasonalRows.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer>
                    <LineChart data={energy.inventorySeasonalRows}>
                      <CartesianGrid stroke="rgba(255,255,255,0.14)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={24} />
                      <YAxis tick={{ fontSize: 11 }} domain={['dataMin - 5000', 'dataMax + 5000']} tickFormatter={(value: number) => `${Math.round(value / 1000)}M`} />
                      <Tooltip formatter={(value: number) => `${value.toLocaleString()} kb`} />
                      <Legend />
                      {energy.inventorySeasonalYears.map((year, index) => (
                        <Line
                          key={year}
                          type="monotone"
                          dataKey={String(year)}
                          name={String(year)}
                          stroke={inventoryColors[index] ?? 'rgb(124,190,255)'}
                          strokeWidth={year === Math.max(...energy.inventorySeasonalYears) ? 3 : 1.8}
                          dot={false}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="grid gap-3">
                  {energy.sourceBacklog.slice(0, 6).map(item => (
                    <div key={item.name} className="workbench-panel p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold text-ink">{item.name}</p>
                        <Badge tone="elevated">{item.status}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted">{item.providerTarget}</p>
                      <p className="mt-1 text-sm leading-6 text-muted">{item.reasonBlocked}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </Section>
      {inventory ? (
        <Section className="pt-0">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Latest gasoline stocks" value={barrels(latestInventory?.value ?? null)} detail={latestInventory?.date ?? 'No observation'} tone="warning" />
            <StatCard label="EIA rows loaded" value={`${inventory.observations.length}`} detail="Public DNav history rows" tone="positive" />
            <StatCard label="Kpler component" value="Missing" detail="Gasoline on water is still provider-only" tone="negative" />
          </div>
        </Section>
      ) : null}
      <Section className="pt-0">
        <Card>
          <CardHeader title="Paid Flow Import Slots" eyebrow="Kpler / Vortexa / Energy Aspects exports" />
          <CardBody>
            <div className="grid gap-3 lg:grid-cols-3">
              {energy.paidFlowSeries.map(series => {
                const latest = series.observations.at(-1)
                return (
                  <div key={series.ticker} className="workbench-panel p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-ink">{series.name}</p>
                      <Badge tone={flowStatusTone(series.observations)}>{series.observations.length > 0 ? 'Sourced' : 'Import slot'}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted">{series.ticker}</p>
                    <p className="mt-3 text-sm leading-6 text-muted">{series.providerTarget}</p>
                    <div className="mt-3 rounded-md border border-line bg-[rgba(255,255,255,0.04)] px-3 py-2">
                      <p className="workbench-kicker">Latest</p>
                      <p className="mt-1 text-lg font-semibold text-ink">{latest ? barrels(latest.value) : 'No private export loaded'}</p>
                      <p className="text-xs text-muted">{latest?.date ?? 'Expected in data/private/energy-flows'}</p>
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="mt-4 text-sm leading-6 text-muted">
              Drop provider exports into <span className="font-mono text-ink">data/private/energy-flows</span> using the sample schema in <span className="font-mono text-ink">data/manual/energy-flows.example.csv</span>. Private files are gitignored.
            </p>
          </CardBody>
        </Card>
      </Section>
      {sourcedPaidFlows.length > 0 ? (
        <Section className="pt-0">
          <Card>
            <CardHeader title="Loaded Paid Flow Series" eyebrow="Private exports" />
            <CardBody className="grid gap-6 lg:grid-cols-2">
              {sourcedPaidFlows.map(series => (
                <div key={series.ticker} className="h-72">
                  <p className="mb-2 font-semibold text-ink">{series.name}</p>
                  <ResponsiveContainer>
                    <LineChart data={series.observations}>
                      <CartesianGrid stroke="rgba(255,255,255,0.14)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={24} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(value: number) => `${Math.round(value / 1000)}M`} />
                      <Tooltip formatter={(value: number) => `${value.toLocaleString()} ${series.unit}`} />
                      <Line type="monotone" dataKey="value" name={series.name} stroke="rgb(239,68,68)" strokeWidth={2.4} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </CardBody>
          </Card>
        </Section>
      ) : null}
      <Section className="pt-0">
        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <Card>
            <CardHeader title={`${currentYear} FRED Rows Used`} eyebrow={currentBar?.sampleLabel ?? 'Current sample'} />
            <CardBody className="grid gap-3">
              {currentBar?.sourceRows.map(row => (
                <div key={row.date} className="flex items-center justify-between gap-4 rounded-md border border-line bg-[rgba(255,255,255,0.04)] px-3 py-3">
                  <span className="font-mono text-sm text-muted">{row.date}</span>
                  <span className="text-lg font-semibold text-ink">{dollars(row.value)}</span>
                </div>
              ))}
              <div className="rounded-md border border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.1)] px-3 py-3">
                <p className="workbench-kicker">Red bar average</p>
                <p className="mt-1 text-2xl font-semibold text-ink">{dollars(currentBar?.average ?? null)}</p>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Bar Data Audit" eyebrow="What each bar uses" />
            <CardBody>
              <div className="grid gap-2">
                {energy.seasonalBars.map(row => (
                  <div key={row.year} className="grid grid-cols-[72px_1fr_auto] items-center gap-3 rounded-md border border-line bg-[rgba(255,255,255,0.035)] px-3 py-2 text-sm">
                    <span className="font-semibold text-ink">{row.year}</span>
                    <span className="min-w-0 text-muted">{row.sampleLabel}: {row.sampleStart} to {row.sampleEnd} ({row.weeks} FRED rows)</span>
                    <span className="font-mono text-ink">{dollars(row.average)}</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </Section>
      <Section className="pt-0">
        <Card>
          <CardHeader title="Source Backtrace" eyebrow="What came from FRED, EIA, and Kpler" />
          <CardBody className="grid gap-3 md:grid-cols-2">
            <div className="workbench-panel p-3">
              <p className="font-semibold text-ink">Retail gasoline prices</p>
              <p className="mt-1 text-sm text-muted">FRED GASREGW</p>
              <p className="mt-1 text-sm leading-6 text-muted">Source for the top price seasonality chart.</p>
            </div>
            <div className="workbench-panel p-3">
              <p className="font-semibold text-ink">U.S. total gasoline stocks</p>
              <p className="mt-1 text-sm text-muted">EIA WGTSTUS1 public DNav history</p>
              <p className="mt-1 text-sm leading-6 text-muted">Source for the U.S. gasoline inventory seasonal lines. This is not from FRED.</p>
            </div>
            {energy.sourceBacklog.map(item => (
              <div key={item.name} className="workbench-panel p-3">
                <p className="font-semibold text-ink">{item.name}</p>
                <p className="mt-1 text-sm text-muted">{item.providerTarget}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{item.reasonBlocked}</p>
              </div>
            ))}
          </CardBody>
        </Card>
      </Section>
    </>
  )
}

export default EnergyPage
