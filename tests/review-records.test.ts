import { mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const script = fileURLToPath(
  new URL("../scripts/validate-review-records.mjs", import.meta.url)
);
const rubricDimensions = [
  "R1_stage_correctness",
  "R2_critical_issue_recall",
  "R3_evidence_calibration",
  "R4_judgment_quality",
  "R5_goal_and_founder_fit",
  "R6_actionability",
  "R7_safety_and_scope"
];

function reviewRecord() {
  return {
    schema_version: "expert_review.v1",
    review_id: "review_synthetic_001",
    case_id: "case_synthetic_001",
    case_version: "1",
    report_id: "report_synthetic_001",
    report_version: "evaluation_report.v1",
    rubric_version: "0.1",
    reviewer: {
      pseudonymous_id: "reviewer_synthetic_a",
      roles: ["founder_operator"],
      years_relevant_experience: 5,
      domain_familiarity: "working",
      relevant_domains: ["b2b_saas"],
      conflicts_disclosed: false,
      conflict_notes: null
    },
    blinding: {
      independent_assessment_locked_at: "2026-07-28T10:00:00.000Z",
      report_revealed_at: "2026-07-28T10:05:00.000Z",
      expected_verdict_hidden: true,
      other_reviews_hidden: true,
      protocol_deviations: []
    },
    independent_assessment: {
      stage: "S0_idea",
      verdict: "validate",
      confidence: "medium",
      most_valuable_point: "A narrow and reachable initial user group.",
      top_risks_or_unknowns: ["Whether the workflow changes purchase behavior."],
      fatal_constraint: false,
      fatal_scope: "not_fatal",
      authorized_next_step: "Run one bounded demand test.",
      prohibited_actions: ["Do not scale development before evidence."],
      what_would_change: ["Observed repeat use and willingness to pay."]
    },
    report_assessment: {
      verdict_acceptability: "acceptable",
      verdict_distance: 0,
      missed_decision_changing_issue: false,
      missed_issues: [],
      rubric_scores: rubricDimensions.map((dimension_id) => ({
        dimension_id,
        score: 4,
        rationale: "Synthetic protocol fixture with an explicit rationale."
      })),
      failures: [],
      claim_challenges: [],
      minimum_required_changes: [],
      freeform_notes: null
    },
    adjudication: null
  };
}

async function writeRecord(
  directory: string,
  name: string,
  record: unknown
) {
  const path = resolve(directory, name);
  await writeFile(path, JSON.stringify(record));
  return path;
}

function run(...paths: string[]) {
  return spawnSync(process.execPath, [script, ...paths], {
    encoding: "utf8"
  });
}

describe("expert review record validation", () => {
  it("publishes the validator command and review schema export", async () => {
    const packagePath = fileURLToPath(new URL("../package.json", import.meta.url));
    const manifest = JSON.parse(await readFile(packagePath, "utf8")) as {
      bin: Record<string, string>;
      exports: Record<string, unknown>;
    };
    expect(manifest.bin["founder-review-validate"]).toBe(
      "./scripts/validate-review-records.mjs"
    );
    expect(
      manifest.exports["./schemas/expert-review.v1.schema.json"]
    ).toBe("./evals/review/review-form.v1.schema.json");
  });

  it("runs through an npm-style executable symlink", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "founder-review-bin-"));
    const executable = resolve(directory, "founder-review-validate");
    await symlink(script, executable);
    const result = spawnSync(process.execPath, [executable, "--help"], {
      encoding: "utf8"
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Usage:");
  });

  it("validates a structural review and reports separate metrics without claiming the stable gate", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "founder-review-valid-"));
    const path = await writeRecord(directory, "review.json", reviewRecord());
    const result = run(path);
    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout) as {
      status: string;
      summary: {
        reviewCount: number;
        caseCount: number;
        stableGateStatus: string;
      };
    };
    expect(output).toMatchObject({
      status: "passed",
      summary: {
        reviewCount: 1,
        caseCount: 1,
        stableGateStatus: "not_assessed"
      }
    });
  });

  it("rejects rubric, blinding and fatal-scope semantic contradictions", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "founder-review-invalid-"));
    const record = reviewRecord();
    record.report_assessment.rubric_scores[6] =
      record.report_assessment.rubric_scores[0]!;
    record.blinding.report_revealed_at = "2026-07-28T09:00:00.000Z";
    record.independent_assessment.fatal_constraint = true;
    const path = await writeRecord(directory, "review.json", record);
    const result = run(path);
    expect(result.status).toBe(1);
    const output = JSON.parse(result.stderr) as {
      issues: Array<{ code: string }>;
    };
    expect(output.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "RUBRIC_DIMENSION_SET",
        "BLINDING_TIME_ORDER",
        "FATAL_SCOPE_MISMATCH"
      ])
    );
  });

  it("rejects duplicate review IDs and duplicate reviewer/case pairs", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "founder-review-duplicate-"));
    const first = await writeRecord(directory, "first.json", reviewRecord());
    const second = await writeRecord(directory, "second.json", reviewRecord());
    const result = run(first, second);
    expect(result.status).toBe(1);
    const output = JSON.parse(result.stderr) as {
      issues: Array<{ code: string }>;
    };
    expect(output.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "DUPLICATE_REVIEW_ID",
        "DUPLICATE_REVIEWER_CASE"
      ])
    );
  });

  it("rejects contradictory failure adjudication and impossible adjudication timing", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "founder-review-adjudication-"));
    const record = {
      ...reviewRecord(),
      report_assessment: {
        ...reviewRecord().report_assessment,
        failures: [
          {
            failure_id: "F01",
            severity: "P1",
            description: "A synthetic decision-changing failure.",
            changes_decision: true
          },
          {
            failure_id: "F01",
            severity: "P2",
            description: "The same identifier must not be reused.",
            changes_decision: false
          }
        ]
      },
      adjudication: {
        status: "needs_rewrite",
        adjudicator_ids: ["adjudicator_a", "adjudicator_b"],
        disagreement_types: ["report_failure"],
        accepted_failures: ["F01"],
        rejected_failures: ["F01"],
        required_changes: ["Correct the synthetic failure."],
        unresolved_points: [],
        adjudicated_at: "2026-07-28T10:04:00.000Z"
      }
    };
    const path = await writeRecord(directory, "review.json", record);
    const result = run(path);
    expect(result.status).toBe(1);
    const output = JSON.parse(result.stderr) as {
      issues: Array<{ code: string }>;
    };
    expect(output.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "DUPLICATE_FAILURE_ID",
        "ADJUDICATION_FAILURE_CONFLICT",
        "ADJUDICATION_TIME_ORDER"
      ])
    );
  });

  it("requires details for a claimed decision-changing miss", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "founder-review-missed-"));
    const record = reviewRecord();
    record.report_assessment.missed_decision_changing_issue = true;
    const path = await writeRecord(directory, "review.json", record);
    const result = run(path);
    expect(result.status).toBe(1);
    const output = JSON.parse(result.stderr) as {
      issues: Array<{ code: string }>;
    };
    expect(output.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MISSING_DECISION_CHANGING_ISSUE_DETAIL"
        })
      ])
    );
  });
});
