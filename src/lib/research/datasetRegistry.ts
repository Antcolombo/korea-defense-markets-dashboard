import type { Provenance, UnavailableField } from './api'

export type ProviderHealthDefinition = {
  id: string
  label: string
  visibility: 'active' | 'deferred'
  requirement: 'required' | 'optional'
  detail: string
  providers?: string[]
  datasets?: string[]
  sources?: string[]
  fields?: string[]
  fieldPrefixes?: string[]
}

type DeferredDatasetEntry = {
  id: string
  providerHealthId: string
  fields: string[]
  fieldPrefixes?: string[]
  providers?: string[]
}

const activeProviderHealth: ProviderHealthDefinition[] = [
  {
    id: 'postgres',
    label: 'Postgres',
    visibility: 'active',
    requirement: 'required',
    detail: 'Provider rows and point-in-time snapshots',
    providers: ['Postgres']
  },
  {
    id: 'polygon-ohlcv',
    label: 'Polygon OHLCV',
    visibility: 'active',
    requirement: 'required',
    detail: 'Daily OHLCV, returns, relative strength',
    providers: ['Polygon/Massive', 'derived from Polygon/Massive'],
    sources: [
      'https://polygon.io/docs/rest/stocks/aggregates/custom-bars',
      'Signal calculations from sourced Polygon/Massive OHLCV rows'
    ]
  }
]

const deferredProviderHealth: ProviderHealthDefinition[] = [
  {
    id: 'polygon-options',
    label: 'Massive Options',
    visibility: 'deferred',
    requirement: 'optional',
    detail: 'Options Basic proxy and optional live chain snapshot; free tier throttled to 5 calls/min',
    providers: ['Polygon/Massive + FINRA'],
    sources: [
      'https://polygon.io/docs/rest/options/snapshots/option-chain-snapshot',
      'https://massive.com/docs/rest/options/contracts; https://massive.com/docs/rest/options/aggregates'
    ]
  },
  {
    id: 'finra-short-sale',
    label: 'FINRA Short Sale Volume',
    visibility: 'deferred',
    requirement: 'optional',
    detail: 'Daily short-sale volume flow proxy',
    providers: ['Polygon/Massive + FINRA', 'FINRA'],
    sources: ['https://developer.finra.org/docs']
  },
  {
    id: 'finra-short-interest',
    label: 'FINRA Short Interest',
    visibility: 'deferred',
    requirement: 'optional',
    detail: 'Settlement-date short interest proxy',
    providers: ['Polygon/Massive + FINRA', 'FINRA'],
    sources: ['https://developer.finra.org/docs']
  },
  {
    id: 'catalyst-context',
    label: 'Catalysts',
    visibility: 'deferred',
    requirement: 'optional',
    detail: 'SEC, news, macro, and materiality context',
    providers: ['Google News RSS', 'SEC EDGAR', 'OpenDART', 'FRED'],
    sources: ['sourced catalyst rows', 'report engine unavailable shell']
  },
  {
    id: 'validation-lab',
    label: 'Validation Lab',
    visibility: 'deferred',
    requirement: 'optional',
    detail: 'Historical signal validation samples',
    providers: ['derived validation'],
    sources: ['validation engine']
  }
]

const deferredDatasets: DeferredDatasetEntry[] = [
  {
    id: 'polygon-options',
    providerHealthId: 'polygon-options',
    fields: [
      'positioning.optionsVolume',
      'sources.optionsVolume',
      'optionsVolume',
      'Options volume',
      'options volume',
      'positioning.openInterest',
      'sources.openInterest',
      'openInterest',
      'Open interest',
      'open interest',
      'positioning.putCallRatio',
      'sources.putCallRatio',
      'putCallRatio',
      'Put/call ratio',
      'Options put/call ratio',
      'put/call ratio',
      'live option chain snapshot',
      'delayed options aggregate sample volume',
      'positioning.impliedVolatility',
      'sources.impliedVolatility',
      'impliedVolatility',
      'Implied volatility',
      'implied volatility',
      'positioning.impliedVolPercentile',
      'impliedVolPercentile',
      'Insufficient IV history',
      'iv history',
      'crowding.optionsScore',
      'basketCrowding.optionsScore',
      'sources.optionsScore',
      'optionsScore',
      'Options component',
      'options score',
      'Options component missing'
    ]
  },
  {
    id: 'finra-short-interest',
    providerHealthId: 'finra-short-interest',
    fields: [
      'positioning.shortInterest',
      'sources.shortInterest',
      'shortInterest',
      'Short interest',
      'short interest',
      'positioning.shortInterestChange',
      'sources.shortInterestChange',
      'shortInterestChange',
      'FINRA short-interest history',
      'crowding.shortInterestScore',
      'basketCrowding.shortInterestScore',
      'sources.shortInterestScore',
      'shortInterestScore',
      'Short-interest component',
      'short interest score',
      'Short-interest component missing'
    ]
  },
  {
    id: 'finra-short-sale',
    providerHealthId: 'finra-short-sale',
    fields: [
      'positioning.shortVolumeRatio',
      'sources.shortVolumeRatio',
      'shortVolumeRatio',
      'FINRA short-sale volume ratio',
      'FINRA short-sale volume row',
      'Short-sale volume ratio',
      'short volume',
      'short sale',
      'short-sale'
    ]
  },
  {
    id: 'catalyst-context',
    providerHealthId: 'catalyst-context',
    fields: [
      'catalysts.materialityScore',
      'materialityScore',
      'Materiality',
      'Catalyst materiality score',
      'No sourced materiality score stored for generated event',
      'catalyst support score',
      'catalystSupportScore',
      'sources.catalystSupportScore',
      'crowding.catalystSupportScore',
      'basketCrowding.catalystSupportScore',
      'Catalyst support score',
      'Sourced catalyst row',
      'Catalyst rows missing',
      'No sourced catalyst rows available',
      'No SEC, news, or macro catalyst rows are sourced for this ticker',
      'direct catalyst row'
    ],
    fieldPrefixes: ['Materiality:']
  },
  {
    id: 'validation-lab',
    providerHealthId: 'validation-lab',
    fields: [
      'validation.hitRate',
      'hitRate',
      'Validation result missing',
      'No sourced validation sample available',
      'validation.averageForwardReturn',
      'averageForwardReturn',
      'historical sourced sample',
      'validation sample'
    ],
    providers: ['derived validation']
  }
]

export function providerHealthDefinitions(visibility: 'active' | 'deferred') {
  return visibility === 'active' ? activeProviderHealth : deferredProviderHealth
}

export function unavailableFieldVisibility(input: Pick<UnavailableField, 'field' | 'reason' | 'provider'>): 'active' | 'deferred' {
  return deferredDatasetForField(input) ? 'deferred' : 'active'
}

export function deferredDatasetForField(input: Pick<UnavailableField, 'field' | 'reason' | 'provider'>) {
  return deferredDatasets.find(entry => matchesDeferredEntry(entry, input)) ?? null
}

export function providerHealthIdForUnavailableField(input: Pick<UnavailableField, 'field' | 'reason' | 'provider'>) {
  return deferredDatasetForField(input)?.providerHealthId ?? null
}

export function matchesProviderHealthDefinition(item: Provenance, definition: ProviderHealthDefinition) {
  return exactIncludes(definition.providers, item.provider)
    || exactIncludes(definition.datasets, item.dataset)
    || exactIncludes(definition.sources, item.source)
}

export function providerHealthDefinitionHasField(definition: ProviderHealthDefinition, field: Pick<UnavailableField, 'field' | 'reason' | 'provider'>) {
  return providerHealthIdForUnavailableField(field) === definition.id
}

export function normalizeRegistryText(value: string | undefined) {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')
}

function matchesDeferredEntry(entry: DeferredDatasetEntry, input: Pick<UnavailableField, 'field' | 'reason' | 'provider'>) {
  const fieldText = normalizeRegistryText(input.field)
  const reasonText = normalizeRegistryText(input.reason)
  const providerText = normalizeRegistryText(input.provider)
  const fields = entry.fields.map(normalizeRegistryText)
  const prefixes = (entry.fieldPrefixes ?? []).map(normalizeRegistryText)
  const providers = (entry.providers ?? []).map(normalizeRegistryText)

  return fields.includes(fieldText)
    || fields.includes(reasonText)
    || prefixes.some(prefix => fieldText.startsWith(prefix))
    || providers.includes(providerText)
}

function exactIncludes(values: string[] | undefined, value: string) {
  if (!values?.length) return false
  const normalized = normalizeRegistryText(value)
  return values.map(normalizeRegistryText).includes(normalized)
}
