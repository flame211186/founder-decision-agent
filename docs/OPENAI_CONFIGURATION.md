# OpenAI configuration

Version: beta

## Defaults

- Quick: `gpt-5.6-terra`, reasoning effort `medium`.
- Deep: `gpt-5.6-sol`, reasoning effort `high`.
- API surface: Responses API.
- Storage: every request sets `store: false`.
- Web search: quick `0`; deep configurable, default cap `10`.

Override model aliases:

```bash
export FOUNDER_DECISION_QUICK_MODEL="your-model"
export FOUNDER_DECISION_DEEP_MODEL="your-model"
```

Model names are adapter configuration, not public report contracts. Changes should be evaluated against fixtures, live smoke cases, factuality sampling and expert review before becoming new defaults.

## Credentials

```bash
export OPENAI_API_KEY="..."
```

The default adapter fails fast with `MISSING_API_KEY` when the variable is absent. The SDK also accepts an `apiKey` constructor option, but applications should inject it from a secret manager and never serialize the adapter options.

## Stable safety identifier

Applications may set `FOUNDER_DECISION_SAFETY_IDENTIFIER` or pass `safetyIdentifier` in the SDK request. The adapter hashes it before sending `safety_identifier` to OpenAI. It is not copied into reports or manifests.

Use a stable application-level user identifier that does not directly identify a person. Do not use an email address, government identifier or raw profile content.

## Cost control

The user who owns the API key pays provider charges. Default budgets are guardrails:

- quick: 2 model calls, 0 searches, 2 minutes;
- deep: 8 model calls, 10 searches, 15 minutes.

The workflow may use fewer calls. Deep mode reserves final synthesis and one repair call, skipping optional role passes when the configured cap is low.

Always review current provider pricing and organizational spend limits. This project intentionally does not estimate a fixed per-report price because models, token counts and web-search prices change.
