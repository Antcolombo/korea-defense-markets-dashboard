# Data Ownership

## Modes

Set `RESEARCH_DATA_MODE` to one of:

- `live`: latest eligible provider-backed Postgres rows.
- `snapshot`: Postgres rows at or before `DEMO_AS_OF_DATE`.
- `generated`: generated JSON adapters only; database access is disabled.

Backward compatibility: an unset mode with `DEMO_AS_OF_DATE` selects `snapshot`; otherwise it selects `live`. Snapshot mode requires a valid `YYYY-MM-DD` date.

`unavailable` is a result state, not a configured mode. Unsupported generated datasets return unavailable or empty feature state; they never borrow live rows or fabricate values.

## Authority

- Provider-backed prices, signals, positioning, crowding, fundamentals, estimates, and research snapshots: Postgres in live/snapshot modes.
- Events and legacy reference datasets: generated JSON when explicitly requested by a generated adapter.
- Pitches and decisions: Postgres for writes. Missing database means read-only fallback where already supported.

Every research API envelope reports `dataMode`, provenance, coverage, active gaps, deferred gaps, and generation time.

Large generated price history is filtered server-side by requested ticker and window before delivery.

## Generated dataset classification

Generated files are never an implicit fallback for Postgres market rows. The explicit adapters under `src/lib/data` are the only runtime entry points.

| Classification | Datasets | Runtime rule |
| --- | --- | --- |
| Supported generated-mode sources | `assets`, `events`, `eventReturns`, `prices`, `themes`, `companies`, `koreaMacro`, `semisCycle`, `energyResearch`, `sourceAudit` | Read only through a generated adapter; unsupported feature fields remain unavailable. |
| Legacy/reference views | `marketTape`, `companyCoverage`, `eventTape`, `ideaLedger`, `weeklyReview`, `researchArtifacts`, `masteryPipeline`, `memos`, `riskIndex` | Reference/research-OS material only; never substitutes for live or snapshot Postgres rows. |
| Private/user material | `privateTradeJournal` | Not a market-data fallback and never loaded into public workspace responses. |
| Ingestion intermediates | `raw/*` | Pipeline input only; never imported by frontend runtime code. |
| Obsolete candidates | none currently | Removal requires a separate usage audit and compatibility decision. |

Static taxonomy/reference material may appear beside a configured market mode, but must retain its own source provenance. This is not a market-row fallback: live and snapshot loaders for rotation, reports, risk, PM, pitches, and decisions never substitute generated market rows. The event-study module is an explicit legacy/reference generated adapter. Generated mode disables Prisma centrally.
