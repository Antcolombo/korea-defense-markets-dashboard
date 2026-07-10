# Architecture

The terminal is a Pages Router modular monolith. Delivery code calls feature application services. Application services use pure domain rules and typed persistence ports. Prisma and provider-specific behavior stay in infrastructure or platform adapters.

```text
src/pages + src/shell
        ↓
src/features/*/application + feature UI
        ↓
src/features/*/domain + application ports
        ↓
src/features/*/infrastructure + src/platform/persistence
        ↓
Postgres / generated datasets
```

## Ownership

- `src/contracts`: neutral shared wire and workspace contracts.
- `src/features`: business capability code, loaders, domain rules, application services, infrastructure, and feature UI.
- `src/shell`: terminal layout, navigation, and global interaction.
- `src/platform`: data-mode policy, persistence composition, observability, and runtime adapters.
- `src/components/ui`: generic UI primitives.
- `scripts`: ingestion, validation, audits, tests, and build-time transforms.

Compatibility barrels remain under `src/lib/research` while callers migrate. New code should import the owning feature or platform module.

## Enforced rules

`npm run lint:architecture` rejects dependency cycles, neutral contracts importing implementations, domain code importing delivery/infrastructure, and Prisma access outside persistence owners.

Pages Router stays in place. Route paths and successful API envelopes remain backward-compatible.
