import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { parseAsString, useQueryState } from 'nuqs'
import { toPng } from 'html-to-image'
import { Search, Terminal, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { TerminalActionMenu } from '@/components/terminal/action-menu'
import { TerminalCommandPalette } from '@/components/terminal/command-palette'
import { SourceSheet } from '@/components/terminal/source-sheet'
import { TerminalMetrics } from '@/components/terminal/terminal-metrics'
import { qualityBadgeClass, statusLabel } from '@/components/workbench/terminal-quality'
import { useTerminalStore, type PanelLayoutMode } from '@/features/workspace/components/workspace-store'
import { LeftRail, MainModule, MobileModuleSelect, RightRail } from '@/features/workspace/components/module-renderer'
import type { TerminalWorkspaceProps } from '@/contracts/workspace'
import { moduleMeta, visibleWorkspaceModules } from '@/features/workspace/components/module-registry'
import { buildWatchlist, isModuleActive, panelLayoutSizes } from '@/features/workspace/domain/selectors'

export function TerminalWorkspace({
  module,
  data,
  shell,
  unavailableFields,
  deferredUnavailableFields = [],
  selectedTicker,
  selectedSlug
}: TerminalWorkspaceProps) {
  const router = useRouter()
  const workspaceRef = useRef<HTMLElement | null>(null)
  const activeMeta = moduleMeta(module)
  const watchlist = buildWatchlist(data)
  const defaultTicker = selectedTicker ?? data.report?.ticker ?? watchlist[0]?.ticker ?? 'NVDA'
  const [, setTickerQuery] = useQueryState('ticker', parseAsString.withDefault(defaultTicker))
  const commandOpen = useTerminalStore(state => state.commandOpen)
  const setCommandOpen = useTerminalStore(state => state.setCommandOpen)
  const openCommand = useTerminalStore(state => state.openCommand)
  const sourceSheetOpen = useTerminalStore(state => state.sourceSheetOpen)
  const setSourceSheetOpen = useTerminalStore(state => state.setSourceSheetOpen)
  const layoutMode = useTerminalStore(state => state.layoutMode)
  const setLayoutMode = useTerminalStore(state => state.setLayoutMode)
  const setActiveTickerDraft = useTerminalStore(state => state.setActiveTickerDraft)
  const [ticker, setTicker] = useState(defaultTicker)
  const focusedTicker = ticker || defaultTicker
  const panelSizes = panelLayoutSizes(layoutMode)

  useEffect(() => {
    setTicker(defaultTicker)
    setActiveTickerDraft(defaultTicker)
  }, [defaultTicker, setActiveTickerDraft])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        openCommand()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openCommand])

  function updateTicker(value: string) {
    const next = value.toUpperCase()
    setTicker(next)
    setActiveTickerDraft(next)
    void setTickerQuery(next || null, { history: 'replace', shallow: true })
  }

  function normalizedTicker(value: string) {
    return value.trim().toUpperCase() || 'NVDA'
  }

  function openReportTicker(value: string) {
    const next = normalizedTicker(value)
    updateTicker(next)
    void router.push(`/report/${encodeURIComponent(next)}`)
  }

  function openDecisionTicker(value: string) {
    const next = normalizedTicker(value)
    updateTicker(next)
    void router.push(`/?module=decision-log&ticker=${encodeURIComponent(next)}&new=1`)
  }

  function submitTicker(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    openReportTicker(ticker)
  }

  async function copyReportMarkdown() {
    if (!data.report) return
    await copyText(data.report.markdown)
  }

  function exportMarkdown() {
    if (!data.report) return
    downloadBlob(
      new Blob([data.report.markdown], { type: 'text/markdown;charset=utf-8' }),
      `${data.report.ticker.toLowerCase()}-report.md`
    )
  }

  async function exportSnapshot() {
    if (!workspaceRef.current) return
    const dataUrl = await toPng(workspaceRef.current, {
      cacheBust: true,
      pixelRatio: 1.5,
      filter: node => !(node instanceof HTMLElement && node.dataset.exportSkip === 'true')
    })
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `liquidchain-${module}.png`
    link.click()
  }

  function changeLayout(mode: PanelLayoutMode) {
    setLayoutMode(mode)
  }

  const mainPanel = (
    <MainModule
      module={module}
      data={data}
      shell={shell}
      selectedTicker={focusedTicker}
      selectedSlug={selectedSlug}
      onTickerChange={updateTicker}
      onOpenReport={openReportTicker}
      onOpenDecision={openDecisionTicker}
      unavailableFields={unavailableFields}
      deferredUnavailableFields={deferredUnavailableFields}
    />
  )

  return (
    <TooltipProvider>
      <main ref={workspaceRef} className="terminal-v2 flex h-screen min-h-screen flex-col overflow-hidden bg-background text-foreground">
        <header className="terminal-command-bar border-b border-border bg-card/80 px-3 py-2 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex min-w-[150px] items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/40 bg-primary/15 text-primary">
                <Terminal className="h-4 w-4" />
              </div>
              <div className="min-w-0"><p className="truncate text-sm font-bold tracking-[0.08em] text-foreground">LIQUIDCHAIN</p></div>
            </div>
            <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto lg:flex" aria-label="Workspace modules">
              {visibleWorkspaceModules.map(item => {
                const Icon = item.icon
                return (
                  <Button key={item.id} asChild variant={isModuleActive(item.id, module) ? 'secondary' : 'ghost'} size="sm" className="text-[0.75rem] font-medium">
                    <Link href={item.href}><Icon className="h-3.5 w-3.5" />{item.short}</Link>
                  </Button>
                )
              })}
            </nav>
          </div>
          <form onSubmit={submitTicker} className="flex min-w-0 items-center gap-2">
            <InputGroup className="min-w-[190px] flex-1 lg:w-[320px] lg:flex-none">
              <InputGroupAddon><Search className="h-3.5 w-3.5" /></InputGroupAddon>
              <InputGroupInput value={ticker} onChange={event => updateTicker(event.target.value)} className="font-mono text-xs" aria-label="Ticker command" placeholder="/report NVDA" />
            </InputGroup>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="submit" size="sm" variant="secondary" aria-label="Open stock report" className="px-2 sm:px-3">
                  <Zap className="h-4 w-4" /><span className="hidden sm:inline">Open Report</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open stock report</TooltipContent>
            </Tooltip>
            <Badge variant="outline" className={`hidden font-mono sm:inline-flex ${qualityBadgeClass(shell)}`}>{statusLabel(shell)}</Badge>
            <TerminalActionMenu
              report={data.report}
              layoutMode={layoutMode}
              onOpenCommand={openCommand}
              onOpenSourceSheet={() => setSourceSheetOpen(true)}
              onCopyMarkdown={copyReportMarkdown}
              onExportMarkdown={exportMarkdown}
              onSnapshot={() => void exportSnapshot()}
              onSetLayout={changeLayout}
            />
          </form>
        </header>

        <TerminalMetrics data={data} shell={shell} active={activeMeta} />

        <section className="hidden min-h-0 flex-1 lg:block">
          <ResizablePanelGroup key={layoutMode} direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={panelSizes.left} minSize={14}><LeftRail active={module} watchlist={watchlist} data={data} /></ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={panelSizes.center} minSize={42}>{mainPanel}</ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={panelSizes.right} minSize={18}>
              <RightRail shell={shell} data={data} unavailableFields={unavailableFields} deferredUnavailableFields={deferredUnavailableFields} active={activeMeta} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </section>

        <section className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden lg:hidden">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 p-3">
            <MobileModuleSelect module={module === 'basket-detail' ? 'baskets' : module} />
            {mainPanel}
            <LeftRail active={module} watchlist={watchlist} data={data} compact />
            <RightRail shell={shell} data={data} unavailableFields={unavailableFields} deferredUnavailableFields={deferredUnavailableFields} active={activeMeta} />
          </div>
        </section>
      </main>
      <SourceSheet open={sourceSheetOpen} onOpenChange={setSourceSheetOpen} shell={shell} unavailableFields={unavailableFields} deferredUnavailableFields={deferredUnavailableFields} />
      <TerminalCommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        modules={visibleWorkspaceModules}
        ticker={focusedTicker}
        report={data.report}
        shell={shell}
        unavailableFields={unavailableFields}
        onOpenSourceSheet={() => setSourceSheetOpen(true)}
        onSnapshot={() => void exportSnapshot()}
        onCopyMarkdown={copyReportMarkdown}
        onSetLayout={changeLayout}
      />
    </TooltipProvider>
  )
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text)
  const element = document.createElement('textarea')
  element.value = text
  element.setAttribute('readonly', '')
  element.style.position = 'fixed'
  element.style.top = '-9999px'
  document.body.appendChild(element)
  element.select()
  document.execCommand('copy')
  document.body.removeChild(element)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
