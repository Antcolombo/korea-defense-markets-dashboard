# Ingestion Pipeline

Frontend compilation and data refresh are independent.

```text
npm run build          # Next.js compilation only
npm run pipeline:data  # ingest → validate → audit
npm run verify:deploy  # lint + database data audit
```

Generated-data refresh remains `npm run build:generated` and runs through the dedicated GitHub workflow.

Provider runs are created before network work begins and finalized afterward. Metadata records dataset, ticker, lifecycle, freshness deadline, and error category. An interrupted run remains visible as `running`/partial. Price writes use unique point-in-time keys, making retries idempotent and preserving the last successful dataset after failure.

Frontend requests never fetch providers. They read existing Postgres rows or explicit generated datasets according to configured data mode.
