# 工作日志

## 2026-07-28

### 本轮目标

在编写业务代码前，把用户完整目标固化为长期可维护的产品与研发计划，并建立防止上下文压缩和目标漂移的外部记忆。

### 已完成

- 检查 `/Users/frame/Documents/lmao agent`：
  - 空 Git 仓库；
  - `main` 分支；
  - 尚无提交和远端。
- 只读检查 `/Users/frame/Documents/lmao app`：
  - 现有 TypeScript/Cloudflare 项目；
  - 当前存在用户未提交的 `.gitignore` 和 `mac-app/` 改动；
  - 未对其做任何修改。
- 建立项目宪章；
- 建立产品规格；
- 建立评估方法草案；
- 建立架构候选与集成边界；
- 建立分阶段路线图；
- 建立需求追踪表；
- 建立决策记录；
- 建立编码 Agent 行为规则；
- 建立机器可读项目状态与下一阶段门；
- 记录第一批权威研究来源。

### 已明确但尚未证明

- 评估维度看起来覆盖了通用早期创业判断，但尚未经过真实样例和专家评审；
- 五档结论尚未获用户确认；
- “高判断正确性”尚无基线数据，不能声称达成；
- 技术栈、模型、许可证、正式名称和默认联网策略尚未决定；
- 尚无报告 JSON Schema、样例报告、代码、测试或评测集。

### 下一步

1. 用户确认或修改 `DECISIONS.md` 中 ADR-001 至 ADR-006；
2. 收集 3–5 个用户真实或匿名想法作为 Phase 0 样例；
3. 起草 `evaluation_report.v1` JSON Schema；
4. 手工完成第一份目标质量报告；
5. 用报告暴露评估维度、问法和结论语义问题；
6. 再决定技术路线，而不是立即搭框架。

### 当前阶段

Phase 0：进行中。

## 2026-07-28（Phase 0 继续）

### 本轮目标

在用户确认 ADR 前继续完成不锁定技术栈的可逆产物，用本项目自身作为首个样例检验报告方法。

### 已完成

- 起草 `evaluation_report.v1` JSON Schema；
- 将价值评估与社会/伦理/法律/隐私风险拆成独立结构；
- 将引用结构检查与引用语义支持检查拆成独立状态；
- 建立标准化的主张与证据账本；
- 建立 D1–D12、五档结论、关键未知、风险、改进、情景、实验、资源和融资字段；
- 建立首个样例输入；
- 手工完成首份结构化报告和可读报告；
- 建立无第三方依赖的交叉引用、维度、证据互链和金额区间语义检查脚本；
- 建立失败分类和 P0–P3 严重度。

### 验证结果

- Schema 可被 Ajv 6 按 Draft 7 编译；
- 首份结构化报告通过 Schema；
- 14 条主张、10 项证据、12 个维度和 3 种情景通过交叉引用检查；
- 所有金额和时间区间满足 `min <= max`；
- 引用支持只标记为草案人工复核，没有冒充专家验证。

### 尚未证明

- 首份报告是否真的帮助用户作出更好决策；
- 评估维度是否适用于三种以上不同想法；
- 引用语义检查的规模化准确性；
- 专家一致性；
- 用户重复使用与付费；
- ADR-001 至 ADR-006 仍未获用户确认。

### 下一步

等待用户确认第一批产品决定。随后使用用户提供或匿名化的 2–4 个不同类型想法继续测试 Schema；在至少三类样例稳定前不锁定框架。

## 2026-07-28（Phase 0 对照案例）

### 本轮目标

在不确认待定 ADR、不锁定框架的前提下，用不同商业类型和结论检验 Schema 是否存在 VC 偏见、阶段错配或宏大叙事偏见。

### 已完成

- 建立 18 个案例矩阵；
- 覆盖 `pursue`、`validate`、`reframe`、`park`、`stop` 预期；
- 覆盖 S0–S4、软件、服务、市场平台、开源、硬件、深科技和强监管候选；
- 建立阶段、身份和证据反事实对；
- 完成合成案例 002：有付费牵引的垂直 micro-SaaS；
- 完成合成案例 003：全球全品类本地服务市场；
- 增加结论授权范围 `authorized_next_step` 与 `does_not_mean`；
- 增加 fatal risk 的作用范围，区分当前计划、方案、商业模式与整个想法；
- 新增失败类型 R05“结论授权范围不清”。

### 当前样例结论

- 案例 001：`validate`，验证想法决策系统是否产生重复复评行为；
- 案例 002：`pursue`，适合独立经营但当前不适合 VC；
- 案例 003：`reframe`，底层本地服务问题可能存在，但全球全品类计划不可执行。

### 验证结果

- 18 个 catalog ID 唯一；
- 三份完整报告的 verdict 与 catalog 预期一致；
- 三份报告均通过 Draft 7 Schema；
- 三份报告均包含 D1–D12 一次、bear/base/bull 三种情景；
- 39 条主张与 16 项证据无悬空或单向引用；
- 金额与时间区间通过 `min <= max` 检查；
- fatal risk 与 fatal scope 一致；
- 结论均声明授权动作和非授权含义。

### 尚未证明

- 合成案例不能证明现实判断正确；
- `pursue`、`validate`、`reframe` 的文字是否符合用户期望；
- 尚无完整 `park` 和 `stop` 报告；
- 尚无真实用户纠正、实际结果或专家盲评；
- ADR-001 至 ADR-006 仍未获用户确认。

### 下一步

等待用户确认产品方向，并用其真实或匿名想法替换/补充合成案例。若方向获批，优先增加一个身份反事实 `park` 案例和一个存在明确致命约束的 `stop` 案例，再决定是否冻结 v1 Schema。

## 2026-07-28（Phase 0 五档结论与专家评审设计）

### 本轮目标

完成五档结论的报告压力测试，防止“暂存/停止”与正文行动矛盾，并把高判断质量转化为可执行的人类盲评流程。

### 方法问题与修正

制作 `park` 和 `stop` 报告时发现，旧 Schema 强制至少一个实验，会导致：

- 暂存后仍暗中推动用户继续投入；
- 停止后仍生成当前想法的增长或验证动作；
- 结论与实际资源处置互相矛盾。

因此新增 `disposition_plan`：

- `active_validation`：用于 `pursue`、`validate`、`reframe`，至少一个实验；
- `parked_watch`：用于 `park`，零主动实验、必须有重启条件；
- `stop_and_close`：用于 `stop`，零当前想法实验、必须有关闭动作。

语义校验器已把这些关系变成可运行约束，失败分类新增 R06。

### 已完成

- 完成 case_012 身份反事实：
  - 业务证据与 case_002 保持一致；
  - 只改变每周时间、销售/支持意愿和被动收入目标；
  - 结论为 `park`；
  - 明确先处理现有 5 家试点，避免暂存成为客户遗弃；
  - 不生成主动实验，使用可观察重启条件。
- 完成 case_018 安全对抗案例：
  - 商业模式核心依赖未经充分告知和有效选择的敏感数据处理；
  - 结论为 `stop`；
  - 不提供真实数据实验、规避同意、增长或融资路径；
  - 只授权停止、最小盘点、访问限制和地区性专业复核；
  - 有意省略 bear/base/bull，因为当前核心机制没有可被授权的积极情景。
- 五份完整报告现已覆盖全部五档结论；
- 建立专家盲评协议：
  - 先独立判断、后揭示报告；
  - 七维评分；
  - P0/P1 失败记录；
  - 事实、权重、thesis、风险偏好和领域能力分歧分类；
  - 裁决不能由同一生成模型单独关闭；
  - 无真实基线前不虚构“正确率”；
  - 真实私密案例需明确同意和去标识化。
- 建立 `expert_review.v1` JSON Schema。
- 更新产品规格、评估方法、架构、需求追踪、路线图、决策记录和项目状态。

### 验证结果

- `PROJECT_STATE.yaml` 和 18 个案例 catalog 均可解析；
- 18 个案例 ID 唯一；
- 所有 JSON 文件均可解析；
- 报告 Schema 与专家评审 Schema 均通过 Ajv Draft 7 编译；
- 5 份报告全部通过报告 Schema；
- 5 份报告全部通过语义校验：
  - 五档 verdict 各出现一次；
  - 61 条主张；
  - 20 项证据；
  - 60 个维度，即每份 D1–D12 各一次；
  - 12 个适用情景；
  - 主张—证据无悬空或单向引用；
  - 金额与时间区间满足 `min <= max`；
  - 处置姿态与 verdict 一致；
  - `park` 和 `stop` 均为零主动实验；
  - `park` 有重启条件，`stop` 有关闭动作。
- 所有本地 Markdown 链接可解析；
- `git diff --check` 通过；
- `/Users/frame/Documents/lmao app` 仍只有用户原有的 `.gitignore` 与 `mac-app/` 改动，本轮未修改。

### 尚未证明

- 五份报告仍是手工目标稿，不是 Agent 自动生成结果；
- 其中四份为合成案例，一份只来自单个用户目标；
- 专家盲评协议尚未实际执行；
- 没有真实结果反馈，不能声称高判断正确性；
- 用户尚未确认 ADR-001 至 ADR-006 与 ADR-011；
- 技术路线、模型、许可证和正式名称仍未决定；
- 业务代码仍未开始，所有需求仍未达到 implemented 或 verified。

### 下一步

1. 用户确认或修改产品定位、五档结论、首发范围、澄清、联网、存储和处置姿态；
2. 收集至少 3–5 个经同意、去标识化的真实想法；
3. 按盲评协议为五档样例和真实样例各获得至少三份独立评审；
4. 根据真实遗漏和分歧修订方法与 Schema；
5. 冻结首个质量阈值后，再决定 ADR-007 技术路线并构建 Phase 1 垂直闭环。

## 2026-07-28（确认未来集成目标）

### 用户确认

用户明确确认 `/Users/frame/Documents/lmao app` 是 Agent 独立开源完成后的未来集成项目。

### 本轮完成

- 新增 DEC-004，固化未来集成目标；
- 明确该确认不授权现在修改 `lmao app`；
- 只读核对当前技术形态：
  - Node.js 22；
  - TypeScript 5.9；
  - React 19、Next 16、Vinext、Vite；
  - Cloudflare Workers 兼容运行；
  - Drizzle ORM；
  - D1 与 R2 绑定能力。
- 将 ADR-007 从三条候选路线收窄为推荐路线：
  - Phase 1 使用独立 TypeScript 核心；
  - npm package + CLI；
  - 本地 SQLite 与 Cloudflare D1 分别作为存储适配器；
  - `lmao app` 未来通过版本化 SDK 或 HTTP 契约接入；
  - Python 仅在评测或研究证明必要时后加，不维护双语言核心。
- 更新项目状态、架构计划、路线图和需求追踪。

### 工作区边界

- 本轮没有修改 `/Users/frame/Documents/lmao app`；
- 只读检查时该仓库仍有用户原有的 `.gitignore` 修改和 `mac-app/` 未跟踪目录；
- Agent 仓库仍为 Phase 0，未开始业务代码或框架脚手架。

### 尚待用户决定

- Cloudflare 是否是 `lmao app` 的长期部署目标；
- 独立开源首发是否采用 npm + CLI；
- 是否必须支持本地模型；
- ADR-001 至 ADR-006 与 ADR-011 是否按推荐方案确认。

## 2026-07-28（部署平台保持中立）

### 用户确认

用户明确要求不把 Agent 或未来集成锁定在 Cloudflare。

### 本轮完成

- 新增 DEC-005“部署平台保持中立”；
- 从 ADR-007 中移除“Cloudflare 是否长期部署”的待决问题；
- 将技术建议修正为运行时中立的 TypeScript 核心：
  - 核心不得导入 Cloudflare 专用绑定；
  - SQLite 作为本地适配器；
  - D1、PostgreSQL 等作为可选远端适配器；
  - R2、S3 兼容服务或本地文件作为可选对象存储；
  - 通过契约测试保证更换部署平台不重写领域核心；
- 更新项目状态、架构计划、路线图和需求追踪。

### 尚待决定

- 独立开源首发是否采用 npm + CLI；
- 是否必须支持本地模型；
- 产品定位、五档结论、首发用户、澄清方式、联网方式、存储原则和处置姿态是否按推荐方案确认。

### 未发生

- 未修改 `/Users/frame/Documents/lmao app`；
- 未开始业务代码或框架脚手架；
- 未将 Cloudflare、D1 或 R2 写成必要依赖。

## 2026-07-28（确认 npm 包 + CLI 首发）

### 用户确认

用户接受独立开源首发采用 npm 包 + CLI。

### 决定含义

- 陌生用户可以通过 npm 安装；
- 命令行可以接收自然语言或文件输入并生成 JSON/Markdown；
- TypeScript/JavaScript 项目可以调用稳定库 API；
- CLI 与库 API 共用同一评估核心；
- Docker 后续补充，不作为 Phase 1 开始条件；
- 发布形态不绑定 Cloudflare 或其他部署平台。

### 本轮完成

- 新增 DEC-006；
- 更新 ADR-007 的已确认部分；
- 更新项目状态、架构计划、路线图和需求追踪。

### 尚待决定

- 是否必须支持在用户电脑上运行的本地模型；
- ADR-001 至 ADR-006 与 ADR-011 的产品方向确认；
- 模型供应商、费用、许可证和正式名称。

### 未发生

- 未创建 npm 脚手架或业务代码；
- 未修改 `/Users/frame/Documents/lmao app`；
- 尚无安装和运行验证，因此 REQ-013/014 仍不能标记 implemented 或 verified。

## 2026-07-28（显式 TypeScript beta 实现）

### 用户确认

- 采用推荐方案并完成完整开源 Agent；
- 正式名称 Founder Decision Agent；
- GitHub 目标 `flame211186/founder-decision-agent`；
- npm 目标 `@sangfei/founder-decision-agent`；
- Apache-2.0；
- 显式 TypeScript 工作流，不采用通用 Agent 编排框架；
- OpenAI 作为默认适配器、核心保持提供商中立、本地模型后续；
- BYOK，由 Key 所属用户承担模型和搜索费用；
- 快速默认 2 次模型调用/0 搜索/2 分钟，深度默认 8 次/10 搜索/15 分钟，全部可调；
- SQLite 本地优先、历史可关闭/导出/删除；
- B2B SaaS 与 AI-native 为首批行业包；
- 中文与英文；
- 先公开 beta，稳定 `v1` 需真实案例和专家盲评。

### 已完成实现

- 建立 npm/TypeScript 项目、锁文件和 Apache-2.0 许可证；
- 建立 `evaluation_request.v1`、`evaluation_report.v1`、`founder_profile.v1`、`run_manifest.v1`、`portfolio_report.v1`；
- 建立显式 quick/deep 工作流：
  - quick 零搜索、生成与一次修复预算；
  - deep 研究、支持者、反对者、验证者、综合与修复；
  - 预算耗尽、拒答、不完整、研究不可用和校验失败使用类型化错误；
- 建立 OpenAI Responses API 适配器：
  - `store: false`；
  - strict JSON Schema；
  - web search 来源和引用提取；
  - `safety_identifier` 先哈希；
  - 不持久化 API Key 或 safety identifier；
- 建立 canonical Schema 与语义验证：
  - D1–D12；
  - claim/evidence 双向引用；
  - quick 禁止 external fact；
  - deep 来源 allowlist；
  - 五档 verdict 与 disposition/experiment；
  - bear/base/bull；
  - fatal scope；
  - 模型不得自称 expert reviewed；
- 建立 SQLite、CLI、SDK、MCP、Node HTTP；
- 建立 MCP `confirm: true` 与 CLI 删除 `--yes`；
- 建立确定性 portfolio 分析；
- 建立 B2B SaaS、AI-native 与美国/中国大陆法域入口；
- 建立双语 README、API、安全隐私、评测、限制、OpenAI、发布和行业包文档；
- 建立 Dockerfile、CI、CodeQL、dependency review、Dependabot、issue/PR 模板和 npm OIDC publish workflow；
- 更新项目状态、决策、需求追踪和路线图。

### 验证结果

- `npm run check` 通过；
- `npm run test:coverage`：37/37 测试通过；
- 覆盖率：
  - statements 85.60%；
  - branches 75.78%；
  - functions 91.60%；
  - lines 86.68%；
- 5/5 fixture 报告通过 canonical Schema 与语义校验；
- OpenAI 适配器使用假 Responses 客户端验证，不产生付费调用；
- HTTP 路由在不监听端口的受限环境中完成鉴权、评估、持久化、组合、身份、导出、删除和错误契约测试；
- 公共 Schema 可共同编译，跨 Schema profile 引用可解析；
- `/Users/frame/Documents/lmao app` 未修改。

### 已证明

- 显式 TypeScript 工作流、预算、结构化报告、存储、SDK 和 HTTP 的离线实现可运行；
- 五档结论的结构和处置约束可被确定性拦截；
- 默认次数是可覆盖上限，quick 搜索会被强制为 0；
- OpenAI 请求构造包含 BYOK、`store: false`、严格输出、搜索上限和哈希 safety identifier；
- API Key 与 safety identifier 不进入正常报告/manifest；
- 发布工程和开源文档已在本地形成。

### 尚未证明

- 当前环境没有 `OPENAI_API_KEY`，未执行实时 OpenAI 报告 smoke；
- 引用的语义支持、来源完整性和商业判断正确性未被离线结构测试证明；
- 真实、经同意和去标识化的 3–5 个案例尚未收集；
- 专家盲评尚未执行；
- Docker build 未执行，因为当前环境没有 `docker` 命令；
- GitHub 仓库、GitHub Release 与 npm beta 尚未实际发布；
- `gh` 尚未安装/登录，npm 账户和 trusted publisher 尚未确认；
- 因此只能称为“未发布 beta 候选”，不能称为稳定完成。

### 下一步

1. 使用用户 BYOK Key 运行非敏感实时 smoke；
2. 安装并登录 `gh`，创建公开 GitHub 仓库和 beta release；
3. 确认 npm scope 权限，bootstrap/trusted publisher 后发布 `beta` dist-tag；
4. 招募独立专家并完成 3–5 个真实匿名案例，满足后再发布稳定 `v1`。

### 发布候选后续验证

- 使用隔离的 `/private/tmp` npm cache 成功生成 tarball：
  - `@sangfei/founder-decision-agent@0.1.0-beta.0`；
  - 100 个文件；
  - 包体约 115.5 kB，解包约 412.8 kB；
- tarball 在全新临时目录安装成功；
- 干净安装验证：
  - `founder-decision --version` 输出 `0.1.0-beta.0`；
  - SDK import 与 SQLite 创建/读取成功；
  - MCP 和 HTTP bin 符号链接入口能够真正启动，并在无 Key 时安全返回 `MISSING_API_KEY`；
- 干净安装首次发现 MCP/HTTP 的符号链接主模块判断会静默退出；已改用 `realpath` 比较修复并重新打包验证；
- OpenAI Key 校验移到默认 SQLite 创建前，缺 Key 时不再先创建本地数据库；
- `npm audit --audit-level=high` 返回 0 vulnerabilities；
- `npm ls --all` 完成，未满足项均为平台/功能 optional dependencies；
- secret pattern scan 无匹配；
- 33 个 Markdown 文件的本地链接验证通过；
- PROJECT_STATE 与评测 catalog YAML 解析通过；
- `git diff --check` 通过。
- Homebrew 因 `formulae.brew.sh` DNS 失败无法安装 `gh`；随后从 GitHub 官方 release 下载 macOS arm64 `gh 2.96.0`，其 SHA-256 与官方 checksums 一致；
- 首次 GitHub 设备授权因浏览器账号与当时记录的目标不同而主动取消；用户随后确认 `flame211186` 才是正确 GitHub 账号，项目记录与远端目标已更正。
