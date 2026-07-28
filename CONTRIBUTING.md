# Contributing

Founder Decision Agent welcomes focused bug reports, evaluation cases, documentation fixes and adapter proposals.

## Before coding

Read `AGENTS.md`, `PROJECT_STATE.yaml`, the project charter, requirements traceability, decisions, roadmap and worklog. Every implementation change must map to one or more `REQ-*` items.

## Development

```bash
npm ci
npm run check
npm test
npm run test:coverage
npm run validate:fixtures
npm run build
```

Add deterministic offline tests for behavior changes. Do not make ordinary CI depend on a paid model or real web search. Live-model evals belong in a separately authorized run.

## Evaluation cases

Never submit a real confidential idea, identity, API key, private investor material or customer record. Use synthetic or consented, anonymized cases and state the failure-taxonomy category the case protects.

Do not mark a requirement verified solely because code or a test exists. Add direct evidence to `docs/REQUIREMENTS_TRACEABILITY.md`.

## Pull requests

Keep changes scoped and explain:

- linked requirement IDs;
- behavior and public-contract impact;
- validation run;
- known limitations and unproven claims;
- security/privacy impact;
- migration path for a Schema change.

Framework, model or provider changes need evidence that they improve a confirmed requirement. Complexity is not itself a contribution.
