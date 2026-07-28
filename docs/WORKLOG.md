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
- GitHub 公开源码仓库已经发布，但 GitHub Release 与 npm beta 尚未实际发布；
- npm 登录账号 `flame211186` 及其 `sangfei` 组织 owner 权限已确认；首次 bootstrap 发布和 trusted publisher 尚未完成；
- 因此只能称为“公开源码 beta 候选”，不能称为已发布 beta 或稳定完成。

### 下一步

1. 使用用户 BYOK Key 运行非敏感实时 smoke；
2. 实时 smoke 通过后创建 GitHub beta Release；
3. 完成 npm bootstrap 发布并配置 trusted publisher，发布 `beta` dist-tag；
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
- GitHub 官方设备授权成功，CLI 核对登录账号为 `flame211186`；
- 已创建公开仓库 `https://github.com/flame211186/founder-decision-agent`，并将本地 `main` 根提交推送到远端；
- GitHub 仓库公开不等于 beta Release：实时 OpenAI smoke 和 npm 发布门仍保持开放。
- 远端 `main` 的 CI 与 CodeQL 首次运行通过；
- 新仓库的 Dependency Review 最初因未启用 Dependency Graph 失败；启用依赖图与漏洞提醒后，7 个自动依赖更新 PR 的依赖审查重跑全部通过；
- npm 官方网页登录成功，`npm whoami` 为 `flame211186`，`npm org ls sangfei` 确认为 `sangfei` 组织 owner；未因 GitHub 用户名不同而擅自更换既定 npm scope。

## 2026-07-28（发布前审计与发布链加固）

### 审计发现

- 原 publish workflow 会在 GitHub Release 发布时立即执行 OIDC npm publish，但全新 npm 包在首次发布前又无法配置 trusted publisher；若先本地 bootstrap，同版本自动发布会失败；
- 深研 manifest 使用去重查询数近似搜索调用数，重复查询时会低估实际 `web_search_call` 数量；
- 初版 live smoke 仅写在发布清单中，没有可重复、权限受限且能检查隐私/预算不变量的命令；
- `package.json` 若暴露 live smoke 命令但不把脚本包含进 tarball，会导致发布包中的命令不可用。

### 已完成

- OpenAI adapter 现在按响应中的真实 `web_search_call` 项计数，同时继续只对展示用查询文本去重；
- 深研零搜索配置会在调用提供商前拒绝；适配器报告超过预算的搜索调用时工作流失败关闭；
- 新增 `scripts/live-smoke.mjs` 与 `npm run eval:live -- --mode quick|deep`：
  - 使用固定合成想法；
  - `persist: false`；
  - 检查完整 manifest、canonical report、预算、quick 零搜索/零外部事实、无虚假人工评审；
  - 检查 API Key 与原始 safety identifier 不进入结果；
  - 完整 outcome 只写入权限受限的临时目录和 mode `0600` 文件；
- live smoke 脚本纳入 npm tarball，因此源码仓库和已安装包共用同一验证入口；
- npm publish workflow 改为：
  - 串行发布与 30 分钟超时；
  - 发布环境禁用 package-manager cache；
  - 重跑完整质量门；
  - 从 release tag 打出单一精确 tarball；
  - 仅在 registry 已有版本与本地 tarball integrity 完全一致时跳过一次 bootstrap；
  - 后续版本通过 trusted OIDC 与 provenance 发布；
  - 校验 registry integrity、dist-tag，并从 registry 干净安装 CLI；
- `packageManager` 与 CI/release workflow 固定为已验证的 npm `11.16.0`，避免 bootstrap 与 OIDC 重打包使用不同 tar 算法；
- 发布文档明确首次 bootstrap、2FA、trusted publisher 和首版 provenance 限制。

### 验证

- `npm run check` 通过，包含所有 `.mjs` 语法检查；
- `npm run test:coverage`：39/39 通过；
- coverage：statements 85.90%、branches 75.94%、functions 91.72%、lines 86.99%；
- 5/5 fixture 与 33 个 Markdown 链接通过；
- live smoke 无 Key 时安全返回 `MISSING_API_KEY`，没有创建伪成功产物；
- 隔离 npm cache 下的最终 tarball dry-run 成功：105 个文件、约 123 kB、解包约 434 kB，且包含 live smoke 脚本；
- 使用该 tarball的 `npm publish --dry-run --access public --tag beta --provenance=false` 通过命令与包元数据检查；
- publish workflow YAML 可解析，正式 GitHub release 运行仍必须等待实时 smoke 与 npm bootstrap。

### 尚未证明

- `OPENAI_API_KEY` 仍未提供到工作区，live smoke 工具尚未产生真实 OpenAI 结果；
- npm registry 尚无 `0.1.0-beta.0`，trusted publisher 只能在首次 bootstrap 后配置；
- GitHub beta Release 尚未创建；
- 真实案例、独立专家盲评、引用语义抽查和稳定版质量门仍未完成。

### SQLite 安装风险修正

- 在最终 tarball 的干净消费者项目安装时，npm 11 提示 `better-sqlite3` 安装脚本尚未由消费者批准；
- 实际运行当时仍成功，但 npm 官方已经说明当前警告未来会转为默认阻止，因此不能把偶然成功当作长期安装保证；
- `SqliteStorage` 已切换为 Node 内置 `node:sqlite`，移除 `better-sqlite3` 和对应类型依赖；
- 旧驱动创建的标准 SQLite 数据库能够由新适配器直接打开；
- 使用官方 SHA-256 校验后的 Node `v22.14.0` macOS arm64 二进制执行 `check`、39 个测试和 build 均通过；
- Node 22.14 只在实际构造 SQLite 适配器时输出上游 `ExperimentalWarning`；普通 CLI 版本查询和 SDK import 不触发，限制已公开；当前 Node 24.18 运行无该警告；
- CI 改为 Node `22.14.0` 与 `24` 双版本矩阵；
- 项目开发依赖中只有经固定版本批准的 `esbuild` 与 macOS `fsevents` 安装脚本，发布包消费者不安装这些 devDependencies。
- `npm ci --strict-allow-scripts` 通过，证明未来默认阻止未审批脚本时开发安装仍可重建；
- 移除原生运行依赖后再次执行干净消费者安装：
  - 无待审批安装脚本；
  - 包内 CLI 版本、SDK import、真实 SQLite 创建/读取、live smoke `--help` 与无 Key 失败路径全部通过；
  - 最终 tarball 的 npm public `beta` publish dry-run 通过。
- 下载的 actionlint `1.7.12` 与官方 SHA-256 校验和一致，全部 GitHub Actions workflow 语义检查通过；
- 最终依赖树 `npm audit --audit-level=high` 为 0 vulnerabilities；
- 收紧避免 NIST URL 误报后的密钥模式扫描无匹配，`git diff --check` 通过。

### 平台支持边界

- Ubuntu Node 22.14/24 由 CI 验证，macOS arm64 Node 22.14/24 已完成本地验证；
- Windows 在当前 beta 中尚未纳入 CI，不将推测兼容性表述为已证明支持；
- Windows 文件权限加固明确为 best-effort，处理敏感想法时应检查目录 ACL 或使用 `--no-persist`。

### 最终候选包复验

- 使用隔离 npm cache 生成真实 tarball，而非只依赖 dry-run：105 个文件、约 124 kB，解包约 436 kB；
- 从该 tarball 在全新目录严格安装成功，无未批准的运行期安装脚本；
- 包内 CLI 版本、SDK import、SQLite 创建/读取与 live smoke 帮助入口均通过；
- 无 Key 的 live smoke 按预期只返回结构化 `MISSING_API_KEY`，未伪造成功；
- `npm audit --audit-level=high` 联网复验为 0 vulnerabilities；
- live smoke 现在优先读取执行目录中的忽略 `.env`，便于已安装包调用；`--help` 在读取任何 Key 前完成。

### 远端复验

- 发布加固提交 `063babf` 已推送至公开仓库；
- 因 `github.com:443` 临时超时，使用已授权 GitHub API 上传 23 个 Git blob，并在更新 `main` 前逐一核对 blob SHA、tree SHA 与最终 commit SHA 均与本地完全一致；
- 远端 CI run `30353777901` 成功，覆盖 Ubuntu Node 22.14 与 24 矩阵；
- 远端 CodeQL run `30353777927` 成功；
- GitHub beta Release 与 npm beta 仍未创建，继续等待用户 BYOK 实时 smoke 通过。

## 2026-07-28（公共输入与 MCP 协议证据补强）

### 审计发现

- MCP 只有发布包进程入口 smoke，没有通过 MCP 协议真正发现和调用工具的集成测试；
- `FounderProfile` 在 CLI、HTTP、MCP 和 SQLite 的运行时校验强度不一致；
- `PortfolioRequest` 只有 TypeScript 版本字段，没有公开 JSON Schema；
- SDK 的畸形输入会在规范化阶段先触发普通 TypeError，而不是稳定的 `INVALID_INPUT`。
- 公开 `npm run eval:offline` 指向不存在的 `tests/evals`，会以“无测试文件”失败。

### 已完成

- 新增 `portfolio-request.v1.schema.json`，引用 canonical report 与 founder profile 契约；
- 评估、画像和组合请求统一使用 Ajv Draft 7 运行时校验；
- SDK 在规范化和模型调用前拒绝畸形请求与无效嵌套画像；
- CLI、HTTP、MCP 与公开 SQLite 适配器在持久化前拒绝无效画像；
- `createFounderDecisionMcpServer` 接受通用 `StorageAdapter`，默认仍使用 SQLite；
- `eval:offline` 改为真正执行 coverage-enforced 测试与五份 fixture 校验，并由 CI/发布
  workflow 直接调用；
- 新增内存 MCP client/server 协议测试，覆盖：
  - 七个工具发现；
  - quick 评估与持久化；
  - 删除必须 `confirm: true`；
  - 敏感画像保存必须明确同意且通过 Schema；
  - 两份报告文件的组合分析。

### 仍未证明

- 新增离线证据不替代真实 OpenAI 输出、真实用户纠正或专家盲评；
- npm registry 复核仍为 404；BYOK Key 仍未设置，因此不创建 beta Release。

### 验证

- `npm run check` 通过；
- 10 个测试文件、45/45 测试通过；
- coverage：statements 85.45%、branches 75.77%、functions 87.64%、lines 87.10%；
- 5/5 fixture、33 个 Markdown 链接与 TypeScript build 通过；
- Node 22.14 上的 check、45 项测试和 build 通过，只有已公开的上游 SQLite 实验警告；
- 实际 tarball 包含 106 个文件和新增组合请求 Schema，约 127 kB；
- tarball 在全新消费者目录严格安装成功，包内 CLI、SDK Schema getter、公开 Schema
  子路径和 SQLite 无效画像拒绝路径均通过；
- 修正后的 `npm run eval:offline` 实际执行 45 项 coverage 测试和 5/5 fixture 校验并通过；
- 修改后的 CI 与 publish workflow 通过 actionlint；
- 提交 `b8a0b49` 已推送，远端 CI run `30355428433` 与 CodeQL run
  `30355428396` 均成功。

## 2026-07-28（专家评审记录验证工具）

### 已完成

- 新增 `scripts/validate-review-records.mjs` 与 `npm run validate:reviews -- <path...>`；
- 验证器接受显式文件或目录，不默认扫描或复制真实私密记录；
- 检查专家评审 JSON Schema、R1–R7 唯一完整性、盲评锁定/揭示/裁决时间顺序、
  致命约束范围、重复评审/失败 ID、同一评审者重复案例、裁决人数及裁决失败引用/冲突；
- 汇总分别报告案例、评审者、各维度分数分布、P0–P3、裁决状态和决策改变遗漏，
  不用一个平均分互相抵消；
- 输出固定 `stableGateStatus: not_assessed`，避免结构验证冒充专家质量、有效同意或
  稳定版通过；
- 评审 schema 的旧项目 URN 已更正为 Founder Decision Agent；
- 验证脚本和 schema 均纳入 npm tarball，避免发布包暴露不可执行命令；
- npm 安装用户可直接运行 `founder-review-validate`，评审 Schema 也有稳定包导出路径；
- 新增七项协议测试，覆盖公开命令/Schema 导出、npm 符号链接入口、有效记录、
  盲评/致命约束矛盾、重复评审、裁决矛盾和关键遗漏细节；
- 干净安装探针发现并修复 npm `.bin` 符号链接下入口判断静默退出的问题。

### 尚未证明

- 没有真实评审记录，工具存在不等于专家盲评已执行；
- 未证明评审者独立性、专业性、真实案例同意或去标识化；
- 未冻结稳定版阈值，仍不得发布稳定 `v1`。

### 验证

- `npm run check` 通过；
- `npm run eval:offline` 通过：11 个测试文件、52/52 测试、5/5 fixture；
- coverage：statements 85.45%、branches 75.77%、functions 87.64%、lines 87.10%；
- `npm run validate:docs` 通过，33 个 Markdown 文件链接有效；
- `npm run build` 通过；
- 隔离缓存生成精确 npm tarball：110 个文件，包含评审验证器与
  `review-form.v1.schema.json`；
- tarball 在全新临时目录安装成功：96 个依赖、0 个已知漏洞；
- 安装包内 `.bin/founder-review-validate --help`、评审 Schema 子路径导入与 SDK
  公开导入均通过。

## 2026-07-28（实时质量诊断与真实案例同意门）

### 审计发现

- 原有 live smoke 只能运行一个固定合成案例，不能直接产生稳定性、反事实敏感性或
  事实性抽样材料；
- 稳定版要求 3–5 个知情同意并去标识化的真实案例，但此前只有原则，没有可机检的
  处理记录契约；
- 用户已经确定模型调用次数使用可调默认值，因此质量评测也必须先显示总费用上限，
  不能在普通命令中暗中产生付费 API 调用。

### 已完成

- 新增 `founder-quality-eval` / `npm run eval:quality`：
  - 默认只输出无费用计划，只有显式 `--execute` 才使用 BYOK；
  - 默认三次相同基线加“更强付费留存证据”和“每周仅一小时”两个单变量反事实；
  - 重复次数默认 3，可通过参数或 `FOUNDER_DECISION_QUALITY_REPEATS` 调为 2–5；
  - quick/deep 每次评测继续使用 2/0/2 分钟与 8/10/15 分钟默认上限，也可单独调整；
  - 输出分别保留 verdict/stage/各维度稳定性、反事实观察和最多 12 条外部事实人工
    引用抽样，不合并为一个伪精确总分；
  - 所有人工状态固定 `not_reviewed`，稳定版状态固定 `not_assessed`；
  - 执行产物使用权限受限的临时目录和 `0600` 文件。
- 新增公共 `live-quality-eval.v1` Schema、npm 子路径和 `.bin` 入口；
- 新增 `real-case-consent.v1` 与 `founder-consent-validate`：
  - 记录只允许随机化案例/参与者/操作者 ID，不保存姓名、联系信息、原始提交或密钥；
  - 私有评测必须明确允许 Agent、外部模型和去标识化专家评审；
  - 公开发布许可独立，私有评测不强迫用户公开案例；
  - 检查撤回一致性、同意/去标识化/复核时间顺序、低重识别风险声明、第二人独立
    复核、SHA-256、删除流程及重复记录；
  - 输出只汇总数量和本地问题位置，固定不自称法律合规或稳定版通过。
- README、评测、OpenAI 费用、Schema、路线图、追踪表、变更日志和真实案例隐私流程
  已同步；`/Users/frame/Documents/lmao app` 未修改。

### 验证

- `npm run check` 通过，新增 `.mjs` 均有语法检查；
- 13 个测试文件、65/65 测试通过；
- coverage：statements 86.04%、branches 75.97%、functions 90.26%、lines 87.55%；
- 5/5 fixture、34 个 Markdown 文件链接与 TypeScript build 通过；
- 精确 tarball 为 115 个文件，约 147.8 kB，解包约 547.0 kB；
- tarball 在全新临时项目安装成功，96 个依赖；
- 安装包内质量计划输出确认默认 5 次评测、最多 10 次模型调用和 0 次搜索；
- 安装包内 `founder-consent-validate`、`founder-review-validate` 及两个新增公共
  Schema 子路径均可用。
- 实现提交 `07f175498253fd93f65044723ab317836d23c4db` 已推送到公开仓库 `main`；
- 远端 CI run `30360931774` 与 CodeQL run `30360931721` 均成功。

### 尚未证明

- 工作区没有 `OPENAI_API_KEY`，因此尚未执行实时 smoke 或质量诊断，未产生真实模型
  的重复、反事实和事实性结果；
- 没有真实案例或真实同意记录，验证器存在不等于有效同意、绝对去标识化或法律合规；
- 没有独立专家评审和裁决，稳定 `v1` 质量门继续开放；
- npm beta 和 GitHub beta Release 仍未发布。

## 2026-07-28（人工质量复核与稳定版统一证据审计）

### 审计发现

- 实时质量工具能生成重复、反事实和引用抽样，但没有一个版本化人工记录把判断绑定到
  原始汇总字节；
- 真实案例同意、专家评审、报告、质量结果和发布证据此前分别验证，无法一次检查完整
  链路；
- 专家评审表只有案例/报告 ID 和版本，没有案例与报告 SHA-256；同名报告在评审后被
  替换时可能无法察觉；
- “结构通过”和“稳定版批准”必须继续分开，不能让统一工具因所有输入为绿色就自行
  发布稳定版。

### 已完成

- 新增公共 `live_quality_review.v1` Schema 和
  `founder-quality-review-validate`：
  - 将人工评审绑定到实时质量汇总的准确 SHA-256；
  - 要求恰好覆盖两个反事实和全部抽样引用主张；
  - 分别检查重复稳定性、反事实和引用支持的判断、P0–P3 严重度、冲突声明和裁决；
  - 输出观测与未解决失败数量，`stableGateStatus` 固定为 `not_assessed`。
- 专家评审 `expert_review.v1` 增加必填 `case_artifact_sha256` 与
  `report_sha256`；统一审计将前者与同意记录中的去标识化案例哈希核对，并对实际报告
  文件逐字节计算后者。
- 新增 `stable_release_evidence.v1` 与 `founder-stable-audit`：
  - 接受维护者显式传入的私有同意、专家评审、冻结报告、实时质量汇总/人工复核及发布
    证据路径，不自动扫描或复制私密记录；
  - 检查 3–5 个 eligible 案例、案例版本、报告 ID/版本/哈希、冻结评审最低数量和可选
    角色覆盖、零未解决 P0/P1、决策改变遗漏、深度模式引用抽样；
  - 检查冻结门槛的产品负责人/评审组批准、候选版本/源码提交、已发布 npm 包干净安装、
    独立 SDK/HTTP 集成和发布说明证据文件哈希；
  - 最高只输出 `evidence_ready_for_human_release_decision`，
    `stableGateStatus` 仍为 `not_assessed`；
  - 明确说明工具无法认证同意、真实案例、评审者资历/独立性、npm 历史或人工发布决定。
- README、评测、发布、Schema、真实案例/专家评审说明、路线图、需求追踪和变更日志
  已同步；`/Users/frame/Documents/lmao app` 未修改。

### 验证

- `npm run check` 通过；
- `npm run eval:offline` 通过：15 个测试文件、76/76 测试、5/5 fixture；
- coverage：statements 86.15%、branches 76.08%、functions 90.26%、lines 87.55%；
- 34 个 Markdown 文件链接、TypeScript build 和 `git diff --check` 通过；
- 合成证据测试覆盖完整链路、损坏的发布清单、报告版本漂移与报告字节哈希漂移；测试
  明确声明合成记录不满足真实案例门；
- 最终 npm tarball 为 119 个文件、159,321 bytes，解包 604,597 bytes；
- tarball 在全新临时项目安装 96 个依赖成功；安装包内
  `founder-quality-review-validate`、`founder-stable-audit`、两个新公共 Schema 导出
  以及专家评审必填哈希字段均通过。
- 实现提交 `cae42f7a9844c6924abda01bdb1ff8d7f217d1c1` 已推送到公开仓库 `main`；
- 远端 CI run `30364834621` 与 CodeQL run `30364835123` 均成功。

### 尚未证明

- 工作区仍没有 `OPENAI_API_KEY`，未执行付费实时 smoke/质量运行；
- 没有 3–5 个真实同意案例、真实专家盲评、人工事实性复核或裁决；
- 本次干净安装来自本地候选 tarball，不是 npm registry 已发布制品，因此不满足稳定版
  的 published-artifact gate；
- npm beta 和 GitHub beta Release 尚未发布，稳定版也未被人工评审组批准。

## 2026-07-28（Docker 运行交付验证）

### 审计发现

- Dockerfile 已存在，但此前本机没有 Docker 命令，项目只能证明文件存在，不能证明
  镜像能构建或容器运行正确；
- Docker 构建使用基础镜像自带 npm，未与仓库声明和发布流程固定的 npm `11.16.0`
  对齐；
- README 没有提供安全注入 BYOK、服务 token 和持久化 SQLite volume 的 Docker
  运行示例。

### 已完成

- Docker build 阶段固定安装 npm `11.16.0`，依赖安装使用
  `npm ci --strict-allow-scripts`，生产裁剪禁止执行安装脚本；
- CI 新增独立 `docker` job：
  - 从仓库 Dockerfile 构建运行镜像；
  - 从最终运行镜像执行 CLI 版本 smoke；
  - 确认容器不是 root，并在 `/data` 创建和关闭真实 SQLite 数据库；
- README 增加本地构建、运行时环境变量注入、bearer token 和命名 volume 示例；
- 本地 actionlint、TypeScript/脚本检查、文档链接和 diff whitespace 检查通过。

### 尚未证明

- 本机仍没有 Docker 命令，无法本地复验镜像构建；
- Docker 验证不替代 BYOK 实时模型、npm beta 或稳定版真人质量门。

### 远端验证

- 实现提交 `02ba3e40b445c87fb3ed839137d704486e588f5d` 已推送到 `main`；
- GitHub CI run `30365502105` 成功；
- 其中 `docker` job `90295585578` 实际完成镜像构建、CLI 版本 smoke 和非 root SQLite
  smoke，三步均为 `success`；
- CodeQL run `30365502128` 成功。

## 2026-07-28（稳定版最终决定与发布失败关闭门）

### 审计发现

- 原 publish workflow 只按 SemVer 是否含预发布后缀选择 `beta` 或 `latest`，没有检查
  GitHub Release 的 prerelease 标记；
- 仅把 `package.json` 改为 `1.0.0` 并创建普通 Release，就可能绕过真实案例、专家评审
  和最终人工决定记录，直接尝试发布 npm `latest`；
- 统一稳定版审计输出没有公共 Schema，最终产品负责人/评审组决定也没有不可变记录
  契约。

### 已完成

- 新增 `stable_release_audit.v1`，固定统一审计的案例、报告哈希、质量复核、外部证据、
  issue 和 `not_assessed` 输出结构；
- 新增 `stable_release_decision.v1` 与 `founder-stable-decision-validate`：
  - 将最终决定绑定到准确审计文件 SHA-256、候选版本和源码提交；
  - 要求产品负责人和独立于证据生成的评审组、唯一审批者、冲突/时间一致性；
  - approved 必须确认全部人工检查、零未解决 P0/P1、已发布包证据和公开限制，且不能
    保留开放发布条件；
  - 仍明确不能认证人员身份、专业性、独立性或底层私有证据。
- 新增 `verify-release-gate.mjs` 并接入 publish workflow：
  - 预发布 SemVer 必须对应 GitHub prerelease，使用 `beta`；
  - 稳定 SemVer 必须对应普通 Release，并路由到 `stable-release` environment；
  - stable 必须精确匹配受保护环境中的版本、源码提交、审计 SHA-256 和决定 SHA-256；
  - Release notes 必须重复四项精确标记，缺失、重复或不匹配全部失败关闭；
  - beta 路由到独立 `beta-release` environment，不要求伪造稳定版证据。
- 发布、评测、README、Schema、路线图、追踪表、状态和变更日志已同步。

### 验证

- 首次全量运行的 86 项功能测试全部通过，但新脚本使 branches coverage 降至 74.33%，
  低于 75% 门；未降低阈值；
- 补充非 published event、draft、错误源码 SHA、无效 stable SemVer、缺失受保护哈希、
  重复发布标记和 CLI 参数失败路径后：
  - 17 个测试文件、89/89 测试通过；
  - coverage：statements 85.25%、branches 76.25%、functions 88.98%、lines 86.46%；
  - 5/5 fixture、34 个 Markdown 链接、TypeScript build、全部 workflow actionlint 与
    `git diff --check` 通过。
- 最终 npm tarball 为 122 个文件、166,481 bytes，解包 639,875 bytes；
- tarball 在全新临时项目安装 96 个依赖成功；安装包内最终决定命令和两个新公共
  Schema 导出均通过。

### 尚未证明

- 当前没有真实稳定版审计文件或真实最终决定记录；合成测试不满足真人质量门；
- `stable-release` environment 尚未配置独立 required reviewer 或实际批准变量；
- 工作区仍无 `OPENAI_API_KEY`，npm 包与 GitHub beta Release 仍未发布；
- 发布门只能核对声明、哈希与 GitHub 保护状态，不能替代对私有证据真实性的人工核验。

## 2026-07-28（稳定版门远端 TypeScript 兼容修复）

### 远端发现

- 稳定版门实现提交 `be4ecb1749fd9aef2752c5db3ecc6af688961a28` 已以非强制快进
  方式同步到公开仓库 `main`；远端提交、父提交和树哈希均与本地一致；
- GitHub CI run `30368275556` 的 Node 22.14 与 Node 24 quality job 都在
  `npm run check` 失败；
- 失败限定在 `tests/stable-release-audit.test.ts`：TypeScript 在 NodeNext/CJS
  interop 下将 `Ajv` 与 `ajv-formats` 默认导入解析为不可构造/不可调用的模块命名空间；
- 同一 run 的 Docker job `90305102788` 已成功构建镜像，并通过 CLI 与非 root SQLite
  smoke；这不能抵消 quality job 的失败。

### 修复与本地验证

- 测试改用与现有 `src/validation.ts` 和 `tests/schema-contracts.test.ts` 相同的
  `createRequire` 兼容模式；产品运行时代码、公开 Schema 和质量门槛均未改变；
- `npm run check` 通过；
- `npm run eval:offline` 通过：17 个测试文件、89/89 测试和 5/5 fixture；
- coverage：statements 85.25%、branches 76.25%、functions 88.98%、lines 86.46%；
- 34 个 Markdown 链接、TypeScript build 和 npm dry-run tarball 通过；
- 本机默认 npm cache 含历史 root 所有权文件，首次 dry-run 在完成 prepack 后因
  `EPERM` 失败；未修改用户全局目录，改用 `/private/tmp` 独立缓存后成功，生成 122 个
  文件、167.5 kB 的候选 tarball。

### 尚未证明

- 本修复尚未取得新的远端 Node 22.14/24 CI 与 CodeQL 成功证据；
- BYOK 实时 smoke、npm beta、GitHub beta Release、3–5 个真实案例和最终人工稳定版
  决定仍未完成。
