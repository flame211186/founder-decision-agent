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

For maintainer live smoke runs, a local `.env` file is also supported. It is ignored by Git and
should be mode `0600`. Never send the key through chat, commit it, or put it directly in shell
history.

The default adapter fails fast with `MISSING_API_KEY` when the variable is absent. The SDK also accepts an `apiKey` constructor option, but applications should inject it from a secret manager and never serialize the adapter options.

## Structured output compatibility

OpenAI Structured Outputs accepts only a JSON Schema subset. The adapter derives a generation
schema that removes unsupported composition and uniqueness keywords, converts constants to typed
single-value enums, makes optional object fields required-but-nullable, and retains only supported
string formats. The public canonical Schema is not weakened: every generated report is parsed and
then checked again with the full canonical and semantic validators.

The subset regression test checks unsupported keywords, typed enums, required object properties
and `additionalProperties: false`. Provider-side live smoke is still required because OpenAI may
change validation behavior.

## Stable safety identifier

Applications may set `FOUNDER_DECISION_SAFETY_IDENTIFIER` or pass `safetyIdentifier` in the SDK request. The adapter hashes it before sending `safety_identifier` to OpenAI. It is not copied into reports or manifests.

Use a stable application-level user identifier that does not directly identify a person. Do not use an email address, government identifier or raw profile content.

## Cost control

The user who owns the API key pays provider charges. Default budgets are guardrails:

- quick: 2 model calls, 0 searches, 2 minutes;
- deep: 8 model calls, 10 searches, 15 minutes.

The workflow may use fewer calls. Deep mode reserves final synthesis and one repair call, skipping optional role passes when the configured cap is low.
Quick mode always forces the search cap to `0`. Deep mode requires at least one allowed search;
choose quick mode for a zero-search evaluation. The OpenAI adapter records the number of actual
`web_search_call` items, while deduplicating query text only for display.

Always review current provider pricing and organizational spend limits. This project intentionally does not estimate a fixed per-report price because models, token counts and web-search prices change.

If the API returns `429 You exceeded your current quota`, OpenAI documents two possible causes:
the project has no remaining credits or the organization reached its maximum monthly spend. The
Key owner must add credits under API Billing or raise the organization limit. A ChatGPT
subscription does not supply this project's API budget.

`npm run eval:quality` is a no-cost planning command unless `--execute` is added. Its default three
repeat runs plus two counterfactuals create five evaluations, so the printed aggregate ceiling is
five times the per-evaluation cap: quick defaults to at most 10 model calls and 0 searches; deep
defaults to at most 40 model calls and 50 searches. These are hard ceilings, not expected usage or
price estimates. Use `--repeats 2..5` and the budget flags to lower or raise them deliberately.
