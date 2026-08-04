# Contributing

Self Improvement Tracker is local-first. Contributions must preserve offline operation, deterministic core behavior, accessible controls, and the module boundaries in `docs/adr/`.

Before submitting a change, run:

```bash
npm run typecheck
npm run test:run
npm run build
```

New runtime dependencies require a compatible permissive license and an entry in `THIRD_PARTY_NOTICES.md`. Do not add telemetry, advertising, remote assets, cloud accounts, or GPL/AGPL/SSPL/NC dependencies.
