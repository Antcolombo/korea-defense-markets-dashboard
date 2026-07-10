import { DecisionWorkbench } from '@/features/decisions/components/decision-workbench'
import { ModuleFrame } from '@/components/workbench/module-frame'
import type { WorkspaceData } from '@/contracts/workspace'

export function DecisionLogModule({
  data,
  selectedTicker,
  sourceSummary
}: {
  data: WorkspaceData
  selectedTicker: string
  sourceSummary: string
}) {
  return (
    <ModuleFrame
      title="Investment Decision Audit Trail"
      kicker="Decision Log"
      description="Separate evidence from narrative, force risk framing, and track post-mortems."
    >
      <DecisionWorkbench
        decisions={data.decisions ?? []}
        activeDecision={data.decision}
        initialTicker={selectedTicker}
        sourceSummary={sourceSummary}
      />
    </ModuleFrame>
  )
}
