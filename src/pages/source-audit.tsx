import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/ui/Section'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { getSourceAudit } from '@/lib/data/getSourceAudit'

function StatusBadge({ status }: { status: string }) {
  return <Badge tone={status === 'passed' || status === 'source' ? 'source' : 'crisis'}>{status}</Badge>
}

function compactFailure(failure: string) {
  return failure.replace(/https:\/\/\S+/g, '[provider URL]')
}

function formatDatasetName(name: string) {
  if (name === 'riskIndex') return 'marketRegime'
  return name
}

export function SourceAuditPage() {
  const audit = getSourceAudit()
  const datasetCounts = Object.entries(audit.datasetCounts ?? {})
  const providers = audit.providers ?? []
  const failures = [...(audit.readinessFailures ?? []), ...audit.missingProvenance]

  return (
    <>
      <PageHeader
        eyebrow="Source audit"
        title="Provider And Dataset Readiness"
        description="Build-time audit of live provider ingestion, normalized dataset counts, provenance coverage, and publication blockers."
      >
        <StatusBadge status={audit.status} />
      </PageHeader>
      <Section>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-4">
            <p className="workbench-kicker">Generated</p>
            <p className="mt-2 text-sm font-semibold text-ink">{audit.generatedAt}</p>
          </Card>
          <Card className="p-4">
            <p className="workbench-kicker">Records checked</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{audit.recordsChecked}</p>
          </Card>
          <Card className="p-4">
            <p className="workbench-kicker">Blocking issues</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{failures.length}</p>
          </Card>
        </div>
      </Section>
      <Section className="pt-0">
        <Card>
          <CardHeader title="Price Data Limits" eyebrow="Do not overclaim this layer" />
          <CardBody>
            <div className="grid gap-3 text-sm leading-6 text-muted lg:grid-cols-4">
              {[
                ['U.S. prices', 'Public daily historical quotes. Useful for research context; not institutional consolidated tape, NBBO, intraday, or execution-grade data.'],
                ['Korea prices', 'Local Korean equities are currently disclosure/evidence names unless a KRX-capable price provider supplies verified history.'],
                ['Macro data', 'FRED series are sourced levels. FX/rate/commodity moves are level changes and must not be read as equity returns.'],
                ['Upgrade path', 'Decision-grade use should add Polygon, FactSet, Bloomberg, Refinitiv, Tiingo/IEX, or a licensed global feed with corporate-action handling.']
              ].map(([title, body]) => (
                <div key={title} className="workbench-panel p-3">
                  <p className="font-semibold text-ink">{title}</p>
                  <p className="mt-1">{body}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </Section>
      <Section className="pt-0">
        <Card>
          <CardHeader title="Provider Status" eyebrow="Raw ingestion" />
          <div className="overflow-x-auto">
            <table className="workbench-table min-w-[760px] table-fixed">
              <thead>
                <tr>
                  <th className="w-[18%]">Provider</th>
                  <th className="w-[13%]">Status</th>
                  <th className="w-[10%]">Records</th>
                  <th className="w-[22%]">Retrieved</th>
                  <th>Failures</th>
                </tr>
              </thead>
              <tbody>
                {providers.map(provider => (
                  <tr key={provider.provider} className="align-top">
                    <td className="font-semibold text-ink">{provider.provider}</td>
                    <td><StatusBadge status={provider.status} /></td>
                    <td>{provider.records}</td>
                    <td className="break-words">{provider.retrievedAt ?? 'Not retrieved'}</td>
                    <td>
                      {provider.failures.length > 0 ? (
                        <ul className="grid gap-1">
                          {provider.failures.map(failure => <li key={failure} className="break-words">{compactFailure(failure)}</li>)}
                        </ul>
                      ) : 'None'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>
      <Section className="pt-0">
        <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
          <Card>
            <CardHeader title="Normalized Datasets" eyebrow="Generated JSON" />
            <CardBody className="grid gap-2">
              {datasetCounts.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between gap-4 border-b border-line py-2 text-sm last:border-b-0">
                  <span className="font-semibold text-ink">{formatDatasetName(name)}</span>
                  <span className="text-muted">{count}</span>
                </div>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Publication Blockers" eyebrow="Strict readiness" />
            <CardBody>
              {failures.length === 0 ? (
                <p className="text-sm leading-7 text-muted">No blockers. Core datasets are populated and provenance fields are present.</p>
              ) : (
                <ul className="grid gap-2 text-sm leading-6 text-muted">
                  {failures.map(failure => <li key={failure} className="break-words">• {compactFailure(failure)}</li>)}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </Section>
    </>
  )
}

export default SourceAuditPage
