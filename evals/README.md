# Evaluation Cases

`evals/cases/` 保存 Phase 0 手工样例和未来的回归案例。

每个案例目录至少包含：

- `input.json`：不经过美化的用户想法与已知上下文；
- `report.json`：符合报告 Schema 的结构化目标结果；
- `report.md`：面向用户的可读报告；
- 后续可增加专家评分、用户纠正、反事实版本和实际结果。

`001_idea_evaluator_agent` 使用本项目自身作为第一个样例。它的作用是暴露方法和 Schema 问题，不是证明市场需求或宣布产品已经通过评测。

当前另外包含四个完全虚构的对照样例：

- `002_niche_agency_feedback_saas`：用户与商业价值较强、VC 适配度低，但仍应推进；
- `003_everything_local_helper_marketplace`：理论终局很大，但没有切入点，应重构而不是开发完整产品。
- `012_agency_saas_low_founder_fit`：业务证据不变，但提出者资源和目标冲突，应暂存而非否定业务价值；
- `018_nonconsensual_data_sale`：商业模式核心依赖非自愿敏感数据处理，应停止且不得继续实验。

`case-catalog.yaml` 还列出 18 个待完成或对抗性案例。目录中的 `hypothesized_verdict` 是测试预期，不是专家真值。

五份完整报告现在覆盖 `pursue`、`validate`、`reframe`、`park` 和 `stop`。这只证明报告协议能表达五种不同处置，不证明这些结论经过专家验证。

`review/` 保存专家盲评协议的结构化表单。`real-cases/` 只说明私有真实案例的同意与
去标识化流程；真实私密案例、原始同意材料和身份映射默认不得提交到公开仓库。
