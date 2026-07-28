import type { EvaluationReport } from "./types.js";

const VERDICT_LABELS: Record<string, Record<string, string>> = {
  "zh-CN": {
    pursue: "推进",
    validate: "先验证",
    reframe: "重构",
    park: "暂存",
    stop: "停止"
  },
  en: {
    pursue: "Pursue",
    validate: "Validate first",
    reframe: "Reframe",
    park: "Park",
    stop: "Stop"
  }
};

function list(items: string[]): string {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- 无 / None";
}

export function renderReport(report: EvaluationReport): string {
  const zh = report.report_language === "zh-CN";
  const label = VERDICT_LABELS[zh ? "zh-CN" : "en"]?.[report.verdict.label];
  const sections: string[] = [
    `# ${zh ? "创始人想法决策报告" : "Founder Idea Decision Report"}`,
    [
      `- ${zh ? "结论" : "Verdict"}: **${label}**`,
      `- ${zh ? "置信度" : "Confidence"}: ${report.verdict.confidence}`,
      `- ${zh ? "阶段" : "Stage"}: ${report.idea_normalization.stage}`,
      `- ${zh ? "模式" : "Mode"}: ${report.evaluation_mode}`,
      `- ${zh ? "截至日期" : "As of"}: ${report.as_of_date}`
    ].join("\n"),
    `> ${report.verdict.one_sentence}`,
    `## ${zh ? "一分钟摘要" : "One-minute summary"}`,
    [
      `**${zh ? "最有价值的一点" : "Opportunity"}**：${report.executive_summary.opportunity}`,
      `**${zh ? "最大问题" : "Main problem"}**：${report.executive_summary.main_problem}`,
      `**${zh ? "现在最该做的事" : "Next move"}**：${report.executive_summary.recommended_next_move}`,
      `**${zh ? "授权范围" : "Authorized next step"}**：${report.verdict.authorized_next_step}`
    ].join("\n\n"),
    `## ${zh ? "想法重述" : "Normalized idea"}`,
    [
      report.idea_normalization.one_sentence,
      `${zh ? "问题" : "Problem"}：${report.idea_normalization.problem}`,
      `${zh ? "目标用户" : "Target users"}：${report.idea_normalization.target_users.join("；")}`,
      `${zh ? "方案" : "Solution"}：${report.idea_normalization.proposed_solution}`
    ].join("\n\n"),
    `## ${zh ? "价值判断" : "Value assessments"}`,
    Object.entries(report.value_assessments)
      .map(
        ([key, value]) =>
          `### ${key}\n\n${value.label} (${value.score ?? "N/A"}/5)\n\n${value.summary}`
      )
      .join("\n\n"),
    `## ${zh ? "十二维评估" : "Twelve dimensions"}`,
    report.dimension_assessments
      .map(
        (item) =>
          `### ${item.dimension_id} ${item.name}\n\n${item.score ?? "N/A"}/5 — ${item.summary}`
      )
      .join("\n\n"),
    `## ${zh ? "支持与反对" : "Support and opposition"}`,
    [
      `### ${zh ? "最强支持论点" : "Strongest supporting case"}`,
      list(report.theses.supporting.map((item) => item.statement)),
      `### ${zh ? "最强反对论点" : "Strongest opposing case"}`,
      list(report.theses.opposing.map((item) => item.statement)),
      `### ${zh ? "综合" : "Synthesis"}`,
      report.theses.synthesis
    ].join("\n\n"),
    `## ${zh ? "关键未知与风险" : "Unknowns and risks"}`,
    [
      ...report.key_unknowns.map(
        (item) =>
          `- **${item.importance}** ${item.question} — ${item.why_it_matters}；${zh ? "最低成本验证" : "cheapest test"}：${item.cheapest_test}`
      ),
      ...report.risks.map(
        (item) =>
          `- **${item.severity}/${item.likelihood}** ${item.description} — ${item.mitigation}`
      )
    ].join("\n"),
    `## ${zh ? "改进方向" : "Improvements"}`,
    list(
      report.improvements.map(
        (item) => `**${item.title}**：${item.description}；${item.expected_effect}`
      )
    ),
    `## ${zh ? "行动与资源" : "Actions and resources"}`,
    [
      `**Disposition**: ${report.disposition_plan.mode}`,
      report.experiments.length
        ? report.experiments
            .map(
              (item) =>
                `### ${item.horizon} · ${item.hypothesis}\n\n${item.method}\n\n**Success**\n${list(item.success_criteria)}\n\n**Failure**\n${list(item.failure_criteria)}`
            )
            .join("\n\n")
        : [
            `**${zh ? "允许动作" : "Allowed actions"}**`,
            list(report.disposition_plan.allowed_actions),
            `**${zh ? "关闭动作" : "Closure actions"}**`,
            list(report.disposition_plan.closure_actions),
            `**${zh ? "重启条件" : "Reactivation conditions"}**`,
            list(report.disposition_plan.reactivation_triggers)
          ].join("\n\n")
    ].join("\n\n"),
    `## ${zh ? "融资准备" : "Funding readiness"}`,
    [
      `${report.funding.readiness} / ${report.funding.recommended_path}`,
      report.funding.rationale,
      `**${zh ? "阻碍" : "Blockers"}**\n${list(report.funding.current_blockers)}`,
      `**${zh ? "下一里程碑" : "Next fundable milestone"}**\n${report.funding.next_fundable_milestone}`
    ].join("\n\n"),
    `## ${zh ? "证据与限制" : "Evidence and limitations"}`,
    report.evidence
      .map((item) =>
        item.url
          ? `- [${item.title}](${item.url}) — ${item.statement}`
          : `- ${item.evidence_type} · ${item.title} — ${item.statement}`
      )
      .join("\n"),
    `## ${zh ? "本结论不代表" : "This verdict does not mean"}`,
    list(report.verdict.does_not_mean),
    `---\n${list(report.disclaimer.limitations)}`
  ];
  return sections.join("\n\n").trim() + "\n";
}
