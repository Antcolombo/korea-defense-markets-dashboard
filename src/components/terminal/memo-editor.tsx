import dynamic from 'next/dynamic'

const MdxEditorInner = dynamic(
  () => import('@/components/terminal/mdx-editor-inner').then(mod => mod.MdxEditorInner),
  {
    ssr: false,
    loading: () => (
      <div className="grid min-h-[260px] place-items-center rounded-md border border-border bg-background/45">
        <p className="font-mono text-xs text-muted-foreground">Loading editor</p>
      </div>
    )
  }
)

export function MemoEditor({
  markdown,
  onChange
}: {
  markdown: string
  onChange: (value: string) => void
}) {
  return <MdxEditorInner markdown={markdown} onChange={onChange} />
}
