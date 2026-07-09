import { cloneElement, isValidElement, useEffect, useId, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { AreaSeries, createChart, LineStyle } from 'lightweight-charts'
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
import type { PricePoint } from '@/types/market'
import { PitchList, ShareActions } from '@/components/pitch/pitch-list'

type ChartPricePoint = Pick<PricePoint, 'date' | 'ticker' | 'price'>

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
        headers: { 'content-type': 'application/json' },
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

function PitchEditor({ pitch, onChange }: { pitch: StockPitch; onChange: (pitch: StockPitch) => void }) {
  const patch = (next: Partial<StockPitch>) => onChange({ ...pitch, ...next })
  const patchSetup = (next: Partial<StockPitch['setup']>) => patch({ setup: { ...pitch.setup, ...next } })
  const patchVariant = (next: Partial<StockPitch['variantView']>) => patch({ variantView: { ...pitch.variantView, ...next } })
  const patchPositioning = (next: Partial<StockPitch['positioning']>) => patch({ positioning: { ...pitch.positioning, ...next } })
  const patchEvidence = (index: number, next: Partial<PitchEvidenceDriver>) => patch({
    evidenceDrivers: pitch.evidenceDrivers.map((driver, itemIndex) => itemIndex === index ? { ...driver, ...next } : driver).slice(0, 3)
  })
  const patchModel = (next: Partial<StockPitch['model']>) => patch({ model: { ...pitch.model, ...next } })
  const patchValuation = (next: Partial<StockPitch['valuation']>) => patch({ valuation: { ...pitch.valuation, ...next } })
  const patchTrade = (next: Partial<StockPitch['tradeStructure']>) => patch({ tradeStructure: { ...pitch.tradeStructure, ...next } })
  const patchRed = (next: Partial<StockPitch['redTeam']>) => patch({ redTeam: { ...pitch.redTeam, ...next } })
  const patchPost = (next: Partial<StockPitch['postMortem']>) => patch({ postMortem: { ...pitch.postMortem, ...next } })

  return (
    <Tabs defaultValue="setup" className="min-w-0">
      <TabsList className="mb-3 flex-wrap">
        {pitchTabIds.map(tab => <TabsTrigger key={tab.id} value={tab.id}>{tab.label}</TabsTrigger>)}
      </TabsList>

      <TabsContent value="setup">
        <EditorPanel title="Setup" kicker="Identity">
          <EditorGrid>
            <TextInput label="Ticker" value={pitch.setup.ticker} onChange={value => patchSetup({ ticker: value.toUpperCase() })} />
            <TextInput label="Company" value={pitch.setup.companyName} onChange={value => patchSetup({ companyName: value })} />
            <TextInput label="Date" value={pitch.setup.date} onChange={value => patchSetup({ date: value })} />
            <TextInput label="Analyst" value={pitch.setup.analyst} onChange={value => patchSetup({ analyst: value })} />
            <Field label="Recommendation">
              <Select value={pitch.setup.recommendation} onValueChange={value => patchSetup({ recommendation: value as PitchRecommendation })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{recommendationOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <TextInput label="Sector" value={pitch.setup.sector} onChange={value => patchSetup({ sector: value })} />
            <TextInput label="Industry" value={pitch.setup.industry ?? ''} onChange={value => patchSetup({ industry: value })} />
            <TextInput label="Time Horizon" value={pitch.setup.timeHorizon} onChange={value => patchSetup({ timeHorizon: value })} />
            <NumberInput label="Current Price" value={pitch.setup.currentPrice} onChange={value => patchSetup({ currentPrice: value })} />
            <NumberInput label="Market Cap" value={pitch.setup.marketCap} onChange={value => patchSetup({ marketCap: value })} />
            <NumberInput label="Target Price" value={pitch.setup.targetPrice} onChange={value => patchSetup({ targetPrice: value })} />
            <NumberInput label="Downside Price" value={pitch.setup.downsidePrice} onChange={value => patchSetup({ downsidePrice: value })} />
            <NumberInput label="Expected Return %" value={pitch.setup.expectedReturn} onChange={value => patchSetup({ expectedReturn: value })} />
          </EditorGrid>
          <TextareaInput label="Thesis" value={pitch.thesis} onChange={value => patch({ thesis: value })} />
          <TextareaInput label="One-Line Thesis" value={pitch.setup.oneLineThesis} onChange={value => patchSetup({ oneLineThesis: value })} />
          <TextareaInput label="Primary Catalyst" value={pitch.setup.primaryCatalyst} onChange={value => patchSetup({ primaryCatalyst: value })} />
          <EvidenceDriverEditor drivers={pitch.evidenceDrivers} onChange={patchEvidence} />
        </EditorPanel>
      </TabsContent>

      <TabsContent value="variant-view">
        <EditorPanel title="Variant View" kicker="Debate">
          <EditorGrid>
            <TextareaInput label="Market Believes" value={pitch.variantView.marketBelieves} onChange={value => patchVariant({ marketBelieves: value })} />
            <TextareaInput label="My View" value={pitch.variantView.myView} onChange={value => patchVariant({ myView: value })} />
            <TextareaInput label="Why Now" value={pitch.variantView.whyNow} onChange={value => patchVariant({ whyNow: value })} />
            <TextareaInput label="Debate" value={pitch.variantView.debate} onChange={value => patchVariant({ debate: value })} />
            <TextareaInput label="Mispricing" value={pitch.variantView.mispricing} onChange={value => patchVariant({ mispricing: value })} />
          </EditorGrid>
        </EditorPanel>
      </TabsContent>

      <TabsContent value="positioning">
        <EditorPanel title="Positioning" kicker="Options / short / RS">
          <EditorGrid>
            <NumberInput label="Call Volume" value={pitch.positioning.callVolume} onChange={value => patchPositioning({ callVolume: value })} />
            <NumberInput label="Put Volume" value={pitch.positioning.putVolume} onChange={value => patchPositioning({ putVolume: value })} />
            <NumberInput label="Call/Put Ratio" value={pitch.positioning.callPutRatio} onChange={value => patchPositioning({ callPutRatio: value })} />
            <NumberInput label="IV" value={pitch.positioning.impliedVolatility} onChange={value => patchPositioning({ impliedVolatility: value })} />
            <NumberInput label="IV Rank" value={pitch.positioning.ivRank} onChange={value => patchPositioning({ ivRank: value })} />
            <TextInput label="Skew" value={pitch.positioning.skew ?? ''} onChange={value => patchPositioning({ skew: value })} />
            <NumberInput label="Key Call Wall" value={pitch.positioning.keyCallWall} onChange={value => patchPositioning({ keyCallWall: value })} />
            <NumberInput label="Key Put Wall" value={pitch.positioning.keyPutWall} onChange={value => patchPositioning({ keyPutWall: value })} />
            <NumberInput label="Short Interest % Float" value={pitch.positioning.shortInterestPercentFloat} onChange={value => patchPositioning({ shortInterestPercentFloat: value })} />
            <NumberInput label="Days To Cover" value={pitch.positioning.daysToCover} onChange={value => patchPositioning({ daysToCover: value })} />
            <NumberInput label="Borrow Cost" value={pitch.positioning.borrowCost} onChange={value => patchPositioning({ borrowCost: value })} />
          </EditorGrid>
          <EditorGrid>
            <TextareaInput label="GEX Summary" value={pitch.positioning.gammaExposureSummary ?? ''} onChange={value => patchPositioning({ gammaExposureSummary: value })} />
            <TextareaInput label="Open Interest Summary" value={pitch.positioning.openInterestSummary ?? ''} onChange={value => patchPositioning({ openInterestSummary: value })} />
            <TextareaInput label="Relative Strength Summary" value={pitch.positioning.relativeStrengthSummary} onChange={value => patchPositioning({ relativeStrengthSummary: value })} />
            <TextareaInput label="Conclusion" value={pitch.positioning.positioningConclusion} onChange={value => patchPositioning({ positioningConclusion: value })} />
          </EditorGrid>
        </EditorPanel>
      </TabsContent>

      <TabsContent value="catalysts">
        <CatalystEditor
          catalysts={pitch.catalysts}
          onChange={catalysts => patch({ catalysts })}
        />
      </TabsContent>

      <TabsContent value="model">
        <EditorPanel title="Model" kicker="KPI build">
          <TextareaInput label="Revenue Drivers" value={pitch.model.revenueDrivers.join('\n')} onChange={value => patchModel({ revenueDrivers: lines(value) })} />
          <EditorGrid>
            <TextareaInput label="Most Important Driver" value={pitch.model.mostImportantDriver} onChange={value => patchModel({ mostImportantDriver: value })} />
            <TextareaInput label="Model Conclusion" value={pitch.model.modelConclusion} onChange={value => patchModel({ modelConclusion: value })} />
          </EditorGrid>
          <LineItemEditor title="Key KPIs" rows={pitch.model.keyKpis} onChange={rows => patchModel({ keyKpis: rows })} />
          <LineItemEditor title="Margin Assumptions" rows={pitch.model.marginAssumptions} onChange={rows => patchModel({ marginAssumptions: rows })} />
          <LineItemEditor title="EPS / FCF Assumptions" rows={pitch.model.epsFcfAssumptions} onChange={rows => patchModel({ epsFcfAssumptions: rows })} />
        </EditorPanel>
      </TabsContent>

      <TabsContent value="valuation">
        <EditorPanel title="Valuation" kicker="Scenario map">
          <EditorGrid>
            <TextareaInput label="Primary Method" value={pitch.valuation.primaryMethod} onChange={value => patchValuation({ primaryMethod: value })} />
            <TextareaInput label="Conclusion" value={pitch.valuation.valuationConclusion} onChange={value => patchValuation({ valuationConclusion: value })} />
          </EditorGrid>
          <TextareaInput label="Peer Set" value={pitch.valuation.peerSet.join('\n')} onChange={value => patchValuation({ peerSet: lines(value) })} />
          <div className="grid gap-3 md:grid-cols-3">
            {pitch.valuation.scenarios.map((scenario, index) => (
              <Card key={scenario.name} className="rounded-md border-border bg-background/45 shadow-none">
                <CardHeader className="pb-2"><CardTitle className="font-mono text-sm">{scenario.name}</CardTitle></CardHeader>
                <CardContent className="grid gap-2">
                  <NumberInput label="Price Target" value={scenario.priceTarget} onChange={value => patchValuation({ scenarios: replaceAt(pitch.valuation.scenarios, index, { ...scenario, priceTarget: value ?? 0 }) })} />
                  <NumberInput label="Implied Return %" value={scenario.impliedReturn} onChange={value => patchValuation({ scenarios: replaceAt(pitch.valuation.scenarios, index, { ...scenario, impliedReturn: value ?? 0 }) })} />
                  <TextInput label="Method" value={scenario.method} onChange={value => patchValuation({ scenarios: replaceAt(pitch.valuation.scenarios, index, { ...scenario, method: value }) })} />
                  <TextareaInput label="Assumptions" value={scenario.assumptions.join('\n')} onChange={value => patchValuation({ scenarios: replaceAt(pitch.valuation.scenarios, index, { ...scenario, assumptions: lines(value) }) })} />
                </CardContent>
              </Card>
            ))}
          </div>
        </EditorPanel>
      </TabsContent>

      <TabsContent value="trade-structure">
        <EditorPanel title="Trade Structure" kicker="Expression">
          <EditorGrid>
            <Field label="Preferred Expression">
              <Select value={pitch.tradeStructure.preferredExpression} onValueChange={value => patchTrade({ preferredExpression: value as TradeExpression })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{expressionOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Sizing">
              <Select value={pitch.tradeStructure.sizing} onValueChange={value => patchTrade({ sizing: value as 'small' | 'medium' | 'large' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['small', 'medium', 'large'].map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <TextInput label="Time Horizon" value={pitch.tradeStructure.timeHorizon} onChange={value => patchTrade({ timeHorizon: value })} />
            <NumberInput label="Stop Level" value={pitch.tradeStructure.stopLevel} onChange={value => patchTrade({ stopLevel: value })} />
            <NumberInput label="Take Profit Level" value={pitch.tradeStructure.takeProfitLevel} onChange={value => patchTrade({ takeProfitLevel: value })} />
          </EditorGrid>
          <EditorGrid>
            <TextareaInput label="Entry Trigger" value={pitch.tradeStructure.entryTrigger} onChange={value => patchTrade({ entryTrigger: value })} />
            <TextareaInput label="Invalidation" value={pitch.tradeStructure.invalidation} onChange={value => patchTrade({ invalidation: value })} />
            <TextareaInput label="Risk / Reward" value={pitch.tradeStructure.riskReward} onChange={value => patchTrade({ riskReward: value })} />
            <TextareaInput label="Why This Expression" value={pitch.tradeStructure.whyThisExpression} onChange={value => patchTrade({ whyThisExpression: value })} />
          </EditorGrid>
        </EditorPanel>
      </TabsContent>

      <TabsContent value="red-team">
        <EditorPanel title="Red Team" kicker="Falsification">
          <EditorGrid>
            <TextareaInput label="Bear Case" value={pitch.redTeam.bearCase} onChange={value => patchRed({ bearCase: value })} />
            <TextareaInput label="Strongest Counterargument" value={pitch.redTeam.strongestCounterargument} onChange={value => patchRed({ strongestCounterargument: value })} />
            <TextareaInput label="What Would Make Me Wrong" value={pitch.redTeam.whatWouldMakeMeWrong} onChange={value => patchRed({ whatWouldMakeMeWrong: value })} />
            <TextareaInput label="Data To Monitor" value={pitch.redTeam.dataToMonitor.join('\n')} onChange={value => patchRed({ dataToMonitor: lines(value) })} />
          </EditorGrid>
        </EditorPanel>
      </TabsContent>

      <TabsContent value="post-mortem">
        <EditorPanel title="Post-Mortem" kicker="After action">
          <EditorGrid>
            <Field label="Status">
              <Select value={pitch.postMortem.status} onValueChange={value => patchPost({ status: value as 'not-started' | 'open' | 'closed' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['not-started', 'open', 'closed'].map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <TextInput label="Entry Date" value={pitch.postMortem.entryDate ?? ''} onChange={value => patchPost({ entryDate: value })} />
            <TextInput label="Exit Date" value={pitch.postMortem.exitDate ?? ''} onChange={value => patchPost({ exitDate: value })} />
            <NumberInput label="Entry Price" value={pitch.postMortem.entryPrice} onChange={value => patchPost({ entryPrice: value })} />
            <NumberInput label="Exit Price" value={pitch.postMortem.exitPrice} onChange={value => patchPost({ exitPrice: value })} />
            <NumberInput label="Realized Return %" value={pitch.postMortem.realizedReturn} onChange={value => patchPost({ realizedReturn: value })} />
          </EditorGrid>
          <EditorGrid>
            <TextareaInput label="What Was Right" value={pitch.postMortem.whatWasRight ?? ''} onChange={value => patchPost({ whatWasRight: value })} />
            <TextareaInput label="What Was Wrong" value={pitch.postMortem.whatWasWrong ?? ''} onChange={value => patchPost({ whatWasWrong: value })} />
            <TextareaInput label="Process Lesson" value={pitch.postMortem.processLesson ?? ''} onChange={value => patchPost({ processLesson: value })} />
          </EditorGrid>
        </EditorPanel>
      </TabsContent>
    </Tabs>
  )
}

function EvidenceDriverEditor({
  drivers,
  onChange
}: {
  drivers: PitchEvidenceDriver[]
  onChange: (index: number, patch: Partial<PitchEvidenceDriver>) => void
}) {
  return (
    <div className="grid gap-3">
      <div>
        <p className="font-mono text-sm font-semibold">Three evidence drivers</p>
        <p className="mt-1 text-xs text-muted-foreground">Exactly three. No fourth driver; cut weaker evidence.</p>
      </div>
      <div className="grid gap-3">
        {drivers.slice(0, 3).map((driver, index) => (
          <Card key={index} className="rounded-md border-border bg-background/45 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="font-mono text-sm">Driver {index + 1}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <EditorGrid>
                <TextInput label="Driver" value={driver.driver} onChange={value => onChange(index, { driver: value })} />
                <Field label="Source status">
                  <Select value={driver.sourceStatus} onValueChange={value => onChange(index, { sourceStatus: value as PitchSourceQuality })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{sourceQualityOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <TextInput label="Source URL" value={driver.sourceUrl ?? ''} onChange={value => onChange(index, { sourceUrl: value || null })} />
              </EditorGrid>
              <EditorGrid>
                <TextareaInput label="Claim" value={driver.claim} onChange={value => onChange(index, { claim: value })} />
                <TextareaInput label="Evidence" value={driver.evidence} onChange={value => onChange(index, { evidence: value })} />
                <TextareaInput label="Why it matters" value={driver.whyItMatters} onChange={value => onChange(index, { whyItMatters: value })} />
              </EditorGrid>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function SourceEvidencePanel({ pitch }: { pitch: StockPitch }) {
  const items = pitch.sourceEvidence.length ? pitch.sourceEvidence : []
  return (
    <Panel title="Source Evidence" kicker={`${items.length} rows`}>
      <div className="grid gap-2">
        {items.length ? items.slice(0, 8).map(item => (
          <div key={`${item.label}-${item.asOfDate ?? ''}`} className="rounded-md border border-border bg-background/45 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="font-mono text-xs font-semibold">{item.label}</p>
              <Badge variant={item.sourceStatus === 'sourced' || item.sourceStatus === 'derived' ? 'secondary' : 'outline'} className="font-mono">{item.sourceStatus}</Badge>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.detail || item.source}</p>
            {item.url ? <a href={item.url} target="_blank" rel="noreferrer" className="mt-2 block truncate font-mono text-[0.68rem] text-primary">{item.url}</a> : null}
          </div>
        )) : (
          <p className="text-sm leading-6 text-muted-foreground">No source evidence rows attached. Refresh sourced pitch context before PM review.</p>
        )}
      </div>
    </Panel>
  )
}

function PitchSourceTabs({ pitch, prices }: { pitch: StockPitch; prices: ChartPricePoint[] }) {
  const battlefield = pitch.sourceSnapshot?.optionsBattlefield
  const dayMap = pitch.sourceSnapshot?.dayMap
  const confidence = pitch.sourceSnapshot?.targetConfidence
  return (
    <Panel title={`${pitch.setup.ticker} Target Workbench`} kicker={battlefield ? `${battlefield.sourceLabel} / ${dayMap?.sourceLabel ?? 'day map pending'}` : 'Source-conditioned'}>
      <Tabs defaultValue="scenario" className="min-w-0">
        <TabsList className="mb-3 flex-wrap">
          <TabsTrigger value="scenario">Scenario</TabsTrigger>
          <TabsTrigger value="battlefield">Options Battlefield</TabsTrigger>
          <TabsTrigger value="day-map">Day Map</TabsTrigger>
          <TabsTrigger value="confidence">Confidence</TabsTrigger>
        </TabsList>
        <TabsContent value="scenario">
          <PitchTargetChart pitch={pitch} prices={prices} />
        </TabsContent>
        <TabsContent value="battlefield">
          <OptionsBattlefieldPanel battlefield={battlefield} />
        </TabsContent>
        <TabsContent value="day-map">
          <DayMapPanel dayMap={dayMap} />
        </TabsContent>
        <TabsContent value="confidence">
          <TargetConfidencePanel confidence={confidence} />
        </TabsContent>
      </Tabs>
    </Panel>
  )
}

function OptionsBattlefieldPanel({ battlefield }: { battlefield?: OptionsBattlefieldView }) {
  if (!battlefield) {
    return <p className="text-sm leading-6 text-muted-foreground">No options battlefield attached. Run positioning ingest for this ticker.</p>
  }
  const maxMagnet = Math.max(1, ...battlefield.strikes.map(strike => strike.magnetScore ?? 0))
  const visibleStrikes = [...battlefield.strikes]
    .sort((a, b) => (b.magnetScore ?? 0) - (a.magnetScore ?? 0))
    .slice(0, 28)
  return (
    <div className="grid gap-3">
      <div className="grid gap-2 md:grid-cols-5">
        <MetricMini label="Source" value={battlefield.sourceLabel} />
        <MetricMini label="Call Wall" value={money(battlefield.callWall ?? undefined)} />
        <MetricMini label="Put Wall" value={money(battlefield.putWall ?? undefined)} />
        <MetricMini label="Zero Gamma" value={money(battlefield.zeroGamma ?? undefined)} />
        <MetricMini label="Exp Move" value={money(battlefield.expectedMove ?? undefined)} />
      </div>
      <div className="grid gap-3 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="overflow-hidden rounded-md border border-border">
          <div className="grid grid-cols-[0.9fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-2 border-b border-border bg-card p-2 font-mono text-[0.65rem] uppercase text-muted-foreground">
            <span>Strike</span>
            <span>Call Vol</span>
            <span>Put Vol</span>
            <span>GEX / Proxy</span>
            <span>Magnet</span>
          </div>
          <div className="max-h-[420px] overflow-auto">
            {visibleStrikes.length ? visibleStrikes.map(strike => (
              <BattlefieldStrikeRow key={`${strike.expirationDate}-${strike.strikePrice}`} strike={strike} maxMagnet={maxMagnet} />
            )) : (
              <p className="p-4 text-sm text-muted-foreground">No strike-level rows. Snapshot entitlement may be missing or ingest has not run.</p>
            )}
          </div>
        </div>
        <div className="grid gap-3">
          <TextBlock title="Read" body={battlefield.mode === 'true-gex'
            ? `True GEX view. Pressure is ${battlefield.pressureDirection}; walls and zero-gamma come from sourced OI/IV/Greeks.`
            : battlefield.mode === 'proxy'
              ? `Options Proxy view. Strike heat uses Massive Basic contract/aggregate samples. Good for interest, not dealer gamma.`
              : 'Plan locked. No true options wall or IV expected move yet.'}
          />
          <div className="rounded-md border border-border bg-background/45 p-3">
            <p className="font-mono text-[0.65rem] uppercase text-muted-foreground">Expiry Clusters</p>
            <div className="mt-2 grid gap-2">
              {battlefield.expiryClusters.length ? battlefield.expiryClusters.slice(0, 6).map(cluster => (
                <div key={cluster.expirationDate} className="rounded-md border border-border bg-card p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-xs font-semibold">{cluster.expirationDate}</p>
                    <Badge variant="outline" className="font-mono">{cluster.sourceQuality}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Vol {compactNumber(cluster.totalVolume)} / OI {compactNumber(cluster.openInterest)} / EM {money(cluster.expectedMove ?? undefined)}</p>
                </div>
              )) : <p className="text-sm text-muted-foreground">No expiry clusters.</p>}
            </div>
          </div>
          {battlefield.gaps.length ? <ListBlock title="Battlefield Limits" items={battlefield.gaps} /> : null}
        </div>
      </div>
    </div>
  )
}

function BattlefieldStrikeRow({ strike, maxMagnet }: { strike: OptionsStrikeSignalView; maxMagnet: number }) {
  const magnetPct = Math.max(4, ((strike.magnetScore ?? 0) / maxMagnet) * 100)
  const gex = strike.gammaExposure ?? strike.gammaProxy
  return (
    <div className="relative grid grid-cols-[0.9fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-2 border-b border-border/70 p-2 text-xs last:border-b-0">
      <div
        aria-hidden="true"
        className="absolute inset-y-1 left-1 rounded-sm bg-primary/15"
        style={{ width: `${magnetPct}%` }}
      />
      <p className="relative font-mono font-semibold">{money(strike.strikePrice)} <span className="text-muted-foreground">{strike.expirationDate}</span></p>
      <p className="relative font-mono text-emerald-300">{compactNumber(strike.callVolume)}</p>
      <p className="relative font-mono text-red-300">{compactNumber(strike.putVolume)}</p>
      <p className="relative font-mono text-muted-foreground">{compactNumber(gex)}</p>
      <p className="relative font-mono">{strike.magnetScore === null ? 'N/A' : strike.magnetScore.toFixed(0)}</p>
    </div>
  )
}

function DayMapPanel({ dayMap }: { dayMap?: DayMapView }) {
  if (!dayMap) {
    return <p className="text-sm leading-6 text-muted-foreground">No day map attached. Need DailyPrice rows.</p>
  }
  return (
    <div className="grid gap-3">
      <div className="grid gap-2 md:grid-cols-5">
        <MetricMini label="Source" value={dayMap.sourceLabel} />
        <MetricMini label="Prior High" value={money(dayMap.priorHigh ?? undefined)} />
        <MetricMini label="Prior Low" value={money(dayMap.priorLow ?? undefined)} />
        <MetricMini label="Prior Close" value={money(dayMap.priorClose ?? undefined)} />
        <MetricMini label="ATR20" value={money(dayMap.atr20 ?? undefined)} />
      </div>
      <div className="grid gap-3 xl:grid-cols-[1fr_0.7fr]">
        <div className="grid gap-2 md:grid-cols-2">
          {dayMap.levels.map(level => (
            <div key={`${level.label}-${level.type}`} className="rounded-md border border-border bg-background/45 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-sm font-semibold">{level.label}</p>
                <Badge variant="outline" className="font-mono">{level.type}</Badge>
              </div>
              <p className="mt-2 font-mono text-lg font-semibold">{level.type === 'gap' ? signedMoney(level.price) : money(level.price ?? undefined)}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{level.description}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-3">
          <TextBlock title="Use" body="Daily OHLCV map gives prior levels, ATR bands, gap delta, and volume-shelf proxy. This answers likely fight zones from sourced daily bars, not intraday VWAP." />
          {dayMap.gaps.length ? <ListBlock title="Day Map Limits" items={dayMap.gaps} /> : null}
        </div>
      </div>
    </div>
  )
}

function TargetConfidencePanel({ confidence }: { confidence?: TargetConfidenceView }) {
  if (!confidence) {
    return <p className="text-sm leading-6 text-muted-foreground">No target confidence attached. Create or refresh sourced pitch.</p>
  }
  return (
    <div className="grid gap-3">
      <div className="rounded-md border border-border bg-background/45 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">Target Confidence</p>
            <p className="mt-1 font-mono text-3xl font-semibold">{confidence.score}<span className="text-base text-muted-foreground">/100</span></p>
          </div>
          <Badge variant={confidence.score >= 50 ? 'secondary' : 'outline'} className="font-mono">{confidence.confidenceLabel}</Badge>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div className={scoreBarClass(confidence.score)} style={{ width: `${confidence.score}%` }} />
        </div>
      </div>
      <div className="grid gap-3 xl:grid-cols-3">
        <ListBlock title="Drivers" items={confidence.drivers} />
        <ListBlock title="Blockers" items={confidence.blockers} />
        <ListBlock title="Next Data Needed" items={confidence.nextDataNeeded} />
      </div>
    </div>
  )
}

function PitchTargetChart({ pitch, prices }: { pitch: StockPitch; prices: ChartPricePoint[] }) {
  const chartRef = useRef<HTMLDivElement | null>(null)
  const [range, setRange] = useState<ChartRange>('6M')
  const [levelMode, setLevelMode] = useState<LevelMode>('battlefield')
  const [hover, setHover] = useState<{ time: string; value: number } | null>(null)
  const [renderedRails, setRenderedRails] = useState<RenderedChartRail[]>([])
  const data = useMemo(() => {
    return prices
      .filter(point => point.ticker === pitch.setup.ticker)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(point => ({ time: point.date, value: point.price }))
  }, [prices, pitch.setup.ticker])
  const visibleData = useMemo(() => filterChartRange(data, range), [data, range])
  const levels = useMemo(() => targetLevels(pitch, levelMode), [levelMode, pitch])
  const overlayRails = useMemo(() => chartOverlayRails(pitch, levelMode), [levelMode, pitch])
  const battlefieldRequested = levelMode === 'battlefield' || levelMode === 'all'
  const battlefieldUnavailable = battlefieldRequested && pitch.sourceSnapshot?.optionsBattlefield && !overlayRails.some(rail => rail.group === 'battlefield')

  useEffect(() => {
    if (!chartRef.current || visibleData.length === 0) return
    const element = chartRef.current
    let active = true
    const chart = createChart(element, {
      width: element.clientWidth,
      height: element.clientHeight,
      layout: { background: { color: 'transparent' }, textColor: 'rgba(255,255,255,0.66)' },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.06)' },
        horzLines: { color: 'rgba(255,255,255,0.08)' }
      },
      crosshair: {
        vertLine: { color: 'rgba(116,242,206,0.45)', labelBackgroundColor: '#1f6f69' },
        horzLine: { color: 'rgba(116,242,206,0.35)', labelBackgroundColor: '#1f6f69' }
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, rightOffset: 6 }
    })
    const series = chart.addSeries(AreaSeries, {
      lineColor: '#50d2c1',
      topColor: 'rgba(80, 210, 193, 0.24)',
      bottomColor: 'rgba(80, 210, 193, 0.02)',
      lineWidth: 2,
      priceLineVisible: false
    })
    series.setData(visibleData as never)
    function updateRenderedRails() {
      if (!active) return
      const height = element.clientHeight
      const rails = overlayRails.flatMap(rail => {
        const y = series.priceToCoordinate(rail.price)
        if (y === null || y < -12 || y > height + 12) return []
        return [{
          ...rail,
          y: Math.max(0, Math.min(height, y)),
          labelOffset: 0
        }]
      })
      setRenderedRails(assignRailLabelOffsets(rails))
    }
    for (const level of levels) {
      series.createPriceLine({
        price: level.price,
        color: level.color,
        lineWidth: 1,
        lineStyle: level.style,
        axisLabelVisible: true,
        title: level.label
      })
    }
    chart.subscribeCrosshairMove(param => {
      if (!param.time) {
        setHover(null)
        return
      }
      const point = param.seriesData.get(series) as { value?: number } | undefined
      if (typeof point?.value === 'number') setHover({ time: String(param.time), value: point.value })
    })
    chart.timeScale().fitContent()
    requestAnimationFrame(updateRenderedRails)
    const resize = new ResizeObserver(entries => {
      const entry = entries[0]
      if (!entry) return
      chart.applyOptions({
        width: Math.max(1, Math.floor(entry.contentRect.width)),
        height: Math.max(1, Math.floor(entry.contentRect.height))
      })
      requestAnimationFrame(updateRenderedRails)
    })
    resize.observe(element)
    return () => {
      active = false
      resize.disconnect()
      chart.remove()
      setRenderedRails([])
    }
  }, [levels, overlayRails, visibleData])

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {chartRanges.map(option => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={range === option ? 'secondary' : 'outline'}
              onClick={() => setRange(option)}
              className="h-8 px-2 font-mono text-xs"
            >
              {option}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {levelModes.map(option => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={levelMode === option ? 'secondary' : 'outline'}
              onClick={() => setLevelMode(option)}
              className="h-8 px-2 font-mono text-xs capitalize"
            >
              {option}
            </Button>
          ))}
        </div>
      </div>
      <div className="relative h-[520px] min-h-[420px] w-full overflow-hidden rounded-md border border-border bg-background/35">
        {visibleData.length === 0 ? (
          <div className="absolute inset-0 z-10 grid place-items-center">
            <p className="font-mono text-sm text-muted-foreground">No sourced price series or current price.</p>
          </div>
        ) : null}
        <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-md border border-border bg-card/90 px-3 py-2 backdrop-blur">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">Crosshair</p>
          <p className="mt-1 font-mono text-sm font-semibold">{hover ? `${hover.time} / ${money(hover.value)}` : `${pitch.setup.date} / ${money(pitch.setup.currentPrice)}`}</p>
        </div>
        {battlefieldUnavailable ? (
          <div className="pointer-events-none absolute right-20 top-3 z-10 max-w-[320px] rounded-md border border-amber-300/35 bg-card/90 px-3 py-2 backdrop-blur">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-amber-200">No verified battlefield rails</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">No option strike rows from Massive proxy or true snapshot yet. Scenario targets are not used as battlefield levels.</p>
          </div>
        ) : null}
        <div ref={chartRef} className="h-full w-full" />
        <div className="pointer-events-none absolute inset-y-0 left-0 right-16 z-10">
          {renderedRails.map(rail => (
            <div
              key={rail.id}
              className="absolute left-0 right-0"
              style={{ top: rail.y, transform: 'translateY(-50%)' }}
            >
              <div
                className="absolute left-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full"
                style={{
                  width: `${rail.lineWidthPct}%`,
                  background: rail.lineGradient,
                  boxShadow: `0 0 18px ${rail.glowColor}`
                }}
              />
              <span
                className="absolute left-3 top-1/2 max-w-[136px] truncate rounded border px-2 py-0.5 font-mono text-[0.58rem] uppercase tracking-[0.1em] shadow-sm backdrop-blur"
                style={{
                  backgroundColor: rail.labelBackground,
                  borderColor: rail.borderColor,
                  color: rail.textColor,
                  transform: `translateY(calc(-50% + ${rail.labelOffset}px))`
                }}
              >
                {rail.label}
              </span>
              <div
                className="absolute right-4 top-1/2 flex h-2 w-[118px] -translate-y-1/2 overflow-hidden rounded-full border bg-background/80 shadow-[0_0_14px_rgba(0,0,0,0.3)] backdrop-blur"
                style={{ borderColor: rail.borderColor }}
                aria-label={`${rail.label} volume stack`}
              >
                {rail.segments.map(segment => (
                  <div
                    key={`${rail.id}-${segment.label}`}
                    title={`${segment.label}: ${compactNumber(segment.value)}`}
                    style={{ width: `${segment.widthPct}%`, background: segment.color }}
                    className="min-w-[3px]"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <TargetLevelDeck levels={levels} currentPrice={pitch.setup.currentPrice} />
    </div>
  )
}

const chartRanges = ['1M', '3M', '6M', 'ALL'] as const
type ChartRange = typeof chartRanges[number]
const levelModes = ['scenario', 'battlefield', 'day', 'risk', 'all'] as const
type LevelMode = typeof levelModes[number]

type TargetLevel = {
  label: string
  price: number
  color: string
  style: LineStyle
  group: LevelMode
}

type CandidateTargetLevel = Omit<TargetLevel, 'price'> & {
  price?: number | null
}

type ChartRailSegment = {
  label: string
  value: number | null
  color: string
  widthPct: number
}

type ChartOverlayRail = {
  id: string
  label: string
  price: number
  lineWidthPct: number
  lineGradient: string
  glowColor: string
  borderColor: string
  labelBackground: string
  textColor: string
  stackLabel: string
  segments: ChartRailSegment[]
  group: LevelMode
}

type RenderedChartRail = ChartOverlayRail & {
  y: number
  labelOffset: number
}

function assignRailLabelOffsets(rails: RenderedChartRail[]): RenderedChartRail[] {
  const offsets = [0, -18, 18, -34, 34, -50, 50]
  const placed: RenderedChartRail[] = []
  for (const rail of [...rails].sort((a, b) => a.y - b.y)) {
    const labelOffset = offsets.find(offset => {
      const y = rail.y + offset
      return placed.every(row => Math.abs((row.y + row.labelOffset) - y) >= 15)
    }) ?? 0
    placed.push({ ...rail, labelOffset })
  }
  return placed
}

function targetLevels(pitch: StockPitch, mode: LevelMode): TargetLevel[] {
  const scenarioColors: Record<string, string> = { bear: '#ff7777', base: '#e5e7eb', bull: '#50d2c1' }
  const levels: CandidateTargetLevel[] = [
    { label: 'Current', price: pitch.setup.currentPrice, color: '#ffffff', style: LineStyle.Solid, group: 'all' as const },
    { label: 'Base Target', price: pitch.setup.targetPrice, color: '#50d2c1', style: LineStyle.Dashed, group: 'scenario' },
    { label: 'Downside', price: pitch.setup.downsidePrice, color: '#ff7777', style: LineStyle.Dotted, group: 'risk' },
    { label: 'Stop', price: pitch.tradeStructure.stopLevel, color: '#ff9f43', style: LineStyle.Dotted, group: 'risk' },
    { label: 'Take Profit', price: pitch.tradeStructure.takeProfitLevel, color: '#74f2ce', style: LineStyle.Dashed, group: 'risk' },
    ...pitch.valuation.scenarios.map(scenario => ({
      label: scenario.name,
      price: scenario.priceTarget,
      color: scenarioColors[scenario.name],
      style: LineStyle.Dashed,
      group: 'scenario' as const
    }))
  ]
  const seen = new Set<string>()
  return levels.filter((level): level is TargetLevel => {
    if (!level.price || level.price <= 0) return false
    if (mode !== 'all' && level.group !== mode && level.label !== 'Current') return false
    const key = `${level.label}-${level.price}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function chartOverlayRails(pitch: StockPitch, mode: LevelMode): ChartOverlayRail[] {
  const current = pitch.setup.currentPrice
  const battlefield = pitch.sourceSnapshot?.optionsBattlefield
  const dayMap = pitch.sourceSnapshot?.dayMap
  const rails: ChartOverlayRail[] = []
  if ((mode === 'battlefield' || mode === 'all') && battlefield) {
    if (battlefield.strikes.length && battlefield.expectedMove && current > 0) {
      rails.push(chartRail({
        id: 'expected-move-high',
        label: 'EM High',
        price: current + battlefield.expectedMove,
        group: 'battlefield',
        color: '#f4d35e',
        widthPct: 76,
        stackLabel: 'iv range',
        segments: singleSegment('em', battlefield.expectedMove, '#f4d35e')
      }))
      rails.push(chartRail({
        id: 'expected-move-low',
        label: 'EM Low',
        price: current - battlefield.expectedMove,
        group: 'battlefield',
        color: '#f4d35e',
        widthPct: 76,
        stackLabel: 'iv range',
        segments: singleSegment('em', battlefield.expectedMove, '#f4d35e')
      }))
    }
    if (battlefield.strikes.length) {
      const byStrike = new Map(battlefield.strikes.map(strike => [strike.strikePrice, strike]))
      if (battlefield.callWall) {
        const strike = byStrike.get(battlefield.callWall)
        if (strike) rails.push(optionRail('call-wall', 'Call Wall', battlefield.callWall, strike, 96, '#5eead4'))
      }
      if (battlefield.putWall) {
        const strike = byStrike.get(battlefield.putWall)
        if (strike) rails.push(optionRail('put-wall', 'Put Wall', battlefield.putWall, strike, 96, '#fb7185'))
      }
      const seen = new Set([battlefield.callWall, battlefield.putWall].filter((value): value is number => typeof value === 'number'))
      for (const strike of [...battlefield.strikes].sort((a, b) => (b.magnetScore ?? 0) - (a.magnetScore ?? 0)).slice(0, 4)) {
        if (seen.has(strike.strikePrice)) continue
        seen.add(strike.strikePrice)
        rails.push(optionRail(`magnet-${strike.expirationDate}-${strike.strikePrice}`, `Magnet ${money(strike.strikePrice)}`, strike.strikePrice, strike, Math.max(40, strike.magnetScore ?? 40), '#50d2c1'))
      }
    }
  }
  if ((mode === 'day' || mode === 'all') && dayMap) {
    const dayRails = [
      { id: 'prior-high', label: 'Prior High', price: dayMap.priorHigh, color: '#93c5fd', stack: 'daily high' },
      { id: 'prior-low', label: 'Prior Low', price: dayMap.priorLow, color: '#93c5fd', stack: 'daily low' },
      { id: 'atr-high', label: 'ATR High', price: dayMap.upperAtrBand, color: '#fbbf24', stack: 'atr' },
      { id: 'atr-low', label: 'ATR Low', price: dayMap.lowerAtrBand, color: '#fbbf24', stack: 'atr' },
      { id: 'volume-shelf', label: 'Volume Shelf', price: dayMap.volumeShelf, color: '#c4b5fd', stack: 'vol shelf' }
    ]
    for (const level of dayRails) {
      if (!level.price) continue
      rails.push(chartRail({
        id: level.id,
        label: level.label,
        price: level.price,
        group: 'day',
        color: level.color,
        widthPct: level.id === 'volume-shelf' ? 88 : 66,
        stackLabel: level.stack,
        segments: singleSegment(level.stack, level.price, level.color)
      }))
    }
  }
  return rails.filter(rail => rail.price > 0)
}

function chartRail(input: {
  id: string
  label: string
  price: number
  group: LevelMode
  color: string
  widthPct: number
  stackLabel: string
  segments: ChartRailSegment[]
}): ChartOverlayRail {
  return {
    id: input.id,
    label: input.label,
    price: input.price,
    lineWidthPct: Math.max(28, Math.min(98, input.widthPct)),
    lineGradient: `linear-gradient(90deg, ${input.color} 0%, ${input.color}cc 34%, ${input.color}55 72%, transparent 100%)`,
    glowColor: `${input.color}66`,
    borderColor: `${input.color}88`,
    labelBackground: 'rgba(2, 17, 15, 0.86)',
    textColor: input.color,
    stackLabel: input.stackLabel,
    segments: input.segments.length ? normalizeSegments(input.segments) : singleSegment(input.stackLabel, 1, input.color),
    group: input.group
  }
}

function optionRail(id: string, label: string, price: number, strike: OptionsStrikeSignalView | undefined, widthPct: number, color: string): ChartOverlayRail {
  const segments = optionSegments(strike)
  return chartRail({
    id,
    label,
    price,
    group: 'battlefield',
    color,
    widthPct,
    stackLabel: strike ? compactNumber((strike.callVolume ?? 0) + (strike.putVolume ?? 0) + (strike.openInterest ?? 0) + (strike.gammaProxy ?? 0)) : 'level',
    segments
  })
}

function optionSegments(strike: OptionsStrikeSignalView | undefined): ChartRailSegment[] {
  if (!strike) return singleSegment('level', 1, '#50d2c1')
  const call = Math.max(0, strike.callVolume ?? 0)
  const put = Math.max(0, strike.putVolume ?? 0)
  const oi = Math.max(0, strike.openInterest ?? 0)
  const proxy = Math.max(0, strike.gammaProxy ?? 0)
  const gamma = Math.max(0, Math.abs(strike.gammaExposure ?? 0))
  return normalizeSegments([
    { label: 'call vol', value: call, color: '#34d399', widthPct: 0 },
    { label: 'put vol', value: put, color: '#fb7185', widthPct: 0 },
    { label: 'open interest', value: oi, color: '#60a5fa', widthPct: 0 },
    { label: strike.gammaExposure !== null ? 'gex' : 'proxy', value: gamma || proxy || (strike.magnetScore ?? 0), color: '#f4d35e', widthPct: 0 }
  ])
}

function singleSegment(label: string, value: number | null, color: string): ChartRailSegment[] {
  return [{ label, value, color, widthPct: 100 }]
}

function normalizeSegments(segments: ChartRailSegment[]): ChartRailSegment[] {
  const positives = segments.filter(segment => (segment.value ?? 0) > 0)
  const rows = positives.length ? positives : segments.slice(0, 1)
  const total = rows.reduce((sum, segment) => sum + Math.max(0, segment.value ?? 0), 0)
  if (total <= 0) return rows.map(segment => ({ ...segment, widthPct: 100 / rows.length }))
  return rows.map(segment => ({
    ...segment,
    widthPct: Math.max(4, Math.max(0, segment.value ?? 0) / total * 100)
  }))
}

function filterChartRange(data: { time: string; value: number }[], range: ChartRange) {
  if (range === 'ALL' || data.length <= 1) return data
  const days = range === '1M' ? 31 : range === '3M' ? 93 : 186
  const last = Date.parse(data[data.length - 1]?.time ?? '')
  if (!Number.isFinite(last)) return data
  const cutoff = last - days * 24 * 60 * 60 * 1000
  const filtered = data.filter(point => {
    const time = Date.parse(point.time)
    return Number.isFinite(time) && time >= cutoff
  })
  return filtered.length ? filtered : data
}

function TargetLevelDeck({ levels, currentPrice }: { levels: TargetLevel[]; currentPrice?: number }) {
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
      {levels.map(level => {
        const distance = currentPrice && currentPrice > 0 ? ((level.price / currentPrice) - 1) * 100 : null
        return (
          <div key={`${level.label}-${level.price}`} className="rounded-md border border-border bg-background/45 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: level.color }} />
              <p className="truncate font-mono text-[0.65rem] uppercase text-muted-foreground">{level.group === 'all' ? 'spot' : level.group}</p>
            </div>
            <p className="mt-2 font-mono text-sm font-semibold">{level.label}</p>
            <p className="mt-1 font-mono text-lg font-semibold">{money(level.price)}</p>
            <p className={distance !== null && distance >= 0 ? 'mt-1 font-mono text-xs text-emerald-300' : 'mt-1 font-mono text-xs text-red-300'}>
              {distance === null ? 'N/A' : percent(distance)}
            </p>
          </div>
        )
      })}
    </div>
  )
}

function TargetMethod({ pitch }: { pitch: StockPitch }) {
  const battlefield = pitch.sourceSnapshot?.optionsBattlefield
  const confidence = pitch.sourceSnapshot?.targetConfidence
  const rows = [
    { label: 'Line type', value: 'Scenario target map' },
    { label: 'Source', value: 'Sourced close + RS + crowding + catalyst + extension; options battlefield is separate evidence.' },
    { label: 'Options layer', value: battlefield ? `${battlefield.sourceLabel}: ${battlefield.pressureDirection}, call wall ${money(battlefield.callWall ?? undefined)}, put wall ${money(battlefield.putWall ?? undefined)}.` : 'No options battlefield attached.' },
    { label: 'Confidence', value: confidence ? `${confidence.score}/100 ${confidence.confidenceLabel}. See Confidence tab for drivers/blockers.` : 'No confidence score attached.' },
    { label: 'Horizon', value: pitch.setup.timeHorizon || '1-3 months' }
  ]
  return (
    <div className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map(row => (
          <div key={row.label} className="rounded-md border border-border bg-background/45 p-3">
            <p className="font-mono text-[0.65rem] uppercase text-muted-foreground">{row.label}</p>
            <p className="mt-2 text-sm leading-5 text-muted-foreground">{row.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-md border border-border bg-background/45 p-3">
        <p className="font-mono text-[0.65rem] uppercase text-muted-foreground">Formula Read</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{pitch.valuation.valuationConclusion}</p>
      </div>
    </div>
  )
}

function ScenarioBars({ pitch }: { pitch: StockPitch }) {
  const scenarios = pitch.valuation.scenarios
  const max = Math.max(1, ...scenarios.map(item => Math.abs(item.impliedReturn)))
  return (
    <div className="grid gap-3">
      {scenarios.map(scenario => {
        const width = Math.max(4, Math.abs(scenario.impliedReturn) / max * 100)
        const positive = scenario.impliedReturn >= 0
        return (
          <div key={scenario.name} className="rounded-md border border-border bg-background/45 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-sm font-semibold uppercase">{scenario.name}</p>
              <p className={positive ? 'font-mono text-sm text-emerald-300' : 'font-mono text-sm text-red-300'}>
                {money(scenario.priceTarget)} / {percent(scenario.impliedReturn)}
              </p>
            </div>
            <div className="mt-3 h-2 rounded-full bg-muted">
              <div
                className={positive ? 'h-2 rounded-full bg-primary' : 'h-2 rounded-full bg-destructive'}
                style={{ width: `${width}%` }}
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">{scenario.method}</p>
          </div>
        )
      })}
    </div>
  )
}

function RiskStructure({ pitch }: { pitch: StockPitch }) {
  const upside = pitch.setup.targetPrice && pitch.setup.currentPrice ? pitch.setup.targetPrice - pitch.setup.currentPrice : null
  const downside = pitch.setup.currentPrice && pitch.setup.downsidePrice ? pitch.setup.currentPrice - pitch.setup.downsidePrice : null
  const ratio = upside && downside && downside > 0 ? upside / downside : null
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2">
        <MetricMini label="Expression" value={pitch.tradeStructure.preferredExpression} />
        <MetricMini label="Sizing" value={pitch.tradeStructure.sizing} />
        <MetricMini label="Stop" value={money(pitch.tradeStructure.stopLevel)} />
        <MetricMini label="Take Profit" value={money(pitch.tradeStructure.takeProfitLevel)} />
      </div>
      <div className="rounded-md border border-border bg-background/45 p-3">
        <p className="font-mono text-[0.65rem] uppercase text-muted-foreground">Reward / Risk</p>
        <p className="mt-1 font-mono text-lg font-semibold">{ratio ? `${ratio.toFixed(1)}x` : 'N/A'}</p>
        <div className="mt-3 grid grid-cols-[1fr_1fr] gap-2">
          <div className="h-2 rounded-full bg-destructive/70" />
          <div className="h-2 rounded-full bg-primary/70" />
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">{pitch.tradeStructure.riskReward}</p>
      </div>
    </div>
  )
}

function AiScanPanel({ pitch, onRunAiScan, aiScanning }: { pitch: StockPitch; onRunAiScan?: () => void; aiScanning: boolean }) {
  const scan = pitch.aiScan
  const payload = scan?.payload
  const status = scan?.status ?? 'unavailable'
  return (
    <Panel title="AI Reviewer" kicker={status}>
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant={status === 'completed' ? 'secondary' : status === 'error' ? 'destructive' : 'outline'} className="font-mono">{status}</Badge>
          {onRunAiScan ? (
            <Button type="button" variant="outline" size="sm" onClick={onRunAiScan} disabled={aiScanning}>
              <Sparkles className="h-4 w-4" />
              {aiScanning ? 'Reviewing' : 'Run AI Review'}
            </Button>
          ) : null}
        </div>
        {payload ? (
          <div className="grid gap-3">
            <TextBlock title="Variant Thesis" body={payload.variantThesis} />
            <TextBlock title="Non-Consensus Read" body={payload.nonConsensusRead} />
            <TextBlock title="Bear Case" body={payload.bearCase} />
            <TextBlock title="Invalidation" body={payload.invalidation} />
            <ListBlock title="Evidence Map" items={payload.evidenceMap} />
            <ListBlock title="PM Questions" items={payload.pmQuestions} />
          </div>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">{scan?.errorMessage ?? 'Reviewer waits for finished source bundle. Configure OPENAI_API_KEY, then run review manually.'}</p>
        )}
      </div>
    </Panel>
  )
}

function NewsTapePanel({ items }: { items: PitchNewsTapeItem[] }) {
  return (
    <Panel title="News Tape" kicker={`${items.length} direct rows`}>
      {items.length ? (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-card text-muted-foreground">
              <tr>
                <th className="p-2 text-left">Time</th>
                <th className="p-2 text-left">Headline</th>
                <th className="p-2 text-left">Materiality</th>
                <th className="p-2 text-left">Why matters</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-t border-border align-top">
                  <td className="p-2 text-muted-foreground">{item.date}</td>
                  <td className="p-2">
                    {item.url ? <a className="font-semibold underline-offset-4 hover:underline" href={item.url} target="_blank" rel="noreferrer">{item.headline}</a> : <span className="font-semibold">{item.headline}</span>}
                    <p className="mt-1 text-muted-foreground">{item.sourceName ?? item.provider}</p>
                  </td>
                  <td className="p-2 font-mono text-muted-foreground">{item.materiality ?? 'N/A'}</td>
                  <td className="p-2 text-muted-foreground">{item.whyMatters}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm leading-6 text-muted-foreground">No direct ticker catalyst passed relevance filter. Broad theme headlines stay out of primary catalyst.</p>
      )}
    </Panel>
  )
}

function CatalystEditor({ catalysts, onChange }: { catalysts: Catalyst[]; onChange: (rows: Catalyst[]) => void }) {
  function patchCatalyst(index: number, next: Partial<Catalyst>) {
    onChange(replaceAt(catalysts, index, { ...catalysts[index], ...next }))
  }
  return (
    <EditorPanel title="Catalysts" kicker={`${catalysts.length} rows`}>
      <div className="grid gap-3">
        {catalysts.map((catalyst, index) => (
          <Card key={`${catalyst.id}-${index}`} className="rounded-md border-border bg-background/45 shadow-none">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="font-mono text-sm">{catalyst.title || catalyst.id}</CardTitle>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(catalysts.filter((_, rowIndex) => rowIndex !== index))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              <EditorGrid>
                <TextInput label="ID" value={catalyst.id} onChange={value => patchCatalyst(index, { id: value })} />
                <TextInput label="Date" value={catalyst.date} onChange={value => patchCatalyst(index, { date: value })} />
                <TextInput label="Title" value={catalyst.title} onChange={value => patchCatalyst(index, { title: value })} />
                <Field label="Type">
                  <Select value={catalyst.type} onValueChange={value => patchCatalyst(index, { type: value as CatalystType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{catalystTypeOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Importance">
                  <Select value={catalyst.importance} onValueChange={value => patchCatalyst(index, { importance: value as 'low' | 'medium' | 'high' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['low', 'medium', 'high'].map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </EditorGrid>
              <TextareaInput label="Expected Impact" value={catalyst.expectedImpact} onChange={value => patchCatalyst(index, { expectedImpact: value })} />
            </CardContent>
          </Card>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={() => onChange([...catalysts, { id: `catalyst-${catalysts.length + 1}`, type: 'other', date: 'TBD', title: 'New catalyst', expectedImpact: '', importance: 'medium' }])}
      >
        <Plus className="h-4 w-4" />
        Add Catalyst
      </Button>
    </EditorPanel>
  )
}

function LineItemEditor({ title, rows, onChange }: { title: string; rows: ModelLineItem[]; onChange: (rows: ModelLineItem[]) => void }) {
  function patchRow(index: number, next: Partial<ModelLineItem>) {
    onChange(replaceAt(rows, index, { ...rows[index], ...next }))
  }
  return (
    <div className="rounded-md border border-border bg-background/45">
      <div className="flex items-center justify-between gap-2 border-b border-border p-3">
        <p className="font-mono text-sm font-semibold">{title}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, { label: 'New metric', current: 'TBD', baseCase: 'TBD', bullCase: 'TBD', bearCase: 'TBD' }])}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
      <div className="grid gap-2 p-3">
        {rows.map((row, index) => (
          <div key={`${row.label}-${index}`} className="grid gap-2 rounded-md border border-border bg-card p-2 md:grid-cols-[1.1fr_0.8fr_0.8fr_0.8fr_0.8fr_auto]">
            <Input value={row.label} onChange={event => patchRow(index, { label: event.target.value })} aria-label={`${title} label`} />
            <Input value={String(row.current)} onChange={event => patchRow(index, { current: event.target.value })} aria-label={`${title} current`} />
            <Input value={String(row.baseCase)} onChange={event => patchRow(index, { baseCase: event.target.value })} aria-label={`${title} base`} />
            <Input value={String(row.bullCase)} onChange={event => patchRow(index, { bullCase: event.target.value })} aria-label={`${title} bull`} />
            <Input value={String(row.bearCase)} onChange={event => patchRow(index, { bearCase: event.target.value })} aria-label={`${title} bear`} />
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

function Panel({ title, kicker, children }: { title: string; kicker: string; children: ReactNode }) {
  return (
    <Card className="rounded-md border-border bg-card shadow-none">
      <CardHeader className="border-b border-border pb-3">
        <p className="font-mono text-[0.65rem] tracking-[0.04em] text-muted-foreground">{kicker}</p>
        <CardTitle className="mt-1 font-mono text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  )
}

function EditorPanel({ title, kicker, children }: { title: string; kicker: string; children: ReactNode }) {
  return (
    <Panel title={title} kicker={kicker}>
      <div className="grid gap-4">{children}</div>
    </Panel>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <p className="font-mono text-[0.65rem] tracking-[0.04em] text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-mono text-sm font-semibold leading-tight">{value}</p>
    </div>
  )
}

function MetricMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/45 p-2">
      <p className="font-mono text-[0.65rem] tracking-[0.04em] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-mono text-sm font-semibold">{value}</p>
    </div>
  )
}

function TextBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-border bg-background/45 p-3">
      <p className="font-mono text-[0.65rem] tracking-[0.04em] text-muted-foreground">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body || 'N/A'}</p>
    </div>
  )
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-border bg-background/45 p-3">
      <p className="font-mono text-[0.65rem] tracking-[0.04em] text-muted-foreground">{title}</p>
      <ol className="mt-2 grid gap-2">
        {items.length ? items.map(item => <li key={item} className="text-sm leading-6 text-muted-foreground">{item}</li>) : <li className="text-sm text-muted-foreground">N/A</li>}
      </ol>
    </div>
  )
}

function DetailGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-2">{children}</div>
}

function EditorGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-2">{children}</div>
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const id = useId()
  const child = isValidElement(children)
    ? cloneElement(children as ReactElement<{ id?: string }>, { id: (children.props as { id?: string }).id ?? id })
    : children
  return (
    <div className="grid min-w-0 gap-1.5">
      <Label htmlFor={id} className="font-mono text-[0.65rem] tracking-[0.04em] text-muted-foreground">{label}</Label>
      {child}
    </div>
  )
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <Field label={label}>
      <Input value={value} onChange={event => onChange(event.target.value)} />
    </Field>
  )
}

function NumberInput({ label, value, onChange }: { label: string; value?: number; onChange: (value: number | undefined) => void }) {
  return (
    <Field label={label}>
      <Input
        type="number"
        value={value ?? ''}
        onChange={event => onChange(event.target.value === '' ? undefined : Number(event.target.value))}
        className="font-mono"
      />
    </Field>
  )
}

function TextareaInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <Field label={label}>
      <Textarea value={value} onChange={event => onChange(event.target.value)} className="min-h-[110px] text-sm leading-6" />
    </Field>
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
