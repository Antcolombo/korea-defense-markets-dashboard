import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EditorPanel, Panel } from '@/features/pitches/components/pitch-surfaces'
import type { Catalyst, CatalystType, ModelLineItem, PitchEvidenceDriver, PitchRecommendation, PitchSourceQuality, PitchTabId, StockPitch, TradeExpression } from '@/types/pitch'

const recommendationOptions: PitchRecommendation[] = ['long', 'short', 'watchlist', 'no-trade']
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

export function PitchEditor({ pitch, onChange }: { pitch: StockPitch; onChange: (pitch: StockPitch) => void }) {
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

export function SourceEvidencePanel({ pitch }: { pitch: StockPitch }) {
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

export function DetailGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-2">{children}</div>
}

function EditorGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-2">{children}</div>
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
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


function replaceAt<T>(rows: T[], index: number, next: T) {
  return rows.map((row, rowIndex) => rowIndex === index ? next : row)
}

function lines(value: string) {
  return value.split('\n').map(item => item.trim()).filter(Boolean)
}
