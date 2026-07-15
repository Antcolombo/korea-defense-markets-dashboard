import Link from 'next/link'
import { ArrowUpRight, CheckCircle2, Database, FileText, ShieldCheck } from 'lucide-react'
import type { ShellMeta } from '@/contracts/provenance'
import type { WorkspaceData } from '@/contracts/workspace'
import { PriceChart } from '@/features/stock-report/components/stock-report-module'
import type { MetricValue, RotationRow } from '@/types/research'

export function KoreaDefenseExperience({ data, shell }: { data: WorkspaceData; shell: ShellMeta }) {
  const signals = data.rotations ?? data.basketSignals ?? []
  const crowding = data.crowding ?? data.basketCrowding ?? []
  const events = data.events ?? []
  const ewy = signals.find(row => row.ticker === 'EWY')
  const topUsExpression = [...signals]
    .filter(row => !['EWY', 'SPY', 'ITA', 'XAR'].includes(row.ticker))
    .sort((a, b) => metricNumber(b.relativeStrengthVsSpy20d) - metricNumber(a.relativeStrengthVsSpy20d))[0]
  const latestAsOf = signals
    .map(row => row.asOfDate)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1)
    ?.slice(0, 10) ?? shell.asOf.slice(0, 10)
  const decision = metricNumber(ewy?.relativeStrengthVsSpy20d) < 0 && metricNumber(topUsExpression?.relativeStrengthVsSpy20d) > 0
    ? 'Selective, not broad'
    : 'Confirmation building'

  return (
    <main className="korea-product min-h-screen text-foreground">
      <div className="korea-product__frame">
        <header className="korea-product__masthead">
          <Link href="/korea-defense" className="korea-product__brand" aria-label="Korea Market Dashboard home">
            <span className="korea-product__brand-mark" aria-hidden="true" />
            <span>
              <strong>KOREA MARKET DASHBOARD</strong>
              <small>Korea catalysts → U.S. market consequences</small>
            </span>
          </Link>
          <nav className="korea-product__primary-nav" aria-label="Case study navigation">
            <a href="#case-study">Case study</a>
            <a href="#market-monitor">Dashboard</a>
            <a href="#decision">Decision</a>
          </nav>
          <div className="korea-product__actions">
            <Link href="/report/EWY" className="korea-product__button korea-product__button--quiet">
              Research note <FileText size={14} />
            </Link>
            <span className={`korea-product__status korea-product__status--${shell.qualityStatus}`}>{shell.qualityLabel}</span>
          </div>
        </header>

        <nav className="korea-product__tabs" aria-label="Dashboard sections">
          <a className="is-active" href="#market-monitor">Dashboard</a>
          <a href="#market-monitor">Markets</a>
          <a href="#source-audit">Source Audit</a>
          <Link href="/report/EWY">Research Note</Link>
          <a href="#decision">Proof</a>
        </nav>

        <section id="case-study" className="korea-product__hero">
          <div>
            <div className="korea-product__eyebrow-row">
              <span>CROSS-MARKET CASE STUDY</span>
              <span className="korea-product__source-pill"><Database size={13} /> SOURCED DATA</span>
            </div>
            <h1>Where Korea risk reprices in U.S. markets</h1>
            <p>
              Trace Korean defense and geopolitical catalysts into EWY, U.S. suppliers, semiconductors, and FX—then separate real market confirmation from narrative.
            </p>
          </div>
          <div className="korea-product__hero-question">
            <span>RESEARCH QUESTION</span>
            <strong>Does Korea move U.S. assets more than investors realize?</strong>
          </div>
        </section>

        <section className="korea-product__metrics" aria-label="Research summary">
          <Metric label="Korea beta · 20D" value={formatMetric(ewy?.return20d)} detail="EWY sourced close series" tone="negative" />
          <Metric label="Top U.S. expression" value={topUsExpression?.ticker ?? 'N/A'} detail={`${formatMetric(topUsExpression?.relativeStrengthVsSpy20d)} RS vs SPY`} tone="positive" />
          <Metric label="Catalyst tape" value={`${events.length}`} detail={`Verified events · as of ${latestAsOf}`} />
          <Metric label="Current decision" value={decision} detail="Evidence first; headline second" tone="decision" />
        </section>

        <section id="market-monitor" className="korea-product__section-head">
          <div>
            <span>MARKET MONITOR</span>
            <h2>Korea transmission dashboard</h2>
          </div>
          <p>One screen for price confirmation, relative strength, event pressure, and source-backed evidence.</p>
        </section>

        <section className="korea-product__monitor-grid">
          <article className="korea-product__panel korea-product__chart-panel">
            <header className="korea-product__panel-head">
              <div>
                <span>TODAY · RELATIVE PERFORMANCE</span>
                <h3>EWY Korea beta tape</h3>
              </div>
              <div className="korea-product__polling">
                <i aria-hidden="true" />
                <span><b>{shell.qualityLabel.toUpperCase()}</b>As of {latestAsOf}</span>
              </div>
            </header>
            <div className="korea-product__chart">
              <PriceChart
                prices={data.prices ?? []}
                ticker="EWY"
                eventMarkers={events.slice(0, 4).map(event => ({ date: event.date, title: event.title }))}
              />
            </div>
          </article>

          <article className="korea-product__panel korea-product__ranked-panel">
            <header className="korea-product__panel-head">
              <div>
                <span>RELATIVE TABLE</span>
                <h3>U.S. confirmation · ranked</h3>
              </div>
            </header>
            <div className="korea-product__ranked-header" aria-hidden="true">
              <span>SECURITY</span><span>20D</span><span>RS / SPY</span>
            </div>
            <div className="korea-product__ranked-list">
              {rankSignals(signals).slice(0, 8).map(row => (
                <SignalRow key={row.ticker} row={row} />
              ))}
            </div>
          </article>
        </section>

        <section className="korea-product__transmission" aria-labelledby="transmission-title">
          <div className="korea-product__section-head korea-product__section-head--inside">
            <div>
              <span>FIVE-MINUTE WALKTHROUGH</span>
              <h2 id="transmission-title">Catalyst → market → decision</h2>
            </div>
            <p>Repeatable research path, not dashboard tourism.</p>
          </div>
          <div className="korea-product__steps">
            <Step number="01" label="Catalyst" text="Verify Korean defense, alliance, procurement, and export-control events." />
            <Step number="02" label="Korea beta" text="Test EWY and USD/KRW before calling headlines tradable confirmation." />
            <Step number="03" label="U.S. echo" text="Measure breadth through defense suppliers, semis, ITA, and XAR." />
            <Step number="04" label="Decision" text="Act only when price, breadth, sources, and invalidation agree." />
          </div>
        </section>

        <section className="korea-product__evidence-grid">
          <article className="korea-product__panel">
            <header className="korea-product__panel-head">
              <div><span>CATALYST TAPE</span><h3>What changed</h3></div>
              <span className="korea-product__count">{events.length} EVENTS</span>
            </header>
            <div className="korea-product__event-list">
              {events.slice(0, 5).map(event => (
                <article key={event.id}>
                  <time>{event.date}</time>
                  <div><h4>{event.title}</h4><p>{event.summary}</p></div>
                  <span>{event.verified ? <CheckCircle2 size={15} /> : null}{event.verified ? 'VERIFIED' : 'CHECK'}</span>
                </article>
              ))}
            </div>
          </article>

          <article id="decision" className="korea-product__panel korea-product__decision-panel">
            <header className="korea-product__panel-head">
              <div><span>DECISION GATE</span><h3>What evidence says now</h3></div>
              <ShieldCheck size={19} />
            </header>
            <div className="korea-product__decision-callout">
              <span>CURRENT READ</span>
              <strong>{decision}</strong>
              <p>Selective U.S. supplier strength does not yet equal broad Korea-market sponsorship.</p>
            </div>
            <div className="korea-product__rules">
              <div><span>CONFIRM</span><p>EWY and defense proxies broaden while supplier relative strength and sourced volume agree.</p></div>
              <div><span>INVALIDATE</span><p>EWY rolls over, USD/KRW stress dominates, breadth narrows, or extension outruns catalysts.</p></div>
            </div>
          </article>
        </section>

        <section id="source-audit" className="korea-product__source-strip">
          <div>
            <span>SOURCE AUDIT</span>
            <strong>{shell.coveragePercent}% active coverage</strong>
          </div>
          <p>{shell.sourceSummary}</p>
          <Link href="/?module=source-audit">Inspect sources <ArrowUpRight size={14} /></Link>
        </section>

        <footer className="korea-product__footer">
          <span>KOREA MARKET DASHBOARD</span>
          <p>Public-source cross-market research. Missing evidence stays visible.</p>
          <span>AS OF {latestAsOf}</span>
        </footer>
      </div>
    </main>
  )
}

function Metric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone?: 'positive' | 'negative' | 'decision' }) {
  return (
    <article className={`korea-product__metric ${tone ? `is-${tone}` : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  )
}

function SignalRow({ row }: { row: RotationRow }) {
  const rs = metricNumber(row.relativeStrengthVsSpy20d)
  return (
    <article>
      <div><i aria-hidden="true" /><span><strong>{row.ticker}</strong><small>{row.name}</small></span></div>
      <b className={metricTone(metricNumber(row.return20d))}>{formatMetric(row.return20d)}</b>
      <b className={metricTone(rs)}>{formatMetric(row.relativeStrengthVsSpy20d)}</b>
    </article>
  )
}

function Step({ number, label, text }: { number: string; label: string; text: string }) {
  return (
    <article>
      <span>{number}</span>
      <h3>{label}</h3>
      <p>{text}</p>
    </article>
  )
}

function rankSignals(rows: RotationRow[]) {
  return [...rows].sort((a, b) => metricNumber(b.relativeStrengthVsSpy20d) - metricNumber(a.relativeStrengthVsSpy20d))
}

function metricNumber(metric: MetricValue | undefined) {
  return metric?.value ?? Number.NEGATIVE_INFINITY
}

function formatMetric(metric: MetricValue | undefined) {
  const value = metric?.value
  if (value === null || value === undefined || !Number.isFinite(value)) return 'N/A'
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}

function metricTone(value: number) {
  if (!Number.isFinite(value)) return ''
  return value > 0 ? 'is-positive' : value < 0 ? 'is-negative' : ''
}
