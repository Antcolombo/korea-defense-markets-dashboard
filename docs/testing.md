# Testing

Required local gates:

```bash
npm run lint
npm run test:api
npm run test:workspace
npm run test:repositories
npm run test:ingestion
npm run test:pitches
npm run test:trust
npm run test:pm
npm run test:decisions
npm run build
```

Use `npm run audit:data` only with configured Postgres. Use `npm run smoke:click` with a running application.

Coverage responsibilities:

- architecture: cycles and forbidden dependency direction
- API: method handling, validation, authorization, error categories, envelope behavior
- workspace: module resolution, loader results, live/snapshot/generated configuration
- trust: provenance, availability, deferred datasets, coverage
- PM: deterministic clock, sizing, factors, risk, missing-source behavior
- decisions and pitches: readiness, lifecycle validation, persistence fallback, editor authorization
- repositories: pitch and decision application services against deterministic in-memory fakes

Sandboxed `tsx` may fail creating its IPC socket. Rerun with approved elevated execution; do not treat that environmental failure as a product regression.
