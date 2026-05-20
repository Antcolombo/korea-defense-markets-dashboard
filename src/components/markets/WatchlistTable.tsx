import type { Asset } from '@/types/asset'
import { formatAssetMove, getReturnClass } from '@/lib/returns'

export function WatchlistTable({ assets }: { assets: Asset[] }) {
  return (
    <div className="workbench-table-wrap">
      <table className="workbench-table min-w-[1040px]">
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Name</th>
            <th>Sleeve</th>
            <th>Asset class</th>
            <th>Group</th>
            <th>Theme exposure</th>
            <th>1D move</th>
            <th>5D move</th>
            <th>20D move</th>
            <th>YTD move</th>
            <th>Events</th>
            <th>Provider</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {assets.map(asset => (
            <tr key={asset.ticker} className="align-top">
              <td className="font-semibold text-ink">{asset.ticker}</td>
              <td className="text-ink">{asset.name}</td>
              <td>{asset.sleeve}</td>
              <td className="capitalize">{asset.assetClass}</td>
              <td>{asset.group}</td>
              <td>{asset.themes.slice(0, 2).join(', ')}</td>
              <td className={`font-semibold ${getReturnClass(asset.return1d)}`}>{formatAssetMove(asset, asset.return1d)}</td>
              <td className={`font-semibold ${getReturnClass(asset.return5d)}`}>{formatAssetMove(asset, asset.return5d)}</td>
              <td className={`font-semibold ${getReturnClass(asset.return20d)}`}>{formatAssetMove(asset, asset.return20d)}</td>
              <td className={`font-semibold ${getReturnClass(asset.returnYtd)}`}>{formatAssetMove(asset, asset.returnYtd)}</td>
              <td>{asset.relatedEventCount ?? 'N/A'}</td>
              <td>{asset.provider}</td>
              <td>{asset.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
