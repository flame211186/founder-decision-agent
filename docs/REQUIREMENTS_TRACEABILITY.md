# 需求追踪

版本：0.2  
最后更新：2026-07-29

状态含义：

- `captured`：已写入规格；
- `designed`：已有设计；
- `implemented`：已有实现；
- `verified`：已有直接验证证据；
- `deferred`：经明确决定延期；

| ID | 用户需求 | 当前状态 | 设计位置 | 最终验证证据 |
|---|---|---|---|---|
| REQ-001 | 接收自然语言组成的基础想法 | verified | `PRODUCT_SPEC.md §2`、`src/cli.ts`、`src/server.ts` | `tests/workflow.test.ts`、`tests/server.test.ts`；干净 tarball 的 CLI 入口 smoke 通过 |
| REQ-002 | 用有经验的早期投资人视角进行多方面完整评估 | implemented | `PROJECT_CHARTER.md §1`、`EVALUATION_METHODOLOGY.md §4`、`src/prompts.ts` | 5 个完整 fixture 通过；专家盲评待执行 |
| REQ-003 | 首先服务独立工作者、个人开发者和早期创业者 | designed | `PROJECT_CHARTER.md §3` | 用户测试样本覆盖 |
| REQ-004 | 后续扩展到多个行业和身份模板 | implemented | `PRODUCT_SPEC.md §1.2, §8`、`src/industry-packs.ts` | 两个行业包和身份反事实 fixture；领域专家评测待完成 |
| REQ-005 | 输出简洁结论和全面报告 | implemented | `PRODUCT_SPEC.md §3`、`src/renderer.ts` | 5 个 Schema+语义 fixture、renderer 测试；人工可用性评审待完成 |
| REQ-006 | 明确想法是否有价值、问题在哪里以及如何改进 | implemented | `PRODUCT_SPEC.md §3.2`、报告 Schema | 5 个 fixture 覆盖五档结论；行动性人工评分待完成 |
| REQ-007 | 有价值时说明如何落地现实 | implemented | `EVALUATION_METHODOLOGY.md §8`、语义校验器 | active verdict 必须有完整实验；人工执行性待评审 |
| REQ-008 | 说明未来投入与产出，包括时间、资金、资源和证据 | implemented | 报告 Schema、`src/validation.ts` | resource/scenario/range fixture 验证通过 |
| REQ-009 | 提供融资准备、投资人问题和现实融资路径 | implemented | 报告 Schema、`src/jurisdictions.ts` | 美国/中国大陆官方入口单测；法域安全人工检查待完成 |
| REQ-010 | 支持不止一个想法 | verified | `src/portfolio.ts`、`schemas/portfolio-request.v1.schema.json` | `tests/portfolio.test.ts`、`tests/schema-contracts.test.ts`、`tests/mcp.test.ts` |
| REQ-011 | 从多个想法发现个人漏洞、专长和思维模式 | implemented | `EVALUATION_METHODOLOGY.md §9`、`src/portfolio.ts` | 两想法证据阈值测试通过；用户纠正测试待完成 |
| REQ-012 | 引导用户思考和产品迭代 | implemented | `PRODUCT_SPEC.md §2.3, §3.2`、`src/prompts.ts` | 澄清最多三项和实验结构验证；真实迭代案例待完成 |
| REQ-013 | Agent 先独立开源，再接入另一个开源项目 | implemented | `ARCHITECTURE_PLAN.md §5, §9`、公共 SDK/HTTP | 独立构建与 HTTP 契约测试通过；`lmao app` 集成明确延期 |
| REQ-014 | 发布到 GitHub，供别人使用 | verified | `ROADMAP.md Phase 6`、`.github/`、Apache-2.0 | 公开源码仓库 `https://github.com/flame211186/founder-decision-agent` 已创建并推送 `main`；默认分支已要求 PR、CI/CodeQL/Docker/Dependency Review，且禁止强推和删除；GitHub Release 仍受 beta 质量门约束 |
| REQ-015 | 中途关键事项由用户决策 | verified | `DECISIONS.md`、`ROADMAP.md` | DEC-001 至 DEC-014 用户确认历史；DEC-015 为记录清楚的可逆发布实现决定 |
| REQ-016 | 不急于求成，不以堆代码代替质量 | implemented | `PROJECT_CHARTER.md §5`、`AGENTS.md §2`、`docs/EVALS.md` | 覆盖率门和稳定版硬门已执行/记录；人工门仍开放 |
| REQ-017 | 降低幻觉、上下文压缩和目标丢失 | implemented | `AGENTS.md`、`EVALUATION_METHODOLOGY.md §6–11`、`src/validation.ts` | 状态恢复、外部事实/引用/提示词边界测试；深研真实搜索调用计数与超限失败关闭测试；语义引用人工评测待完成 |
| REQ-018 | 评估应具有较高判断正确性 | captured | `EVALUATION_METHODOLOGY.md §10`、`EXPERT_REVIEW_PROTOCOL.md` | 专家评审、实时质量人工复核和统一稳定版证据审计已实现；测试覆盖不可变案例/报告/质量汇总哈希、重复/反事实/引用样本及 P0–P3/裁决逻辑；实际 BYOK 运行、专家盲评和事实性人工指标仍待执行 |
| REQ-019 | 用户可以纠正 Agent 对其想法和个人模式的理解 | implemented | `PRODUCT_SPEC.md §1.3`、`answers`、版本化 profile | 画像公共 Schema 与 CLI/SDK/MCP/HTTP/SQLite 运行时校验已实现，SDK/HTTP/MCP/SQLite 拒绝路径有直接测试；纠正与重评真实端到端测试待完成 |
| REQ-020 | 不同价值类型不能被一个 VC 总分覆盖 | verified | `PROJECT_CHARTER.md §2.2`、报告 Schema | 五份 fixture 和 case 002 独立 value assessments |
| REQ-021 | 模型调用次数采用可调默认值 | verified | `DECISIONS.md DEC-010`、`src/budget.ts` | `tests/safety-and-budget.test.ts`、`tests/workflow.test.ts`；实际 `web_search_call` 计数且超限失败关闭 |
| REQ-022 | 用户通过 BYOK 承担费用，Agent 不保存 Key | implemented | `DECISIONS.md DEC-010/011`、`src/adapters/openai.ts`、`scripts/live-smoke.mjs` | 适配器请求/隐私测试和 live smoke 泄漏断言已实现；本地 `.env` 已验证为 `0600`、被忽略且未跟踪；真实 quick 与无生成模型元数据请求都因本机无法连接 `api.openai.com:443` 而在收到 API 响应前超时，实际账单归属与实时输出仍待网络恢复后验证 |
| REQ-023 | 使用显式 TypeScript 工作流 | verified | `DECISIONS.md DEC-009`、`src/workflow.ts` | quick/deep/repair/角色顺序单测和严格 TS 检查 |
| REQ-024 | 提供 CLI、SDK、MCP 和 HTTP 使用面 | verified | `src/cli.ts`、`src/index.ts`、`src/mcp.ts`、`src/server.ts` | SDK/HTTP 测试、MCP 内存传输协议集成测试、干净 tarball 安装和三个 bin 入口 smoke 通过；Node 22.14/24 CI 矩阵覆盖 |
| REQ-025 | 首批支持 B2B SaaS、AI-native、中文和英文 | implemented | `src/industry-packs.ts`、`src/prompts.ts` | industry/context 单测与中英文 fixture；领域人工评测待完成 |
| REQ-026 | 先公开 beta，稳定 v1 需真实案例和专家盲评 | implemented | `DECISIONS.md DEC-014`、`docs/EVALS.md`、publish workflow | `founder-stable-audit` 统一机检全部证据，最终人工决定另以准确审计哈希记录；publish workflow 对 beta/stable 标记、受保护版本/源码/审计/决定哈希失败关闭，不能只靠改 SemVer 发布 `latest`；GitHub CI `30368618478` 已在 Node 22.14/24 与 Docker 通过，CodeQL `30368620648` 通过；实际真实案例、beta 与 v1 发布证据待完成 |

## 需求变更规则

- 新需求加入新编号，不复用旧编号。
- 删除或缩小需求必须记录用户批准的决定。
- 实现完成不等于验证完成。
- `verified` 必须链接到实际测试、评测结果、运行产物或发布记录。

## Phase 0 初步设计证据

以下证据只能说明设计正在接受检验，不能把需求状态提升为 `verified`：

- REQ-005：五个不同类型、覆盖五档结论的报告已共用 `evaluation-report.v1` Schema；
- REQ-006/007/008：五份报告都包含结论、问题、改进、处置计划、输入与产出；继续型结论使用实验，暂存/停止使用观察或关闭动作；
- REQ-020：案例 002 明确给出较高用户/商业价值和较低 VC 适配度，同时结论仍为 `pursue`；
- REQ-018：案例 003 检查了宏大终局不能掩盖冷启动和资源约束，但尚无专家正确性证明；
- REQ-017：Schema 已分离价值/风险、结构引用/语义支持、结论/授权范围。

进一步但仍不构成 `verified` 的设计证据：

- REQ-011/020：案例 012 在业务证据不变时，因为身份与目标冲突给出 `park`，没有把业务价值与个人适配混合；
- REQ-017/018：案例 018 对致命伦理与隐私约束给出 `stop`，且不再生成当前想法实验；
- REQ-007/008：报告协议新增处置姿态，主动验证、暂存观察和停止关闭拥有不同输入与产出；
- REQ-018：已建立专家盲评协议、七维评分、P0/P1 裁决和分歧分类，但尚无实际评审记录。
- REQ-013：用户已确认 `/Users/frame/Documents/lmao app` 为未来集成目标，并确认部署平台保持中立；只读技术快照支持 TypeScript/npm + 版本化契约方向，但 Cloudflare 仅作为可选适配器，尚无实现或集成测试。
- REQ-013/014：用户已确认独立开源首发采用 npm 包 + CLI，且库与 CLI 共用同一核心；尚无安装、运行或发布证据。
