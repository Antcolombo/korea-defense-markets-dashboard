import { useRouter } from 'next/router'
import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/ui/Section'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { CompanyDossier } from '@/components/companies/CompanyDossier'
import { getCompanies } from '@/lib/data/getCompanies'
import { getAssets } from '@/lib/data/getAssets'
import { getEvents } from '@/lib/data/getEvents'

export function CompanyDossierPage() {
  const router = useRouter()
  const ticker = typeof router.query.ticker === 'string' ? decodeURIComponent(router.query.ticker) : ''
  const companies = getCompanies()
  const assets = getAssets()
  const events = getEvents()
  const company = companies.find(item => item.ticker.toLowerCase() === ticker.toLowerCase())
  const asset = assets.find(item => item.ticker.toLowerCase() === ticker.toLowerCase())

  if (!company) {
    return (
      <>
        <PageHeader eyebrow="Company dossier" title="Company Not Found" description="This dossier route did not match a company in the generated universe." />
        <Section>
          <Card className="p-6">
            <Button href="/companies">Back to company universe</Button>
          </Card>
        </Section>
      </>
    )
  }

  const relatedEvents = events.filter(event => event.affectedAssets.includes(company.ticker) || event.affectedThemes.some(theme => company.relatedThemes.includes(theme)))

  return (
    <>
      <PageHeader
        eyebrow="Company dossier"
        title={`${company.ticker} · ${company.name}`}
        description="Company overview, geopolitical exposure, recent sourced performance, catalysts, risks, valuation snapshot, and related public-source event themes."
      />
      <Section>
        <CompanyDossier company={company} asset={asset} events={relatedEvents} />
      </Section>
    </>
  )
}

export default CompanyDossierPage
