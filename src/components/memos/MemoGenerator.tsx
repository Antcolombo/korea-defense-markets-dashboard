import { useState } from 'react'
import type { Memo } from '@/types/memo'
import type { RiskLevel } from '@/types/theme'

type MemoGeneratorProps = {
  onGenerate: (memo: Memo) => void
}

export function MemoGenerator({ onGenerate }: MemoGeneratorProps) {
  const [researchPriority, setResearchPriority] = useState(68)
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('Elevated')
  const [topEvent, setTopEvent] = useState('U.S.-ROK-Japan defense coordination remained the dominant theme this week.')
  const [marketReaction, setMarketReaction] = useState('Defense-linked names outperformed semiconductors, while KRW showed limited stress.')
  const [themeUpdate, setThemeUpdate] = useState('Missile defense and allied defense capacity remain the cleanest research themes.')
  const [watchlist, setWatchlist] = useState('HII, RTX, LMT, Hanwha Aerospace, HD Hyundai, SMH, KRW/USD, VIX')

  function generateMemo() {
    const retrievedAt = new Date().toISOString()
    onGenerate({
      provider: 'user-entered',
      sourceUrl: '/memos',
      sourceName: 'User-entered memo draft',
      retrievedAt,
      publishedAt: retrievedAt,
      isDerived: true,
      methodologyNote: 'Draft memo entered by the user in the browser. Publish only after source review.',
      dataQuality: 'derived',
      id: `generated-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      title: 'Korea Defense Markets Weekly Brief',
      researchPriority,
      riskLevel,
      topEvents: [topEvent],
      marketReaction,
      themeUpdate,
      watchlist: watchlist.split(',').map(item => item.trim()).filter(Boolean),
      investmentImplication: 'Educational research draft only. Not investment advice or a recommendation.',
      whatToWatchNext: ['Validate source links before publishing', 'Confirm price-provider coverage', 'Review methodology labels'],
      sources: ['/methodology']
    })
  }

  return (
    <div className="workbench-control-grid">
      <label className="workbench-field">
        Research priority
        <input className="workbench-input" type="number" min="0" max="100" value={researchPriority} onChange={event => setResearchPriority(Number(event.target.value))} />
      </label>
      <label className="workbench-field">
        Risk level
        <select className="workbench-input" value={riskLevel} onChange={event => setRiskLevel(event.target.value as RiskLevel)}>
          {['Low', 'Watch', 'Elevated', 'High', 'Crisis'].map(level => <option key={level}>{level}</option>)}
        </select>
      </label>
      <label className="workbench-field">
        Top event
        <textarea className="workbench-input min-h-20" value={topEvent} onChange={event => setTopEvent(event.target.value)} />
      </label>
      <label className="workbench-field">
        Market reaction
        <textarea className="workbench-input min-h-20" value={marketReaction} onChange={event => setMarketReaction(event.target.value)} />
      </label>
      <label className="workbench-field">
        Theme update
        <textarea className="workbench-input min-h-20" value={themeUpdate} onChange={event => setThemeUpdate(event.target.value)} />
      </label>
      <label className="workbench-field">
        Watchlist
        <input className="workbench-input" value={watchlist} onChange={event => setWatchlist(event.target.value)} />
      </label>
      <button type="button" onClick={generateMemo} className="min-h-8 rounded-md border border-[rgba(80,210,193,0.45)] bg-[rgba(80,210,193,0.16)] px-4 py-2 text-sm font-semibold text-white hover:bg-[rgba(80,210,193,0.28)]">
        Generate Markdown Memo
      </button>
    </div>
  )
}
