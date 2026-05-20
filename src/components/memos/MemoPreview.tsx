import type { Memo } from '@/types/memo'

export function memoToMarkdown(memo: Memo) {
  return `# ${memo.title}

Date: ${memo.date}
Research State: ${memo.riskLevel}

## Top Events
${memo.topEvents.map(event => `- ${event}`).join('\n')}

## Market Reaction
${memo.marketReaction}

## Theme Update
${memo.themeUpdate}

## Watchlist
${memo.watchlist.join(', ')}

## Investment Implication
${memo.investmentImplication}

## What To Watch Next
${memo.whatToWatchNext.map(item => `- ${item}`).join('\n')}

## Sources
${memo.sources.map(source => `- ${source}`).join('\n')}
`
}

export function MemoPreview({ memo }: { memo: Memo }) {
  return (
    <pre className="workbench-code max-h-[620px] overflow-auto whitespace-pre-wrap">
      {memoToMarkdown(memo)}
    </pre>
  )
}
