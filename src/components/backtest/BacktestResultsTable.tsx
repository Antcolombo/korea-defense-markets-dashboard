import type { BacktestRow } from '@/lib/backtest'
import { formatReturn, getReturnClass } from '@/lib/returns'
import { formatCategory } from '@/lib/formatters'

export function BacktestResultsTable({ rows }: { rows: BacktestRow[] }) {
  return (
    <div className="workbench-table-wrap">
      <table className="workbench-table min-w-[860px]">
        <thead>
          <tr>
            <th>Event</th>
            <th>Category</th>
            <th>Ticker</th>
            <th>Asset</th>
            <th>Selected return</th>
            <th>Interpretation</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 40).map(row => (
            <tr key={`${row.eventId}-${row.ticker}`} className="align-top">
              <td>{row.eventId}</td>
              <td>{formatCategory(row.eventCategory)}</td>
              <td className="font-semibold text-ink">{row.ticker}</td>
              <td>{row.assetName}</td>
              <td className={`font-semibold ${getReturnClass(row.selectedReturn)}`}>{formatReturn(row.selectedReturn)}</td>
              <td>{row.interpretation}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
