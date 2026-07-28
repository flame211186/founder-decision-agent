# Human and Expert Review

本目录保存评审协议的机器可读表单，不保存未经明确同意的真实私密想法。

使用顺序：

1. 评审者只看案例输入，填写 `independent_assessment`；
2. 锁定第一阶段答案；
3. 显示 Agent 报告，填写 `report_assessment`；
4. 维护者或领域专家填写 `adjudication`；
5. P0/P1 失败进入长期回归案例。

`review-form.v1.schema.json` 只验证记录结构，不证明评审者专业性、判断正确性或裁决质量。完整流程见 `docs/EXPERT_REVIEW_PROTOCOL.md`。
