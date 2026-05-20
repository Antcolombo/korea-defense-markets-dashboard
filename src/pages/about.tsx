import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/ui/Section'
import { Card } from '@/components/ui/Card'
import { Sidebar } from '@/components/layout/Sidebar'

export function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title="Portfolio Context"
        description="A concise explanation of the project, audience, and research workflow shown by the dashboard."
      />
      <Section>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Card className="p-6">
            <p className="text-lg leading-8 text-ink">
              Asia Macro Research OS is a portfolio research project built to connect public geopolitical event monitoring, Korea macro, liquid U.S.-accessible trade expressions, filings/disclosures, and market analysis. It is designed to look like the workflow an analyst would use before writing a trade note: define the setup, collect evidence, choose the cleanest expression, and state invalidation.
            </p>
            <div className="mt-6 grid gap-4 text-sm leading-7 text-muted md:grid-cols-2">
              <div>
                <h2 className="font-semibold text-ink">What it shows</h2>
                <p className="mt-2">Structured event taxonomy, source audit, price coverage boundaries, macro/market boards, event-response analysis, company dossiers, and recruiter-facing trade notes.</p>
              </div>
              <div>
                <h2 className="font-semibold text-ink">What it does not claim</h2>
                <p className="mt-2">It is not a trading bot, prediction engine, financial advice product, proprietary alpha system, or execution-grade market data terminal.</p>
              </div>
            </div>
          </Card>
          <Sidebar />
        </div>
      </Section>
    </>
  )
}

export default AboutPage
