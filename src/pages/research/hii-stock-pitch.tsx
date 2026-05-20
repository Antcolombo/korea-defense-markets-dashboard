import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/ui/Section'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { getCompanies } from '@/lib/data/getCompanies'
import { getAssets } from '@/lib/data/getAssets'
import { getEvents } from '@/lib/data/getEvents'
import { DISCLAIMER } from '@/lib/constants'
import { formatReturn } from '@/lib/returns'

export function HiiStockPitchPage() {
  const company = getCompanies().find(item => item.ticker === 'HII')
  const asset = getAssets().find(item => item.ticker === 'HII')
  const events = getEvents().filter(event => event.affectedAssets.includes('HII')).slice(0, 4)

  return (
    <>
      <PageHeader
        eyebrow="Trade note"
        title="HII U.S. A&D Expression Note"
        description="A sourced note asking whether HII is a clean liquid U.S. expression for naval capacity, shipbuilding constraints, and Indo-Pacific defense read-through."
      />
      <Section>
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Ticker" value="HII" detail="NYSE" />
          <StatCard label="5D sourced return" value={formatReturn(asset?.return5d)} tone="positive" />
          <StatCard label="20D sourced return" value={formatReturn(asset?.return20d)} tone="positive" />
          <StatCard label="Related events" value={`${asset?.relatedEventCount ?? 0}`} detail="Event tape matches" />
        </div>
      </Section>
      <Section className="pt-0">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="p-5">
            <h2 className="text-xl font-semibold text-ink">Setup</h2>
            <p className="mt-3 text-sm leading-7 text-muted">
              HII is the cleanest single-name public-market case study in this project for Indo-Pacific naval capacity. The pitch is not that Korea headlines mechanically move the stock; it is that shipbuilding capacity, submarine demand, fleet sustainment, and allied deterrence create a useful research bridge from public geopolitical events to a focused A&D diligence workflow.
            </p>
            <h3 className="mt-6 font-semibold text-ink">Evidence channel</h3>
            <p className="mt-2 text-sm leading-7 text-muted">
              {company?.defenseExposure ?? 'Mapped to naval shipbuilding, China/Taiwan spillover, and U.S.-ROK-Japan alliance themes.'} HII is included because naval deterrence is a direct channel from Indo-Pacific security pressure to U.S. shipbuilding capacity analysis.
            </p>
            <h3 className="mt-6 font-semibold text-ink">Execution framework</h3>
            <p className="mt-2 text-sm leading-7 text-muted">
              This page deliberately avoids a target price. A tradeable note would compare HII price action against ITA/XAR, LMT/RTX/GD, U.S. rates, and the event tape, then define entry, invalidation, and risk before taking exposure.
            </p>
          </Card>
          <Card className="p-5">
            <h2 className="text-xl font-semibold text-ink">Catalysts, Invalidation, Risks</h2>
            <div className="mt-4 grid gap-5 text-sm leading-7 text-muted">
              <div>
                <h3 className="font-semibold text-ink">Catalysts</h3>
                <ul className="mt-2 grid gap-2">
                  {[
                    'Sustained public demand signals for submarines, surface combatants, and fleet readiness.',
                    'Alliance activity that keeps Indo-Pacific naval deterrence in budget and procurement discussion.',
                    ...(company?.catalysts ?? [])
                  ].map(item => <li key={item}>• {item}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-ink">Risks</h3>
                <ul className="mt-2 grid gap-2">
                  {[
                    'Shipbuilding execution, labor availability, supply chain cost, and working-capital drag can overwhelm thematic demand.',
                    'Budget timing and program-specific risk matter more than headline geopolitical intensity.',
                    ...(company?.risks ?? [])
                  ].map(item => <li key={item}>• {item}</li>)}
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </Section>
      <Section className="pt-0">
        <Card className="p-5">
          <h2 className="text-xl font-semibold text-ink">Relevant Public-Source Themes</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {(company?.relatedThemes ?? []).map(theme => (
              <div key={theme} className="workbench-panel p-4">
                <p className="font-semibold text-ink">{theme}</p>
              </div>
            ))}
          </div>
          <h3 className="mt-6 font-semibold text-ink">Related sourced events</h3>
          <div className="mt-3 grid gap-3">
            {events.map(event => (
              <div key={event.id} className="workbench-panel p-4">
                <p className="font-medium text-ink">{event.title}</p>
                <p className="mt-1 text-sm text-muted">{event.analystNote}</p>
                <a href={event.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-steel">Open source</a>
              </div>
            ))}
          </div>
          <h3 className="mt-6 font-semibold text-ink">How to use this note</h3>
          <p className="mt-2 text-sm leading-7 text-muted">
            Treat HII as one possible U.S.-listed expression, not the answer. Compare it against EWY, semis, broader A&D ETFs, and macro overlays; only use the name when the evidence channel and price action agree.
          </p>
        </Card>
      </Section>
      <Section className="pt-0">
        <Card className="p-5">
          <p className="text-sm leading-7 text-muted">{DISCLAIMER}</p>
        </Card>
      </Section>
    </>
  )
}

export default HiiStockPitchPage
