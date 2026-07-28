# Founder Decision Agent

Evidence-calibrated decision support for independent founders and idea-to-pre-seed teams.

Founder Decision Agent turns a natural-language idea into a strict, inspectable report: a five-level verdict, separated value and risk assessments, assumptions and unknowns, a realistic disposition plan, experiments when authorized, resource scenarios, and fundraising readiness.

It is not a startup-success predictor, investment adviser, lawyer, tax adviser, or automated fundraising service.

> Beta status: the TypeScript implementation, offline contracts and fixtures are tested. Live OpenAI quality, expert blind review and 3–5 real anonymized cases remain release gates for stable `v1`.

## 中文说明

这是一个面向独立开发者、个人创业者和早期团队的创业想法决策 Agent。它不会用一个总分假装预测成功，而是区分：

- 用户价值、可持续商业价值、VC 适配度和创始人适配度；
- 用户提供、外部事实、确定性计算、模型推断、情景假设和未知；
- 推进、先验证、重构、暂存、停止五种结论；
- 主动验证、暂存观察和停止关闭三种处置方式。

默认使用用户自己的 OpenAI API Key（BYOK）。OpenAI 模型与联网搜索费用由 Key 所属账户承担，本项目不代付、不加价，也不保存 API Key。

## Install

Requirements: Node.js `>=22.14`; Node 24 is recommended. On Node 22, constructing the built-in
SQLite adapter emits an upstream experimental-feature warning.

```bash
npm install -g @sangfei/founder-decision-agent@beta
export OPENAI_API_KEY="your-key"
founder-decision evaluate "为小型代理机构做一个客户反馈 SaaS"
```

Until the npm beta is published, clone the repository and run:

```bash
npm ci
npm run build
node dist/cli.js evaluate "A workflow tool for small agencies"
```

Never put a real key in a source file, fixture, command history, issue, or commit. Prefer a shell secret manager or local environment configuration.

## Quick and deep modes

| Mode | Default model-call cap | Search cap | Wall-time cap | Intended use |
|---|---:|---:|---:|---|
| `quick` | 2 | 0 | 2 minutes | Fast first pass; externally variable facts remain unknown |
| `deep` | 8 | 10 | 15 minutes | Explicit web research plus supporter, opponent and verifier passes |

These are configurable safety and cost defaults, not fixed requirements:

```bash
founder-decision evaluate "..." \
  --mode deep \
  --max-model-calls 6 \
  --max-search-calls 5 \
  --max-minutes 10
```

Quick mode always forces searches to `0`; deep mode requires a search cap of at least `1`.

Actual API charges depend on the selected model, tokens and search tool use. Check the current [OpenAI API pricing](https://openai.com/api/pricing/) before running deep evaluations.

## CLI

```bash
# Markdown to stdout; local history is enabled by default
founder-decision evaluate "..." --industry b2b_saas --jurisdiction "中国大陆"

# JSON and Markdown files, without local persistence
founder-decision evaluate --file idea.txt --format both --output ./reports --no-persist

# Deep research in English
founder-decision evaluate "..." --mode deep --language en --industry ai_native

# Founder profile and portfolio
founder-decision init-profile founder-profile.json
founder-decision profile save founder-profile.json
founder-decision portfolio report-a.json report-b.json

# Local data controls
founder-decision history list
founder-decision history export --output export.json
founder-decision history delete REPORT_ID --yes
founder-decision profile delete PROFILE_ID --yes
```

SQLite history defaults to `~/.founder-decision/data.sqlite` and uses Node's built-in SQLite
driver, so installation does not require a native addon build. Use `--no-persist` for an evaluation
that must not be stored.

Platform verification for this beta covers Ubuntu on Node 22.14 and 24 in CI, plus macOS arm64 on
Node 22.14 and 24 locally. Windows is not yet CI-verified; local file-permission hardening is
best-effort there, so Windows users handling sensitive ideas should review directory ACLs or use
`--no-persist`.

## TypeScript SDK

```ts
import {
  FounderDecisionAgent,
  OpenAiAdapter,
  SqliteStorage
} from "@sangfei/founder-decision-agent";

const storage = new SqliteStorage("./founder-decision.sqlite");
const agent = new FounderDecisionAgent({
  model: new OpenAiAdapter(),
  storage
});

const outcome = await agent.evaluate({
  schemaVersion: "evaluation_request.v1",
  idea: "A focused workflow product for small agencies",
  mode: "quick",
  language: "en",
  industryPacks: ["b2b_saas"],
  jurisdiction: "United States",
  persist: true
});

console.log(outcome.report.verdict);
await storage.close();
```

The core depends on `ModelAdapter` and `StorageAdapter` ports. OpenAI and SQLite are default adapters, not domain requirements.

## MCP and HTTP

```bash
founder-decision-mcp
```

The MCP server exposes evaluation, portfolio, history and profile tools. Sensitive profile persistence and destructive tools require an explicit `confirm: true`.

```bash
export FOUNDER_DECISION_SERVER_TOKEN="replace-with-a-secret"
export FOUNDER_DECISION_HOST="0.0.0.0"
founder-decision-server
```

Non-loopback HTTP binding refuses to start without a bearer token. See [API documentation](docs/API.md) for routes and the synchronous deep-mode limitation.

Expert-review records can be validated without placing private records in the repository:

```bash
founder-review-validate /private/path/to/review-records
founder-consent-validate /private/path/to/consent-records
founder-quality-review-validate \
  /private/path/to/live-quality-summary.json \
  /private/path/to/live-quality-review.json
```

The commands check record structure and deterministic consistency only. Consent records are
pseudonymous process receipts and must never contain names, contact details, raw submissions or
secrets. The quality-review command binds human factuality, repeat-stability and counterfactual
judgments to the exact summary SHA-256. None of these commands claims legal compliance, expert
independence or a passed stable-release gate.

Maintainers can link all private gate evidence without copying it into the repository:

```bash
founder-stable-audit \
  --consents /private/path/to/consents \
  --reviews /private/path/to/expert-reviews \
  --reports /private/path/to/frozen-reports \
  --quality-summary /private/path/to/live-quality-summary.json \
  --quality-review /private/path/to/live-quality-review.json \
  --release-evidence /private/path/to/stable-release-evidence.json
```

Even a clean audit only means the declared evidence is mechanically ready for a separate human
release decision. Synthetic IDs, valid JSON or exit code zero do not prove real cases or approve
stable `v1`.

## What a report guarantees—and does not

The implementation enforces versioned JSON Schema for evaluation, founder-profile and portfolio
inputs as well as report outputs, plus claim/evidence references, verdict/disposition consistency,
D1–D12 coverage, scenario structure, citation allowlists for deep mode, numerical traceability
fields and report validation status.

It does **not** prove that a cited page semantically supports every sentence, that the model made the right business judgment, or that the idea will succeed. Automated citation review is always labeled as draft review. Stable `v1` requires the [expert review protocol](docs/EXPERT_REVIEW_PROTOCOL.md).

## Privacy and data

- API keys are read from environment variables and are not written to reports, manifests or SQLite.
- OpenAI requests set `store: false`; provider data-control terms still apply.
- Raw ideas and profiles are sensitive. Local persistence is opt-out, exportable and deletable.
- Quick mode performs no web research. Deep mode sends the idea and relevant profile/context to the configured provider and search tool.
- The software does not contact investors, publish content, submit forms, transfer funds or execute other external writes.

Read [Security and privacy](docs/SECURITY_AND_PRIVACY.md) before evaluating confidential or regulated ideas.

## Architecture

```text
CLI / SDK / MCP / HTTP
          │
Explicit TypeScript workflow
          │
Versioned report + deterministic validators
          │
ModelAdapter / StorageAdapter
          │
OpenAI Responses API / SQLite (defaults)
```

There is no LangGraph, Mastra or CrewAI dependency. The explicit workflow makes budgets, roles, validation and failure states inspectable. Cloudflare is only a possible future adapter for `lmao app`, not a requirement.

## Development

```bash
npm ci
npm run check
npm test
npm run test:coverage
npm run validate:fixtures
npm run build
npm run pack:dry

# No-cost plan: 3 repeated baseline runs + 2 counterfactuals by default
npm run eval:quality

# Explicit BYOK execution; the API-key owner pays provider charges
npm run eval:quality -- --mode quick --execute

# Maintainer-only live OpenAI smoke; reads the environment or ignored .env
npm run eval:live -- --mode quick
```

Key references:

- [Product charter](docs/PROJECT_CHARTER.md)
- [Evaluation methodology](docs/EVALUATION_METHODOLOGY.md)
- [Failure taxonomy](docs/FAILURE_TAXONOMY.md)
- [Evaluation and release gates](docs/EVALS.md)
- [Public API](docs/API.md)
- [Known limitations](docs/KNOWN_LIMITATIONS.md)
- [Contributing](CONTRIBUTING.md)

## License

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
