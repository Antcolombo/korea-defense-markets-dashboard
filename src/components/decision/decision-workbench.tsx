import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { CheckCircle2, FileText, RefreshCw, Save, Search, ShieldCheck, Trash2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type {
  DecisionAction,
  DecisionStatus,
  EvidenceDriver,
  InvestmentDecisionRecord,
  InvestmentDecisionSummary,
  RiskPlan,
  SourceStatus
} from '@/types/decision'

type ApiEnvelope<T> = {
  data?: T
  error?: string
}

type DecisionWorkbenchProps = {
  decisions: InvestmentDecisionSummary[]
  activeDecision?: InvestmentDecisionRecord | null
  initialTicker: string
  sourceSummary: string
}

const sourceStatuses: SourceStatus[] = ['missing', 'partial', 'stale', 'sourced']
const decisionActions: DecisionAction[] = ['watch', 'long', 'short', 'pass']
const decisionStatuses: DecisionStatus[] = ['watch', 'accepted', 'rejected', 'closed']
const statusFilters = ['all', 'open', 'watch', 'accepted', 'rejected', 'closed', 'public'] as const
const sortModes = ['updated-desc', 'created-desc', 'ticker-asc', 'evidence-desc', 'risk-clear'] as const

export function DecisionWorkbench({ decisions, activeDecision, initialTicker, sourceSummary }: DecisionWorkbenchProps) {
  const router = useRouter()
  const statusFilter = typeof router.query.status === 'string' ? router.query.status : ''
  const [tableStatus, setTableStatus] = useState(statusFilter || 'all')
  const [tableSearch, setTableSearch] = useState('')
  const [sortMode, setSortMode] = useState<typeof sortModes[number]>('updated-desc')
  const visibleDecisions = useMemo(
    () => filterDecisions(decisions, tableStatus, tableSearch, sortMode),
    [decisions, sortMode, tableSearch, tableStatus]
  )
  const [draft, setDraft] = useState<InvestmentDecisionRecord | null>(activeDecision ?? null)
  const [editorToken, setEditorToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setDraft(activeDecision ?? null)
  }, [activeDecision?.slug])

  useEffect(() => {
    setTableStatus(statusFilter || 'all')
  }, [statusFilter])

  useEffect(() => {
    setEditorToken(window.localStorage.getItem('decision-editor-token') ?? window.localStorage.getItem('pitch-editor-token') ?? '')
  }, [])

  useEffect(() => {
    if (editorToken) window.localStorage.setItem('decision-editor-token', editorToken)
  }, [editorToken])

  async function createDecision(ticker = initialTicker || 'NVDA') {
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch('/api/research/decisions', {
        method: 'POST',
        headers: writeHeaders(editorToken),
        body: JSON.stringify({ ticker })
      })
      const data = await parseApi<{ record: InvestmentDecisionRecord }>(response)
      setDraft(data.record)
      await router.push(`/?module=decision-log&slug=${encodeURIComponent(data.record.slug)}`)
    } catch (error) {
      setMessage(describeError(error))
    } finally {
      setSaving(false)
    }
  }

  async function refreshSources() {
    if (!draft) return
    if (isTemplateDecision(draft)) {
      setMessage('Save first, then refresh sources.')
      return
    }
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch(`/api/research/decisions/${encodeURIComponent(draft.slug)}`, {
        method: 'PUT',
        headers: writeHeaders(editorToken),
        body: JSON.stringify({ refreshSources: true })
      })
      const data = await parseApi<{ record: InvestmentDecisionRecord }>(response)
      setDraft(data.record)
      setMessage('Sources refreshed')
    } catch (error) {
      setMessage(describeError(error))
    } finally {
      setSaving(false)
    }
  }

  async function deleteDraft() {
    if (!draft || !canDeleteDraft(draft)) return
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch(`/api/research/decisions/${encodeURIComponent(draft.slug)}`, {
        method: 'DELETE',
        headers: writeHeaders(editorToken)
      })
      await parseApi<{ deleted: boolean; slug: string }>(response)
      setDraft(null)
      setMessage('Draft deleted')
      await router.push('/?module=decision-log&status=open')
    } catch (error) {
      setMessage(describeError(error))
    } finally {
      setSaving(false)
    }
  }

  async function saveDecision(nextDraft = draft) {
    if (!nextDraft) return
    setSaving(true)
    setMessage('')
    try {
      const isTemplate = nextDraft.id.startsWith('template-') || nextDraft.slug.endsWith('-decision-template')
      const response = await fetch(isTemplate ? '/api/research/decisions' : `/api/research/decisions/${encodeURIComponent(nextDraft.slug)}`, {
        method: isTemplate ? 'POST' : 'PUT',
        headers: writeHeaders(editorToken),
        body: JSON.stringify({ decision: decisionPayload(nextDraft) })
      })
      const data = await parseApi<{ record: InvestmentDecisionRecord }>(response)
      setDraft(data.record)
      setMessage('Saved')
      if (isTemplate) await router.push(`/?module=decision-log&slug=${encodeURIComponent(data.record.slug)}`)
    } catch (error) {
      setMessage(describeError(error))
    } finally {
      setSaving(false)
    }
  }

  function patchDraft(patch: Partial<InvestmentDecisionRecord>) {
    if (!draft) return
    setDraft({ ...draft, ...patch })
  }

  function patchRisk(patch: Partial<RiskPlan>) {
    if (!draft) return
    setDraft({ ...draft, risk: { ...draft.risk, ...patch } })
  }

  function patchEvidence(index: number, patch: Partial<EvidenceDriver>) {
    if (!draft) return
    const evidence = draft.evidence.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)
    setDraft({ ...draft, evidence })
  }

  function setDecisionState(status: DecisionStatus, decision: DecisionAction = draft?.decision ?? 'watch') {
    if (!draft) return
    const next = { ...draft, status, decision }
    const missing = status === 'closed' ? draft.readiness.missingForClose : status === 'accepted' ? draft.readiness.missingForAccept : []
    if (missing.length) {
      setMessage(`Missing: ${missing.slice(0, 4).join(', ')}`)
      return
    }
    setDraft(next)
    void saveDecision(next)
  }

  return (
    <div className="grid min-w-0 gap-3">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <Card className="rounded-md border-border bg-card shadow-none">
          <CardHeader className="border-b border-border pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[0.65rem] tracking-[0.04em] text-muted-foreground">Decision Journal</p>
                <CardTitle className="mt-1 font-mono text-sm">Investment Decision Audit Trail</CardTitle>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => void createDecision(initialTicker || 'NVDA')} disabled={saving}>
                  <FileText className="h-4 w-4" />
                  New Decision
                </Button>
                <Button asChild type="button" size="sm" variant="outline">
                  <Link href="/portfolio">Paper Book</Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <DecisionFilters
              status={tableStatus}
              search={tableSearch}
              sort={sortMode}
              onStatusChange={setTableStatus}
              onSearchChange={setTableSearch}
              onSortChange={setSortMode}
            />
            <DecisionTable decisions={visibleDecisions} activeSlug={draft?.slug} />
          </CardContent>
        </Card>

        <Card className="rounded-md border-border bg-card shadow-none">
          <CardHeader className="border-b border-border pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[0.65rem] tracking-[0.04em] text-muted-foreground">PM Read</p>
                <CardTitle className="mt-1 font-mono text-sm">{draft ? `${draft.ticker} Discipline Check` : 'No decision selected'}</CardTitle>
              </div>
              {draft ? <Badge variant={draft.readiness.canAccept ? 'secondary' : 'outline'} className="font-mono">{draft.readiness.canAccept ? 'decision-ready' : 'incomplete'}</Badge> : null}
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-4">
            {draft ? (
              <>
                <PmReadGrid decision={draft} />
                <div className="grid gap-2">
                  <p className="text-xs leading-5 text-muted-foreground">{draft.sourceSnapshot?.summary ?? sourceSummary}</p>
                  {draft.readiness.missingForAccept.length ? (
                    <p className="text-xs leading-5 text-amber">Missing before accept: {draft.readiness.missingForAccept.slice(0, 6).join(', ')}</p>
                  ) : null}
                </div>
              </>
            ) : (
              <EmptyState title="No decision selected" detail="Create a decision or open one from the table." />
            )}
          </CardContent>
        </Card>
      </div>

      {draft ? (
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="rounded-md border-border bg-card shadow-none">
            <CardHeader className="border-b border-border pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[0.65rem] tracking-[0.04em] text-muted-foreground">Decision Journal Record</p>
                  <CardTitle className="mt-1 font-mono text-sm">{draft.ticker} / {draft.companyName}</CardTitle>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setDecisionState('rejected', 'pass')}>
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setDecisionState('watch', 'watch')}>
                    Watch
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setDecisionState('accepted', draft.decision === 'watch' ? 'long' : draft.decision)}>
                    <CheckCircle2 className="h-4 w-4" />
                    Accept
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => void refreshSources()} disabled={saving}>
                    <RefreshCw className="h-4 w-4" />
                    Refresh Sources
                  </Button>
                  <Button type="button" size="sm" onClick={() => void saveDecision()} disabled={saving}>
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                  {canDeleteDraft(draft) ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => void deleteDraft()} disabled={saving}>
                      <Trash2 className="h-4 w-4" />
                      Delete Draft
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 pt-4">
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Ticker">
                  <Input value={draft.ticker} onChange={event => patchDraft({ ticker: event.target.value.toUpperCase() })} className="font-mono" />
                </Field>
                <Field label="Company">
                  <Input value={draft.companyName} onChange={event => patchDraft({ companyName: event.target.value })} />
                </Field>
                <Field label="Editor token">
                  <Input value={editorToken} onChange={event => setEditorToken(event.target.value)} type="password" placeholder="DECISION_EDITOR_TOKEN" />
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
                <Field label="Thesis">
                  <Textarea value={draft.risk.thesis} onChange={event => patchRisk({ thesis: event.target.value })} className="min-h-[96px]" />
                </Field>
                <Field label="Decision timestamp">
                  <Input value={draft.risk.decidedAt} onChange={event => patchRisk({ decidedAt: event.target.value })} className="font-mono" />
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Market believes">
                  <Textarea value={draft.marketBelief} onChange={event => patchDraft({ marketBelief: event.target.value })} className="min-h-[120px]" />
                </Field>
                <Field label="My variant view">
                  <Textarea value={draft.variantView} onChange={event => patchDraft({ variantView: event.target.value })} className="min-h-[120px]" />
                </Field>
              </div>

              <div className="grid gap-3">
                <div>
                  <p className="font-mono text-sm font-semibold">Three evidence drivers</p>
                  <p className="mt-1 text-xs text-muted-foreground">No more than three. Pick what matters and ignore rest.</p>
                </div>
                {draft.evidence.map((driver, index) => (
                  <div key={index} className="grid gap-2 rounded-md border border-border bg-background/45 p-3">
                    <div className="grid gap-2 md:grid-cols-[180px_minmax(0,1fr)_140px]">
                      <Field label={`Driver ${index + 1}`}>
                        <Input value={driver.driver} onChange={event => patchEvidence(index, { driver: event.target.value })} />
                      </Field>
                      <Field label="Claim">
                        <Input value={driver.claim} onChange={event => patchEvidence(index, { claim: event.target.value })} />
                      </Field>
                      <Field label="Source">
                        <select value={driver.sourceStatus} onChange={event => patchEvidence(index, { sourceStatus: event.target.value as SourceStatus })} className="h-9 rounded-md border border-border bg-background px-2 text-sm">
                          {sourceStatuses.map(status => <option key={status} value={status}>{status}</option>)}
                        </select>
                      </Field>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <Field label="Sourced evidence">
                        <Textarea value={driver.sourcedEvidence} onChange={event => patchEvidence(index, { sourcedEvidence: event.target.value })} />
                      </Field>
                      <Field label="Why it matters">
                        <Textarea value={driver.whyItMatters} onChange={event => patchEvidence(index, { whyItMatters: event.target.value })} />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>

              <Field label="Invalidation">
                <Textarea value={draft.invalidation} onChange={event => patchDraft({ invalidation: event.target.value })} />
              </Field>
            </CardContent>
          </Card>

          <div className="grid gap-3">
            <Card className="rounded-md border-border bg-card shadow-none">
              <CardHeader className="border-b border-border pb-3">
                <CardTitle className="font-mono text-sm">Trade / Risk Plan</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 pt-4">
                <Field label="Decision">
                  <select value={draft.decision} onChange={event => patchDraft({ decision: event.target.value as DecisionAction })} className="h-9 rounded-md border border-border bg-background px-2 text-sm">
                    {decisionActions.map(action => <option key={action} value={action}>{action}</option>)}
                  </select>
                </Field>
                <Field label="Status">
                  <select value={draft.status} onChange={event => patchDraft({ status: event.target.value as DecisionStatus })} className="h-9 rounded-md border border-border bg-background px-2 text-sm">
                    {decisionStatuses.map(status => <option key={status} value={status}>{status}</option>)}
                  </select>
                </Field>
                <Field label="Entry">
                  <Textarea value={draft.risk.entry} onChange={event => patchRisk({ entry: event.target.value })} />
                </Field>
                <div className="grid gap-2 md:grid-cols-2">
                  <Field label="Entry price">
                    <Input value={draft.risk.entryPrice ?? ''} onChange={event => patchRisk({ entryPrice: numberOrNull(event.target.value) })} placeholder="100.00" />
                  </Field>
                  <Field label="Target price">
                    <Input value={draft.risk.targetPrice ?? ''} onChange={event => patchRisk({ targetPrice: numberOrNull(event.target.value) })} placeholder="120.00" />
                  </Field>
                </div>
                <Field label="Sizing">
                  <select value={draft.risk.sizing} onChange={event => patchRisk({ sizing: event.target.value as RiskPlan['sizing'] })} className="h-9 rounded-md border border-border bg-background px-2 text-sm">
                    <option value="small">small</option>
                    <option value="medium">medium</option>
                    <option value="large">large</option>
                  </select>
                </Field>
                <div className="grid gap-2 md:grid-cols-2">
                  <Field label="Position size %">
                    <Input value={draft.risk.positionSizePct ?? ''} onChange={event => patchRisk({ positionSizePct: numberOrNull(event.target.value) })} placeholder="2.0" />
                  </Field>
                  <Field label="Confidence">
                    <Input value={draft.risk.confidence ?? ''} onChange={event => patchRisk({ confidence: numberOrNull(event.target.value) })} placeholder="0-100" />
                  </Field>
                </div>
                <Field label="Stop">
                  <Input value={draft.risk.stop} onChange={event => patchRisk({ stop: event.target.value })} />
                </Field>
                <Field label="Stop price">
                  <Input value={draft.risk.stopPrice ?? ''} onChange={event => patchRisk({ stopPrice: numberOrNull(event.target.value) })} placeholder="92.00" />
                </Field>
                <div className="grid gap-2 md:grid-cols-2">
                  <Field label="Upside">
                    <Input value={draft.risk.upside} onChange={event => patchRisk({ upside: event.target.value })} />
                  </Field>
                  <Field label="Downside">
                    <Input value={draft.risk.downside} onChange={event => patchRisk({ downside: event.target.value })} />
                  </Field>
                </div>
                <Field label="Time horizon">
                  <Input value={draft.risk.timeHorizon} onChange={event => {
                    patchRisk({ timeHorizon: event.target.value })
                    patchDraft({ timeHorizon: event.target.value })
                  }} />
                </Field>
                <Field label="Next catalyst date">
                  <Input value={draft.risk.catalystDate} onChange={event => patchRisk({ catalystDate: event.target.value })} placeholder="YYYY-MM-DD" />
                </Field>
                <Field label="What would change mind">
                  <Textarea value={draft.risk.whatWouldChangeMind} onChange={event => patchRisk({ whatWouldChangeMind: event.target.value })} />
                </Field>
                <div className="grid gap-2 rounded-md border border-border bg-background/45 p-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draft.isPublic}
                      onChange={event => patchDraft({ isPublic: event.target.checked })}
                      className="h-4 w-4 rounded border-border"
                    />
                    Show on public portfolio
                  </label>
                  <Field label="Featured rank">
                    <Input
                      value={draft.featuredRank ?? ''}
                      onChange={event => patchDraft({ featuredRank: integerOrNull(event.target.value) })}
                      placeholder="1"
                    />
                  </Field>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-md border-border bg-card shadow-none">
              <CardHeader className="border-b border-border pb-3">
                <CardTitle className="font-mono text-sm">Post-Mortem</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 pt-4">
                <Field label="Outcome return">
                  <Input value={draft.outcomeReturn ?? ''} onChange={event => patchDraft({ outcomeReturn: numberOrNull(event.target.value) })} placeholder="%" />
                </Field>
                <Field label="Lesson">
                  <Textarea value={draft.lesson} onChange={event => patchDraft({ lesson: event.target.value })} />
                </Field>
                <Button type="button" variant="outline" onClick={() => setDecisionState('closed', draft.decision)}>
                  <ShieldCheck className="h-4 w-4" />
                  Close With Lesson
                </Button>
                {message ? <Badge variant={message === 'Saved' ? 'secondary' : 'destructive'} className="w-fit font-mono">{message}</Badge> : null}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function filterDecisions(
  decisions: InvestmentDecisionSummary[],
  statusFilter: string,
  search: string,
  sortMode: typeof sortModes[number]
) {
  const query = search.trim().toLowerCase()
  const filtered = decisions.filter(decision => {
    const statusMatch =
      statusFilter === 'all' ||
      (statusFilter === 'open' && decision.status !== 'closed') ||
      (statusFilter === 'public' && decision.isPublic) ||
      decision.status === statusFilter
    const searchMatch = !query || [decision.ticker, decision.companyName, decision.variantView, decision.lesson]
      .some(value => value.toLowerCase().includes(query))
    return statusMatch && searchMatch
  })
  return filtered.sort((a, b) => {
    if (sortMode === 'ticker-asc') return a.ticker.localeCompare(b.ticker)
    if (sortMode === 'created-desc') return b.createdAt.localeCompare(a.createdAt)
    if (sortMode === 'evidence-desc') return evidenceRank(b.pmRead.evidenceQuality) - evidenceRank(a.pmRead.evidenceQuality)
    if (sortMode === 'risk-clear') return riskRank(b.pmRead.riskClarity) - riskRank(a.pmRead.riskClarity)
    return b.updatedAt.localeCompare(a.updatedAt)
  })
}

function DecisionFilters({
  status,
  search,
  sort,
  onStatusChange,
  onSearchChange,
  onSortChange
}: {
  status: string
  search: string
  sort: typeof sortModes[number]
  onStatusChange: (value: string) => void
  onSearchChange: (value: string) => void
  onSortChange: (value: typeof sortModes[number]) => void
}) {
  return (
    <div className="mb-3 grid gap-2 2xl:grid-cols-[minmax(180px,1fr)_150px_180px]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={event => onSearchChange(event.target.value)}
          className="pl-8"
          aria-label="Search decisions"
          placeholder="Search ticker, view, lesson"
        />
      </div>
      <select
        value={status}
        onChange={event => onStatusChange(event.target.value)}
        className="h-9 rounded-md border border-border bg-background px-2 text-sm"
        aria-label="Filter decisions"
      >
        {statusFilters.map(item => <option key={item} value={item}>{item}</option>)}
      </select>
      <select
        value={sort}
        onChange={event => onSortChange(event.target.value as typeof sortModes[number])}
        className="h-9 rounded-md border border-border bg-background px-2 text-sm"
        aria-label="Sort decisions"
      >
        <option value="updated-desc">latest update</option>
        <option value="created-desc">newest created</option>
        <option value="ticker-asc">ticker A-Z</option>
        <option value="evidence-desc">best evidence</option>
        <option value="risk-clear">risk clear first</option>
      </select>
    </div>
  )
}

export function PortfolioView({ decisions }: { decisions: InvestmentDecisionRecord[] }) {
  return (
    <main className="terminal-v2 min-h-screen bg-background p-3 text-foreground">
      <div className="mx-auto grid max-w-7xl gap-3">
        <section className="rounded-md border border-border bg-card p-4">
          <p className="font-mono text-[0.68rem] tracking-[0.04em] text-muted-foreground">Public Paper Book</p>
          <h1 className="mt-1 font-mono text-xl font-semibold">Investment Decision Audit Trail</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">Public records only. This page shows process quality, not AI stock picks.</p>
        </section>
        {decisions.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {decisions.map(decision => (
              <Card key={decision.slug} className="rounded-md border-border bg-card shadow-none">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">{decision.decision} / {decision.status}</p>
                      <CardTitle className="mt-1 font-mono text-base">{decision.ticker} / {decision.companyName}</CardTitle>
                    </div>
                    <Badge variant="outline" className="font-mono">{formatReturn(decision.outcomeReturn)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <p className="text-sm leading-6 text-muted-foreground">{decision.variantView || 'Variant view pending.'}</p>
                  <PmReadGrid decision={decision} />
                  <p className="text-xs leading-5 text-muted-foreground">Lesson: {decision.lesson || 'Pending post-mortem.'}</p>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/?module=decision-log&slug=${encodeURIComponent(decision.slug)}`}>Open Decision</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState title="No public decisions yet" detail="Mark real decisions public after they have a variant view, risk plan, and post-mortem." />
        )}
      </div>
    </main>
  )
}

function DecisionTable({ decisions, activeSlug }: { decisions: InvestmentDecisionSummary[]; activeSlug?: string }) {
  if (!decisions.length) return <EmptyState title="No decisions yet" detail="Create one from ticker, then write the variant view and risk plan." />
  return (
    <>
    <div className="grid gap-2 md:hidden">
      {decisions.map(decision => (
        <div key={decision.slug} className={`rounded-md border p-3 ${decision.slug === activeSlug ? 'border-primary/50 bg-primary/5' : 'border-border bg-background/45'}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs text-muted-foreground">{decision.createdAt.slice(0, 10)} / {decision.decision}</p>
              <Link href={`/?module=decision-log&slug=${encodeURIComponent(decision.slug)}`} className="mt-1 block font-mono text-sm font-semibold">{decision.ticker} / {decision.companyName}</Link>
            </div>
            <Badge variant="outline" className="font-mono">{decision.status}</Badge>
          </div>
          <p className="mt-2 max-h-[4.5rem] overflow-hidden text-sm leading-6 text-muted-foreground">{decision.variantView || 'Pending human variant view.'}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <Metric label="Evidence" value={decision.pmRead.evidenceQuality} />
            <Metric label="Risk" value={decision.pmRead.riskClarity} />
            <Metric label="Outcome" value={formatReturn(decision.outcomeReturn)} />
          </div>
        </div>
      ))}
    </div>
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="font-mono text-[0.68rem] text-muted-foreground">
          <tr className="border-b border-border">
            {['Date', 'Ticker', 'Decision', 'Variant View', 'Evidence Grade', 'Risk', 'Status', 'Outcome', 'Lesson'].map(header => (
              <th key={header} className="px-2 py-2 font-medium">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {decisions.map(decision => (
            <tr key={decision.slug} className={`border-b border-border/60 ${decision.slug === activeSlug ? 'bg-primary/5' : ''}`}>
              <td className="px-2 py-3 font-mono text-xs text-muted-foreground">{decision.createdAt.slice(0, 10)}</td>
              <td className="px-2 py-3 font-mono font-semibold">
                <Link href={`/?module=decision-log&slug=${encodeURIComponent(decision.slug)}`}>{decision.ticker}</Link>
              </td>
              <td className="px-2 py-3">{decision.decision}</td>
              <td className="max-w-[280px] truncate px-2 py-3 text-muted-foreground">{decision.variantView || 'Pending human variant view.'}</td>
              <td className="px-2 py-3">{decision.pmRead.evidenceQuality}</td>
              <td className="px-2 py-3">{decision.pmRead.riskClarity}</td>
              <td className="px-2 py-3">{decision.status}</td>
              <td className="px-2 py-3 font-mono">{formatReturn(decision.outcomeReturn)}</td>
              <td className="max-w-[220px] truncate px-2 py-3 text-muted-foreground">{decision.lesson || 'Pending.'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  )
}

function PmReadGrid({ decision }: { decision: InvestmentDecisionRecord | InvestmentDecisionSummary }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Metric label="Variant" value={decision.pmRead.variantStrength} />
      <Metric label="Evidence" value={decision.pmRead.evidenceQuality} />
      <Metric label="Risk" value={decision.pmRead.riskClarity} />
      <Metric label="Catalyst" value={decision.pmRead.nextCatalystDate} />
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/45 p-2">
      <p className="font-mono text-[0.65rem] tracking-[0.04em] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-mono text-sm font-semibold">{value}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="font-mono text-[0.68rem] text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-background/45 p-4">
      <p className="font-mono text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{detail}</p>
    </div>
  )
}

function writeHeaders(token: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (token) {
    headers['x-decision-editor-token'] = token
    headers['x-pitch-editor-token'] = token
  }
  return headers
}

async function parseApi<T>(response: Response): Promise<T> {
  const body = await response.json() as ApiEnvelope<T>
  if (!response.ok || body.error) throw new Error(body.error ?? `Request failed (${response.status})`)
  if (!body.data) throw new Error('Response missing data.')
  return body.data
}

function decisionPayload(decision: InvestmentDecisionRecord) {
  return {
    ticker: decision.ticker,
    companyName: decision.companyName,
    status: decision.status,
    decision: decision.decision,
    marketBelief: decision.marketBelief,
    variantView: decision.variantView,
    evidence: decision.evidence,
    risk: decision.risk,
    invalidation: decision.invalidation,
    timeHorizon: decision.timeHorizon,
    expectedReturn: decision.expectedReturn,
    downside: decision.downside,
    sourceSnapshot: decision.sourceSnapshot,
    outcomeReturn: decision.outcomeReturn,
    lesson: decision.lesson,
    isPublic: decision.isPublic,
    featuredRank: decision.featuredRank
  }
}

function numberOrNull(value: string) {
  if (!value.trim()) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function integerOrNull(value: string) {
  if (!value.trim()) return null
  const number = Number.parseInt(value, 10)
  return Number.isFinite(number) ? number : null
}

function formatReturn(value: number | null) {
  if (value === null) return 'Pending'
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}

function evidenceRank(value: string) {
  if (value === 'sourced') return 3
  if (value === 'partial') return 2
  return 1
}

function riskRank(value: string) {
  return value === 'clear' ? 2 : 1
}

function canDeleteDraft(decision: InvestmentDecisionRecord) {
  return !isTemplateDecision(decision) &&
    !decision.isPublic &&
    decision.status === 'watch' &&
    decision.decision === 'watch' &&
    !decision.marketBelief.trim() &&
    !decision.variantView.trim() &&
    !decision.invalidation.trim() &&
    decision.evidence.every(driver => !driver.claim.trim() && !driver.sourcedEvidence.trim() && !driver.whyItMatters.trim()) &&
    decision.outcomeReturn === null &&
    !decision.lesson.trim()
}

function isTemplateDecision(decision: Pick<InvestmentDecisionRecord, 'id' | 'slug'>) {
  return decision.id.startsWith('template-') || decision.slug.endsWith('-decision-template')
}

function describeError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
