import { Download, FileDown, FileText, Gauge, ImageDown, PanelLeft, PanelRight, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import type { StockReport } from '@/lib/research/types'
import { downloadStockReportPdf } from '@/lib/research/export'
import type { PanelLayoutMode } from '@/features/workspace/components/workspace-store'

export function TerminalActionMenu({
  report,
  layoutMode,
  onOpenCommand,
  onOpenSourceSheet,
  onCopyMarkdown,
  onExportMarkdown,
  onSnapshot,
  onSetLayout
}: {
  report?: StockReport
  layoutMode: PanelLayoutMode
  onOpenCommand: () => void
  onOpenSourceSheet: () => void
  onCopyMarkdown: () => void
  onExportMarkdown: () => void
  onSnapshot: () => void
  onSetLayout: (mode: PanelLayoutMode) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" aria-label="Open terminal actions" className="px-2 sm:px-3">
          <Gauge className="h-4 w-4" />
          <span className="hidden sm:inline">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Terminal actions</DropdownMenuLabel>
        <DropdownMenuItem onSelect={onOpenCommand}>
          <FileText className="h-4 w-4" />
          Command palette
          <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onOpenSourceSheet}>
          <ShieldAlert className="h-4 w-4" />
          Source inspector
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={!report} onSelect={() => report && void downloadStockReportPdf(report)}>
          <FileDown className="h-4 w-4" />
          Export PDF
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!report} onSelect={onExportMarkdown}>
          <Download className="h-4 w-4" />
          Export markdown
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!report} onSelect={onCopyMarkdown}>
          <FileText className="h-4 w-4" />
          Copy markdown
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onSnapshot}>
          <ImageDown className="h-4 w-4" />
          Export PNG snapshot
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Layout: {layoutMode}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => onSetLayout('balanced')}>
          <PanelLeft className="h-4 w-4" />
          Balanced panels
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSetLayout('memo-heavy')}>
          <PanelRight className="h-4 w-4" />
          Memo-heavy panels
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSetLayout('data-heavy')}>
          <PanelRight className="h-4 w-4" />
          Data-heavy panels
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
