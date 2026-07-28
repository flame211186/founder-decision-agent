import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const script = fileURLToPath(
  new URL(
    "../scripts/validate-stable-release-decision.mjs",
    import.meta.url
  )
);

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function caseAudit(index: number) {
  return {
    caseId: `real_case${String(index).padStart(4, "0")}`,
    caseVersion: "1",
    reportIds: [`report_case_${String(index).padStart(4, "0")}`],
    reportHashes: [String(index).repeat(64)],
    reviewCount: 1,
    reviewerCount: 1,
    roleCoverage: {
      founderOrProductOperator: true,
      investorOrIncubator: false,
      domainFamiliarity: true
    },
    unresolvedP0: 0,
    unresolvedP1: 0,
    decisionChangingMisses: 0,
    blockingAdjudications: 0
  };
}

function stableAudit() {
  return {
    schemaVersion: "stable_release_audit.v1",
    generatedAt: "2026-07-28T12:00:00.000Z",
    candidateVersion: "1.0.0",
    sourceCommitSha: "a".repeat(40),
    status: "evidence_ready_for_human_release_decision",
    stableGateStatus: "not_assessed",
    counts: {
      eligibleRealCases: 3,
      reviewRecords: 3,
      reviewers: 3,
      reports: 3
    },
    cases: [caseAudit(1), caseAudit(2), caseAudit(3)],
    qualityReview: {
      schemaVersion: "live_quality_review_summary.v1",
      mode: "deep",
      reviewerCount: 1,
      sampledCitationClaimCount: 3,
      counterfactualReviewCount: 2,
      observedFailureCounts: { P0: 0, P1: 0, P2: 0, P3: 0 },
      unresolvedFailureCounts: { P0: 0, P1: 0, P2: 0, P3: 0 },
      adjudicationStatus: "not_adjudicated",
      factualitySamplingApplicable: true,
      stableGateStatus: "not_assessed",
      stableGateNotes: [
        "Synthetic fixture: human authenticity remains outside this test."
      ]
    },
    externalEvidence: {
      policyId: "policy_stable_0001",
      policyFrozenAt: "2026-07-28T11:00:00.000Z",
      publishedArtifactInstall: "declared_and_hash_linked",
      independentIntegration: "declared_and_hash_linked",
      releaseNotes: "hash_linked"
    },
    issues: [],
    notes: [
      "Synthetic fixture does not prove real cases or human approval."
    ]
  };
}

function stableDecision(auditHash: string) {
  return {
    schema_version: "stable_release_decision.v1",
    decision_id: "stable_decision_0001",
    stable_audit_sha256: auditHash,
    candidate_version: "1.0.0",
    source_commit_sha: "a".repeat(40),
    decided_at: "2026-07-28T13:00:00.000Z",
    decision: "approved",
    approvers: [
      {
        approver_id: "approver_product_0001",
        role: "product_owner",
        independent_of_evidence_generation: false,
        has_conflict: false,
        conflict_notes: null,
        affirmed_at: "2026-07-28T12:45:00.000Z"
      },
      {
        approver_id: "approver_review_0001",
        role: "review_group",
        independent_of_evidence_generation: true,
        has_conflict: false,
        conflict_notes: null,
        affirmed_at: "2026-07-28T12:50:00.000Z"
      }
    ],
    acknowledgements: {
      audit_status_evidence_ready: true,
      evidence_authenticity_manually_checked: true,
      reviewer_independence_manually_checked: true,
      zero_unresolved_p0_p1_confirmed: true,
      limitations_reviewed: true,
      published_artifact_evidence_reviewed: true
    },
    rationale:
      "The product owner and independent review group recorded a synthetic approval fixture.",
    open_conditions: []
  };
}

async function writePair(
  directory: string,
  mutate?: (
    audit: ReturnType<typeof stableAudit>,
    decision: ReturnType<typeof stableDecision>
  ) => void
) {
  const audit = stableAudit();
  let auditText = `${JSON.stringify(audit, null, 2)}\n`;
  const initialAuditHash = sha256(auditText);
  const decision = stableDecision(initialAuditHash);
  mutate?.(audit, decision);
  auditText = `${JSON.stringify(audit, null, 2)}\n`;
  if (decision.stable_audit_sha256 === initialAuditHash) {
    decision.stable_audit_sha256 = sha256(auditText);
  }
  const auditPath = resolve(directory, "stable-audit.json");
  const decisionPath = resolve(directory, "stable-decision.json");
  await writeFile(auditPath, auditText);
  await writeFile(
    decisionPath,
    `${JSON.stringify(decision, null, 2)}\n`
  );
  return { auditPath, decisionPath };
}

function run(auditPath: string, decisionPath: string) {
  return spawnSync(process.execPath, [script, auditPath, decisionPath], {
    encoding: "utf8"
  });
}

describe("stable release human decision validation", () => {
  it("publishes the validator and both final-gate Schemas", async () => {
    const packagePath = fileURLToPath(new URL("../package.json", import.meta.url));
    const manifest = JSON.parse(await readFile(packagePath, "utf8")) as {
      bin: Record<string, string>;
      exports: Record<string, unknown>;
    };
    expect(manifest.bin["founder-stable-decision-validate"]).toBe(
      "./scripts/validate-stable-release-decision.mjs"
    );
    expect(
      manifest.exports["./schemas/stable-release-audit.v1.schema.json"]
    ).toBe("./schemas/stable-release-audit.v1.schema.json");
    expect(
      manifest.exports[
        "./schemas/stable-release-decision.v1.schema.json"
      ]
    ).toBe("./schemas/stable-release-decision.v1.schema.json");
  });

  it("runs through an npm-style executable symlink", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "stable-decision-bin-"));
    const executable = resolve(
      directory,
      "founder-stable-decision-validate"
    );
    await symlink(script, executable);
    const result = spawnSync(process.execPath, [executable, "--help"], {
      encoding: "utf8"
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("cannot authenticate or create approval");
  });

  it("records an approved synthetic decision without claiming authenticated stable approval", async () => {
    const directory = await mkdtemp(
      resolve(tmpdir(), "stable-decision-valid-")
    );
    const pair = await writePair(directory);
    const result = run(pair.auditPath, pair.decisionPath);
    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output).toMatchObject({
      status: "recorded",
      summary: {
        candidateVersion: "1.0.0",
        recordedDecision: "approved",
        releaseEligibleByRecordedDecision: true,
        stableGateStatus: "human_approval_recorded_not_authenticated",
        approverCount: 2
      }
    });
    expect(output.summary.auditSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(output.summary.decisionSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects hash, candidate and readiness contradictions", async () => {
    const directory = await mkdtemp(
      resolve(tmpdir(), "stable-decision-link-")
    );
    const pair = await writePair(directory, (audit, decision) => {
      decision.stable_audit_sha256 = "0".repeat(64);
      decision.candidate_version = "2.0.0";
      audit.cases[0]!.unresolvedP1 = 1;
    });
    const result = run(pair.auditPath, pair.decisionPath);
    expect(result.status).toBe(1);
    const codes = JSON.parse(result.stderr).issues.map(
      (issue: { code: string }) => issue.code
    );
    expect(codes).toEqual(
      expect.arrayContaining([
        "STABLE_AUDIT_HASH_MISMATCH",
        "STABLE_DECISION_CANDIDATE_MISMATCH",
        "STABLE_AUDIT_CASE_READINESS_INVARIANT"
      ])
    );
  });

  it("rejects self-contradictory approval composition and timing", async () => {
    const directory = await mkdtemp(
      resolve(tmpdir(), "stable-decision-approval-")
    );
    const pair = await writePair(directory, (_audit, decision) => {
      decision.approvers[1]!.approver_id =
        decision.approvers[0]!.approver_id;
      decision.approvers[1]!.independent_of_evidence_generation = false;
      Object.assign(decision.approvers[1]!, {
        has_conflict: true,
        conflict_notes: "A synthetic conflict."
      });
      decision.approvers[1]!.affirmed_at = "2026-07-28T14:00:00.000Z";
      decision.acknowledgements.limitations_reviewed = false;
      Object.assign(decision, {
        open_conditions: ["A synthetic condition remains."]
      });
    });
    const result = run(pair.auditPath, pair.decisionPath);
    expect(result.status).toBe(1);
    const codes = JSON.parse(result.stderr).issues.map(
      (issue: { code: string }) => issue.code
    );
    expect(codes).toEqual(
      expect.arrayContaining([
        "DUPLICATE_STABLE_DECISION_APPROVER",
        "STABLE_REVIEW_GROUP_NOT_INDEPENDENT",
        "STABLE_APPROVER_TIME_ORDER",
        "STABLE_APPROVAL_ACKNOWLEDGEMENT_MISSING",
        "STABLE_APPROVAL_HAS_OPEN_CONDITIONS",
        "STABLE_APPROVAL_HAS_CONFLICTED_APPROVER"
      ])
    );
  });
});
