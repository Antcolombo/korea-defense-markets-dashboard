import type { Asset } from '@/types/asset'
import { formatAssetMove } from '@/lib/returns'

function getHeatClass(value: number | null | undefined) {
  if (value === null || value === undefined) return 'bg-[rgba(0,0,0,0.34)] text-muted'
  if (value >= 4) return 'bg-[rgba(80,210,193,0.32)] text-white'
  if (value >= 1) return 'bg-[rgba(80,210,193,0.16)] text-good'
  if (value <= -2) return 'bg-[rgba(255,122,122,0.28)] text-white'
  if (value < 0) return 'bg-[rgba(255,122,122,0.14)] text-crisis'
  return 'bg-[rgba(255,255,255,0.05)] text-muted'
}

export function AssetHeatmap({ assets }: { assets: Asset[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {assets.slice(0, 15).map(asset => (
        <div key={asset.ticker} className={`rounded-md border border-line p-3 ${getHeatClass(asset.return5d)}`}>
          <p className="text-sm font-semibold">{asset.ticker}</p>
          <p className="mt-2 text-lg font-bold">{formatAssetMove(asset, asset.return5d)}</p>
          <p className="mt-1 truncate text-xs opacity-80">{asset.group}</p>
        </div>
      ))}
    </div>
  )
}
