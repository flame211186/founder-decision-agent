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
npm run eval:offline
npm run validate:fixtures
npm run validate:docs
npm run build
```

`eval:offline` is the single offline evaluation gate: it runs the coverage-enforced test suite and
then validates all five canonical fixture reports. The individual commands remain available for
diagnosis.

The maintainer-only live smoke is:

```bash
npm run eval:live -- --mode quick
```

It uses a fixed synthetic B2B SaaS idea, `persist: false`, the normal OpenAI adapter and the
canonical workflow. A pass requires a completed manifest, an independently valid report, no budget
overrun, zero quick-mode searches/external facts, no false human-review claim, and no raw API key or
safety identifier in the outcome. The full artifact is written to a permission-restricted temporary
path and remains human-review status `not_reviewed`.

The reproducible live quality harness is no-cost by default:

```bash
# prints the cases and hard aggregate ceilings; makes no API request
npm run eval:quality

# explicit BYOK execution
npm run eval:quality -- --mode quick --execute

# configurable 2–5 baseline repeats and per-evaluation ceilings
npm run eval:quality -- --mode deep --repeats 3 \
  --max-model-calls 8 --max-search-calls 10 \
  --max-wall-time-minutes 15 --execute
```

The default is three baseline repeats plus two single-variable counterfactuals. Output reports
verdict/stage/score stability, the observed counterfactual changes and a deterministic deep-mode
citation sample. All sampled claims remain `not_reviewed`, and `stable_gate_status` is always
`not_assessed`; the harness does not invent a correctness threshold or replace expert judgment.
Artifacts use permission-restricted temporary files. The API-key owner pays any provider charges.

Private expert-review records can be checked without copying them into the repository:

```bash
npm run validate:reviews -- /private/path/to/review-records

# after installing the npm package
founder-review-validate /private/path/to/review-records
```

This validates the review form, required deidentified-case/report SHA-256 bindings and deterministic
cross-field invariants, and emits aggregate counts plus local issue locations, never review bodies.
Its summary deliberately reports
`stableGateStatus: not_assessed`; consent, reviewer independence, expertise and adjudication remain
human evidence.

Before a real case is evaluated or reviewed, validate its separate pseudonymous consent receipt:

```bash
npm run validate:consents -- /private/path/to/consent-records

# after installing the npm package
founder-consent-validate /private/path/to/consent-records
```

An `eligible` receipt requires explicit agent, external-model and deidentified-review scopes,
withdrawal and retention disclosures, low-risk de-identification, an independent second-person
check, artifact SHA-256 and an available deletion process. Public-release consent is separate and
may remain false. Raw submissions, identities and contact details stay outside the repository.
This validator checks declarations and consistency; it cannot authenticate the receipt, inspect the
raw source, detect every identifier or establish legal compliance.

After a deep live-quality run, a human reviewer records citation support, repeat stability and both
counterfactual judgments in `live_quality_review.v1` and binds the review to the exact summary
bytes:

```bash
npm run validate:quality-review -- \
  /private/path/to/live-quality-summary.json \
  /private/path/to/live-quality-review.json

# after installing the npm package
founder-quality-review-validate \
  /private/path/to/live-quality-summary.json \
  /private/path/to/live-quality-review.json
```

The validator requires exact citation-claim and counterfactual coverage, checks severity and
adjudication consistency, and reports unresolved findings separately by P0–P3. It cannot determine
whether a human actually read each source or whether the reviewer is independent.

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

The final private mechanical audit links every eligible consent to a case/version, every expert
review to its frozen report, the human quality review to the exact live-quality summary, and the
published-install, independent-integration and release-note files to a frozen policy:

```bash
npm run audit:stable -- \
  --consents /private/path/to/consents \
  --reviews /private/path/to/expert-reviews \
  --reports /private/path/to/frozen-reports \
  --quality-summary /private/path/to/live-quality-summary.json \
  --quality-review /private/path/to/live-quality-review.json \
  --release-evidence /private/path/to/stable-release-evidence.json
```

The manifest uses `stable_release_evidence.v1`. A successful result is only
`evidence_ready_for_human_release_decision`; `stableGateStatus` remains `not_assessed`. The audit
cannot authenticate consent, prove that pseudonymous cases are real, verify reviewer credentials or
independence, inspect npm registry history, or replace the recorded human release decision.

## Fixture policy

Fixtures contain synthetic or intentionally anonymized ideas only. Never add a real confidential idea, identity, API key, private investor material or customer record.

When evaluation behavior changes, add or update the smallest fixture that demonstrates the intended behavior and the failure taxonomy category it protects.
