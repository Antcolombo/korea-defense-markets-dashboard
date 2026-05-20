# Methodology

This project uses generated source-provenance data files. It does not invent event facts, market prices, company descriptions, or memo conclusions when provider data is unavailable. In strict source mode, provider failures and empty core datasets block publication.

## Source Vs Derived Fields
Source fields come directly from providers, such as event title, source URL, article domain, filing date, ticker, and daily close where available.

Derived fields are deterministic calculations or classifications, such as:

- Event category
- Affected themes
- Affected assets
- Market-regime labels
- Source-readiness checks
- Event-to-market return windows
- Memo summaries assembled from sourced records

Each generated record includes:

- provider
- source URL
- source name
- retrieval timestamp
- published timestamp where available
- derived flag
- methodology note
- data-quality status

## Market Regime Board
The product UI no longer converts event text into a tradeable numeric score. Event metadata is too noisy as a standalone proxy for market movement.

The regime board starts with sourced market data:

- FX pressure from USD/KRW tape
- Rates pressure from U.S. 10Y tape
- Equity tape from EWY, SPX, and VIX
- Semis tape from SOXX, SMH, NVDA, TSM, and MU
- Defense tape from liquid U.S. aerospace and defense expressions
- Source coverage and explicit backlog status

Events remain useful for context, sourcing, taxonomy, and research prompts. They do not become a buy/sell score without confirmation from price, filings, fundamentals, or repeatable return studies.

## Limitations
Provider coverage can be incomplete. API keys, provider rate limits, licensing constraints, source availability, holidays, and disclosure timing can affect coverage. Missing values must not be estimated.

Recent events may not have complete forward market windows. In that case, the event-return lab uses the available trailing sourced close-price window and labels the output as derived correlation context, not causal impact.

## Publication Gate

`npm run audit:data` checks provider status, required generated dataset counts, and provenance fields. `npm run build` runs that audit before `next build`, so the deployed site cannot ship with empty events, prices, market-regime inputs, event returns, Research OS registries, or memos.
