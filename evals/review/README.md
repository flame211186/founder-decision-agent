# Human and Expert Review

本目录保存评审协议的机器可读表单，不保存未经明确同意的真实私密想法。

使用顺序：

1. 评审者只看案例输入，填写 `independent_assessment`；
2. 锁定第一阶段答案；
3. 显示 Agent 报告，填写 `report_assessment`；
4. 维护者或领域专家填写 `adjudication`；
5. P0/P1 失败进入长期回归案例。

`review-form.v1.schema.json` 只验证记录结构，不证明评审者专业性、判断正确性或裁决质量。完整流程见 `docs/EXPERT_REVIEW_PROTOCOL.md`。

结构与跨字段一致性验证：

```bash
npm run validate:reviews -- /private/path/to/review.json
npm run validate:reviews -- /private/path/to/review-directory

# 安装 npm 包后
founder-review-validate /private/path/to/review-directory
```

命令检查 JSON Schema、R1–R7 唯一完整性、盲评与裁决时间顺序、致命约束范围、
案例/报告 SHA-256 字段、重复 `review_id`、重复失败编号、同一评审者重复评同一案例、
裁决人数与裁决引用/冲突。
它只输出文件数量、问题和聚合统计，不输出评审正文。

输出中的 `stableGateStatus` 固定为 `not_assessed`。真实案例同意、去标识化、评审者构成、
冻结阈值和 P0/P1 裁决必须由独立证据证明，不能由结构验证器自动宣称通过。
