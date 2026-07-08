import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { ShellMeta, UnavailableField } from '@/lib/research/api'

export function SourceSheet({
  open,
  onOpenChange,
  shell,
  unavailableFields,
  deferredUnavailableFields
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  shell: ShellMeta
  unavailableFields: UnavailableField[]
  deferredUnavailableFields: UnavailableField[]
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border p-4">
          <SheetTitle className="font-mono">Source Inspector</SheetTitle>
          <SheetDescription>Provider health, active gaps, and deferred feeds for current module.</SheetDescription>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className="grid gap-3 p-4">
            <section className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-mono text-sm font-semibold">Active Providers</h3>
                <Badge variant="outline">{shell.coveragePercent}%</Badge>
              </div>
              {shell.providerHealth.length ? shell.providerHealth.map(item => (
                <div key={item.id} className="rounded-md border border-border bg-background/45 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-xs font-semibold">{item.label}</p>
                    <Badge variant="outline">{item.status}</Badge>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.detail}</p>
                </div>
              )) : <EmptySheetLine title="No active provider rows" />}
            </section>
            <section className="grid gap-2">
              <h3 className="font-mono text-sm font-semibold">Required Gaps</h3>
              {unavailableFields.length ? unavailableFields.map((field, index) => (
                <div key={`${field.field}-${index}`} className="rounded-md border border-border bg-background/45 p-3">
                  <p className="font-mono text-xs font-semibold">{field.field}</p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{field.reason}</p>
                </div>
              )) : <EmptySheetLine title="No required gaps" />}
            </section>
            <section className="grid gap-2">
              <h3 className="font-mono text-sm font-semibold">Deferred Providers</h3>
              {shell.deferredProviderHealth.length ? shell.deferredProviderHealth.map(item => (
                <div key={item.id} className="rounded-md border border-border bg-background/35 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-xs font-semibold">{item.label}</p>
                    <Badge variant="outline">{item.status}</Badge>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.detail}</p>
                </div>
              )) : <EmptySheetLine title="No deferred provider rows" />}
            </section>
            <section className="grid gap-2">
              <h3 className="font-mono text-sm font-semibold">Deferred Gaps</h3>
              {deferredUnavailableFields.length ? deferredUnavailableFields.map((field, index) => (
                <div key={`${field.field}-${index}`} className="rounded-md border border-border bg-background/35 p-3">
                  <p className="font-mono text-xs font-semibold">{field.field}</p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{field.reason}</p>
                </div>
              )) : <EmptySheetLine title="No deferred gaps" />}
            </section>
          </div>
        </ScrollArea>
        <div className="border-t border-border p-4">
          <Button type="button" variant="outline" className="w-full font-mono" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function EmptySheetLine({ title }: { title: string }) {
  return <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">{title}</div>
}
