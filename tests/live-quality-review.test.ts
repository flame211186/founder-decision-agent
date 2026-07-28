import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildQualityEvalPlan,
  summarizeQualityEval
} from "../scripts/live-quality-eval.mjs";
import type { EvaluationOutcome, RunManifest } from "../src/types.js";
import { fixtureReport } from "./helpers.js";

const script = fileURLToPath(
  new URL("../scripts/validate-live-quality-review.mjs", import.meta.url)
);

function qualityExecution(
  caseId: "baseline_repeat" | "stronger_traction" | "limited_founder_time",
  runKind: "repeat" | "counterfactual",
  repeatIndex: number
) {
  const report = fixtureReport("001_idea_evaluator_agent");
  report.report_id = `report_${caseId}_${repeatIndex}`;
  report.idea_id = `idea_${caseId}`;
  const manifest: RunManifest = {
    schemaVersion: "run_manifest.v1",
    runId: `run_${caseId}_${repeatIndex}`,
    reportId: report.report_id,
    ideaId: report.idea_id,
    mode: "deep",
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
      maxModelCalls: 8,
      maxSearchCalls: 10,
      maxWallTimeMs: 900000,
      maxOutputTokensPerCall: 32000
    },
    budgetUsed: {
      modelCalls: 1,
      searchCalls: 1,
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
    markdown: "Synthetic quality review fixture",
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

function qualitySummary() {
  const plan = buildQualityEvalPlan({
    mode: "deep",
    repeats: 2,
    budget: {}
  });
  return summarizeQualityEval(
    [
      qualityExecution("baseline_repeat", "repeat", 1),
      qualityExecution("baseline_repeat", "repeat", 2),
      qualityExecution("stronger_traction", "counterfactual", 1),
      qualityExecution("limited_founder_time", "counterfactual", 1)
    ],
    {
      mode: "deep",
      plan,
      generatedAt: "2026-07-28T10:00:00.000Z"
    }
  );
}

function qualityReview(summary: ReturnType<typeof qualitySummary>, hash: string) {
  return {
    schema_version: "live_quality_review.v1",
    review_id: "quality_review_a81f20c4",
    quality_summary_sha256: hash,
    reviewed_at: "2026-07-28T11:00:00.000Z",
    reviewers: [
      {
        pseudonymous_id: "reviewer_a981cf20",
        roles: ["founder_operator"],
        independent_of_generation: true,
        has_conflict: false,
        conflict_notes: null
      }
    ],
    repeat_stability: {
      assessment: "acceptable",
      failure_severity: null,
      rationale: "The repeated baseline decisions remain materially consistent.",
      recommended_change: null
    },
    counterfactual_reviews: summary.counterfactuals.map((item) => ({
      case_id: String(item.case_id),
      assessment: "expected_response",
      failure_severity: null,
      rationale: "The changed variable affects the intended part of the analysis.",
      recommended_change: null
    })),
    citation_claim_reviews:
      summary.citation_review_sample.sampled_claims.map((claim) => ({
        claim_id: claim.claim_id,
        support_status: "supported",
        failure_severity: null,
        reviewed_evidence_urls: claim.evidence.map((item) =>
          String(item.url)
        ),
        rationale: "The cited material directly supports the sampled claim.",
        recommended_change: null
      })),
    adjudication: null
  };
}

async function writePair(
  directory: string,
  mutate?: (
    summary: ReturnType<typeof qualitySummary>,
    review: ReturnType<typeof qualityReview>
  ) => void
) {
  const summary = qualitySummary();
  const summaryText = JSON.stringify(summary, null, 2);
  const hash = createHash("sha256").update(summaryText).digest("hex");
  const review = qualityReview(summary, hash);
  mutate?.(summary, review);
  const summaryPath = resolve(directory, "summary.json");
  const reviewPath = resolve(directory, "review.json");
  await writeFile(summaryPath, summaryText);
  await writeFile(reviewPath, JSON.stringify(review, null, 2));
  return { summaryPath, reviewPath };
}

function run(summaryPath: string, reviewPath: string) {
  return spawnSync(process.execPath, [script, summaryPath, reviewPath], {
    encoding: "utf8"
  });
}

describe("live quality human review validation", () => {
  it("publishes the validator and public review Schema", async () => {
    const packagePath = fileURLToPath(new URL("../package.json", import.meta.url));
    const manifest = JSON.parse(await readFile(packagePath, "utf8")) as {
      bin: Record<string, string>;
      exports: Record<string, unknown>;
    };
    expect(manifest.bin["founder-quality-review-validate"]).toBe(
      "./scripts/validate-live-quality-review.mjs"
    );
    expect(
      manifest.exports["./schemas/live-quality-review.v1.schema.json"]
    ).toBe("./schemas/live-quality-review.v1.schema.json");
  });

  it("runs through an npm-style executable symlink", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "quality-review-bin-"));
    const executable = resolve(directory, "founder-quality-review-validate");
    await symlink(script, executable);
    const result = spawnSync(process.execPath, [executable, "--help"], {
      encoding: "utf8"
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Usage:");
  });

  it("validates complete deep factuality, repeat and counterfactual review linkage", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "quality-review-valid-"));
    const pair = await writePair(directory);
    const result = run(pair.summaryPath, pair.reviewPath);
    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output).toMatchObject({
      status: "passed",
      summary: {
        mode: "deep",
        reviewerCount: 1,
        counterfactualReviewCount: 2,
        factualitySamplingApplicable: true,
        stableGateStatus: "not_assessed"
      }
    });
    expect(output.summary.sampledCitationClaimCount).toBeGreaterThan(0);
  });

  it("rejects a review of a different immutable summary", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "quality-review-hash-"));
    const pair = await writePair(directory, (_summary, review) => {
      review.quality_summary_sha256 = "0".repeat(64);
    });
    const result = run(pair.summaryPath, pair.reviewPath);
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stderr).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "QUALITY_SUMMARY_HASH_MISMATCH" })
      ])
    );
  });

  it("requires exact citation and counterfactual coverage", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "quality-review-set-"));
    const pair = await writePair(directory, (_summary, review) => {
      review.citation_claim_reviews.pop();
      review.counterfactual_reviews[1] = review.counterfactual_reviews[0]!;
    });
    const result = run(pair.summaryPath, pair.reviewPath);
    expect(result.status).toBe(1);
    const codes = JSON.parse(result.stderr).issues.map(
      (issue: { code: string }) => issue.code
    );
    expect(codes).toEqual(
      expect.arrayContaining([
        "CITATION_REVIEW_SET_MISMATCH",
        "COUNTERFACTUAL_REVIEW_SET_MISMATCH"
      ])
    );
  });

  it("rejects passing findings with severity and failures without severity", async () => {
    const directory = await mkdtemp(
      resolve(tmpdir(), "quality-review-severity-")
    );
    const pair = await writePair(directory, (_summary, review) => {
      Object.assign(review.repeat_stability, { failure_severity: "P1" });
      review.counterfactual_reviews[0]!.assessment = "unexpected_response";
    });
    const result = run(pair.summaryPath, pair.reviewPath);
    expect(result.status).toBe(1);
    const codes = JSON.parse(result.stderr).issues.map(
      (issue: { code: string }) => issue.code
    );
    expect(codes).toEqual(
      expect.arrayContaining([
        "QUALITY_PASSING_FINDING_HAS_SEVERITY",
        "QUALITY_FAILURE_MISSING_SEVERITY"
      ])
    );
  });

  it("rejects contradictory or unknown adjudication findings", async () => {
    const directory = await mkdtemp(
      resolve(tmpdir(), "quality-review-adjudication-")
    );
    const pair = await writePair(directory, (_summary, review) => {
      review.repeat_stability.assessment = "not_acceptable";
      Object.assign(review.repeat_stability, { failure_severity: "P1" });
      Object.assign(review, { adjudication: {
        status: "unresolved_disagreement",
        adjudicator_ids: ["adjudicator_a20c4f91", "adjudicator_b72d01e8"],
        accepted_findings: ["repeat_stability"],
        rejected_findings: ["repeat_stability", "citation:unknown"],
        required_changes: [],
        unresolved_points: ["Whether the repeated verdict change is material."],
        adjudicated_at: "2026-07-28T10:30:00.000Z"
      } });
    });
    const result = run(pair.summaryPath, pair.reviewPath);
    expect(result.status).toBe(1);
    const codes = JSON.parse(result.stderr).issues.map(
      (issue: { code: string }) => issue.code
    );
    expect(codes).toEqual(
      expect.arrayContaining([
        "UNKNOWN_QUALITY_FINDING",
        "QUALITY_ADJUDICATION_CONFLICT",
        "QUALITY_ADJUDICATION_TIME_ORDER"
      ])
    );
  });
});
