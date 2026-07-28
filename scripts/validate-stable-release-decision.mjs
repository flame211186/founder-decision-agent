#!/usr/bin/env node

import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const auditSchemaPath = resolve(
  scriptDirectory,
  "../schemas/stable-release-audit.v1.schema.json"
);
const decisionSchemaPath = resolve(
  scriptDirectory,
  "../schemas/stable-release-decision.v1.schema.json"
);

export async function validateStableReleaseDecisionFiles(
  auditPath,
  decisionPath
) {
  const auditFile = resolve(auditPath);
  const decisionFile = resolve(decisionPath);
  const issues = [];
  const auditInput = await readJsonBytes(
    auditFile,
    "STABLE_AUDIT_JSON_INVALID"
  );
  const decisionInput = await readJsonBytes(
    decisionFile,
    "STABLE_DECISION_JSON_INVALID"
  );
  if (!auditInput.valid || !decisionInput.valid) {
    return {
      valid: false,
      auditFile,
      decisionFile,
      audit: auditInput.value,
      decision: decisionInput.value,
      auditSha256: auditInput.sha256,
      decisionSha256: decisionInput.sha256,
      issues: [...auditInput.issues, ...decisionInput.issues]
    };
  }

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const auditSchema = JSON.parse(await readFile(auditSchemaPath, "utf8"));
  const decisionSchema = JSON.parse(
    await readFile(decisionSchemaPath, "utf8")
  );
  const validateAudit = ajv.compile(auditSchema);
  const validateDecision = ajv.compile(decisionSchema);
  if (!validateAudit(auditInput.value)) {
    issues.push(
      ...schemaIssues(
        "STABLE_AUDIT_SCHEMA_INVALID",
        auditFile,
        validateAudit.errors
      )
    );
  }
  if (!validateDecision(decisionInput.value)) {
    issues.push(
      ...schemaIssues(
        "STABLE_DECISION_SCHEMA_INVALID",
        decisionFile,
        validateDecision.errors
      )
    );
  }
  if (issues.length > 0) {
    return {
      valid: false,
      auditFile,
      decisionFile,
      audit: auditInput.value,
      decision: decisionInput.value,
      auditSha256: auditInput.sha256,
      decisionSha256: decisionInput.sha256,
      issues
    };
  }

  const audit = auditInput.value;
  const decision = decisionInput.value;
  if (decision.stable_audit_sha256 !== auditInput.sha256) {
    issues.push({
      code: "STABLE_AUDIT_HASH_MISMATCH",
      file: decisionFile,
      path: "$.stable_audit_sha256",
      message: `Expected SHA-256 ${auditInput.sha256}.`
    });
  }
  if (
    audit.status !== "evidence_ready_for_human_release_decision" ||
    audit.stableGateStatus !== "not_assessed" ||
    audit.issues.length > 0
  ) {
    issues.push({
      code: "STABLE_AUDIT_NOT_EVIDENCE_READY",
      file: auditFile,
      path: "$.status",
      message:
        "A final human decision requires an issue-free evidence_ready_for_human_release_decision audit."
    });
  }
  validateAuditReadinessSemantics(audit, auditFile, issues);
  if (
    decision.candidate_version !== audit.candidateVersion ||
    decision.source_commit_sha !== audit.sourceCommitSha
  ) {
    issues.push({
      code: "STABLE_DECISION_CANDIDATE_MISMATCH",
      file: decisionFile,
      path: "$",
      message:
        "Decision candidate_version and source_commit_sha must match the immutable audit."
    });
  }

  const approverIds = decision.approvers.map(
    (approver) => approver.approver_id
  );
  if (new Set(approverIds).size !== approverIds.length) {
    issues.push({
      code: "DUPLICATE_STABLE_DECISION_APPROVER",
      file: decisionFile,
      path: "$.approvers",
      message: "Final decision approvers must be unique."
    });
  }
  const roles = new Set(decision.approvers.map((approver) => approver.role));
  if (!roles.has("product_owner") || !roles.has("review_group")) {
    issues.push({
      code: "STABLE_DECISION_APPROVER_ROLES",
      file: decisionFile,
      path: "$.approvers",
      message:
        "Final decision requires at least one product_owner and one review_group approver."
    });
  }
  for (const [index, approver] of decision.approvers.entries()) {
    if (
      approver.role === "review_group" &&
      !approver.independent_of_evidence_generation
    ) {
      issues.push({
        code: "STABLE_REVIEW_GROUP_NOT_INDEPENDENT",
        file: decisionFile,
        path: `$.approvers[${index}].independent_of_evidence_generation`,
        message:
          "A review_group final approver must be independent of evidence generation."
      });
    }
    if (
      approver.has_conflict &&
      (approver.conflict_notes === null ||
        approver.conflict_notes.trim().length === 0)
    ) {
      issues.push({
        code: "STABLE_APPROVER_CONFLICT_DETAIL_MISSING",
        file: decisionFile,
        path: `$.approvers[${index}].conflict_notes`,
        message: "A disclosed conflict requires explanatory notes."
      });
    }
    if (!approver.has_conflict && approver.conflict_notes !== null) {
      issues.push({
        code: "STABLE_APPROVER_CONFLICT_CONTRADICTION",
        file: decisionFile,
        path: `$.approvers[${index}].conflict_notes`,
        message: "An approver without a conflict must use null conflict notes."
      });
    }
    if (
      Date.parse(approver.affirmed_at) > Date.parse(decision.decided_at)
    ) {
      issues.push({
        code: "STABLE_APPROVER_TIME_ORDER",
        file: decisionFile,
        path: `$.approvers[${index}].affirmed_at`,
        message: "An approver affirmation cannot occur after decided_at."
      });
    }
  }
  if (Date.parse(decision.decided_at) < Date.parse(audit.generatedAt)) {
    issues.push({
      code: "STABLE_DECISION_TIME_ORDER",
      file: decisionFile,
      path: "$.decided_at",
      message: "The final decision cannot predate the immutable audit."
    });
  }

  if (decision.decision === "approved") {
    const missingAcknowledgements = Object.entries(
      decision.acknowledgements
    )
      .filter(([, value]) => value !== true)
      .map(([key]) => key);
    if (missingAcknowledgements.length > 0) {
      issues.push({
        code: "STABLE_APPROVAL_ACKNOWLEDGEMENT_MISSING",
        file: decisionFile,
        path: "$.acknowledgements",
        message: `Approved decisions require every acknowledgement; missing ${missingAcknowledgements.join(", ")}.`
      });
    }
    if (decision.open_conditions.length > 0) {
      issues.push({
        code: "STABLE_APPROVAL_HAS_OPEN_CONDITIONS",
        file: decisionFile,
        path: "$.open_conditions",
        message:
          "An approved stable decision cannot retain open release conditions."
      });
    }
    if (decision.approvers.some((approver) => approver.has_conflict)) {
      issues.push({
        code: "STABLE_APPROVAL_HAS_CONFLICTED_APPROVER",
        file: decisionFile,
        path: "$.approvers",
        message:
          "A conflicted approver cannot participate in an approved final decision."
      });
    }
  } else if (decision.open_conditions.length === 0) {
    issues.push({
      code: "STABLE_REJECTION_CONDITIONS_MISSING",
      file: decisionFile,
      path: "$.open_conditions",
      message: "A rejected decision must record at least one open condition."
    });
  }

  return {
    valid: issues.length === 0,
    auditFile,
    decisionFile,
    audit,
    decision,
    auditSha256: auditInput.sha256,
    decisionSha256: decisionInput.sha256,
    issues
  };
}

function validateAuditReadinessSemantics(audit, file, issues) {
  if (
    audit.counts.eligibleRealCases < 3 ||
    audit.counts.eligibleRealCases > 5 ||
    audit.cases.length !== audit.counts.eligibleRealCases
  ) {
    issues.push({
      code: "STABLE_AUDIT_REAL_CASE_INVARIANT",
      file,
      path: "$.counts.eligibleRealCases",
      message:
        "An evidence-ready audit must contain exactly 3-5 linked case summaries."
    });
  }
  if (
    audit.cases.some(
      (item) =>
        item.reportIds.length !== 1 ||
        item.reportHashes.length !== 1 ||
        item.reviewerCount < 1 ||
        item.unresolvedP0 > 0 ||
        item.unresolvedP1 > 0 ||
        item.decisionChangingMisses > 0 ||
        item.blockingAdjudications > 0
    )
  ) {
    issues.push({
      code: "STABLE_AUDIT_CASE_READINESS_INVARIANT",
      file,
      path: "$.cases",
      message:
        "Every case must bind one report and hash, include review, and have zero blocking findings."
    });
  }
  const quality = audit.qualityReview;
  if (
    !quality ||
    quality.mode !== "deep" ||
    !quality.factualitySamplingApplicable ||
    quality.sampledCitationClaimCount < 1 ||
    quality.counterfactualReviewCount !== 2 ||
    quality.unresolvedFailureCounts.P0 > 0 ||
    quality.unresolvedFailureCounts.P1 > 0 ||
    [
      "unsafe",
      "needs_rewrite",
      "accepted_with_changes",
      "unresolved_disagreement"
    ].includes(quality.adjudicationStatus)
  ) {
    issues.push({
      code: "STABLE_AUDIT_QUALITY_READINESS_INVARIANT",
      file,
      path: "$.qualityReview",
      message:
        "The audit must contain deep factuality, two counterfactual reviews and zero blocking quality findings."
    });
  }
  if (!audit.externalEvidence) {
    issues.push({
      code: "STABLE_AUDIT_EXTERNAL_EVIDENCE_MISSING",
      file,
      path: "$.externalEvidence",
      message:
        "Published-install, independent-integration and release-note evidence must be hash-linked."
    });
  }
}

export function summarizeStableReleaseDecision(validation) {
  return {
    schemaVersion: "stable_release_decision_summary.v1",
    candidateVersion: validation.decision.candidate_version,
    sourceCommitSha: validation.decision.source_commit_sha,
    recordedDecision: validation.decision.decision,
    releaseEligibleByRecordedDecision:
      validation.decision.decision === "approved",
    auditSha256: validation.auditSha256,
    decisionSha256: validation.decisionSha256,
    approverCount: validation.decision.approvers.length,
    stableGateStatus:
      validation.decision.decision === "approved"
        ? "human_approval_recorded_not_authenticated"
        : "human_rejection_recorded_not_authenticated",
    notes: [
      "This validator checks schemas, immutable hashes, candidate links and declared approval invariants.",
      "It cannot authenticate the people, their expertise or independence, or the underlying private evidence.",
      "The exact approved version, source SHA, audit SHA-256 and decision SHA-256 must also be configured in the protected stable-release environment before automation may publish latest."
    ]
  };
}

async function readJsonBytes(file, code) {
  try {
    const bytes = await readFile(file);
    return {
      valid: true,
      value: JSON.parse(bytes.toString("utf8")),
      sha256: createHash("sha256").update(bytes).digest("hex"),
      issues: []
    };
  } catch (error) {
    return {
      valid: false,
      value: null,
      sha256: null,
      issues: [
        {
          code,
          file,
          path: "$",
          message: error instanceof Error ? error.message : String(error)
        }
      ]
    };
  }
}

function schemaIssues(code, file, errors = []) {
  return errors.map((error) => ({
    code,
    file,
    path: error.instancePath || "$",
    message: error.message ?? "Schema validation failed"
  }));
}

function usage() {
  return [
    "Usage: founder-stable-decision-validate <stable-audit.json> <stable-decision.json>",
    "",
    "The command validates a recorded human decision; it cannot authenticate or create approval."
  ].join("\n");
}

async function main() {
  const arguments_ = process.argv.slice(2);
  if (arguments_.includes("--help") || arguments_.includes("-h")) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  if (arguments_.length !== 2) {
    process.stderr.write(`${usage()}\n`);
    process.exitCode = 2;
    return;
  }
  const validation = await validateStableReleaseDecisionFiles(
    arguments_[0],
    arguments_[1]
  );
  const output = {
    status: validation.valid ? "recorded" : "invalid",
    issues: validation.issues,
    ...(validation.valid
      ? { summary: summarizeStableReleaseDecision(validation) }
      : {})
  };
  const stream = validation.valid ? process.stdout : process.stderr;
  stream.write(`${JSON.stringify(output, null, 2)}\n`);
  if (!validation.valid) process.exitCode = 1;
}

if (
  process.argv[1] &&
  realpathSync(resolve(process.argv[1])) ===
    realpathSync(fileURLToPath(import.meta.url))
) {
  main().catch((error) => {
    process.stderr.write(
      `${JSON.stringify({
        error: {
          code: "STABLE_RELEASE_DECISION_VALIDATION_FAILED",
          message: error instanceof Error ? error.message : String(error)
        }
      })}\n`
    );
    process.exitCode = 1;
  });
}
