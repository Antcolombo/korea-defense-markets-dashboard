import Link from 'next/link'

export function DataBuildFailure({ title = 'Data build failed' }: { title?: string }) {
  return (
    <div className="workbench-panel p-4">
      <p className="workbench-kicker text-danger">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted">
        Strict source mode is enabled. Run provider ingestion with working news RSS access, configured market prices, FRED, OpenDART, and SEC EDGAR configuration, then rerun the source audit.
      </p>
      <Link href="/source-audit" className="mt-4 inline-flex min-h-8 items-center rounded-md border border-[rgba(80,210,193,0.45)] bg-[rgba(80,210,193,0.12)] px-3 text-sm font-semibold text-ink hover:bg-[rgba(80,210,193,0.22)]">
        View source audit
      </Link>
    </div>
  )
}
