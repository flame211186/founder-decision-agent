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
  "../schemas/real-case-consent.v1.schema.json"
);

export async function validateRealCaseConsentFiles(paths) {
  const files = await collectJsonFiles(paths);
  if (files.length === 0) {
    return {
      valid: false,
      files: [],
      records: [],
      issues: [
        {
          code: "NO_CONSENT_RECORDS",
          file: null,
          path: "$",
          message: "No JSON consent records were found."
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
  const recordIds = new Map();
  const caseVersions = new Map();

  for (const file of files) {
    let record;
    try {
      record = JSON.parse(await readFile(file, "utf8"));
    } catch (error) {
      issues.push({
        code: "CONSENT_JSON_INVALID",
        file,
        path: "$",
        message: error instanceof Error ? error.message : "Invalid JSON"
      });
      continue;
    }

    if (!validateSchema(record)) {
      for (const error of validateSchema.errors ?? []) {
        issues.push({
          code: "CONSENT_SCHEMA_INVALID",
          file,
          path: error.instancePath || "$",
          message: error.message ?? "Schema validation failed"
        });
      }
      continue;
    }

    issues.push(...validateConsentSemantics(record, file));
    records.push({ file, record });

    const previousRecord = recordIds.get(record.consent_record_id);
    if (previousRecord) {
      issues.push({
        code: "DUPLICATE_CONSENT_RECORD_ID",
        file,
        path: "$.consent_record_id",
        message: `Consent record ID already appears in ${previousRecord}`
      });
    } else {
      recordIds.set(record.consent_record_id, file);
    }

    const caseVersionKey = `${record.case_id}\u0000${record.case_version}`;
    const previousCaseVersion = caseVersions.get(caseVersionKey);
    if (previousCaseVersion) {
      issues.push({
        code: "DUPLICATE_CASE_VERSION",
        file,
        path: "$.case_version",
        message: `Case/version already appears in ${previousCaseVersion}`
      });
    } else {
      caseVersions.set(caseVersionKey, file);
    }
  }

  return {
    valid: issues.length === 0,
    files,
    records,
    issues
  };
}

export function summarizeRealCaseConsents(records) {
  const statusCounts = {
    pending: 0,
    eligible: 0,
    withdrawn_excluded: 0
  };
  let publicReleaseConsentCount = 0;
  for (const { record } of records) {
    statusCounts[record.record_status] += 1;
    if (record.consent.scopes.public_release) {
      publicReleaseConsentCount += 1;
    }
  }
  return {
    schemaVersion: "real_case_consent_summary.v1",
    recordCount: records.length,
    caseCount: new Set(records.map(({ record }) => record.case_id)).size,
    eligibleCaseCount: statusCounts.eligible,
    statusCounts,
    publicReleaseConsentCount,
    stableGateStatus: "not_assessed",
    stableGateNotes: [
      "An eligible record proves only that the declared consent and de-identification process passed structural and deterministic checks.",
      "This validator does not inspect the raw source, detect every identifier, establish legal compliance or prove that a consent record is authentic.",
      "Stable v1 still requires 3-5 eligible real cases linked to evaluated reports, independent expert review, adjudication and the frozen release thresholds."
    ]
  };
}

function validateConsentSemantics(record, file) {
  const issues = [];
  const consentAt = Date.parse(record.consent.obtained_at);
  const deidentification = record.deidentification;
  const verification = deidentification.verification;
  const withdrawn = record.withdrawal.state === "withdrawn_excluded";

  if (
    record.withdrawal.requested !== withdrawn ||
    (withdrawn &&
      (!record.withdrawal.requested_at || !record.withdrawal.processed_at)) ||
    (!withdrawn &&
      (record.withdrawal.requested_at !== null ||
        record.withdrawal.processed_at !== null))
  ) {
    issues.push({
      code: "WITHDRAWAL_STATE_MISMATCH",
      file,
      path: "$.withdrawal",
      message:
        "Active records must have no withdrawal timestamps; withdrawn records require requested and processed timestamps."
    });
  }

  if (
    withdrawn &&
    record.withdrawal.requested_at &&
    record.withdrawal.processed_at &&
    Date.parse(record.withdrawal.processed_at) <
      Date.parse(record.withdrawal.requested_at)
  ) {
    issues.push({
      code: "WITHDRAWAL_TIME_ORDER",
      file,
      path: "$.withdrawal.processed_at",
      message: "Withdrawal cannot be processed before it was requested."
    });
  }

  if (
    (withdrawn && record.record_status !== "withdrawn_excluded") ||
    (!withdrawn && record.record_status === "withdrawn_excluded")
  ) {
    issues.push({
      code: "RECORD_WITHDRAWAL_STATUS_MISMATCH",
      file,
      path: "$.record_status",
      message: "The record status must match the withdrawal state."
    });
  }

  if (
    deidentification.status === "completed" &&
    (!deidentification.completed_at || !deidentification.completed_by)
  ) {
    issues.push({
      code: "DEIDENTIFICATION_COMPLETION_MISSING",
      file,
      path: "$.deidentification",
      message:
        "Completed de-identification requires a completion time and pseudonymous operator ID."
    });
  }
  if (
    deidentification.status === "pending" &&
    (deidentification.completed_at !== null ||
      deidentification.completed_by !== null)
  ) {
    issues.push({
      code: "DEIDENTIFICATION_PENDING_CONTRADICTION",
      file,
      path: "$.deidentification",
      message:
        "Pending de-identification cannot claim a completion time or operator."
    });
  }

  if (
    deidentification.completed_at &&
    Date.parse(deidentification.completed_at) < consentAt
  ) {
    issues.push({
      code: "CONSENT_DEIDENTIFICATION_TIME_ORDER",
      file,
      path: "$.deidentification.completed_at",
      message: "De-identification cannot be recorded before consent is obtained."
    });
  }

  if (
    verification.method === "independent_second_person" &&
    (verification.status !== "verified" ||
      !verification.verified_at ||
      !verification.verified_by ||
      !verification.deidentified_case_sha256)
  ) {
    issues.push({
      code: "INDEPENDENT_VERIFICATION_INCOMPLETE",
      file,
      path: "$.deidentification.verification",
      message:
        "Independent verification requires verified status, time, verifier and artifact SHA-256."
    });
  }
  if (
    verification.method === "self_review_pending" &&
    (verification.status !== "pending" ||
      verification.verified_at !== null ||
      verification.verified_by !== null ||
      verification.deidentified_case_sha256 !== null)
  ) {
    issues.push({
      code: "PENDING_VERIFICATION_CONTRADICTION",
      file,
      path: "$.deidentification.verification",
      message:
        "A pending self-review cannot claim verification metadata or an artifact digest."
    });
  }
  if (
    verification.verified_by &&
    verification.verified_by === deidentification.completed_by
  ) {
    issues.push({
      code: "VERIFIER_NOT_INDEPENDENT",
      file,
      path: "$.deidentification.verification.verified_by",
      message:
        "The independent verifier must differ from the de-identification operator."
    });
  }
  if (
    verification.verified_at &&
    deidentification.completed_at &&
    Date.parse(verification.verified_at) <
      Date.parse(deidentification.completed_at)
  ) {
    issues.push({
      code: "VERIFICATION_TIME_ORDER",
      file,
      path: "$.deidentification.verification.verified_at",
      message:
        "Verification cannot occur before de-identification is completed."
    });
  }

  const requiredConsent =
    record.consent.withdrawal_process_explained &&
    record.consent.data_processors_disclosed &&
    record.consent.retention_policy_disclosed &&
    record.consent.scopes.agent_evaluation &&
    record.consent.scopes.external_model_processing &&
    record.consent.scopes.deidentified_expert_review;
  const requiredDeidentification =
    deidentification.status === "completed" &&
    deidentification.direct_identifiers_removed &&
    deidentification.indirect_identifiers_generalized &&
    deidentification.organization_and_person_names_replaced &&
    deidentification.secrets_removed &&
    deidentification.free_text_manually_reviewed &&
    deidentification.reidentification_risk === "low" &&
    verification.method === "independent_second_person" &&
    verification.status === "verified";
  const requiredHandling =
    record.data_handling.deletion_process_available &&
    record.data_handling.repository_contains_raw_source === false &&
    record.data_handling.consent_record_contains_direct_identifiers === false;
  const deterministicallyEligible =
    !withdrawn &&
    requiredConsent &&
    requiredDeidentification &&
    requiredHandling;

  if (
    (record.record_status === "eligible" && !deterministicallyEligible) ||
    (record.record_status === "pending" && deterministicallyEligible)
  ) {
    issues.push({
      code: "ELIGIBILITY_STATUS_MISMATCH",
      file,
      path: "$.record_status",
      message:
        "Eligible requires all processing scopes, disclosures, low-risk de-identification, independent verification and deletion process; a fully ready active record must be marked eligible."
    });
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
      "Usage: node scripts/validate-real-case-consents.mjs <consent.json|directory> [...]\n"
    );
    return;
  }
  if (paths.length === 0) {
    process.stderr.write(
      "Usage: node scripts/validate-real-case-consents.mjs <consent.json|directory> [...]\n"
    );
    process.exitCode = 2;
    return;
  }

  const validation = await validateRealCaseConsentFiles(paths);
  const output = {
    status: validation.valid ? "passed" : "failed",
    files: validation.files.length,
    issues: validation.issues,
    ...(validation.records.length
      ? { summary: summarizeRealCaseConsents(validation.records) }
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
          code: "REAL_CASE_CONSENT_VALIDATION_FAILED",
          message: error instanceof Error ? error.message : String(error)
        }
      })}\n`
    );
    process.exitCode = 1;
  });
}
