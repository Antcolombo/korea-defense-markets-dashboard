import type { Memo } from '@/types/memo'
import { Card } from '@/components/ui/Card'
import { RiskBadge } from '@/components/ui/Badge'

export function MemoArchive({ memos, onSelect }: { memos: Memo[]; onSelect: (memo: Memo) => void }) {
  if (memos.length === 0) {
    return <p className="text-sm leading-6 text-muted">Data build failed strict memo readiness. Run ingestion and audit before publication.</p>
  }

  return (
    <div className="grid gap-3">
      {memos.map(memo => (
        <button key={memo.id} type="button" onClick={() => onSelect(memo)} className="text-left">
          <Card className="p-4 transition hover:border-steel">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="workbench-kicker">{memo.date}</p>
                <p className="mt-1 font-semibold text-ink">{memo.title}</p>
              </div>
              <RiskBadge level={memo.riskLevel} />
            </div>
          </Card>
        </button>
      ))}
    </div>
  )
}
