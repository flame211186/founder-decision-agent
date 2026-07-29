# 研究来源

最后检查：2026-07-28

本页记录影响产品方法、安全和融资边界的主要公开来源。来源存在时效性，进入产品的事实主张仍需在实际报告生成时重新核验。

## 创业与投资判断

### Y Combinator

- YC’s Essential Startup Advice  
  https://www.ycombinator.com/blog/ycs-essential-startup-advice/  
  采用点：尽早接触用户、构建真实需要、避免过早扩张、用低成本方式学习。

- How to Apply to Y Combinator  
  https://www.ycombinator.com/howtoapply.html  
  采用点：清晰具体地描述产品；主动暴露障碍；说明切入点和如何克服问题。

- YC’s Founding Principles  
  https://www.ycombinator.com/principles/  
  采用点：帮助创始人而不是命令创始人；投资人视角不应覆盖创始人利益。

### Sequoia Capital

- Writing a Business Plan  
  https://sequoiacap.com/article/writing-a-business-plan/  
  采用点：目的、问题、方案、why now、市场、竞争、商业模式、团队、财务和愿景。

- The Arc PMF Terrifying Questions Framework  
  https://sequoiacap.com/article/pmf-framework-2/  
  采用点：存在权、用户是否在意、产品是否改变行为、客户是否愿意支付足够价值、增长路径。

这些框架是有价值的输入，不是唯一真理。它们偏向风险投资和高增长企业，因此本项目会单独评价个人小生意与 VC 适配度。

## AI Agent 与风险管理

- OpenAI: Latest model guide  
  https://developers.openai.com/api/docs/guides/latest-model  
  采用点：默认模型别名与 reasoning effort 是可替换配置，必须由评测而不是营销描述决定升级。

- OpenAI: Responses API reference  
  https://developers.openai.com/api/reference/resources/responses/methods/create  
  采用点：结构化输出、`store: false`、`safety_identifier`、工具和调用上限。

- OpenAI: Structured model outputs — Supported schemas
  https://developers.openai.com/api/docs/guides/structured-outputs#supported-schemas
  采用点：生成 Schema 只使用支持的类型、格式和约束；对象字段全部 required，
  `additionalProperties: false`；完整 canonical 约束在生成后复核。

- OpenAI: API error codes
  https://developers.openai.com/api/docs/guides/error-codes#api-errors
  采用点：区分速率 429 与额度 429；额度 429 需要 Key 所属组织购买额度或提高消费上限。

- OpenAI: Web search guide  
  https://developers.openai.com/api/docs/guides/tools-web-search  
  采用点：外部事实必须保留 URL citation 和来源列表；引用可见不等于语义支持已验证。

- OpenAI: Data controls  
  https://platform.openai.com/docs/guides/your-data  
  采用点：API 数据默认训练政策、abuse monitoring 与 `store: false` 边界必须单独说明。

- OpenAI: A practical guide to building AI agents  
  https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/  
  采用点：分层 guardrails、人类介入、失败阈值、真实部署中的持续评测。

- NIST AI Risk Management Framework 1.0  
  https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-ai-rmf-10  
  采用点：Govern、Map、Measure、Manage；有效性、可靠性、透明度、隐私和持续评测。

- NIST Generative AI Profile  
  https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf  
  采用点：confabulation、隐私、信息完整性以及生成式 AI 特有风险。

## 融资与法律边界

- U.S. SEC Resources for Small Businesses  
  https://www.sec.gov/resources-small-businesses  
  采用点：融资路径和监管信息必须链接到权威资料，不能用通用模型知识代替地区法律。

- SEC: Private Companies and the SEC  
  https://www.sec.gov/resources-small-businesses/capital-raising-building-blocks/private-companies-sec  
  采用点：私营公司发行证券也涉及监管；公开沟通可能构成证券要约，融资建议必须有边界。

- YC Safe Financing Documents  
  https://www.ycombinator.com/documents  
  采用点：可解释常见早期融资工具，但用户应由成立地的执业律师复核。

- SEC: Capital-Raising Building Blocks  
  https://www.sec.gov/resources-small-businesses/capital-raising-building-blocks  
  采用点：美国融资研究的一手入口，不预先推断具体豁免或申报义务。

- U.S. Small Business Administration: Loans  
  https://www.sba.gov/funding-programs/loans

- U.S. Small Business Administration: Investment Capital  
  https://www.sba.gov/funding-programs/investment-capital

- 国家法律法规数据库：《中华人民共和国公司法》  
  https://flk.npc.gov.cn/detail?fileId=&id=ff8081818c9108eb018cb6922f750c07&title=中华人民共和国公司法&type=  
  采用点：中国大陆公司事项的一手法律入口；具体融资、税务、数据和行业许可仍需专业复核。

## 开源 Agent 工程参考

- AutoGPT  
  https://github.com/Significant-Gravitas/AutoGPT
- OpenHands  
  https://github.com/OpenHands/OpenHands
- MetaGPT  
  https://github.com/FoundationAgents/MetaGPT
- Mastra  
  https://github.com/mastra-ai/mastra
- Microsoft Agent Framework  
  https://github.com/microsoft/agent-framework
- CrewAI  
  https://github.com/crewAIInc/crewAI
- LangGraph  
  https://github.com/langchain-ai/langgraph
- OpenAI Agents SDK  
  https://github.com/openai/openai-agents-python
- Hugging Face smolagents  
  https://github.com/huggingface/smolagents

采用点：工作流、工具契约、状态、沙箱、安全、追踪、评测、示例、文档、CLI/API 和发布工程。仓库流行度不作为技术选型的唯一标准。

## 发布与供应链

- npm trusted publishing  
  https://docs.npmjs.com/trusted-publishers  
  采用点：GitHub Actions OIDC、短期凭证和来源证明，避免长期 npm token。

- GitHub secret scanning  
  https://docs.github.com/code-security/secret-scanning/introduction/about-secret-scanning  
  采用点：公共仓库发布前不提交密钥，并启用平台级 secret scanning。
