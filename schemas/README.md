# Schemas

本目录存放对外稳定数据契约。

## `evaluation-report.v1.schema.json`

这是 Founder Decision Agent beta 的报告契约，使用 JSON Schema Draft 7。它定义跨 CLI、SDK、MCP 和 HTTP 的稳定结构；工作流、提示词和模型版本独立记录。

Schema 能验证字段、类型、枚举和基础约束，但以下语义需要后续独立验证器检查：

- `claim_ids`、`evidence_ids` 是否都指向真实对象；
- D1–D12 是否各出现一次；
- 关键主张是否有足够证据；
- 引用是否真正支持对应句子；
- 金额区间是否满足 `min <= max`；
- 结论、分数、风险和行动计划是否互相一致；
- 结论是否清楚说明授权的下一步和不代表什么；
- `pursue`、`validate`、`reframe` 是否真的包含主动验证，而 `park` 和 `stop` 是否禁止继续实验；
- `park` 是否包含可观察的重启条件，`stop` 是否包含关闭与风险控制动作；
- fatal risk 的作用范围是否只是当前计划、方案、商业模式或整个想法；
- 深度模式中的外部事实是否具有来源和访问日期。

当前五份完整 fixture 已覆盖五档结论并通过 Schema 与确定性语义校验。`v1` 仍不等于商业判断、引用语义或专家正确性已验证；这些质量门见 `docs/EVALS.md`。

其他公共契约：

- `evaluation-request.v1.schema.json`
- `founder-profile.v1.schema.json`
- `portfolio-request.v1.schema.json`
- `portfolio-report.v1.schema.json`
- `run-manifest.v1.schema.json`

专家盲评记录契约位于 `evals/review/review-form.v1.schema.json`，安装包可通过
`@sangfei/founder-decision-agent/schemas/expert-review.v1.schema.json` 导入。它只证明
记录结构有效，不证明评审者独立性、专业性或结论正确性。
