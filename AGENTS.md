# Agent Notes

## Communication

Use caveman mode from `/Users/ant/.agents/skills/caveman/SKILL.md`.

## Fast Read

Start with these files:
- `package.json`
- `src/pages/`
- `src/lib/research/`
- `src/lib/data/`
- `scripts/`
- `src/styles/`

Skip unless task needs them:
- `node_modules/`
- `.next/`
- `.vercel/`
- `test-results/`
- `src/generated/` except when debugging generated data shape
- `src/generated/raw/` except ingestion/audit work
- `public/screenshots/` except visual/docs work
- `package-lock.json` except dependency changes
- `prisma/migrations/` except database schema work

## Current Architecture

Pages and API routes live in `src/pages`. Shared research DTO/API/page helpers live in `src/lib/research`. Data ingestion/build/audit scripts live in `scripts`, with shared script helpers under `scripts/lib`.

Styles are split by ownership:
- `globals.css`: base globals only
- `theme-tokens.css`: shadcn/theme variables
- `terminal-layout.css`: shell/navigation
- `workbench.css`: reusable workbench surfaces
- `command-center.css`: home command center
- `reports.css`: stock report workbench
- `site-index.css`: public site/index views

## Checks

Use:
- `npm run lint`
- `npm run lint:styles`
- targeted script smoke tests with `npx tsx scripts/<name>.ts`

Full lint may fail if the worktree is missing WIP component directories. Do not restore or delete user WIP without explicit request.
