import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type {
  AnalysisInput,
  AnalysisResult,
  EvaluationReport,
  ModelAdapter,
  ReportGenerationInput,
  ReportGenerationResult,
  ResearchInput,
  ResearchResult
} from "../src/types.js";

export function fixtureReport(caseName: string): EvaluationReport {
  const path = fileURLToPath(
    new URL(`../evals/cases/${caseName}/report.json`, import.meta.url)
  );
  return JSON.parse(readFileSync(path, "utf8")) as EvaluationReport;
}

export class FixtureModel implements ModelAdapter {
  readonly id = "fixture";
  readonly calls: string[] = [];
  private readonly reports: EvaluationReport[];
  readonly researchResult: ResearchResult;

  constructor(reports: EvaluationReport[], researchResult?: ResearchResult) {
    this.reports = reports.map((report) => structuredClone(report));
    this.researchResult =
      researchResult ??
      ({
        text: "No external research.",
        citations: [],
        queries: [],
        model: "fixture-model"
      } satisfies ResearchResult);
  }

  async analyze(input: AnalysisInput): Promise<AnalysisResult> {
    this.calls.push(input.role);
    return {
      text: `${input.role} analysis`,
      metadata: { model: "fixture-model" }
    };
  }

  async research(_input: ResearchInput): Promise<ResearchResult> {
    this.calls.push("researcher");
    return structuredClone(this.researchResult);
  }

  async generateReport(input: ReportGenerationInput): Promise<ReportGenerationResult> {
    this.calls.push(input.repairErrors ? "repair" : "synthesizer");
    const report = this.reports.shift();
    if (!report) throw new Error("No fixture report remaining");
    return {
      report: structuredClone(report),
      metadata: { model: "fixture-model" }
    };
  }
}
