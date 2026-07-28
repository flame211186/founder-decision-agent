import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  symlink,
  writeFile
} from "node:fs/promises";
import { createRequire } from "node:module";
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

const require = createRequire(import.meta.url);
const Ajv = require("ajv") as typeof import("ajv")["default"];
const addFormats = require("ajv-formats") as typeof import("ajv-formats")["default"];

const script = fileURLToPath(
  new URL("../scripts/audit-stable-release.mjs", import.meta.url)
);
const auditOutputSchemaPath = fileURLToPath(
  new URL(
    "../schemas/stable-release-audit.v1.schema.json",
    import.meta.url
  )
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

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function consentRecord(index: number, caseId: string) {
  return {
    schema_version: "real_case_consent.v1",
    consent_record_id: `consent_case_${String(index).padStart(4, "0")}`,
    case_id: caseId,
    case_version: "1",
    participant_id: `participant_case_${String(index).padStart(4, "0")}`,
    jurisdiction: "CN",
    record_status: "eligible",
    consent: {
      obtained_at: "2026-07-28T10:00:00.000Z",
      method: "digital_affirmation",
      obtained_by: "coordinator_case_0001",
      withdrawal_process_explained: true,
      data_processors_disclosed: true,
      retention_policy_disclosed: true,
      scopes: {
        agent_evaluation: true,
        external_model_processing: true,
        deidentified_expert_review: true,
        public_release: false
      }
    },
    withdrawal: {
      state: "active",
      requested: false,
      requested_at: null,
      processed_at: null
    },
    deidentification: {
      status: "completed",
      completed_at: "2026-07-28T10:10:00.000Z",
      completed_by: `operator_case_${String(index).padStart(4, "0")}`,
      direct_identifiers_removed: true,
      indirect_identifiers_generalized: true,
      organization_and_person_names_replaced: true,
      secrets_removed: true,
      free_text_manually_reviewed: true,
      reidentification_risk: "low",
      verification: {
        method: "independent_second_person",
        status: "verified",
        verified_at: "2026-07-28T10:20:00.000Z",
        verified_by: `verifier_case_${String(index).padStart(4, "0")}`,
        deidentified_case_sha256: sha256(caseId)
      }
    },
    data_handling: {
      raw_source_storage: "restricted_outside_repository",
      repository_contains_raw_source: false,
      consent_record_contains_direct_identifiers: false,
      deidentified_artifact_location: "private_eval_workspace",
      deletion_process_available: true
    }
  };
}

function reviewRecord(
  index: number,
  caseId: string,
  reportId: string,
  reportHash: string
) {
  return {
    schema_version: "expert_review.v1",
    review_id: `review_case_${String(index).padStart(4, "0")}`,
    case_id: caseId,
    case_version: "1",
    case_artifact_sha256: sha256(caseId),
    report_id: reportId,
    report_version: "evaluation_report.v1",
    report_sha256: reportHash,
    rubric_version: "0.1",
    reviewer: {
      pseudonymous_id: `reviewer_case_${String(index).padStart(4, "0")}`,
      roles: ["founder_operator"],
      years_relevant_experience: 5,
      domain_familiarity: "working",
      relevant_domains: ["b2b_saas"],
      conflicts_disclosed: false,
      conflict_notes: null
    },
    blinding: {
      independent_assessment_locked_at: "2026-07-28T10:30:00.000Z",
      report_revealed_at: "2026-07-28T10:35:00.000Z",
      expected_verdict_hidden: true,
      other_reviews_hidden: true,
      protocol_deviations: []
    },
    independent_assessment: {
      stage: "S0_idea",
      verdict: "validate",
      confidence: "medium",
      most_valuable_point: "A narrow and reachable initial user group.",
      top_risks_or_unknowns: [
        "Whether the workflow changes purchase behavior."
      ],
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
    markdown: "Synthetic stable-audit quality fixture",
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

function qualityReview(
  summary: ReturnType<typeof qualitySummary>,
  summaryHash: string
) {
  return {
    schema_version: "live_quality_review.v1",
    review_id: "quality_review_stable_0001",
    quality_summary_sha256: summaryHash,
    reviewed_at: "2026-07-28T11:00:00.000Z",
    reviewers: [
      {
        pseudonymous_id: "quality_reviewer_0001",
        roles: ["researcher"],
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

async function writeJson(path: string, value: unknown) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function createSyntheticEvidence() {
  const root = await mkdtemp(resolve(tmpdir(), "founder-stable-audit-"));
  const consents = resolve(root, "consents");
  const reviews = resolve(root, "reviews");
  const reports = resolve(root, "reports");
  await Promise.all([
    mkdir(consents),
    mkdir(reviews),
    mkdir(reports)
  ]);

  for (let index = 1; index <= 3; index += 1) {
    const suffix = String(index).padStart(4, "0");
    const caseId = `real_case${suffix}`;
    const reportId = `report_real_case${suffix}`;
    const report = fixtureReport("001_idea_evaluator_agent");
    report.report_id = reportId;
    report.idea_id = `idea_real_case${suffix}`;
    const reportText = `${JSON.stringify(report, null, 2)}\n`;
    await Promise.all([
      writeJson(
        resolve(consents, `consent-${suffix}.json`),
        consentRecord(index, caseId)
      ),
      writeJson(
        resolve(reviews, `review-${suffix}.json`),
        reviewRecord(index, caseId, reportId, sha256(reportText))
      ),
      writeFile(resolve(reports, `report-${suffix}.json`), reportText)
    ]);
  }

  const summary = qualitySummary();
  const summaryText = `${JSON.stringify(summary, null, 2)}\n`;
  const qualitySummaryPath = resolve(root, "quality-summary.json");
  const qualityReviewPath = resolve(root, "quality-review.json");
  await writeFile(qualitySummaryPath, summaryText);
  await writeJson(
    qualityReviewPath,
    qualityReview(summary, sha256(summaryText))
  );

  const installEvidencePath = resolve(root, "published-install.txt");
  const integrationEvidencePath = resolve(root, "integration.txt");
  const releaseNotesPath = resolve(root, "release-notes.md");
  const installEvidence = "Synthetic clean-install evidence for contract testing.\n";
  const integrationEvidence =
    "Synthetic independent-integration evidence for contract testing.\n";
  const releaseNotes =
    "# Synthetic release notes\n\nProven behavior and open limitations are separated.\n";
  await Promise.all([
    writeFile(installEvidencePath, installEvidence),
    writeFile(integrationEvidencePath, integrationEvidence),
    writeFile(releaseNotesPath, releaseNotes)
  ]);

  const sourceCommitSha = "a".repeat(40);
  const releaseEvidence = {
    schema_version: "stable_release_evidence.v1",
    candidate_version: "1.0.0",
    source_commit_sha: sourceCommitSha,
    policy: {
      policy_id: "policy_stable_0001",
      frozen_at: "2026-07-28T12:00:00.000Z",
      approvals: [
        {
          approver_id: "approver_product_0001",
          role: "product_owner",
          approved_at: "2026-07-28T11:30:00.000Z"
        },
        {
          approver_id: "approver_review_0001",
          role: "review_group",
          approved_at: "2026-07-28T11:45:00.000Z"
        }
      ],
      minimum_reviews_per_case: 1,
      require_reviewer_role_coverage: false,
      minimum_citation_claims: 1,
      maximum_unresolved_p0: 0,
      maximum_unresolved_p1: 0
    },
    published_artifact: {
      package_name: "@sangfei/founder-decision-agent",
      package_version: "1.0.0",
      registry_tarball_url:
        "https://registry.npmjs.org/@sangfei/founder-decision-agent/-/founder-decision-agent-1.0.0.tgz",
      registry_integrity: "sha512-YWJjZA==",
      tested_at: "2026-07-28T12:30:00.000Z",
      platform: "darwin-arm64",
      node_version: "v22.14.0",
      installed_from_registry: true,
      cli_smoke_passed: true,
      sdk_import_passed: true,
      storage_smoke_passed: true,
      executor_id: "executor_install_0001",
      independent_of_implementation: true,
      evidence_file: {
        path: "published-install.txt",
        sha256: sha256(installEvidence)
      }
    },
    independent_integration: {
      surface: "sdk",
      package_version: "1.0.0",
      source_commit_sha: sourceCommitSha,
      executed_at: "2026-07-28T12:45:00.000Z",
      passed: true,
      executor_id: "executor_integration_0001",
      independent_of_implementation: true,
      evidence_file: {
        path: "integration.txt",
        sha256: sha256(integrationEvidence)
      }
    },
    release_notes: {
      path: "release-notes.md",
      sha256: sha256(releaseNotes),
      proven_behavior_separated: true,
      open_limitations_listed: true
    }
  };
  const releaseEvidencePath = resolve(root, "release-evidence.json");
  await writeJson(releaseEvidencePath, releaseEvidence);

  return {
    root,
    consents,
    reviews,
    reports,
    qualitySummaryPath,
    qualityReviewPath,
    releaseEvidencePath
  };
}

function run(evidence: Awaited<ReturnType<typeof createSyntheticEvidence>>) {
  return spawnSync(
    process.execPath,
    [
      script,
      "--consents",
      evidence.consents,
      "--reviews",
      evidence.reviews,
      "--reports",
      evidence.reports,
      "--quality-summary",
      evidence.qualitySummaryPath,
      "--quality-review",
      evidence.qualityReviewPath,
      "--release-evidence",
      evidence.releaseEvidencePath
    ],
    { encoding: "utf8" }
  );
}

async function expectValidAuditOutput(output: unknown) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const schema = JSON.parse(
    await readFile(auditOutputSchemaPath, "utf8")
  );
  const validate = ajv.compile(schema);
  expect(validate(output), JSON.stringify(validate.errors)).toBe(true);
}

describe("stable release evidence audit", () => {
  it("publishes the audit command and external-evidence Schema", async () => {
    const packagePath = fileURLToPath(new URL("../package.json", import.meta.url));
    const manifest = JSON.parse(await readFile(packagePath, "utf8")) as {
      bin: Record<string, string>;
      exports: Record<string, unknown>;
    };
    expect(manifest.bin["founder-stable-audit"]).toBe(
      "./scripts/audit-stable-release.mjs"
    );
    expect(
      manifest.exports["./schemas/stable-release-evidence.v1.schema.json"]
    ).toBe("./schemas/stable-release-evidence.v1.schema.json");
  });

  it("runs through an npm-style executable symlink", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "stable-audit-bin-"));
    const executable = resolve(directory, "founder-stable-audit");
    await symlink(script, executable);
    const result = spawnSync(process.execPath, [executable, "--help"], {
      encoding: "utf8"
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("never self-approves stable v1");
  });

  it("links complete synthetic fixtures without claiming they prove real cases or stable approval", async () => {
    const evidence = await createSyntheticEvidence();
    const result = run(evidence);
    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output).toMatchObject({
      status: "evidence_ready_for_human_release_decision",
      stableGateStatus: "not_assessed",
      counts: {
        eligibleRealCases: 3,
        reviewRecords: 3,
        reviewers: 3,
        reports: 3
      }
    });
    await expectValidAuditOutput(output);
    expect(output.qualityReview.sampledCitationClaimCount).toBeGreaterThan(0);
    expect(output.notes.join(" ")).toContain(
      "Synthetic records that imitate real-case IDs do not satisfy"
    );
  });

  it("blocks malformed manifests without crashing and detects report-version drift", async () => {
    const malformed = await createSyntheticEvidence();
    await writeJson(malformed.releaseEvidencePath, {
      schema_version: "stable_release_evidence.v1"
    });
    const malformedResult = run(malformed);
    expect(malformedResult.status).toBe(1);
    const malformedOutput = JSON.parse(malformedResult.stderr);
    await expectValidAuditOutput(malformedOutput);
    expect(malformedOutput.status).toBe("blocked");
    expect(malformedOutput.externalEvidence).toBeNull();
    expect(
      malformedOutput.issues.map((issue: { code: string }) => issue.code)
    ).toContain("RELEASE_EVIDENCE_SCHEMA_INVALID");

    const drift = await createSyntheticEvidence();
    const reviewPath = resolve(drift.reviews, "review-0001.json");
    const review = JSON.parse(await readFile(reviewPath, "utf8"));
    review.report_version = "evaluation_report.v0";
    await writeJson(reviewPath, review);
    const driftResult = run(drift);
    expect(driftResult.status).toBe(1);
    expect(
      JSON.parse(driftResult.stderr).issues.map(
        (issue: { code: string }) => issue.code
      )
    ).toContain("REVIEW_REPORT_VERSION_MISMATCH");

    const hashDrift = await createSyntheticEvidence();
    const reportPath = resolve(hashDrift.reports, "report-0001.json");
    const report = JSON.parse(await readFile(reportPath, "utf8"));
    report.generated_at = "2026-07-28T12:59:00.000Z";
    await writeJson(reportPath, report);
    const hashDriftResult = run(hashDrift);
    expect(hashDriftResult.status).toBe(1);
    expect(
      JSON.parse(hashDriftResult.stderr).issues.map(
        (issue: { code: string }) => issue.code
      )
    ).toContain("REVIEW_REPORT_HASH_MISMATCH");
  });
});
