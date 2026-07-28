# Real-case evaluation records

真实案例默认保存在受限的私有评测工作区，不放入公开仓库。本目录不保存任何真实
参与者记录。

每个真实案例在调用模型或交给专家前，必须有一份符合
`schemas/real-case-consent.v1.schema.json` 的独立流程记录，并运行：

```bash
npm run validate:consents -- /private/path/to/consent-records
```

流程记录只能使用随机化的 `case_id`、`participant_id` 和操作者 ID，不得包含：

- 姓名、邮箱、电话、社交账号或地址；
- 原始想法、公司名、客户名或可重新识别的具体组合；
- API Key、密码、内部链接或其他秘密；
- 原始签名、录音、聊天记录或身份映射。

`eligible` 只表示声明的处理范围、撤回机制、去标识化清单、第二人复核和数据处理
字段通过确定性检查。验证器无法证明记录真实、去标识化绝对完整或符合特定法域
法律；必要时应由当地隐私/法律专业人士复核。

允许用于私有评测不等于允许公开案例。只有
`consent.scopes.public_release: true` 时，去标识化案例才可以另行考虑进入公开
fixture；即便如此也必须再次人工检查重识别风险。

完成真实案例、专家盲评和实时质量人工复核后，使用 `founder-stable-audit` 将这些
私有记录与冻结报告及发布证据串联。审计命令见 `docs/EVALS.md`；成功结果仍不证明
案例真实性，也不替代人工稳定版发布决定。
