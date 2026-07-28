import { newId } from "./ids.js";
import type {
  DimensionAssessment,
  EvaluationReport,
  PortfolioInsight,
  PortfolioReport,
  PortfolioRequest
} from "./types.js";

export function analyzePortfolio(
  request: PortfolioRequest,
  now: () => Date = () => new Date()
): PortfolioReport {
  if (request.schemaVersion !== "portfolio_request.v1") {
    throw new Error("schemaVersion must be portfolio_request.v1");
  }
  if (request.reports.length < 2) {
    return {
      schemaVersion: "portfolio_report.v1",
      reportId: newId("portfolio"),
      generatedAt: now().toISOString(),
      ideaIds: request.reports.map((report) => report.idea_id),
      clusters: [],
      insights: [
        {
          id: newId("insight"),
          kind: "pending",
          statement:
            request.language === "en"
              ? "At least two ideas are required before inferring cross-idea patterns."
              : "至少需要两个想法，才能形成跨想法模式判断。",
          evidenceIdeaIds: request.reports.map((report) => report.idea_id),
          confidence: "low",
          correctionStatus: "unreviewed"
        }
      ],
      resourceReuse: [],
      conflicts: [],
      thesis:
        request.language === "en"
          ? "Insufficient evidence for a personal founder thesis."
          : "当前证据不足以形成个人创业 thesis。",
      priorities: request.reports.map((report, index) => ({
        ideaId: report.idea_id,
        rank: index + 1,
        rationale: "Insufficient comparison evidence"
      })),
      warnings: ["Portfolio insights are decision support, not personality diagnosis."]
    };
  }

  const clusterMap = new Map<string, EvaluationReport[]>();
  for (const report of request.reports) {
    for (const archetype of report.idea_normalization.business_archetypes) {
      const current = clusterMap.get(archetype) ?? [];
      current.push(report);
      clusterMap.set(archetype, current);
    }
  }
  const clusters = [...clusterMap.entries()]
    .filter(([, reports]) => reports.length >= 2)
    .map(([label, reports]) => ({
      label,
      ideaIds: reports.map((report) => report.idea_id),
      sharedAttributes: [
        ...new Set(reports.flatMap((report) => report.idea_normalization.target_users))
      ].slice(0, 5)
    }));

  const insights: PortfolioInsight[] = [];
  const dimensionGroups = new Map<string, Array<{ report: EvaluationReport; dimension: DimensionAssessment }>>();
  for (const report of request.reports) {
    for (const dimension of report.dimension_assessments) {
      if (dimension.score_status !== "scored" || dimension.score === null) continue;
      const items = dimensionGroups.get(dimension.dimension_id) ?? [];
      items.push({ report, dimension });
      dimensionGroups.set(dimension.dimension_id, items);
    }
  }
  for (const [dimensionId, items] of dimensionGroups) {
    if (items.length < 2) continue;
    const average = items.reduce((sum, item) => sum + (item.dimension.score ?? 0), 0) / items.length;
    if (average >= 4 || average <= 2) {
      const kind = average >= 4 ? "strength" : "blind_spot";
      insights.push({
        id: newId("insight"),
        kind,
        statement:
          kind === "strength"
            ? `${dimensionId} is repeatedly supported across the evaluated ideas.`
            : `${dimensionId} is repeatedly weak or under-evidenced; treat it as a testable blind-spot candidate.`,
        evidenceIdeaIds: items.map((item) => item.report.idea_id),
        confidence: items.length >= 3 ? "medium" : "low",
        correctionStatus: "unreviewed"
      });
    }
  }
  for (const cluster of clusters) {
    insights.push({
      id: newId("insight"),
      kind: "pattern",
      statement: `Repeated focus on ${cluster.label}; verify whether this reflects reusable access or only idea preference.`,
      evidenceIdeaIds: cluster.ideaIds,
      confidence: cluster.ideaIds.length >= 3 ? "medium" : "low",
      correctionStatus: "unreviewed"
    });
  }

  const priorities = [...request.reports]
    .sort((a, b) => priorityEvidence(b) - priorityEvidence(a))
    .map((report, index) => ({
      ideaId: report.idea_id,
      rank: index + 1,
      rationale: [
        `verdict=${report.verdict.label}`,
        `business=${report.value_assessments.business_value?.score ?? "unknown"}`,
        `founder_fit=${report.value_assessments.founder_fit?.score ?? "unknown"}`,
        `critical_risks=${report.risks.filter((risk) => risk.severity === "critical").length}`
      ].join(", ")
    }));

  return {
    schemaVersion: "portfolio_report.v1",
    reportId: newId("portfolio"),
    generatedAt: now().toISOString(),
    ideaIds: request.reports.map((report) => report.idea_id),
    clusters,
    insights:
      insights.length > 0
        ? insights
        : [
            {
              id: newId("insight"),
              kind: "pending",
              statement: "No repeated pattern currently meets the two-idea evidence threshold.",
              evidenceIdeaIds: request.reports.map((report) => report.idea_id),
              confidence: "low",
              correctionStatus: "unreviewed"
            }
          ],
    resourceReuse: findShared(request.reports, "strengths"),
    conflicts: findConflicts(request.reports),
    thesis:
      clusters.length > 0
        ? `Current evidence suggests a possible focus around ${clusters.map((item) => item.label).join(", ")}; validate this against actual access and outcomes.`
        : "No sufficiently repeated business archetype is established yet.",
    priorities,
    warnings: [
      "Priority is a transparent heuristic, not an objective ranking.",
      "Insights require user correction and must not be treated as personality diagnosis."
    ]
  };
}

function priorityEvidence(report: EvaluationReport): number {
  const order: Record<EvaluationReport["verdict"]["label"], number> = {
    pursue: 5,
    validate: 4,
    reframe: 3,
    park: 2,
    stop: 1
  };
  const business = report.value_assessments.business_value?.score ?? 0;
  const fit = report.value_assessments.founder_fit?.score ?? 0;
  const critical = report.risks.filter((risk) => risk.severity === "critical").length;
  return order[report.verdict.label] * 100 + business * 10 + fit - critical * 50;
}

function findShared(reports: EvaluationReport[], key: "strengths"): string[] {
  const counts = new Map<string, number>();
  for (const report of reports) {
    const unique = new Set(report.dimension_assessments.flatMap((item) => item[key]));
    for (const value of unique) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([value]) => value)
    .slice(0, 10);
}

function findConflicts(reports: EvaluationReport[]): string[] {
  const active = reports.filter((report) =>
    ["pursue", "validate", "reframe"].includes(report.verdict.label)
  );
  if (active.length < 2) return [];
  return [
    `${active.length} ideas currently authorize active work; compare their 30-day time and cash requirements before running them concurrently.`
  ];
}
