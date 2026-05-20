import type { BacktestFilters } from '@/lib/backtest'
import { EVENT_CATEGORIES, RETURN_WINDOWS } from '@/lib/constants'

type BacktestControlsProps = {
  filters: BacktestFilters
  groups: string[]
  onChange: (filters: BacktestFilters) => void
}

export function BacktestControls({ filters, groups, onChange }: BacktestControlsProps) {
  return (
    <div className="workbench-control-grid md:grid-cols-3">
      <label className="workbench-field">
        Event category
        <select className="workbench-input" value={filters.eventCategory} onChange={event => onChange({ ...filters, eventCategory: event.target.value })}>
          <option>All</option>
          {EVENT_CATEGORIES.map(category => <option key={category}>{category}</option>)}
        </select>
      </label>
      <label className="workbench-field">
        Asset group
        <select className="workbench-input" value={filters.assetGroup} onChange={event => onChange({ ...filters, assetGroup: event.target.value })}>
          <option>All</option>
          {groups.map(group => <option key={group}>{group}</option>)}
        </select>
      </label>
      <label className="workbench-field">
        Return window
        <select className="workbench-input" value={filters.returnWindow} onChange={event => onChange({ ...filters, returnWindow: event.target.value as BacktestFilters['returnWindow'] })}>
          {RETURN_WINDOWS.map(window => <option key={window}>{window}</option>)}
        </select>
      </label>
    </div>
  )
}
