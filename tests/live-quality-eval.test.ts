import { mkdtemp, readFile, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  buildCitationReviewSample,
  buildQualityEvalPlan,
  parseQualityEvalArgs,
  summarizeQualityEval,
  validateQualityEvalSummary
} from "../scripts/live-quality-eval.mjs";
import type {
  EvaluationOutcome,
  EvaluationReport,
  RunManifest
} from "../src/types.js";
import { fixtureReport } from "./helpers.js";

const script = fileURLToPath(
  new URL("../scripts/live-quality-eval.mjs", import.meta.url)
);

function qualityExecution(
  caseId: "baseline_repeat" | "stronger_traction" | "limited_founder_time",
  runKind: "repeat" | "counterfactual",
  repeatIndex: number,
  source: string
) {
  const report = fixtureReport(source);
  report.report_id = `report_${caseId}_${repeatIndex}`;
  report.idea_id = `idea_${caseId}`;
  const manifest: RunManifest = {
    schemaVersion: "run_manifest.v1",
    runId: `run_${caseId}_${repeatIndex}`,
    reportId: report.report_id,
    ideaId: report.idea_id,
    mode: report.evaluation_mode,
    startedAt: "2026-07-28T10:00:00.000Z",
    completedAt: "2026-07-28T10:00:01.000Z",
    workflowVersion: "test",
    promptVersion: "test",
    schemaVersionUsed: "evaluation_report.v1",
    provider: "fixture",
    calls: [
      {
        role: "synthesizer",
        model: "fixture-model",
        startedAt: "2026-07-28T10:00:00.000Z",
        completedAt: "2026-07-28T10:00:01.000Z",
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          reasoningTokens: 10,
          totalTokens: 150
        }
      }
    ],
    budget: {
      maxModelCalls: 2,
      maxSearchCalls: report.evaluation_mode === "deep" ? 10 : 0,
      maxWallTimeMs: 120000,
      maxOutputTokensPerCall: 32000
    },
    budgetUsed: {
      modelCalls: 1,
      searchCalls: report.evaluation_mode === "deep" ? 1 : 0,
      elapsedMs: 1000
    },
    validation: {
      valid: true,
      issues: []
    },
    status: "completed",
    warnings: []
  };
  const outcome: EvaluationOutcome = {
    report,
    markdown: "Synthetic quality evaluation",
    manifest
  };
  return {
    caseId,
    runKind,
    repeatIndex,
    artifactFile: `/private/tmp/${caseId}-${repeatIndex}.json`,
    outcome
  };
}

describe("live quality evaluation", () => {
  it("defaults to a no-cost three-repeat quick plan with explicit ceilings", () => {
    const options = parseQualityEvalArgs([], {});
    const plan = buildQualityEvalPlan(options);
    expect(options).toMatchObject({
      mode: "quick",
      repeats: 3,
      execute: false
    });
    expect(plan).toMatchObject({
      status: "planned",
      evaluationCount: 5,
      budget: {
        totalMaxModelCalls: 10,
        totalMaxSearchCalls: 0
      },
      executionRequires: "--execute",
      stableGateStatus: "not_assessed"
    });
  });

  it("accepts configurable repeat and budget caps and rejects unsafe mode combinations", () => {
    const options = parseQualityEvalArgs(
      [
        "--mode",
        "deep",
        "--repeats",
        "2",
        "--max-model-calls",
        "4",
        "--max-search-calls",
        "3",
        "--max-wall-time-minutes",
        "5",
        "--execute"
      ],
      {}
    );
    const plan = buildQualityEvalPlan(options);
    expect(plan).toMatchObject({
      evaluationCount: 4,
      budget: {
        perEvaluation: {
          maxModelCalls: 4,
          maxSearchCalls: 3,
          maxWallTimeMs: 300000
        },
        totalMaxModelCalls: 16,
        totalMaxSearchCalls: 12
      }
    });
    expect(() =>
      buildQualityEvalPlan({
        mode: "quick",
        repeats: 3,
        budget: { maxSearchCalls: 1 }
      })
    ).toThrow("quick mode requires maxSearchCalls to be 0");
  });

  it("prints a plan without requiring a key or build artifact", () => {
    const result = spawnSync(process.execPath, [script], {
      encoding: "utf8",
      env: {
        PATH: process.env.PATH ?? ""
      }
    });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      status: "planned",
      executionRequires: "--execute",
      stableGateStatus: "not_assessed"
    });
  });

  it("runs through an npm-style executable symlink", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "founder-quality-bin-"));
    const executable = resolve(directory, "founder-quality-eval");
    await symlink(script, executable);
    const result = spawnSync(process.execPath, [executable, "--help"], {
      encoding: "utf8"
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Without --execute, prints a no-cost plan.");
  });

  it("summarizes repeat stability and counterfactuals without self-approving stable v1", async () => {
    const plan = buildQualityEvalPlan({
      mode: "quick",
      repeats: 3,
      budget: {}
    });
    const executions = [
      qualityExecution(
        "baseline_repeat",
        "repeat",
        1,
        "002_niche_agency_feedback_saas"
      ),
      qualityExecution(
        "baseline_repeat",
        "repeat",
        2,
        "002_niche_agency_feedback_saas"
      ),
      qualityExecution(
        "baseline_repeat",
        "repeat",
        3,
        "002_niche_agency_feedback_saas"
      ),
      qualityExecution(
        "stronger_traction",
        "counterfactual",
        1,
        "001_idea_evaluator_agent"
      ),
      qualityExecution(
        "limited_founder_time",
        "counterfactual",
        1,
        "012_agency_saas_low_founder_fit"
      )
    ];
    const summary = summarizeQualityEval(executions, {
      mode: "quick",
      plan,
      generatedAt: "2026-07-28T10:00:00.000Z"
    });
    expect(summary).toMatchObject({
      repeat_stability: {
        verdict_counts: { pursue: 3 },
        verdict_agreement_rate: 1,
        unanimous_verdict: true,
        max_verdict_distance: 0
      },
      stable_gate_status: "not_assessed"
    });
    expect(summary.counterfactuals).toHaveLength(2);
    const validation = await validateQualityEvalSummary(summary);
    expect(validation.valid, JSON.stringify(validation.errors)).toBe(true);
  });

  it("deduplicates external claims and leaves citation support for human review", () => {
    const repeatedReport = qualityExecution(
      "baseline_repeat",
      "repeat",
      1,
      "001_idea_evaluator_agent"
    );
    const repeatedAgain = structuredClone(repeatedReport);
    repeatedAgain.repeatIndex = 2;
    repeatedAgain.outcome.report.report_id = "report_baseline_repeat_2";
    const sample = buildCitationReviewSample(
      [repeatedReport, repeatedAgain],
      "deep"
    );
    const rawExternalClaimCount =
      repeatedReport.outcome.report.claims.filter(
        (claim) => claim.claim_type === "external_fact"
      ).length * 2;
    expect(sample.applicable).toBe(true);
    expect(sample.total_unique_external_claims).toBeLessThan(
      rawExternalClaimCount
    );
    expect(sample.sampled_claims.length).toBeGreaterThan(0);
    expect(
      sample.sampled_claims.every(
        (claim) => claim.human_support_status === "not_reviewed"
      )
    ).toBe(true);
  });

  it("publishes the executable and public quality-summary Schema", async () => {
    const packagePath = fileURLToPath(new URL("../package.json", import.meta.url));
    const manifest = JSON.parse(await readFile(packagePath, "utf8")) as {
      bin: Record<string, string>;
      exports: Record<string, unknown>;
    };
    expect(manifest.bin["founder-quality-eval"]).toBe(
      "./scripts/live-quality-eval.mjs"
    );
    expect(
      manifest.exports["./schemas/live-quality-eval.v1.schema.json"]
    ).toBe("./schemas/live-quality-eval.v1.schema.json");
  });
});
