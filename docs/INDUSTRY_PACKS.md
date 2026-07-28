# Industry and jurisdiction packs

Version: beta

## Industry packs

Industry packs extend the common D1–D12 method with questions, metrics, risks and source priorities. They do not fork the domain model or create separate agents.

### `b2b_saas`

Focus:

- buyer, user and procurement distinction;
- painful workflow and switching cost;
- sales motion, ACV, onboarding and time-to-value;
- retention, expansion and service burden;
- security, integration and data-processing requirements.

### `ai_native`

Focus:

- whether the model is essential or cosmetic;
- quality, latency and cost under real workloads;
- evaluation data and failure handling;
- privacy, rights, safety and provider dependency;
- durable advantage beyond access to a public model.

Activate no more than two packs:

```bash
founder-decision evaluate "..." --industry b2b_saas ai_native
```

## Jurisdiction guidance

Jurisdiction guidance is intentionally narrower than legal analysis. It gives the research stage official starting points and forces unknown/professional-review language.

Initial recognized packs:

- United States: SEC capital-raising guidance and SBA loan/investment-capital entry points.
- 中国大陆：国家法律法规数据库中的《中华人民共和国公司法》入口。

The presence of an official link does not mean that it supports a specific report claim. Deep mode must still observe the source and map it to evidence; qualified local review remains required.

Unrecognized jurisdictions do not fall back to U.S. or Chinese rules. They remain unknown until current local primary sources are found.

## Adding a pack

A new pack needs:

1. a stable ID and documented scope;
2. questions/metrics/risks that change decisions rather than add prose;
3. primary-source priorities;
4. at least one positive, one negative and one missing-information evaluation case;
5. jurisdiction and professional-review boundaries where relevant;
6. no provider- or deployment-specific dependency in the core.
