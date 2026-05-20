import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Asset } from '@/types/asset'

export function AssetPerformanceChart({ assets }: { assets: Asset[] }) {
  const data = assets.slice(0, 12).map(asset => ({
    ticker: asset.ticker,
    fiveDay: asset.return5d ?? 0,
    twentyDay: asset.return20d ?? 0
  }))

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.16)" vertical={false} />
          <XAxis dataKey="ticker" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="fiveDay" name="5D return" fill="rgb(80,210,193)" />
          <Bar dataKey="twentyDay" name="20D return" fill="#ffe4a8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
