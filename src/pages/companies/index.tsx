import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/ui/Section'
import { CompanyCard } from '@/components/companies/CompanyCard'
import { getCompanies } from '@/lib/data/getCompanies'
import { getAssets } from '@/lib/data/getAssets'

export function CompaniesPage() {
  const companies = getCompanies()
  const assets = getAssets()

  return (
    <>
      <PageHeader
        eyebrow="Company universe"
        title="Defense And Industrial Company Universe"
        description="Generated company cards linking sourced filings and public defense themes to A&D primes, Korean defense names, industrial suppliers, and semiconductor comparators."
      />
      <Section>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {companies.map(company => (
            <CompanyCard key={company.ticker} company={company} asset={assets.find(asset => asset.ticker === company.ticker)} />
          ))}
        </div>
      </Section>
    </>
  )
}

export default CompaniesPage
