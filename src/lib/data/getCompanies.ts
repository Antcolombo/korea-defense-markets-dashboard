import companiesJson from '@/generated/companies.json'
import type { Company } from '@/types/company'

export function getCompanies(): Company[] {
  return companiesJson as Company[]
}

export function getCompany(ticker: string) {
  return getCompanies().find(company => company.ticker.toLowerCase() === ticker.toLowerCase())
}
