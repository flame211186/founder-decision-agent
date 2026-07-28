#!/usr/bin/env node

import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import {
  summarizeLiveQualityReview,
  validateLiveQualityReviewFiles
} from "./validate-live-quality-review.mjs";
import { validateRealCaseConsentFiles } from "./validate-real-case-consents.mjs";
import { validateReviewRecordFiles } from "./validate-review-records.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const releaseEvidenceSchemaPath = resolve(
  scriptDirectory,
  "../schemas/stable-release-evidence.v1.schema.json"
);
const reportSchemaPath = resolve(
  scriptDirectory,
  "../schemas/evaluation-report.v1.schema.json"
);
const operatorRoles = new Set(["founder_operator", "product_leader"]);
const screeningRoles = new Set([
  "angel_investor",
  "venture_investor",
  "incubator_coach"
]);

export function parseStableAuditArgs(arguments_) {
  const parsed = {};
  const allowed = new Set([
    "--consents",
    "--reviews",
    "--reports",
    "--quality-summary",
    "--quality-review",
    "--release-evidence"
  ]);
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--help" || argument === "-h") {
      return { help: true };
    }
    if (!allowed.has(argument)) {
      throw new Error(`Unknown argument: ${argument}`);
    }
    const value = arguments_[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${argument} requires a path`);
    }
    parsed[argument.slice(2).replaceAll("-", "_")] = value;
    index += 1;
  }
  const required = [
    "consents",
    "reviews",
    "reports",
    "quality_summary",
    "quality_review",
    "release_evidence"
  ];
  for (const field of required) {
    if (!parsed[field]) {
      throw new Error(`--${field.replaceAll("_", "-")} is required`);
    }
  }
  return { ...parsed, help: false };
}

export async function auditStableReleaseEvidence(options) {
  const issues = [];
  const consentValidation = await validateRealCaseConsentFiles([
    options.consents
  ]);
  const reviewValidation = await validateReviewRecordFiles([options.reviews]);
  const qualityValidation = await validateLiveQualityReviewFiles(
    options.quality_summary,
    options.quality_review
  );
  issues.push(...prefixIssues("CONSENT", consentValidation.issues));
  issues.push(...prefixIssues("REVIEW", reviewValidation.issues));
  issues.push(...prefixIssues("QUALITY", qualityValidation.issues));

  const releaseValidation = await validateReleaseEvidence(
    options.release_evidence
  );
  issues.push(...releaseValidation.issues);
  const reportValidation = await validateReportFiles([options.reports]);
  issues.push(...reportValidation.issues);

  const releaseEvidence = releaseValidation.record;
  const policy = releaseEvidence?.policy;
  if (releaseValidation.valid && releaseEvidence) {
    validateReleaseEvidenceSemantics(
      releaseEvidence,
      releaseValidation.file,
      issues
    );
    issues.push(
      ...(await validateReleaseEvidenceFiles(
        releaseEvidence,
        releaseValidation.file
      ))
    );
  }

  const eligibleConsents = consentValidation.records.filter(
    ({ record }) => record.record_status === "eligible"
  );
  const eligibleCaseKeys = new Set(
    eligibleConsents.map(({ record }) => caseKey(record))
  );
  const caseAudits = eligibleConsents.map(({ record }) =>
    auditCase(
      record,
      reviewValidation.records,
      reportValidation.reports,
      policy
    )
  );

  for (const { record } of reviewValidation.records) {
    if (!eligibleCaseKeys.has(caseKey(record))) {
      issues.push({
        code: "REVIEW_WITHOUT_ELIGIBLE_CONSENT",
        file: null,
        path: "$.case_id",
        message: `Review ${record.review_id} does not link to an eligible consent record for ${record.case_id} v${record.case_version}.`
      });
    }
  }
  for (const caseAudit of caseAudits) {
    issues.push(...caseAudit.issues);
  }

  const caseCountReady =
    eligibleConsents.length >= 3 && eligibleConsents.length <= 5;
  if (!caseCountReady) {
    issues.push({
      code: "REAL_CASE_COUNT_GATE",
      file: null,
      path: "$",
      message: `Stable v1 requires 3-5 eligible real cases; found ${eligibleConsents.length}.`
    });
  }

  let qualityReviewSummary = null;
  if (qualityValidation.valid) {
    qualityReviewSummary = summarizeLiveQualityReview(qualityValidation);
    if (!qualityReviewSummary.factualitySamplingApplicable) {
      issues.push({
        code: "DEEP_FACTUALITY_SAMPLE_REQUIRED",
        file: qualityValidation.summaryFile,
        path: "$.citation_review_sample",
        message:
          "Stable v1 requires a non-empty human-reviewed deep-mode factuality sample."
      });
    }
    if (
      policy &&
      qualityReviewSummary.sampledCitationClaimCount <
        policy.minimum_citation_claims
    ) {
      issues.push({
        code: "CITATION_SAMPLE_BELOW_FROZEN_POLICY",
        file: qualityValidation.summaryFile,
        path: "$.citation_review_sample.sampled_claims",
        message: `Frozen policy requires ${policy.minimum_citation_claims} reviewed claims; found ${qualityReviewSummary.sampledCitationClaimCount}.`
      });
    }
    if (
      qualityReviewSummary.unresolvedFailureCounts.P0 > 0 ||
      qualityReviewSummary.unresolvedFailureCounts.P1 > 0
    ) {
      issues.push({
        code: "UNRESOLVED_QUALITY_P0_P1",
        file: qualityValidation.reviewFile,
        path: "$",
        message: "The live quality review contains unresolved P0/P1 findings."
      });
    }
    if (
      [
        "unsafe",
        "needs_rewrite",
        "accepted_with_changes",
        "unresolved_disagreement"
      ].includes(
        qualityReviewSummary.adjudicationStatus
      )
    ) {
      issues.push({
        code: "QUALITY_ADJUDICATION_BLOCKING",
        file: qualityValidation.reviewFile,
        path: "$.adjudication.status",
        message: `Quality adjudication status ${qualityReviewSummary.adjudicationStatus} is release-blocking.`
      });
    }
  }

  const inputEvidenceValid =
    consentValidation.valid &&
    reviewValidation.valid &&
    qualityValidation.valid &&
    releaseValidation.valid &&
    reportValidation.valid;
  const mechanicallyReady = inputEvidenceValid && issues.length === 0;
  return {
    schemaVersion: "stable_release_audit.v1",
    generatedAt: new Date().toISOString(),
    candidateVersion: releaseEvidence?.candidate_version ?? null,
    sourceCommitSha: releaseEvidence?.source_commit_sha ?? null,
    status: mechanicallyReady
      ? "evidence_ready_for_human_release_decision"
      : "blocked",
    stableGateStatus: "not_assessed",
    counts: {
      eligibleRealCases: eligibleConsents.length,
      reviewRecords: reviewValidation.records.length,
      reviewers: new Set(
        reviewValidation.records.map(
          ({ record }) => record.reviewer.pseudonymous_id
        )
      ).size,
      reports: reportValidation.reports.size
    },
    cases: caseAudits.map(({ issues: _issues, ...summary }) => summary),
    qualityReview: qualityReviewSummary,
    externalEvidence: releaseValidation.valid && releaseEvidence
      ? {
          policyId: releaseEvidence.policy.policy_id,
          policyFrozenAt: releaseEvidence.policy.frozen_at,
          publishedArtifactInstall: "declared_and_hash_linked",
          independentIntegration: "declared_and_hash_linked",
          releaseNotes: "hash_linked"
        }
      : null,
    issues,
    notes: [
      "This audit checks schemas, hashes, version links, case/report/review links and frozen-policy thresholds.",
      "It cannot authenticate consent, prove reviewer expertise or independence, inspect npm registry history, or replace the human release decision.",
      "Synthetic records that imitate real-case IDs do not satisfy the real-case gate.",
      "stableGateStatus remains not_assessed even when all mechanical evidence is ready."
    ]
  };
}

function auditCase(consent, reviewEntries, reports, policy) {
  const matching = reviewEntries
    .map(({ record }) => record)
    .filter(
      (review) =>
        review.case_id === consent.case_id &&
        review.case_version === consent.case_version
    );
  const issues = [];
  const reviewerIds = new Set(
    matching.map((review) => review.reviewer.pseudonymous_id)
  );
  const reportIds = new Set(matching.map((review) => review.report_id));
  const reportHashes = new Set(
    matching.map((review) => review.report_sha256)
  );
  const missingReports = [...reportIds].filter(
    (reportId) => !reports.has(reportId)
  );
  if (missingReports.length > 0) {
    issues.push({
      code: "REVIEW_REPORT_NOT_FOUND",
      file: null,
      path: "$.report_id",
      message: `${consent.case_id} references missing reports ${missingReports.join(", ")}.`
    });
  }
  if (reportIds.size > 1) {
    issues.push({
      code: "MULTIPLE_REPORTS_PER_CASE_VERSION",
      file: null,
      path: "$.report_id",
      message: `${consent.case_id} v${consent.case_version} reviews do not use one frozen report.`
    });
  }
  for (const review of matching) {
    if (
      review.case_artifact_sha256 !==
      consent.deidentification.verification.deidentified_case_sha256
    ) {
      issues.push({
        code: "REVIEW_CASE_HASH_MISMATCH",
        file: null,
        path: "$.case_artifact_sha256",
        message: `${review.review_id} does not bind the consented deidentified case artifact.`
      });
    }
    const reportEntry = reports.get(review.report_id);
    if (
      reportEntry &&
      review.report_version !== reportEntry.report.schema_version
    ) {
      issues.push({
        code: "REVIEW_REPORT_VERSION_MISMATCH",
        file: null,
        path: "$.report_version",
        message: `${review.review_id} expects ${review.report_version}, but ${review.report_id} is ${reportEntry.report.schema_version}.`
      });
    }
    if (reportEntry && review.report_sha256 !== reportEntry.sha256) {
      issues.push({
        code: "REVIEW_REPORT_HASH_MISMATCH",
        file: null,
        path: "$.report_sha256",
        message: `${review.review_id} does not bind the exact bytes of ${review.report_id}.`
      });
    }
  }
  const minimumReviews = policy?.minimum_reviews_per_case ?? null;
  if (minimumReviews !== null && reviewerIds.size < minimumReviews) {
    issues.push({
      code: "CASE_REVIEW_COUNT_BELOW_FROZEN_POLICY",
      file: null,
      path: "$.reviewer",
      message: `${consent.case_id} has ${reviewerIds.size} reviewers; frozen policy requires ${minimumReviews}.`
    });
  }

  const roles = new Set(
    matching.flatMap((review) => review.reviewer.roles)
  );
  const operatorCovered = [...roles].some((role) => operatorRoles.has(role));
  const screeningCovered = [...roles].some((role) => screeningRoles.has(role));
  const domainCovered = matching.some(
    (review) =>
      review.reviewer.roles.includes("domain_expert") ||
      ["working", "deep"].includes(review.reviewer.domain_familiarity)
  );
  const roleCoverage = {
    founderOrProductOperator: operatorCovered,
    investorOrIncubator: screeningCovered,
    domainFamiliarity: domainCovered
  };
  if (
    policy?.require_reviewer_role_coverage &&
    Object.values(roleCoverage).some((covered) => !covered)
  ) {
    issues.push({
      code: "CASE_REVIEWER_ROLE_COVERAGE",
      file: null,
      path: "$.reviewer.roles",
      message: `${consent.case_id} does not satisfy frozen reviewer role coverage.`
    });
  }

  let unresolvedP0 = 0;
  let unresolvedP1 = 0;
  let blockingAdjudications = 0;
  let decisionChangingMisses = 0;
  for (const review of matching) {
    const rejected = new Set(review.adjudication?.rejected_failures ?? []);
    for (const failure of review.report_assessment.failures) {
      if (rejected.has(failure.failure_id)) continue;
      if (failure.severity === "P0") unresolvedP0 += 1;
      if (failure.severity === "P1") unresolvedP1 += 1;
    }
    if (review.report_assessment.missed_decision_changing_issue) {
      decisionChangingMisses += 1;
    }
    if (
      review.adjudication &&
      review.adjudication.status !== "accepted"
    ) {
      blockingAdjudications += 1;
    }
  }
  if (unresolvedP0 > 0 || unresolvedP1 > 0) {
    issues.push({
      code: "CASE_UNRESOLVED_P0_P1",
      file: null,
      path: "$.report_assessment.failures",
      message: `${consent.case_id} has unresolved P0=${unresolvedP0}, P1=${unresolvedP1}.`
    });
  }
  if (decisionChangingMisses > 0) {
    issues.push({
      code: "CASE_DECISION_CHANGING_MISS",
      file: null,
      path: "$.report_assessment.missed_decision_changing_issue",
      message: `${consent.case_id} has ${decisionChangingMisses} decision-changing misses and requires a revised report/re-review.`
    });
  }
  if (blockingAdjudications > 0) {
    issues.push({
      code: "CASE_ADJUDICATION_BLOCKING",
      file: null,
      path: "$.adjudication.status",
      message: `${consent.case_id} has ${blockingAdjudications} non-accepted adjudications.`
    });
  }

  return {
    caseId: consent.case_id,
    caseVersion: consent.case_version,
    reportIds: [...reportIds].sort(),
    reportHashes: [...reportHashes].sort(),
    reviewCount: matching.length,
    reviewerCount: reviewerIds.size,
    roleCoverage,
    unresolvedP0,
    unresolvedP1,
    decisionChangingMisses,
    blockingAdjudications,
    issues
  };
}

async function validateReleaseEvidence(path) {
  const file = resolve(path);
  let record;
  try {
    record = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    return {
      valid: false,
      file,
      record: null,
      issues: [
        {
          code: "RELEASE_EVIDENCE_JSON_INVALID",
          file,
          path: "$",
          message: error instanceof Error ? error.message : String(error)
        }
      ]
    };
  }
  const schema = JSON.parse(
    await readFile(releaseEvidenceSchemaPath, "utf8")
  );
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valid = Boolean(validate(record));
  return {
    valid,
    file,
    record,
    issues: valid
      ? []
      : (validate.errors ?? []).map((error) => ({
          code: "RELEASE_EVIDENCE_SCHEMA_INVALID",
          file,
          path: error.instancePath || "$",
          message: error.message ?? "Schema validation failed"
        }))
  };
}

function validateReleaseEvidenceSemantics(record, file, issues) {
  const roles = new Set(record.policy.approvals.map((item) => item.role));
  if (!roles.has("product_owner") || !roles.has("review_group")) {
    issues.push({
      code: "FROZEN_POLICY_APPROVAL_ROLES",
      file,
      path: "$.policy.approvals",
      message: "Frozen policy requires product_owner and review_group approval."
    });
  }
  const approverIds = record.policy.approvals.map(
    (item) => item.approver_id
  );
  if (new Set(approverIds).size !== approverIds.length) {
    issues.push({
      code: "DUPLICATE_POLICY_APPROVER",
      file,
      path: "$.policy.approvals",
      message: "Policy approvers must be unique."
    });
  }
  for (const approval of record.policy.approvals) {
    if (Date.parse(approval.approved_at) > Date.parse(record.policy.frozen_at)) {
      issues.push({
        code: "POLICY_APPROVAL_TIME_ORDER",
        file,
        path: "$.policy.approvals",
        message: "Policy approval cannot occur after its frozen timestamp."
      });
    }
  }
  for (const [path, value] of [
    ["$.published_artifact.package_version", record.published_artifact.package_version],
    ["$.independent_integration.package_version", record.independent_integration.package_version]
  ]) {
    if (value !== record.candidate_version) {
      issues.push({
        code: "CANDIDATE_VERSION_MISMATCH",
        file,
        path,
        message: `Expected candidate version ${record.candidate_version}.`
      });
    }
  }
  if (
    record.independent_integration.source_commit_sha !==
    record.source_commit_sha
  ) {
    issues.push({
      code: "SOURCE_COMMIT_MISMATCH",
      file,
      path: "$.independent_integration.source_commit_sha",
      message: `Expected source commit ${record.source_commit_sha}.`
    });
  }
  if (!record.published_artifact.independent_of_implementation) {
    issues.push({
      code: "PUBLISHED_INSTALL_NOT_INDEPENDENT",
      file,
      path: "$.published_artifact.independent_of_implementation",
      message:
        "Stable evidence requires the published-artifact clean install to be independently executed."
    });
  }
}

async function validateReleaseEvidenceFiles(record, manifestFile) {
  const baseDirectory = dirname(manifestFile);
  const targets = [
    {
      code: "PUBLISHED_INSTALL_EVIDENCE_HASH",
      path: "$.published_artifact.evidence_file",
      value: record.published_artifact.evidence_file
    },
    {
      code: "INTEGRATION_EVIDENCE_HASH",
      path: "$.independent_integration.evidence_file",
      value: record.independent_integration.evidence_file
    },
    {
      code: "RELEASE_NOTES_HASH",
      path: "$.release_notes",
      value: {
        path: record.release_notes.path,
        sha256: record.release_notes.sha256
      }
    }
  ];
  const issues = [];
  for (const target of targets) {
    const file = resolve(baseDirectory, target.value.path);
    try {
      const actual = createHash("sha256")
        .update(await readFile(file))
        .digest("hex");
      if (actual !== target.value.sha256) {
        issues.push({
          code: target.code,
          file: manifestFile,
          path: target.path,
          message: `Expected SHA-256 ${target.value.sha256}; found ${actual}.`
        });
      }
    } catch (error) {
      issues.push({
        code: target.code,
        file: manifestFile,
        path: target.path,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
  return issues;
}

async function validateReportFiles(paths) {
  const files = await collectJsonFiles(paths);
  const schema = JSON.parse(await readFile(reportSchemaPath, "utf8"));
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const reports = new Map();
  const issues = [];
  for (const file of files) {
    let report;
    let reportBytes;
    try {
      reportBytes = await readFile(file);
      report = JSON.parse(reportBytes.toString("utf8"));
    } catch (error) {
      issues.push({
        code: "REPORT_JSON_INVALID",
        file,
        path: "$",
        message: error instanceof Error ? error.message : String(error)
      });
      continue;
    }
    if (!validate(report)) {
      issues.push(
        ...(validate.errors ?? []).map((error) => ({
          code: "REPORT_SCHEMA_INVALID",
          file,
          path: error.instancePath || "$",
          message: error.message ?? "Schema validation failed"
        }))
      );
      continue;
    }
    if (reports.has(report.report_id)) {
      issues.push({
        code: "DUPLICATE_REPORT_ID",
        file,
        path: "$.report_id",
        message: `Report ID ${report.report_id} is duplicated.`
      });
    } else {
      reports.set(report.report_id, {
        file,
        report,
        sha256: createHash("sha256").update(reportBytes).digest("hex")
      });
    }
  }
  if (files.length === 0) {
    issues.push({
      code: "NO_REPORTS",
      file: null,
      path: "$",
      message: "No JSON reports were found."
    });
  }
  return {
    valid: issues.length === 0,
    files,
    reports,
    issues
  };
}

function prefixIssues(prefix, issues) {
  return issues.map((issue) => ({
    ...issue,
    code: `${prefix}_${issue.code}`
  }));
}

function caseKey(record) {
  return `${record.case_id}\u0000${record.case_version}`;
}

async function collectJsonFiles(paths) {
  const files = [];
  for (const path of paths) {
    const absolute = resolve(path);
    const metadata = await stat(absolute);
    if (metadata.isDirectory()) {
      const entries = await readdir(absolute, { withFileTypes: true });
      const nested = entries
        .filter((entry) => !entry.name.startsWith("."))
        .map((entry) => resolve(absolute, entry.name));
      files.push(...(await collectJsonFiles(nested)));
    } else if (metadata.isFile() && absolute.endsWith(".json")) {
      files.push(absolute);
    }
  }
  return [...new Set(files)].sort();
}

function usage() {
  return [
    "Usage: founder-stable-audit [options]",
    "",
    "Required:",
    "  --consents PATH          Consent record file or directory",
    "  --reviews PATH           Expert review file or directory",
    "  --reports PATH           Frozen report file or directory",
    "  --quality-summary PATH   Immutable live quality summary",
    "  --quality-review PATH    Human review of the quality summary",
    "  --release-evidence PATH  Frozen policy and external evidence manifest",
    "",
    "The command never self-approves stable v1."
  ].join("\n");
}

async function main() {
  let options;
  try {
    options = parseStableAuditArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({
        error: {
          code: "INVALID_INPUT",
          message: error instanceof Error ? error.message : String(error)
        }
      })}\n`
    );
    process.exitCode = 2;
    return;
  }
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  const audit = await auditStableReleaseEvidence(options);
  const stream =
    audit.status === "evidence_ready_for_human_release_decision"
      ? process.stdout
      : process.stderr;
  stream.write(`${JSON.stringify(audit, null, 2)}\n`);
  if (audit.status === "blocked") process.exitCode = 1;
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
          code: "STABLE_RELEASE_AUDIT_FAILED",
          message: error instanceof Error ? error.message : String(error)
        }
      })}\n`
    );
    process.exitCode = 1;
  });
}
