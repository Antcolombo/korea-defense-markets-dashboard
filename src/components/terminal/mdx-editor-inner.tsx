import {
  MDXEditor,
  BoldItalicUnderlineToggles,
  InsertTable,
  ListsToggle,
  UndoRedo,
  headingsPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin
} from '@mdxeditor/editor'

export function MdxEditorInner({
  markdown,
  onChange
}: {
  markdown: string
  onChange: (value: string) => void
}) {
  return (
    <MDXEditor
      markdown={markdown}
      onChange={onChange}
      contentEditableClassName="terminal-mdx-content"
      className="terminal-mdx-editor"
      plugins={[
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        tablePlugin(),
        thematicBreakPlugin(),
        markdownShortcutPlugin(),
        toolbarPlugin({
          toolbarContents: () => (
            <>
              <UndoRedo />
              <BoldItalicUnderlineToggles />
              <ListsToggle />
              <InsertTable />
            </>
          )
        })
      ]}
    />
  )
}
