# Security and privacy

Version: beta  
Last updated: 2026-07-28

## Threat model

Ideas, founder profiles, research context and reports may contain confidential commercial or personal data. Treat them as sensitive even when they do not contain conventional identity fields.

The beta protects against accidental API-key persistence, unconstrained model/search usage, prompt instructions embedded in research pages, invalid structured reports, unauthenticated non-loopback HTTP exposure and accidental MCP deletion/profile storage.

It is not a multi-tenant security boundary and has not received an independent penetration test.

## BYOK and cost

The default adapter reads `OPENAI_API_KEY` from the environment. Calls are billed by OpenAI to the account that owns that key. Founder Decision Agent does not proxy, resell or subsidize these calls.

The key is not placed in:

- prompts;
- report JSON or Markdown;
- run manifests or workflow events;
- SQLite;
- test fixtures or normal error messages.

Do not pass keys as CLI arguments. Use an environment secret manager. Revoke and rotate any key that appears in an issue, log or commit.

## Provider transmission

Quick mode sends the idea, selected founder profile, answers and industry/jurisdiction context to the configured model provider, but does not invoke web search.

Deep mode additionally uses web search and sends research/role context to later model passes. Do not use deep mode for material that cannot be transmitted to the configured provider.

OpenAI requests set `store: false`. This disables stored application state for the Responses API but does not itself override provider abuse-monitoring retention or organizational data-control policy. Review the current [OpenAI data controls](https://platform.openai.com/docs/guides/your-data) before processing sensitive information.

## Local storage

SQLite is local-first, not encrypted-at-rest by this project. The file is created with POSIX mode `0600` where supported. Device encryption, backups, malware protection and access controls remain the operator's responsibility.

- Use `--no-persist` to avoid saving an evaluation.
- Use `history export` before migration or deletion.
- CLI deletion requires `--yes`.
- MCP profile save and deletion require `confirm: true`.

Database deletion removes the selected logical record but does not guarantee forensic erasure from filesystem journals, snapshots or backups.

## Prompt injection

Prompts explicitly treat user ideas, files, webpages and tool output as untrusted data rather than instructions. Deep external facts are accepted only when they point to URLs observed in the research step.

These controls reduce risk but do not prove semantic citation support or eliminate all model/tool injection. The beta performs no external writes and exposes no browser, email, payment, publishing or investor-contact tools.

## HTTP deployment

The built-in server is a local/integration surface:

- loopback is the default;
- non-loopback binding requires a bearer token;
- application responses use `Cache-Control: no-store`;
- request bodies default to a 1 MB cap.

For public deployment add TLS, secret rotation, per-user authorization, tenant-separated storage, rate limits, audit policy, abuse controls and a job queue. Do not expose the beta server directly to the internet as a complete SaaS security boundary.

## Regulated and high-stakes use

The software does not provide securities, legal, tax, medical or personalized financial advice. Jurisdiction packs provide official research entry points only. Current local professional review is required before acting on fundraising, entity, tax, privacy, licensing or regulated-industry conclusions.

Report validation proves structure and internal consistency, not professional correctness.
