#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(
  scriptDirectory,
  "../evals/review/review-form.v1.schema.json"
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

export async function validateReviewRecordFiles(paths) {
  const files = await collectJsonFiles(paths);
  if (files.length === 0) {
    return {
      valid: false,
      files: [],
      records: [],
      issues: [
        {
          code: "NO_REVIEW_RECORDS",
          file: null,
          path: "$",
          message: "No JSON review records were found."
        }
      ]
    };
  }

  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validateSchema = ajv.compile(schema);
  const records = [];
  const issues = [];
  const reviewIds = new Map();
  const reviewerCasePairs = new Map();

  for (const file of files) {
    let record;
    try {
      record = JSON.parse(await readFile(file, "utf8"));
    } catch (error) {
      issues.push({
        code: "REVIEW_JSON_INVALID",
        file,
        path: "$",
        message: error instanceof Error ? error.message : "Invalid JSON"
      });
      continue;
    }

    if (!validateSchema(record)) {
      for (const error of validateSchema.errors ?? []) {
        issues.push({
          code: "REVIEW_SCHEMA_INVALID",
          file,
          path: error.instancePath || "$",
          message: error.message ?? "Schema validation failed"
        });
      }
      continue;
    }

    const semanticIssues = validateReviewSemantics(record, file);
    issues.push(...semanticIssues);
    records.push({ file, record });

    const existingReview = reviewIds.get(record.review_id);
    if (existingReview) {
      issues.push({
        code: "DUPLICATE_REVIEW_ID",
        file,
        path: "$.review_id",
        message: `Review ID already appears in ${existingReview}`
      });
    } else {
      reviewIds.set(record.review_id, file);
    }

    const pair = [
      record.case_id,
      record.report_id,
      record.reviewer.pseudonymous_id
    ].join("\u0000");
    const existingPair = reviewerCasePairs.get(pair);
    if (existingPair) {
      issues.push({
        code: "DUPLICATE_REVIEWER_CASE",
        file,
        path: "$.reviewer.pseudonymous_id",
        message: `Reviewer already assessed this case/report in ${existingPair}`
      });
    } else {
      reviewerCasePairs.set(pair, file);
    }
  }

  return {
    valid: issues.length === 0,
    files,
    records,
    issues
  };
}

export function summarizeReviewRecords(records) {
  const verdictAcceptability = {};
  const rubric = Object.fromEntries(
    rubricDimensions.map((dimension) => [
      dimension,
      { count: 0, scores: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }
    ])
  );
  const failures = { P0: 0, P1: 0, P2: 0, P3: 0 };
  const adjudications = {};
  let decisionChangingMisses = 0;
  let unadjudicated = 0;

  for (const { record } of records) {
    const acceptability = record.report_assessment.verdict_acceptability;
    verdictAcceptability[acceptability] =
      (verdictAcceptability[acceptability] ?? 0) + 1;
    if (record.report_assessment.missed_decision_changing_issue) {
      decisionChangingMisses += 1;
    }
    for (const score of record.report_assessment.rubric_scores) {
      const dimension = rubric[score.dimension_id];
      dimension.count += 1;
      dimension.scores[score.score] += 1;
    }
    for (const failure of record.report_assessment.failures) {
      failures[failure.severity] += 1;
    }
    if (record.adjudication) {
      adjudications[record.adjudication.status] =
        (adjudications[record.adjudication.status] ?? 0) + 1;
    } else {
      unadjudicated += 1;
    }
  }

  return {
    schemaVersion: "expert_review_summary.v1",
    reviewCount: records.length,
    caseCount: new Set(records.map(({ record }) => record.case_id)).size,
    reviewerCount: new Set(
      records.map(({ record }) => record.reviewer.pseudonymous_id)
    ).size,
    verdictAcceptability,
    rubric,
    failures,
    decisionChangingMisses,
    adjudications,
    unadjudicated,
    stableGateStatus: "not_assessed",
    stableGateNotes: [
      "Structural review validation does not prove reviewer expertise or judgment quality.",
      "Real-case consent, de-identification, expert composition and frozen release thresholds require independent evidence.",
      "Any unresolved P0/P1, unsafe adjudication or decision-changing miss remains release-blocking."
    ]
  };
}

function validateReviewSemantics(record, file) {
  const issues = [];
  const dimensions = record.report_assessment.rubric_scores.map(
    (score) => score.dimension_id
  );
  if (
    new Set(dimensions).size !== rubricDimensions.length ||
    rubricDimensions.some((dimension) => !dimensions.includes(dimension))
  ) {
    issues.push({
      code: "RUBRIC_DIMENSION_SET",
      file,
      path: "$.report_assessment.rubric_scores",
      message: "Rubric scores must contain R1-R7 exactly once."
    });
  }

  const lockedAt = Date.parse(record.blinding.independent_assessment_locked_at);
  const revealedAt = Date.parse(record.blinding.report_revealed_at);
  if (revealedAt < lockedAt) {
    issues.push({
      code: "BLINDING_TIME_ORDER",
      file,
      path: "$.blinding",
      message: "The report cannot be revealed before the independent assessment is locked."
    });
  }

  const independent = record.independent_assessment;
  if (
    independent.fatal_constraint &&
    independent.fatal_scope === "not_fatal"
  ) {
    issues.push({
      code: "FATAL_SCOPE_MISMATCH",
      file,
      path: "$.independent_assessment.fatal_scope",
      message: "A fatal constraint requires a fatal scope."
    });
  }
  if (
    !independent.fatal_constraint &&
    independent.fatal_scope !== "not_fatal"
  ) {
    issues.push({
      code: "FATAL_SCOPE_MISMATCH",
      file,
      path: "$.independent_assessment.fatal_scope",
      message: "A non-fatal assessment must use not_fatal."
    });
  }

  const reportedFailureIds = record.report_assessment.failures.map(
    (failure) => failure.failure_id
  );
  if (new Set(reportedFailureIds).size !== reportedFailureIds.length) {
    issues.push({
      code: "DUPLICATE_FAILURE_ID",
      file,
      path: "$.report_assessment.failures",
      message: "Failure IDs must be unique within a review."
    });
  }

  if (
    record.report_assessment.missed_decision_changing_issue &&
    record.report_assessment.missed_issues.length === 0
  ) {
    issues.push({
      code: "MISSING_DECISION_CHANGING_ISSUE_DETAIL",
      file,
      path: "$.report_assessment.missed_issues",
      message: "A decision-changing miss requires at least one described issue."
    });
  }

  if (record.adjudication) {
    const observedFailures = new Set(reportedFailureIds);
    const acceptedFailures = new Set(record.adjudication.accepted_failures);
    const rejectedFailures = new Set(record.adjudication.rejected_failures);
    for (const field of ["accepted_failures", "rejected_failures"]) {
      for (const failureId of record.adjudication[field]) {
        if (!observedFailures.has(failureId)) {
          issues.push({
            code: "UNKNOWN_ADJUDICATED_FAILURE",
            file,
            path: `$.adjudication.${field}`,
            message: `Adjudication references unreported failure ${failureId}.`
          });
        }
      }
    }
    for (const failureId of acceptedFailures) {
      if (rejectedFailures.has(failureId)) {
        issues.push({
          code: "ADJUDICATION_FAILURE_CONFLICT",
          file,
          path: "$.adjudication",
          message: `Failure ${failureId} cannot be both accepted and rejected.`
        });
      }
    }
    const adjudicatedAt = Date.parse(record.adjudication.adjudicated_at);
    if (adjudicatedAt < revealedAt) {
      issues.push({
        code: "ADJUDICATION_TIME_ORDER",
        file,
        path: "$.adjudication.adjudicated_at",
        message: "Adjudication cannot occur before the report is revealed."
      });
    }
  }

  return issues;
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

async function main() {
  const paths = process.argv.slice(2);
  if (paths.includes("--help") || paths.includes("-h")) {
    process.stdout.write(
      "Usage: node scripts/validate-review-records.mjs <review.json|directory> [...]\n"
    );
    return;
  }
  if (paths.length === 0) {
    process.stderr.write(
      "Usage: node scripts/validate-review-records.mjs <review.json|directory> [...]\n"
    );
    process.exitCode = 2;
    return;
  }

  const validation = await validateReviewRecordFiles(paths);
  const output = {
    status: validation.valid ? "passed" : "failed",
    files: validation.files.length,
    issues: validation.issues,
    ...(validation.records.length
      ? { summary: summarizeReviewRecords(validation.records) }
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
          code: "REVIEW_VALIDATION_FAILED",
          message: error instanceof Error ? error.message : String(error)
        }
      })}\n`
    );
    process.exitCode = 1;
  });
}
