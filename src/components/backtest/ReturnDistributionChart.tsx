import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { BacktestRow } from '@/lib/backtest'

export function ReturnDistributionChart({ rows }: { rows: BacktestRow[] }) {
  const grouped = rows.reduce<Record<string, { ticker: string; total: number; count: number }>>((accumulator, row) => {
    accumulator[row.ticker] = accumulator[row.ticker] ?? { ticker: row.ticker, total: 0, count: 0 }
    accumulator[row.ticker].total += row.selectedReturn
    accumulator[row.ticker].count += 1
    return accumulator
  }, {})

  const data = Object.values(grouped)
    .map(item => ({ ticker: item.ticker, averageReturn: Number((item.total / item.count).toFixed(2)) }))
    .sort((a, b) => b.averageReturn - a.averageReturn)
    .slice(0, 12)

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.16)" vertical={false} />
          <XAxis dataKey="ticker" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="averageReturn" fill="rgb(80,210,193)" name="Average return" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
