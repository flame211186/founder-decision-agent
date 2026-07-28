# Evaluation and release gates

Version: beta  
Last updated: 2026-07-28

## What is automatically tested

- TypeScript strict compilation.
- Versioned JSON Schema compilation and cross-schema references.
- Canonical report Schema.
- Claim/evidence cross-references and external-evidence fields.
- Quick-mode prohibition on external facts.
- D1–D12 exact coverage.
- Verdict/disposition/experiment consistency.
- Bear/base/bull scenario-set consistency.
- Fatal-risk scope.
- Model inability to self-mark expert review.
- Configurable quick/deep budgets.
- SQLite save, export and deletion.
- Runtime validation of versioned evaluation, founder-profile and portfolio inputs.
- SDK workflow, HTTP routes/authentication and deterministic portfolio analysis.
- MCP protocol discovery, evaluation, persistence, explicit-consent and portfolio calls over an
  in-memory transport.
- Five structurally complete fixtures covering all five verdicts.

Run:

```bash
npm run check
npm test
npm run test:coverage
npm run validate:fixtures
npm run validate:docs
npm run build
```

The maintainer-only live smoke is:

```bash
npm run eval:live -- --mode quick
```

It uses a fixed synthetic B2B SaaS idea, `persist: false`, the normal OpenAI adapter and the
canonical workflow. A pass requires a completed manifest, an independently valid report, no budget
overrun, zero quick-mode searches/external facts, no false human-review claim, and no raw API key or
safety identifier in the outcome. The full artifact is written to a permission-restricted temporary
path and remains human-review status `not_reviewed`.

## What is not automatically proven

- Whether a citation semantically entails the exact claim.
- Whether sources are complete, conflict-free or still current.
- Whether the business judgment is correct.
- Whether recommendations are practically useful to real founders.
- Whether a provider behaves consistently across model changes.
- Whether an idea will succeed or raise capital.

## Beta gate

A public beta candidate requires:

1. all offline tests and fixture validators pass;
2. package build and clean-install smoke test pass;
3. no known P0/P1 structural or safety failure;
4. security/privacy/limitations are documented;
5. live OpenAI smoke evaluation passes with a user-provided test key;
6. release is explicitly labeled beta.

If the live key is unavailable, code may be packaged but the absence of live validation must remain explicit.

## Stable v1 gate

Stable `v1` is blocked until all of the following exist:

1. 3–5 real, consented and anonymized founder cases;
2. independent expert blind review using `EXPERT_REVIEW_PROTOCOL.md`;
3. zero unresolved P0/P1 findings;
4. factuality/citation-support sampling;
5. counterfactual sensitivity and repeat-run stability results reported separately;
6. one clean installation from the published npm artifact;
7. one independent SDK or HTTP integration contract test;
8. release notes that separate proven behavior from open limitations.

Model self-critique, JSON validity, test presence, exit code zero and report length cannot substitute for these gates.

## Fixture policy

Fixtures contain synthetic or intentionally anonymized ideas only. Never add a real confidential idea, identity, API key, private investor material or customer record.

When evaluation behavior changes, add or update the smallest fixture that demonstrates the intended behavior and the failure taxonomy category it protects.
