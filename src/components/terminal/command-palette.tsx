import { useRouter } from 'next/router'
import { FileDown, FileText, LayoutDashboard, Search, ShieldAlert, Sparkles } from 'lucide-react'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut
} from '@/components/ui/command'
import type { ShellMeta, UnavailableField } from '@/lib/research/api'
import type { StockReport } from '@/lib/research/types'
import { downloadStockReportPdf } from '@/lib/research/export'
import type { ModuleMeta } from '@/components/terminal/terminal-workspace'

export function TerminalCommandPalette({
  open,
  onOpenChange,
  modules,
  ticker,
  report,
  shell,
  unavailableFields,
  onOpenSourceSheet,
  onSnapshot,
  onCopyMarkdown,
  onSetLayout
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  modules: ModuleMeta[]
  ticker: string
  report?: StockReport
  shell: ShellMeta
  unavailableFields: UnavailableField[]
  onOpenSourceSheet: () => void
  onSnapshot: () => void
  onCopyMarkdown: () => void
  onSetLayout: (layout: 'balanced' | 'memo-heavy' | 'data-heavy') => void
}) {
  const router = useRouter()

  function run(action: () => void | Promise<void>) {
    onOpenChange(false)
    void action()
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Command Palette" description="Jump, export, inspect, and adjust layout.">
      <Command>
        <CommandInput placeholder="Search ticker, module, export, layout" />
        <CommandList>
          <CommandEmpty>No command found.</CommandEmpty>
          <CommandGroup heading="Ticker">
            <CommandItem onSelect={() => run(async () => { await router.push(`/report/${encodeURIComponent(ticker || 'NVDA')}`) })}>
              <Search className="h-4 w-4" />
              Open {ticker || 'NVDA'} report
              <CommandShortcut>Enter</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Modules">
            {modules.map(item => {
              const Icon = item.icon
              return (
                <CommandItem key={item.id} onSelect={() => run(async () => { await router.push(item.href) })}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                  <CommandShortcut>{item.short}</CommandShortcut>
                </CommandItem>
              )
            })}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => run(onOpenSourceSheet)}>
              <ShieldAlert className="h-4 w-4" />
              Open source inspector
              <CommandShortcut>{unavailableFields.length} gaps</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => run(onSnapshot)}>
              <Sparkles className="h-4 w-4" />
              Export PNG snapshot
              <CommandShortcut>PNG</CommandShortcut>
            </CommandItem>
            <CommandItem disabled={!report} onSelect={() => report ? run(() => downloadStockReportPdf(report)) : undefined}>
              <FileDown className="h-4 w-4" />
              Export report PDF
              <CommandShortcut>PDF</CommandShortcut>
            </CommandItem>
            <CommandItem disabled={!report} onSelect={() => report ? run(onCopyMarkdown) : undefined}>
              <FileText className="h-4 w-4" />
              Copy report markdown
              <CommandShortcut>MD</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Layout">
            <CommandItem onSelect={() => run(() => onSetLayout('balanced'))}>
              <LayoutDashboard className="h-4 w-4" />
              Balanced layout
              <CommandShortcut>{shell.coveragePercent}%</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => run(() => onSetLayout('memo-heavy'))}>
              <LayoutDashboard className="h-4 w-4" />
              Memo-heavy layout
            </CommandItem>
            <CommandItem onSelect={() => run(() => onSetLayout('data-heavy'))}>
              <LayoutDashboard className="h-4 w-4" />
              Data-heavy layout
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
