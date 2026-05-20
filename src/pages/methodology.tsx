import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/ui/Section'
import { Card } from '@/components/ui/Card'
import { DISCLAIMER, EVENT_CATEGORIES } from '@/lib/constants'
import { formatCategory } from '@/lib/formatters'

export function MethodologyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Methodology"
        title="Source-First Methodology And Limitations"
        description="How the dashboard separates sourced facts, deterministic derived fields, provider-readiness checks, and non-advice research language."
      />
      <Section>
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-ink">Public Information Only</h2>
            <div className="mt-4 grid gap-3 text-sm leading-7 text-muted">
              <p>Source facts are taken only from public providers: event metadata, article URLs, filing metadata, disclosure records, public daily market closes, and macro observations.</p>
              <p>Derived fields are deterministic labels or calculations: categories, theme mappings, asset mappings, market-regime labels, source-readiness checks, and event-return windows.</p>
              <p>Strict mode does not ship fallback, demo, stale, or hand-filled records. Missing provider data blocks ingestion or build.</p>
              <p>No classified, restricted, confidential, or material nonpublic information is used.</p>
            </div>
            <p className="workbench-code mt-5 text-sm">{DISCLAIMER}</p>
          </Card>
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-ink">Market Regime Methodology</h2>
            <pre className="workbench-code mt-4 whitespace-pre-wrap">{`Legacy event scoring:
removed from the product UI.

Reason:
text/event metadata is not a reliable standalone proxy for tradeable market movement.

Current board =
FX pressure from USD/KRW tape
+ rates pressure from U.S. 10Y tape
+ equity tape from EWY/SPX/VIX
+ semis tape from SOXX/SMH/NVDA/TSM/MU
+ defense tape from liquid A&D expressions
+ source coverage / backlog status

Events are context and source-discovery inputs only.
Market price, filings, fundamentals, and repeatable return studies do the confirming.`}</pre>
          </Card>
        </div>
      </Section>
      <Section className="pt-0">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-ink">Event Taxonomy</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {EVENT_CATEGORIES.map(category => (
                <p key={category} className="workbench-panel px-3 py-2 text-sm">{formatCategory(category)}</p>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-ink">Backtest Methodology</h2>
            <p className="mt-3 text-sm leading-7 text-muted">
              The event-to-market impact lab groups sourced events by category and calculates return windows from sourced daily closes. Older events use forward windows from the first trading day on or after the event. Recent events use the available trailing window until a full forward window is observable. The output shows workflow structure and possible research questions; it does not claim causality, statistical significance, or predictive power.
            </p>
            <h3 className="mt-5 font-semibold text-ink">Data limitations</h3>
            <p className="mt-2 text-sm leading-7 text-muted">
              Provider rate limits, source coverage, market holidays, disclosure timing, and API failures can block a run. In strict source mode, those failures are errors. API keys are read only by ingestion scripts and are never exposed client-side.
            </p>
            <p className="mt-2 text-sm leading-7 text-muted">
              The current price layer is intentionally labeled as public daily research data across both U.S. and Korean coverage. U.S. listed prices are not institutional consolidated tape, NBBO, intraday, corporate-action-verified, or execution-grade data. Korean local equities are disclosure/evidence names until a KRX-capable market data feed is added.
            </p>
            <h3 className="mt-5 font-semibold text-ink">Publication gate</h3>
            <p className="mt-2 text-sm leading-7 text-muted">
              The source audit requires populated events, prices, market-regime inputs, event returns, Research OS registries, and memos, plus provenance fields on every normalized record. If any required dataset is empty, the production build fails.
            </p>
          </Card>
        </div>
      </Section>
    </>
  )
}

export default MethodologyPage
