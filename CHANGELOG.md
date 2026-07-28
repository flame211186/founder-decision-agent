# Changelog

All notable changes follow semantic versioning once stable.

## 0.1.0-beta.0 — Unreleased

### Added

- Explicit TypeScript quick/deep evaluation workflow.
- OpenAI Responses API BYOK adapter with `store: false`.
- Configurable model, search, wall-time and output-token budgets.
- Actual OpenAI web-search call accounting in run manifests.
- Strict `evaluation_report.v1` generation and deterministic semantic validation.
- Five verdicts with enforced active/park/stop dispositions.
- B2B SaaS and AI-native industry packs.
- United States and Mainland China official jurisdiction entry points.
- Local SQLite history/profile storage, export and deletion.
- Built-in `node:sqlite` storage driver with no runtime native-addon install script.
- TypeScript SDK, CLI, MCP server and Node HTTP API.
- Deterministic portfolio analysis.
- Versioned `portfolio_request.v1` contract and runtime validation for evaluation, profile and
  portfolio inputs.
- In-memory MCP protocol integration tests covering evaluation, persistence, consent and portfolio
  tools.
- Working `eval:offline` quality-gate command wired into CI and release checks.
- Privacy-preserving `founder-review-validate` command with structural, blinding, rubric,
  adjudication and duplicate checks; it never self-declares the stable gate passed.
- No-cost-by-default `founder-quality-eval` plan with explicit BYOK execution, configurable
  repeat count, counterfactual diagnostics and human citation-review sampling.
- Pseudonymous `real_case_consent.v1` contract and `founder-consent-validate` command enforcing
  declared processing scopes, withdrawal consistency and independently verified de-identification.
- Offline fixtures covering all five verdicts.
- Permission-restricted live OpenAI smoke harness and integrity-aware npm release workflow.

### Limitations

- Stable release blocked on live-model validation, expert blind review and real anonymized cases.
