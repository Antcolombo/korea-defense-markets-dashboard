import { PitchWorkbench } from '@/features/pitches/components/pitch-workbench'
import { ModuleFrame } from '@/components/workbench/module-frame'
import type { WorkspaceData } from '@/contracts/workspace'

export function StockPitchModule({ data }: { data: WorkspaceData }) {
  return (
    <ModuleFrame
      title={data.pitch ? `${data.pitch.ticker} Stock Pitch` : 'Stock Pitch Workbench'}
      kicker="Pitch"
      description={data.pitch?.oneLineThesis ?? 'Create, edit, share, and export structured StockPitch memos from one DB object.'}
    >
      <PitchWorkbench
        record={data.pitch}
        pitches={data.pitches ?? []}
        prices={data.prices ?? []}
        sourceSnapshot={data.pitchSource}
        initialTicker={data.pitchCreateTicker}
      />
    </ModuleFrame>
  )
}
