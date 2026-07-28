#!/usr/bin/env node

import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const qualitySchemaPath = resolve(
  scriptDirectory,
  "../schemas/live-quality-eval.v1.schema.json"
);
const reviewSchemaPath = resolve(
  scriptDirectory,
  "../schemas/live-quality-review.v1.schema.json"
);

export async function validateLiveQualityReviewFiles(
  qualitySummaryPath,
  reviewPath
) {
  const issues = [];
  const summaryFile = resolve(qualitySummaryPath);
  const reviewFile = resolve(reviewPath);
  let summaryBytes;
  let summary;
  let review;

  try {
    summaryBytes = await readFile(summaryFile);
    summary = JSON.parse(summaryBytes.toString("utf8"));
  } catch (error) {
    return invalidFile(
      "QUALITY_SUMMARY_JSON_INVALID",
      summaryFile,
      error
    );
  }
  try {
    review = JSON.parse(await readFile(reviewFile, "utf8"));
  } catch (error) {
    return invalidFile("QUALITY_REVIEW_JSON_INVALID", reviewFile, error);
  }

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const qualitySchema = JSON.parse(await readFile(qualitySchemaPath, "utf8"));
  const reviewSchema = JSON.parse(await readFile(reviewSchemaPath, "utf8"));
  const validateSummary = ajv.compile(qualitySchema);
  const validateReview = ajv.compile(reviewSchema);

  if (!validateSummary(summary)) {
    issues.push(
      ...schemaIssues(
        "QUALITY_SUMMARY_SCHEMA_INVALID",
        summaryFile,
        validateSummary.errors
      )
    );
  }
  if (!validateReview(review)) {
    issues.push(
      ...schemaIssues(
        "QUALITY_REVIEW_SCHEMA_INVALID",
        reviewFile,
        validateReview.errors
      )
    );
  }
  if (issues.length > 0) {
    return {
      valid: false,
      summaryFile,
      reviewFile,
      summary,
      review,
      issues
    };
  }

  const expectedHash = createHash("sha256").update(summaryBytes).digest("hex");
  if (review.quality_summary_sha256 !== expectedHash) {
    issues.push({
      code: "QUALITY_SUMMARY_HASH_MISMATCH",
      file: reviewFile,
      path: "$.quality_summary_sha256",
      message: `Expected SHA-256 ${expectedHash}`
    });
  }

  const reviewerIds = review.reviewers.map(
    (reviewer) => reviewer.pseudonymous_id
  );
  if (new Set(reviewerIds).size !== reviewerIds.length) {
    issues.push({
      code: "DUPLICATE_QUALITY_REVIEWER",
      file: reviewFile,
      path: "$.reviewers",
      message: "Reviewer pseudonymous IDs must be unique."
    });
  }
  for (const [index, reviewer] of review.reviewers.entries()) {
    if (
      reviewer.has_conflict &&
      (reviewer.conflict_notes === null ||
        reviewer.conflict_notes.trim().length === 0)
    ) {
      issues.push({
        code: "QUALITY_REVIEWER_CONFLICT_DETAIL_MISSING",
        file: reviewFile,
        path: `$.reviewers[${index}].conflict_notes`,
        message: "A disclosed conflict requires explanatory notes."
      });
    }
    if (!reviewer.has_conflict && reviewer.conflict_notes !== null) {
      issues.push({
        code: "QUALITY_REVIEWER_CONFLICT_CONTRADICTION",
        file: reviewFile,
        path: `$.reviewers[${index}].conflict_notes`,
        message: "A reviewer without a conflict must use null conflict notes."
      });
    }
  }

  const expectedCounterfactuals = new Set(
    summary.counterfactuals.map((item) => item.case_id)
  );
  const reviewedCounterfactuals = review.counterfactual_reviews.map(
    (item) => item.case_id
  );
  compareExactSet(
    expectedCounterfactuals,
    reviewedCounterfactuals,
    issues,
    reviewFile,
    "$.counterfactual_reviews",
    "COUNTERFACTUAL_REVIEW_SET_MISMATCH"
  );

  const expectedClaims = new Set(
    summary.citation_review_sample.sampled_claims.map(
      (claim) => claim.claim_id
    )
  );
  const reviewedClaims = review.citation_claim_reviews.map(
    (item) => item.claim_id
  );
  compareExactSet(
    expectedClaims,
    reviewedClaims,
    issues,
    reviewFile,
    "$.citation_claim_reviews",
    "CITATION_REVIEW_SET_MISMATCH"
  );

  const findings = collectFindings(review);
  for (const finding of findings) {
    validateFindingSeverity(finding, issues, reviewFile);
  }

  if (review.adjudication) {
    const findingIds = new Set(
      findings
        .filter((finding) => finding.failureSeverity !== null)
        .map((finding) => finding.id)
    );
    const accepted = new Set(review.adjudication.accepted_findings);
    const rejected = new Set(review.adjudication.rejected_findings);
    for (const field of ["accepted_findings", "rejected_findings"]) {
      for (const findingId of review.adjudication[field]) {
        if (!findingIds.has(findingId)) {
          issues.push({
            code: "UNKNOWN_QUALITY_FINDING",
            file: reviewFile,
            path: `$.adjudication.${field}`,
            message: `Adjudication references unknown or non-failure finding ${findingId}.`
          });
        }
      }
    }
    for (const findingId of accepted) {
      if (rejected.has(findingId)) {
        issues.push({
          code: "QUALITY_ADJUDICATION_CONFLICT",
          file: reviewFile,
          path: "$.adjudication",
          message: `Finding ${findingId} cannot be accepted and rejected.`
        });
      }
    }
    if (
      Date.parse(review.adjudication.adjudicated_at) <
      Date.parse(review.reviewed_at)
    ) {
      issues.push({
        code: "QUALITY_ADJUDICATION_TIME_ORDER",
        file: reviewFile,
        path: "$.adjudication.adjudicated_at",
        message: "Adjudication cannot occur before the review."
      });
    }
  }

  return {
    valid: issues.length === 0,
    summaryFile,
    reviewFile,
    summary,
    review,
    issues
  };
}

export function summarizeLiveQualityReview(validation) {
  const findings = collectFindings(validation.review);
  const observed = countSeverities(findings);
  const rejected = new Set(
    validation.review.adjudication?.rejected_findings ?? []
  );
  const unresolved = countSeverities(
    findings.filter(
      (finding) =>
        finding.failureSeverity !== null && !rejected.has(finding.id)
    )
  );
  const adjudicationStatus =
    validation.review.adjudication?.status ?? "not_adjudicated";
  return {
    schemaVersion: "live_quality_review_summary.v1",
    mode: validation.summary.mode,
    reviewerCount: validation.review.reviewers.length,
    sampledCitationClaimCount:
      validation.summary.citation_review_sample.sampled_claims.length,
    counterfactualReviewCount:
      validation.review.counterfactual_reviews.length,
    observedFailureCounts: observed,
    unresolvedFailureCounts: unresolved,
    adjudicationStatus,
    factualitySamplingApplicable:
      validation.summary.mode === "deep" &&
      validation.summary.citation_review_sample.applicable &&
      validation.summary.citation_review_sample.sampled_claims.length > 0,
    stableGateStatus: "not_assessed",
    stableGateNotes: [
      "Human review records and deterministic linkage do not establish reviewer expertise, source completeness or release approval.",
      "Any unresolved P0/P1, unsafe or unresolved adjudication remains release-blocking.",
      "Stable v1 still requires linked consented real cases, expert blind review, published-artifact installation and an independent integration test."
    ]
  };
}

function collectFindings(review) {
  return [
    {
      id: "repeat_stability",
      assessment: review.repeat_stability.assessment,
      passingAssessment: "acceptable",
      failureSeverity: review.repeat_stability.failure_severity
    },
    ...review.counterfactual_reviews.map((item) => ({
      id: `counterfactual:${item.case_id}`,
      assessment: item.assessment,
      passingAssessment: "expected_response",
      failureSeverity: item.failure_severity
    })),
    ...review.citation_claim_reviews.map((item) => ({
      id: `citation:${item.claim_id}`,
      assessment: item.support_status,
      passingAssessment: "supported",
      failureSeverity: item.failure_severity
    }))
  ];
}

function validateFindingSeverity(finding, issues, file) {
  const passing = finding.assessment === finding.passingAssessment;
  if (passing && finding.failureSeverity !== null) {
    issues.push({
      code: "QUALITY_PASSING_FINDING_HAS_SEVERITY",
      file,
      path: "$",
      message: `${finding.id} is passing and must not carry a failure severity.`
    });
  }
  if (!passing && finding.failureSeverity === null) {
    issues.push({
      code: "QUALITY_FAILURE_MISSING_SEVERITY",
      file,
      path: "$",
      message: `${finding.id} is not passing and requires a failure severity.`
    });
  }
}

function compareExactSet(
  expected,
  actualItems,
  issues,
  file,
  path,
  code
) {
  const actual = new Set(actualItems);
  const duplicates = actualItems.length !== actual.size;
  const missing = [...expected].filter((item) => !actual.has(item));
  const extra = [...actual].filter((item) => !expected.has(item));
  if (duplicates || missing.length > 0 || extra.length > 0) {
    issues.push({
      code,
      file,
      path,
      message: `Expected exact set; missing=${JSON.stringify(
        missing
      )}, extra=${JSON.stringify(extra)}, duplicates=${duplicates}.`
    });
  }
}

function countSeverities(findings) {
  const counts = { P0: 0, P1: 0, P2: 0, P3: 0 };
  for (const finding of findings) {
    if (finding.failureSeverity) counts[finding.failureSeverity] += 1;
  }
  return counts;
}

function schemaIssues(code, file, errors = []) {
  return errors.map((error) => ({
    code,
    file,
    path: error.instancePath || "$",
    message: error.message ?? "Schema validation failed"
  }));
}

function invalidFile(code, file, error) {
  return {
    valid: false,
    summaryFile: null,
    reviewFile: null,
    summary: null,
    review: null,
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

async function main() {
  const arguments_ = process.argv.slice(2);
  if (arguments_.includes("--help") || arguments_.includes("-h")) {
    process.stdout.write(
      "Usage: node scripts/validate-live-quality-review.mjs <quality-summary.json> <quality-review.json>\n"
    );
    return;
  }
  if (arguments_.length !== 2) {
    process.stderr.write(
      "Usage: node scripts/validate-live-quality-review.mjs <quality-summary.json> <quality-review.json>\n"
    );
    process.exitCode = 2;
    return;
  }
  const validation = await validateLiveQualityReviewFiles(
    arguments_[0],
    arguments_[1]
  );
  const output = {
    status: validation.valid ? "passed" : "failed",
    issues: validation.issues,
    ...(validation.valid
      ? { summary: summarizeLiveQualityReview(validation) }
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
          code: "LIVE_QUALITY_REVIEW_VALIDATION_FAILED",
          message: error instanceof Error ? error.message : String(error)
        }
      })}\n`
    );
    process.exitCode = 1;
  });
}
