# 架构计划

版本：0.2  
状态：显式 TypeScript 工作流、平台中立端口和首批适配器已确认并实现  
最后更新：2026-07-28

## 1. 架构目标

- 独立开源运行；
- 能接入现有或未来的想法收集产品；
- 核心逻辑不绑定模型、搜索、数据库或 UI；
- 快速模式和深度研究模式共用一套评估 Schema；
- 所有关键结论可追踪、可重放、可评测；
- 支持单想法、身份模板和多想法组合；
- 本地优先，同时保留服务化部署路径。
- 不把 Cloudflare、AWS、Vercel 或其他单一部署平台写入领域核心。

## 2. 建议的逻辑模块

```text
Interfaces
  ├─ CLI
  ├─ HTTP API
  ├─ Library SDK
  └─ Future MCP / product adapter

Application
  ├─ EvaluateIdea
  ├─ ClarifyIdea
  ├─ ReevaluateIdea
  ├─ AnalyzePortfolio
  └─ ManageProfile

Domain
  ├─ Idea
  ├─ FounderProfile
  ├─ Evidence
  ├─ Claim
  ├─ DimensionAssessment
  ├─ Verdict
  ├─ DispositionPlan
  ├─ Experiment
  └─ Report

Orchestration
  ├─ Intake normalizer
  ├─ Stage classifier
  ├─ Gap prioritizer
  ├─ Research planner
  ├─ Evaluator
  ├─ Adversarial reviewer
  ├─ Evidence verifier
  ├─ Confidence calibrator
  └─ Report composer

Ports / Adapters
  ├─ Model providers
  ├─ Search and browsing
  ├─ Deterministic calculator
  ├─ Storage
  ├─ Document ingestion
  ├─ Tracing
  └─ Export
```

## 3. 关键架构决定

### 3.1 单核心、多分析阶段

初始版本采用一个受控工作流。支持者、怀疑者、验证者等是职责明确的阶段；只有评测证明独立模型/Agent 能显著提高质量时，才引入真正多 Agent。

### 3.2 结构化结果优先

核心产物是版本化 `EvaluationReport` JSON，而不是一篇 Markdown。Markdown、HTML 和未来产品界面都是渲染层。

预期核心对象：

- `idea.v1`
- `founder_profile.v1`
- `evidence_item.v1`
- `claim.v1`
- `evaluation_report.v1`
- `portfolio_report.v1`

### 3.3 证据账本

深度模式先生成证据账本：

- 搜索查询；
- 访问来源；
- 摘要和原文位置；
- 来源时间；
- 支持/反对的主张；
- 冲突；
- 验证状态。

评估器只能引用账本中的证据或明确标记为通用推断。

### 3.4 提供商无关

通过接口注入：

- 推理模型；
- 快速模型；
- 嵌入模型；
- 搜索；
- 网页读取；
- 存储；
- 追踪。

第一版可以只完整支持一个默认组合，但核心不能写死 API。

### 3.5 本地优先的数据策略

建议默认：

- 本地 SQLite 保存想法、报告、身份模板和运行记录；
- 用户显式选择是否联网研究；
- 对外服务部署时可切换 PostgreSQL 或兼容存储；
- 原始想法可导出和删除；
- 日志默认不保存完整敏感输入。

该策略仍需用户确认。

### 3.6 外部行为

第一版工具以只读研究、计算、文件读取和本地保存为主。不自动：

- 发送邮件或私信；
- 发布社交内容；
- 提交融资申请；
- 创建证券发行材料；
- 进行付款或交易。

未来新增外部写工具时，必须支持预览、明确确认、幂等和审计。

## 4. 运行管线

### 4.1 快速模式

```text
输入
→ 规范化
→ 阶段识别
→ 缺口与澄清
→ 维度评估
→ 反方分析
→ 置信度
→ 结构校验
→ 报告
```

### 4.2 深度模式

```text
输入
→ 规范化
→ 阶段识别
→ 缺口与澄清
→ 研究计划
→ 搜索/浏览
→ 证据账本
→ 维度评估
→ 反方分析
→ 主张-引用验证
→ 数值验证
→ 置信度
→ 结构校验
→ 报告
```

### 4.3 组合模式

```text
已授权的想法与报告
→ 标准化特征
→ 主题/用户/模式聚类
→ 跨想法证据分析
→ 资源复用与冲突分析
→ 优势/盲点候选
→ 证据阈值过滤
→ 用户纠正
→ 个人 thesis 与优先级报告
```

## 5. 接入其他产品

独立 Agent 与产品通过稳定接口连接，而不是让产品直接依赖内部提示词。

用户已确认 `/Users/frame/Documents/lmao app` 是未来集成目标。当前只读检查表明它使用 Node.js 22、TypeScript、React/Next/Vinext、Cloudflare、Drizzle，并具备 D1/R2 绑定。

用户同时确认部署平台保持中立。因此上述 Cloudflare 形态只是当前集成背景，不是 Agent 的运行前提。

用户已确认独立开源首发使用 npm 包 + CLI。CLI 和库 API 必须调用同一个领域核心；不能为了命令行和产品集成复制两套判断逻辑。

这项确认只收窄未来适配方式，不改变开发顺序：

1. Agent 先在独立仓库完成可运行和可评测的核心；
2. 发布版本化 npm 包、CLI 和 JSON Schema；
3. 使用独立契约测试验证 SDK 或 HTTP 边界；
4. Phase 7 获得明确授权后才修改 `lmao app`；
5. `lmao app` 不直接读取 Agent 的内部提示词、私有状态或未版本化对象。

建议接口：

- `POST /v1/evaluations`
- `GET /v1/evaluations/{id}`
- `POST /v1/evaluations/{id}/answers`
- `POST /v1/evaluations/{id}/research`
- `POST /v1/portfolio-analyses`
- `GET/PUT /v1/profile`
- 运行状态事件流；
- JSON Schema 与客户端 SDK。

是否采用进程内 SDK、独立服务或两者兼有，在确认目标集成项目和部署环境后决定。

## 6. 候选技术路线

### 路线 A：TypeScript 核心

优势：

- 容易与当前 TypeScript/Cloudflare 产品共享类型和代码；
- 单仓库和前端接入成本低；
- npm 发布和 Web 部署自然。

风险：

- 某些评测、数据处理和研究工具的 Python 生态更成熟；
- Cloudflare 运行约束可能影响长任务、浏览和本地 SQLite。

当前推荐：**Phase 1 采用运行时中立的路线 A，但不把核心直接写进 `lmao app`。**

推荐形态：

- 独立 TypeScript package：领域对象、工作流、验证器和渲染，不导入 Cloudflare 专用绑定；
- 独立 CLI：本地运行、文件输入输出和离线评测；
- 本地存储适配器：SQLite；
- 可选远端存储适配器：D1、PostgreSQL 或其他经契约测试的实现；
- 可选对象存储适配器：R2、S3 兼容服务或本地文件；
- 模型与研究端口：首发只完整支持一个默认组合，但接口不写死；
- 未来 `lmao app` 通过 npm SDK 或稳定 HTTP API 调用。

选择理由：

- 与已确认集成目标共享语言和类型系统；
- npm/CLI 同时满足独立使用与产品接入；
- 版本化 Schema 可直接生成或校验 TypeScript 类型；
- 通过端口隔离本地、Cloudflare 和其他服务部署差异；
- 避免 Phase 1 就维护 TypeScript/Python 双核心。

### 路线 B：Python 核心服务

优势：

- Agent、数据分析、评测和研究生态成熟；
- CLI、后台任务和实验速度快；
- 适合作为独立开源 Agent。

风险：

- 与 TypeScript 产品需要 HTTP/队列边界；
- 增加部署和本地开发组件。

### 路线 C：TypeScript 产品核心 + Python 研究/评测工具

优势：

- 产品接入自然；
- 研究评测仍可使用 Python。

风险：

- 最早期就维护两套语言和类型同步，复杂度最高。

当前推荐已经收窄到平台中立的路线 A，npm + CLI 发布形态已确认；仍需用户确认是否要求本地模型。ADR-007 完整批准前不开始框架脚手架。

## 7. 框架选择原则

- 如果工作流短且分支可控，优先轻量编排；
- 如果需要持久状态、暂停恢复和长期运行，再考虑图式工作流；
- 如果需要模型 handoff、工具、guardrail、session 和 tracing，可评估 Agents SDK；
- 如果未来出现真正角色自治需求，再评估多 Agent 框架；
- 框架选择必须通过一个端到端垂直样例验证，不先搭空壳平台。

## 8. 可观测性

每次运行记录：

- 运行 ID、报告版本和时间；
- 模型与参数；
- 提示词/策略版本；
- 工具调用和耗时；
- 来源；
- Token 与估算费用；
- 重试和错误；
- 结构、引用和数值验证结果；
- 用户修正；
- 最终结论和置信度。

追踪数据必须支持脱敏和关闭。

## 9. 开源发布目标

- GitHub 仓库；
- 明确许可证；
- 一条命令安装和运行；
- CLI；
- Docker；
- 示例和示例报告；
- JSON Schema；
- 评测集和评测命令；
- 安全文档；
- 贡献指南；
- 版本和迁移说明；
- 可选 npm/PyPI 包；
- 后续可选 MCP Server。
