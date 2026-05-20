# Data Sources

The v2 data model uses automated ingestion with provenance.

## Providers
- Google News RSS: public event/article metadata.
- Alpha Vantage: market prices, FX, commodities, and selected series when an API key is configured.
- FRED: macroeconomic and rates series when an API key is configured.
- SEC EDGAR: U.S. company filing metadata and company facts.
- OpenDART: Korean company disclosure integration when an API key and corp-code mapping are configured.

## Rules
- No fabricated article titles, dates, source names, or URLs.
- No fabricated market prices or returns.
- No fabricated company filing details.
- Derived classifications must be labeled as derived.
- No fallback, demo, stale, or curated seed data is used in strict source mode.
- Missing provider data is an ingestion or build error, not a publishable dashboard state.

## Local Setup

Create `.env.local` from `.env.example`, fill the real provider keys, then run:

```bash
npm run setup:check
npm run ingest
npm run audit:data
```

The ingestion scripts load `.env.local` automatically.
