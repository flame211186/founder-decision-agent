# Public API

Version: beta  
Last updated: 2026-07-28

## Shared contracts

The SDK, CLI, MCP and HTTP interfaces share the same domain workflow and JSON contracts in `schemas/`.

- Input: `evaluation_request.v1`
- Primary output: `evaluation_report.v1`
- Founder profile: `founder_profile.v1`
- Portfolio input: `portfolio_request.v1`
- Run metadata: `run_manifest.v1`
- Portfolio output: `portfolio_report.v1`

Schema versions change only for contract changes. Prompt and workflow versions are recorded separately in each run manifest.

## SDK

```ts
const agent = new FounderDecisionAgent({
  model: new OpenAiAdapter(),
  storage: new SqliteStorage("./data.sqlite"),
  quickModel: "gpt-5.6-terra",
  deepModel: "gpt-5.6-sol",
  onEvent(event) {
    console.error(event);
  }
});
```

`FounderDecisionAgent.evaluate(request)` returns:

```ts
{
  report: EvaluationReport;
  markdown: string;
  manifest: RunManifest;
}
```

The `ModelAdapter` port supports `analyze`, `generateReport` and optional `research`. Deep mode returns `RESEARCH_UNAVAILABLE` when the adapter has no research implementation. `StorageAdapter` supports evaluation/profile save, read, list, export and deletion.

The SDK exports `validateEvaluationRequest`, `validateFounderProfile`,
`validatePortfolioRequest` and their public Schema getters. Runtime entry points reject invalid
public inputs before model calls, persistence or portfolio inference.

## Error contract

Errors use `AgentError` and one of:

- `INVALID_INPUT`
- `UNAUTHORIZED`
- `MISSING_API_KEY`
- `MODEL_REFUSAL`
- `MODEL_INCOMPLETE`
- `MODEL_OUTPUT_INVALID`
- `BUDGET_EXHAUSTED`
- `RESEARCH_UNAVAILABLE`
- `VALIDATION_FAILED`
- `STORAGE_ERROR`
- `NOT_FOUND`
- `INTERNAL_ERROR`

No invalid model report is silently returned as a successful evaluation. When generation plus repair cannot satisfy canonical validation, the workflow throws `VALIDATION_FAILED`.

## HTTP API

Start with `founder-decision-server`. The default address is `127.0.0.1:8787`.

Environment:

- `OPENAI_API_KEY`: required by the default adapter.
- `FOUNDER_DECISION_HOST`: bind host; default `127.0.0.1`.
- `PORT`: bind port; default `8787`.
- `FOUNDER_DECISION_SERVER_TOKEN`: bearer token. Required for non-loopback binding.
- `FOUNDER_DECISION_DB`: SQLite path.
- `FOUNDER_DECISION_QUICK_MODEL` / `FOUNDER_DECISION_DEEP_MODEL`: optional model overrides.

Routes:

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/health` | Public health check |
| `POST` | `/v1/evaluations` | Run an evaluation and optionally persist it |
| `GET` | `/v1/evaluations` | List local report summaries |
| `GET` | `/v1/evaluations/:id` | Read one stored outcome |
| `DELETE` | `/v1/evaluations/:id` | Permanently delete one local report |
| `POST` | `/v1/portfolio-analyses` | Deterministic cross-report analysis |
| `GET` | `/v1/profiles/:id` | Read a local founder profile |
| `PUT` | `/v1/profiles/:id` | Save a local founder profile |
| `DELETE` | `/v1/profiles/:id` | Permanently delete a local founder profile |
| `GET` | `/v1/export` | Export all local evaluations and profiles |

All routes except `/health` require `Authorization: Bearer TOKEN` when a token is configured. Responses include `Cache-Control: no-store`.

Beta limitation: evaluation requests are synchronous. A deep run can occupy a connection for up to its configured wall-time budget. Production deployments should add a job queue, per-user isolation, rate limits, TLS and durable remote storage without changing the domain contracts.

## MCP tools

- `evaluate_idea`
- `analyze_portfolio`
- `get_evaluation`
- `list_evaluations`
- `delete_evaluation`
- `save_founder_profile`
- `delete_founder_profile`

Sensitive profile persistence and destructive tools require literal `confirm: true`. The MCP server communicates over stdio and writes only to its configured local SQLite file.
The same tools are exercised through an in-memory MCP client/server protocol test; this is distinct
from merely checking that the stdio process starts.

## Compatibility policy

During beta, minor versions may add required validation rules while keeping `*.v1` JSON shapes compatible. A breaking public Schema change requires a new Schema version and a documented migration. Stable `v1` will use semantic versioning.
