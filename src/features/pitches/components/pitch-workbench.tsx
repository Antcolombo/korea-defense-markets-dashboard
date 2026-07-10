import { cloneElement, isValidElement, useEffect, useId, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { ArrowRight, Download, PenLine, Plus, Save, Share2, Sparkles, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import type {
  Catalyst,
  CatalystType,
  DayMapView,
  ModelLineItem,
  OptionsBattlefieldView,
  OptionsStrikeSignalView,
  PitchEvidenceDriver,
  PitchRecommendation,
  PitchSourceQuality,
  PitchTabId,
  TargetConfidenceView,
  StockPitch,
  StockPitchRecord,
  StockPitchStatus,
  StockPitchSummary,
  TradeExpression
} from '@/types/pitch'
import type { AiScanView, PitchNewsTapeItem, PitchSourceSnapshot } from '@/types/pitch'
import type { ChartPricePoint } from '@/features/pitches/contracts'
import { PitchTargetChart } from '@/features/pitches/components/pitch-target-chart'
import { EditorPanel, ListBlock, MetricCard, MetricMini, Panel, TextBlock } from '@/features/pitches/components/pitch-surfaces'
import { PitchSourceTabs } from '@/features/pitches/components/pitch-source-panels'
import { AiScanPanel, NewsTapePanel, RiskStructure, ScenarioBars, TargetMethod } from '@/features/pitches/components/pitch-analysis-panels'
import { DetailGrid, Field, PitchEditor, SourceEvidencePanel } from '@/features/pitches/components/pitch-editor'
import { PitchList, ShareActions } from '@/features/pitches/components/pitch-list'

type PitchWorkbenchProps = {
  record?: StockPitchRecord | null
  pitches: StockPitchSummary[]
  prices: ChartPricePoint[]
  sourceSnapshot?: PitchSourceSnapshot
  initialTicker?: string
}

type ApiEnvelope<T> = {
  data?: T
  error?: string
}

const recommendationOptions: PitchRecommendation[] = ['long', 'short', 'watchlist', 'no-trade']
const statusOptions: StockPitchStatus[] = ['draft', 'review', 'published', 'archived']
const expressionOptions: TradeExpression[] = ['common-stock', 'calls', 'puts', 'call-spread', 'put-spread', 'calendar', 'pair-trade', 'no-trade']
const catalystTypeOptions: CatalystType[] = ['earnings', 'macro', 'product', 'regulatory', 'sector', 'technical', 'positioning', 'other']
const sourceQualityOptions: PitchSourceQuality[] = ['sourced', 'derived', 'proxy', 'plan-locked', 'unavailable']
const pitchTabIds: { id: PitchTabId; label: string }[] = [
  { id: 'setup', label: 'Setup' },
  { id: 'variant-view', label: 'Variant' },
  { id: 'positioning', label: 'Positioning' },
  { id: 'catalysts', label: 'Catalysts' },
  { id: 'model', label: 'Model' },
  { id: 'valuation', label: 'Valuation' },
  { id: 'trade-structure', label: 'Trade' },
  { id: 'red-team', label: 'Red Team' },
  { id: 'post-mortem', label: 'Post' }
]

export function PitchWorkbench({ record, pitches, prices, sourceSnapshot, initialTicker }: PitchWorkbenchProps) {
  const router = useRouter()
  const [activeRecord, setActiveRecord] = useState<StockPitchRecord | null>(record ? hydratePitchRecord(record, sourceSnapshot) : null)
  const [draft, setDraft] = useState<StockPitch | null>(record?.pitch ? hydratePitch(record.pitch, sourceSnapshot) : null)
  const [status, setStatus] = useState<StockPitchStatus>(record?.status ?? 'draft')
  const [shareEnabled, setShareEnabled] = useState(Boolean(record?.shareEnabled))
  const [newTicker, setNewTicker] = useState(initialTicker ?? record?.ticker ?? 'NVDA')
  const [newCompanyName, setNewCompanyName] = useState('')
  const [editorToken, setEditorToken] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [aiScanning, setAiScanning] = useState(false)
  const [message, setMessage] = useState('')

  const selected = activeRecord ?? record ?? null

  useEffect(() => {
    setActiveRecord(record ? hydratePitchRecord(record, sourceSnapshot) : null)
    setDraft(record?.pitch ? hydratePitch(record.pitch, sourceSnapshot) : null)
    setStatus(record?.status ?? 'draft')
    setShareEnabled(Boolean(record?.shareEnabled))
    setNewTicker(initialTicker ?? record?.ticker ?? 'NVDA')
  }, [initialTicker, record?.slug, sourceSnapshot?.generatedAt])

  useEffect(() => {
    setEditorToken(window.localStorage.getItem('pitch-editor-token') ?? '')
  }, [])

  useEffect(() => {
    if (editorToken) window.localStorage.setItem('pitch-editor-token', editorToken)
  }, [editorToken])

  async function createPitch() {
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch('/api/research/pitches', {
        method: 'POST',
        headers: writeHeaders(editorToken),
        body: JSON.stringify({
          ticker: newTicker.trim().toUpperCase(),
          companyName: newCompanyName.trim() || undefined
        })
      })
      const data = await parseApi<{ record: StockPitchRecord; sourceSnapshot?: PitchSourceSnapshot }>(response)
      setActiveRecord(data.record)
      setDraft(data.record.pitch)
      setStatus(data.record.status)
      setShareEnabled(data.record.shareEnabled)
      await router.push(`/?module=stock-pitch&slug=${encodeURIComponent(data.record.slug)}`)
    } catch (error) {
      setMessage(describeError(error))
    } finally {
      setSaving(false)
    }
  }

  async function savePitch() {
    if (!selected || !draft) return
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch(`/api/research/pitches/${encodeURIComponent(selected.slug)}`, {
        method: 'PUT',
        headers: writeHeaders(editorToken),
        body: JSON.stringify({ pitch: draft, status, shareEnabled })
      })
      const data = await parseApi<{ record: StockPitchRecord }>(response)
      setActiveRecord(data.record)
      setDraft(data.record.pitch)
      setStatus(data.record.status)
      setShareEnabled(data.record.shareEnabled)
      setMessage('Saved')
    } catch (error) {
      setMessage(describeError(error))
    } finally {
      setSaving(false)
    }
  }

  async function refreshAiScan() {
    if (!draft) return
    setAiScanning(true)
    setMessage('')
    try {
      const response = await fetch('/api/research/ai-scan', {
        method: 'POST',
        headers: writeHeaders(editorToken),
        body: JSON.stringify({ ticker: draft.setup.ticker, mode: 'stock-pitch', forceRefresh: true })
      })
      const data = await parseApi<{ aiScan: AiScanView; sourceSnapshot: PitchSourceSnapshot }>(response)
      setDraft(mergeAiScanIntoPitch(draft, data.aiScan, data.sourceSnapshot))
      setMessage(data.aiScan.status === 'completed' ? 'AI review ready' : data.aiScan.errorMessage ?? 'AI review unavailable')
    } catch (error) {
      setMessage(describeError(error))
    } finally {
      setAiScanning(false)
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex justify-end gap-2">
        {draft ? (
          <Button asChild type="button" variant="secondary" size="sm">
            <Link href={`/?module=decision-log&ticker=${encodeURIComponent(draft.setup.ticker)}&new=1${selected?.slug ? `&fromPitch=${encodeURIComponent(selected.slug)}` : ''}`}>
              <ArrowRight className="h-4 w-4" />
              Promote To Decision
            </Link>
          </Button>
        ) : null}
        <Button type="button" variant={editMode ? 'secondary' : 'outline'} size="sm" onClick={() => setEditMode(value => !value)}>
          <PenLine className="h-4 w-4" />
          {editMode ? 'Done Editing' : 'Edit Pitch'}
        </Button>
      </div>
      {draft ? (
        editMode ? (
          <Tabs defaultValue="dashboard" className="min-w-0">
            <TabsList className="mb-3 flex-wrap">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="editor">Editor</TabsTrigger>
            </TabsList>
            <TabsContent value="dashboard">
              <PitchDashboard pitch={draft} prices={prices} onRunAiScan={refreshAiScan} aiScanning={aiScanning} />
            </TabsContent>
            <TabsContent value="editor">
              <PitchEditor pitch={draft} onChange={setDraft} />
            </TabsContent>
          </Tabs>
        ) : (
          <PitchDashboard pitch={draft} prices={prices} />
        )
      ) : (
        <EmptyPitch />
      )}

      <div className={editMode ? 'grid gap-3 xl:grid-cols-[260px_minmax(0,1fr)]' : 'grid gap-3'}>
        <PitchList pitches={pitches} activeSlug={selected?.slug} />
        {editMode ? (
          <Card className="rounded-md border-border bg-card shadow-none">
            <CardHeader className="border-b border-border pb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[0.65rem] tracking-[0.04em] text-muted-foreground">Pitch Factory</p>
                  <CardTitle className="mt-1 font-mono text-sm">Structured StockPitch DB</CardTitle>
                </div>
                {selected ? <ShareActions record={selected} shareEnabled={shareEnabled} /> : null}
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 pt-4">
              <div className="grid gap-2 xl:grid-cols-[1fr_0.9fr]">
                <div className="grid gap-2 md:grid-cols-2">
                  <Field label="New ticker">
                    <Input value={newTicker} onChange={event => setNewTicker(event.target.value.toUpperCase())} className="font-mono" />
                  </Field>
                  <Field label="Company name">
                    <Input value={newCompanyName} onChange={event => setNewCompanyName(event.target.value)} placeholder="Optional" />
                  </Field>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <Field label="Editor token">
                    <Input
                      value={editorToken}
                      onChange={event => setEditorToken(event.target.value)}
                      placeholder="Only needed in production"
                      type="password"
                      className="min-w-[220px] font-mono"
                    />
                  </Field>
                  <Button type="button" onClick={createPitch} disabled={saving}>
                    <Plus className="h-4 w-4" />
                    Create
                  </Button>
                  <Button type="button" variant="secondary" onClick={savePitch} disabled={saving || !draft}>
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={status} onValueChange={value => setStatus(value as StockPitchStatus)}>
                  <SelectTrigger className="w-[150px] font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant={shareEnabled ? 'secondary' : 'outline'}
                  onClick={() => setShareEnabled(value => !value)}
                  disabled={!selected}
                >
                  <Share2 className="h-4 w-4" />
                  {shareEnabled ? 'Share On' : 'Share Off'}
                </Button>
                {message ? <Badge variant={message === 'Saved' ? 'secondary' : 'destructive'} className="font-mono">{message}</Badge> : null}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}

export function PitchReadOnlyView({ record, prices }: { record: StockPitchRecord; prices: ChartPricePoint[] }) {
  return (
    <main className="terminal-v2 min-h-screen bg-background p-3 text-foreground">
      <div className="mx-auto grid max-w-7xl gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border bg-card p-4">
          <div>
            <p className="font-mono text-[0.68rem] tracking-[0.04em] text-muted-foreground">Shared Stock Pitch</p>
            <h1 className="mt-1 font-mono text-xl font-semibold">{record.ticker} / {record.companyName}</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">{record.oneLineThesis}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="font-mono">{record.recommendation}</Badge>
            <Button asChild variant="outline" size="sm">
              <Link href={`/pitch/${encodeURIComponent(record.slug)}/print?token=${encodeURIComponent(record.shareToken || '')}`}>
                <Download className="h-4 w-4" />
                Print
              </Link>
            </Button>
          </div>
        </div>
        <PitchDashboard pitch={record.pitch} prices={prices} />
      </div>
    </main>
  )
}

export function PitchDashboard({
  pitch,
  prices,
  onRunAiScan,
  aiScanning = false
}: {
  pitch: StockPitch
  prices: ChartPricePoint[]
  onRunAiScan?: () => void
  aiScanning?: boolean
}) {
  return (
    <div className="grid min-w-0 gap-3">
      {isSeedPitch(pitch) ? (
        <div className="rounded-md border border-amber-300/35 bg-amber-300/10 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-amber-300/45 font-mono text-amber-100">template</Badge>
            <p className="font-mono text-xs font-semibold text-amber-100">Seed pitch only. Not live sourced market data.</p>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Use Create or AI refresh to attach sourced price, catalyst, options, and evidence rows before PM review.
          </p>
        </div>
      ) : null}
      <PitchSourceTabs pitch={pitch} prices={prices} />

      <div className="grid gap-3 md:grid-cols-5">
        <MetricCard label="Recommendation" value={pitch.setup.recommendation} />
        <MetricCard label="Current" value={money(pitch.setup.currentPrice)} />
        <MetricCard label="Target" value={money(pitch.setup.targetPrice)} />
        <MetricCard label="Expected" value={percent(pitch.setup.expectedReturn)} />
        <MetricCard label="Price Source" value={pitch.priceProvenance?.label ?? 'N/A'} />
      </div>

      <div className="grid gap-3 xl:grid-cols-[0.82fr_1.18fr]">
        <Panel title="PM Promotion Gate" kicker={pitch.readiness.canPromote ? 'ready' : 'blocked'}>
          <div className="grid gap-3">
            <div className="grid gap-2 md:grid-cols-3">
              <MetricMini label="Promote" value={pitch.readiness.canPromote ? 'Yes' : 'No'} />
              <MetricMini label="Source Score" value={`${pitch.readiness.sourceScore}/100`} />
              <MetricMini label="Missing" value={pitch.readiness.missing.length.toString()} />
            </div>
            {pitch.readiness.missing.length ? <ListBlock title="Missing Before PM Read" items={pitch.readiness.missing} /> : <TextBlock title="Gate" body="Pitch has thesis, exactly three drivers, source-backed evidence, valuation, catalyst, and invalidation." />}
          </div>
        </Panel>
        <Panel title="Three Evidence Drivers" kicker="Only what matters">
          <div className="grid gap-2 md:grid-cols-3">
            {pitch.evidenceDrivers.map((driver, index) => (
              <div key={`${driver.driver}-${index}`} className="rounded-md border border-border bg-background/45 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-mono text-sm font-semibold">{driver.driver || `Driver ${index + 1}`}</p>
                  <Badge variant={driver.sourceStatus === 'sourced' || driver.sourceStatus === 'derived' ? 'secondary' : 'outline'} className="font-mono">{driver.sourceStatus}</Badge>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{driver.claim || 'Claim pending.'}</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{driver.evidence || 'Evidence pending.'}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel title="Variant View" kicker="Memo core">
          <div className="grid gap-3">
            <TextBlock title="Market Believes" body={pitch.variantView.marketBelieves} />
            <TextBlock title="My View" body={pitch.variantView.myView} />
            <TextBlock title="Why Now" body={pitch.variantView.whyNow} />
          </div>
        </Panel>
        <Panel title="Target Method" kicker="What the lines mean">
          <TargetMethod pitch={pitch} />
        </Panel>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1fr_0.85fr]">
        <Panel title="Bull / Base / Bear" kicker="Valuation">
          <ScenarioBars pitch={pitch} />
        </Panel>
        <Panel title="Risk Structure" kicker={pitch.tradeStructure.preferredExpression}>
          <RiskStructure pitch={pitch} />
        </Panel>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <AiScanPanel pitch={pitch} onRunAiScan={onRunAiScan} aiScanning={aiScanning} />
        <NewsTapePanel items={pitch.newsTape ?? pitch.sourceSnapshot?.newsTape ?? []} />
        <SourceEvidencePanel pitch={pitch} />
      </div>

      <Tabs defaultValue="setup" className="min-w-0">
        <TabsList className="mb-3 flex-wrap">
          {pitchTabIds.map(tab => <TabsTrigger key={tab.id} value={tab.id}>{tab.label}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="setup">
          <DetailGrid>
            <TextBlock title="One-Line Thesis" body={pitch.setup.oneLineThesis} />
            <TextBlock title="Primary Catalyst" body={pitch.setup.primaryCatalyst} />
            <TextBlock title="Sector" body={pitch.setup.sector} />
            <TextBlock title="Time Horizon" body={pitch.setup.timeHorizon} />
          </DetailGrid>
        </TabsContent>
        <TabsContent value="variant-view">
          <DetailGrid>
            <TextBlock title="Debate" body={pitch.variantView.debate} />
            <TextBlock title="Mispricing" body={pitch.variantView.mispricing} />
          </DetailGrid>
        </TabsContent>
        <TabsContent value="positioning">
          <DetailGrid>
            <TextBlock title="GEX Summary" body={pitch.positioning.gammaExposureSummary || 'N/A'} />
            <TextBlock title="OI Summary" body={pitch.positioning.openInterestSummary || 'N/A'} />
            <TextBlock title="Relative Strength" body={pitch.positioning.relativeStrengthSummary} />
            <TextBlock title="Conclusion" body={pitch.positioning.positioningConclusion} />
          </DetailGrid>
        </TabsContent>
        <TabsContent value="catalysts">
          <CatalystTable catalysts={pitch.catalysts} />
        </TabsContent>
        <TabsContent value="model">
          <div className="grid gap-3">
            <DetailGrid>
              <TextBlock title="Most Important Driver" body={pitch.model.mostImportantDriver} />
              <TextBlock title="Model Conclusion" body={pitch.model.modelConclusion} />
            </DetailGrid>
            <LineItemTable title="Key KPIs" rows={pitch.model.keyKpis} />
            <LineItemTable title="Margin Assumptions" rows={pitch.model.marginAssumptions} />
            <LineItemTable title="EPS / FCF" rows={pitch.model.epsFcfAssumptions} />
          </div>
        </TabsContent>
        <TabsContent value="valuation">
          <DetailGrid>
            <TextBlock title="Method" body={pitch.valuation.primaryMethod} />
            <TextBlock title="Conclusion" body={pitch.valuation.valuationConclusion} />
            <TextBlock title="Peer Set" body={pitch.valuation.peerSet.join(', ') || 'N/A'} />
          </DetailGrid>
        </TabsContent>
        <TabsContent value="trade-structure">
          <DetailGrid>
            <TextBlock title="Entry Trigger" body={pitch.tradeStructure.entryTrigger} />
            <TextBlock title="Invalidation" body={pitch.tradeStructure.invalidation} />
            <TextBlock title="Why This Expression" body={pitch.tradeStructure.whyThisExpression} />
            <TextBlock title="Risk / Reward" body={pitch.tradeStructure.riskReward} />
          </DetailGrid>
        </TabsContent>
        <TabsContent value="red-team">
          <DetailGrid>
            <TextBlock title="Bear Case" body={pitch.redTeam.bearCase} />
            <TextBlock title="Counterargument" body={pitch.redTeam.strongestCounterargument} />
            <TextBlock title="What Makes Me Wrong" body={pitch.redTeam.whatWouldMakeMeWrong} />
            <TextBlock title="Data To Monitor" body={pitch.redTeam.dataToMonitor.join(', ')} />
          </DetailGrid>
        </TabsContent>
        <TabsContent value="post-mortem">
          <DetailGrid>
            <TextBlock title="Status" body={pitch.postMortem.status} />
            <TextBlock title="What Was Right" body={pitch.postMortem.whatWasRight || 'Not completed'} />
            <TextBlock title="What Was Wrong" body={pitch.postMortem.whatWasWrong || 'Not completed'} />
            <TextBlock title="Process Lesson" body={pitch.postMortem.processLesson || 'Not completed'} />
          </DetailGrid>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function CatalystTable({ catalysts }: { catalysts: Catalyst[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-card text-muted-foreground">
          <tr>
            <th className="p-3 text-left">Date</th>
            <th className="p-3 text-left">Type</th>
            <th className="p-3 text-left">Catalyst</th>
            <th className="p-3 text-left">Impact</th>
            <th className="p-3 text-left">Importance</th>
          </tr>
        </thead>
        <tbody>
          {catalysts.map(catalyst => (
            <tr key={catalyst.id} className="border-t border-border">
              <td className="p-3 text-muted-foreground">{catalyst.date}</td>
              <td className="p-3 text-muted-foreground">{catalyst.type}</td>
              <td className="p-3 font-semibold">{catalyst.title}</td>
              <td className="p-3 text-muted-foreground">{catalyst.expectedImpact}</td>
              <td className="p-3"><Badge variant="outline">{catalyst.importance}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LineItemTable({ title, rows }: { title: string; rows: ModelLineItem[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="border-b border-border bg-card p-3">
        <p className="font-mono text-sm font-semibold">{title}</p>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead className="text-muted-foreground">
          <tr>
            <th className="p-3 text-left">Metric</th>
            <th className="p-3 text-left">Current</th>
            <th className="p-3 text-left">Base</th>
            <th className="p-3 text-left">Bull</th>
            <th className="p-3 text-left">Bear</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.label} className="border-t border-border">
              <td className="p-3 font-semibold">{row.label}</td>
              <td className="p-3 text-muted-foreground">{row.current}</td>
              <td className="p-3 text-muted-foreground">{row.baseCase}</td>
              <td className="p-3 text-muted-foreground">{row.bullCase}</td>
              <td className="p-3 text-muted-foreground">{row.bearCase}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EmptyPitch() {
  return (
    <Card className="rounded-md border-border bg-card shadow-none">
      <CardContent className="p-8 text-center">
        <p className="font-mono text-sm font-semibold">No pitch selected</p>
        <p className="mt-2 text-sm text-muted-foreground">Create a StockPitch or seed the HOOD template.</p>
      </CardContent>
    </Card>
  )
}

function writeHeaders(token: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (token.trim()) headers['x-pitch-editor-token'] = token.trim()
  return headers
}

function hydratePitchRecord(record: StockPitchRecord, sourceSnapshot: PitchSourceSnapshot | undefined): StockPitchRecord {
  return { ...record, pitch: hydratePitch(record.pitch, sourceSnapshot) }
}

function hydratePitch(pitch: StockPitch, sourceSnapshot: PitchSourceSnapshot | undefined): StockPitch {
  const normalized = normalizePitchForClient(pitch)
  if (!sourceSnapshot || sourceSnapshot.ticker !== normalized.setup.ticker) return normalized
  const price = pitch.priceProvenance ?? sourceSnapshot.price ?? undefined
  const directNews = sourceSnapshot.newsTape
  const staleCatalyst = directNews.length === 0 && staleCatalystText(JSON.stringify(normalized))
  return {
    ...normalized,
    setup: {
      ...normalized.setup,
      currentPrice: price?.price ?? normalized.setup.currentPrice,
      primaryCatalyst: staleCatalyst ? 'No direct catalyst passed relevance filter; broad theme headlines remain context only.' : normalized.setup.primaryCatalyst
    },
    variantView: staleCatalyst ? {
      ...normalized.variantView,
      marketBelieves: removeStaleCatalystText(normalized.variantView.marketBelieves),
      whyNow: removeStaleCatalystText(normalized.variantView.whyNow),
      debate: removeStaleCatalystText(normalized.variantView.debate)
    } : normalized.variantView,
    catalysts: staleCatalyst ? [{
      id: 'no-direct-catalyst',
      type: 'other',
      date: sourceSnapshot.reportAsOf,
      title: 'No direct catalyst passed relevance filter',
      expectedImpact: 'Broad theme headlines are context only until linked directly to this ticker by source.',
      importance: 'medium'
    }] : normalized.catalysts,
    sourceSnapshot,
    newsTape: directNews,
    priceProvenance: price
  }
}

function normalizePitchForClient(pitch: StockPitch): StockPitch {
  const evidenceDrivers: PitchEvidenceDriver[] = Array.isArray(pitch.evidenceDrivers) && pitch.evidenceDrivers.length
    ? pitch.evidenceDrivers.slice(0, 3)
    : [
      { driver: 'Variant thesis', claim: '', sourceStatus: 'unavailable' as const, evidence: '', sourceUrl: null, whyItMatters: '' },
      { driver: 'Price/flow confirmation', claim: '', sourceStatus: 'unavailable' as const, evidence: '', sourceUrl: null, whyItMatters: '' },
      { driver: 'Catalyst', claim: '', sourceStatus: 'unavailable' as const, evidence: '', sourceUrl: null, whyItMatters: '' }
    ]
  while (evidenceDrivers.length < 3) {
    evidenceDrivers.push({ driver: `Driver ${evidenceDrivers.length + 1}`, claim: '', sourceStatus: 'unavailable', evidence: '', sourceUrl: null, whyItMatters: '' })
  }
  const normalized = {
    ...pitch,
    thesis: pitch.thesis || pitch.setup.oneLineThesis,
    evidenceDrivers,
    sourceEvidence: Array.isArray(pitch.sourceEvidence) ? pitch.sourceEvidence : [],
    readiness: pitch.readiness ?? { canPromote: false, missing: [], sourceScore: 0 }
  }
  return {
    ...normalized,
    readiness: clientPitchReadiness(normalized)
  }
}

function isSeedPitch(pitch: StockPitch) {
  return pitch.id === 'hood-positioning-driven-catalyst-memo'
}

function clientPitchReadiness(pitch: StockPitch) {
  const missing = [
    !pitch.thesis.trim() ? 'thesis' : null,
    ...pitch.evidenceDrivers.flatMap((driver, index) => [
      !driver.claim.trim() ? `driver ${index + 1} claim` : null,
      !driver.evidence.trim() ? `driver ${index + 1} evidence` : null,
      driver.sourceStatus === 'unavailable' ? `driver ${index + 1} source` : null
    ]),
    pitch.setup.currentPrice <= 0 ? 'current price' : null,
    !pitch.setup.targetPrice || pitch.setup.targetPrice <= 0 ? 'target price' : null,
    !pitch.setup.downsidePrice || pitch.setup.downsidePrice <= 0 ? 'downside price' : null,
    !pitch.tradeStructure.invalidation.trim() ? 'invalidation' : null
  ].filter((item): item is string => Boolean(item))
  return {
    canPromote: missing.length === 0,
    missing,
    sourceScore: Math.round((pitch.evidenceDrivers.filter(driver => driver.sourceStatus === 'sourced' || driver.sourceStatus === 'derived').length / 3) * 100)
  }
}

function mergeAiScanIntoPitch(pitch: StockPitch, aiScan: AiScanView, sourceSnapshot: PitchSourceSnapshot): StockPitch {
  return {
    ...hydratePitch(pitch, sourceSnapshot),
    aiScan,
    aiScanId: aiScan.id,
    sourceSnapshot,
    newsTape: sourceSnapshot.newsTape,
    priceProvenance: sourceSnapshot.price ?? undefined
  }
}

async function parseApi<T>(response: Response): Promise<T> {
  const json = await response.json() as ApiEnvelope<T>
  if (!response.ok) throw new Error(json.error || `Request failed with ${response.status}`)
  if (!json.data) throw new Error('Response missing data envelope.')
  return json.data
}

function replaceAt<T>(rows: T[], index: number, next: T) {
  return rows.map((row, rowIndex) => rowIndex === index ? next : row)
}

function lines(value: string) {
  return value.split('\n').map(line => line.trim()).filter(Boolean)
}

function staleCatalystText(text: string) {
  return /North Korea Capsized Its New Destroyer|Latest catalyst:/i.test(text)
}

function removeStaleCatalystText(text: string) {
  return text
    .replace(/\s*Latest catalyst:[^.]+(?:\.)?/gi, '')
    .replace(/North Korea Capsized Its New Destroyer[^.]+(?:\.)?/gi, 'No direct catalyst passed relevance filter.')
    .trim()
}

function money(value?: number) {
  if (!value || !Number.isFinite(value)) return 'N/A'
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  return `$${value.toFixed(value >= 100 ? 0 : 2)}`
}

function signedMoney(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'N/A'
  const sign = value > 0 ? '+' : ''
  return `${sign}$${Math.abs(value).toFixed(Math.abs(value) >= 100 ? 0 : 2)}`
}

function compactNumber(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'N/A'
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`
  return `${sign}${abs.toFixed(abs >= 100 ? 0 : 1)}`
}

function scoreBarClass(score: number) {
  const color = score >= 75 ? 'bg-primary' : score >= 50 ? 'bg-emerald-300' : score >= 25 ? 'bg-amber-300' : 'bg-destructive'
  return `h-2 rounded-full ${color}`
}

function percent(value?: number) {
  if (value === undefined || value === null || !Number.isFinite(value)) return 'N/A'
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}

function describeError(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error'
}
