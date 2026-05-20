import type { Theme } from '@/types/theme'

export function ExposureMap({ themes }: { themes: Theme[] }) {
  return (
    <div className="workbench-table-wrap">
      <table className="workbench-table min-w-[860px]">
        <thead>
          <tr>
            <th>Theme</th>
            <th>Risk</th>
            <th>Companies</th>
            <th>Assets</th>
            <th>Channels</th>
          </tr>
        </thead>
        <tbody>
          {themes.map(theme => (
            <tr key={theme.id} className="align-top">
              <td className="font-semibold text-ink">{theme.name}</td>
              <td>{theme.currentRiskLevel}</td>
              <td>{theme.relatedCompanies.join(', ') || 'Macro only'}</td>
              <td>{theme.relatedAssets.join(', ')}</td>
              <td>{theme.marketChannels.join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
