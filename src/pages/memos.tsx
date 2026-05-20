import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/ui/Section'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { MemoArchive } from '@/components/memos/MemoArchive'
import { MemoGenerator } from '@/components/memos/MemoGenerator'
import { MemoPreview, memoToMarkdown } from '@/components/memos/MemoPreview'
import { DataBuildFailure } from '@/components/ui/DataBuildFailure'
import { getMemos } from '@/lib/data/getMemos'
import type { Memo } from '@/types/memo'

export function MemosPage() {
  const memos = getMemos()
  const [memo, setMemo] = useState<Memo | null>(memos[0] ?? null)

  function exportMarkdown() {
    if (!memo) return
    const blob = new Blob([memoToMarkdown(memo)], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'korea-macro-trade-note.md'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <PageHeader
        eyebrow="Trade notes"
        title="Trade Note Studio"
        description="Generate concise research notes from sourced event tape, macro series, market prices, and disclosure evidence."
      />
      <Section>
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="grid gap-6">
            <Card>
              <CardHeader title="Archived Trade Notes" eyebrow="Generated archive" />
              <CardBody><MemoArchive memos={memos} onSelect={setMemo} /></CardBody>
            </Card>
            <Card>
              <CardHeader title="Trade Note Generator" eyebrow="Markdown output" />
              <CardBody><MemoGenerator onGenerate={setMemo} /></CardBody>
            </Card>
          </div>
          <Card>
            <CardHeader title="Trade Note Preview" eyebrow="Research note" action={<Button onClick={exportMarkdown} variant="secondary">Export Markdown</Button>} />
            <CardBody>{memo ? <MemoPreview memo={memo} /> : <DataBuildFailure title="No memo passed strict source mode" />}</CardBody>
          </Card>
        </div>
      </Section>
    </>
  )
}

export default MemosPage
