# Known limitations

Version: `0.1.0-beta.0`

- Live OpenAI output quality has not been verified in this workspace because no `OPENAI_API_KEY` is available.
- Expert blind review and real anonymized founder cases have not yet been completed.
- Automated validation checks citation structure and observed URLs, not full semantic entailment.
- The HTTP API is synchronous and is not a production multi-tenant service.
- SQLite storage is local and not encrypted by the package.
- The SQLite adapter uses the built-in `node:sqlite`. It works without a flag on the supported
  Node 22.14 minimum, but Node 22 labels that API experimental and emits a warning when the adapter
  is constructed; Node 24 is the recommended runtime and both versions are tested in CI.
- Ubuntu is CI-verified on Node 22.14 and 24, and macOS arm64 is locally verified on those versions.
  Windows is not CI-verified in this beta; filesystem permission hardening is best-effort there.
- Only OpenAI Responses API and SQLite have first-party adapters.
- Only B2B SaaS and AI-native industry packs are included.
- Jurisdiction guidance initially recognizes the United States and Mainland China, and only as official research entry points.
- Portfolio insights use transparent deterministic heuristics; they do not infer personality and require user correction.
- Model aliases, pricing, behavior and provider policies can change after publication.
- No local-model adapter, Cloudflare adapter, D1 adapter, PostgreSQL adapter, job queue or UI is included.
- The project does not automate investor outreach, public fundraising, applications, payments, signing or publishing.

These limitations block a stable quality claim where noted, but do not prevent an explicitly labeled beta for technical feedback.
