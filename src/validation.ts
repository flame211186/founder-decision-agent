import { createRequire } from "node:module";
import type { ErrorObject, ValidateFunction } from "ajv";
import type {
  EvaluationReport,
  EvaluationRequest,
  ValidationIssue,
  ValidationResult
} from "./types.js";
import { getCanonicalReportSchema } from "./openai-schema.js";

let compiledSchema: ValidateFunction | undefined;
const require = createRequire(import.meta.url);
const Ajv = require("ajv") as typeof import("ajv")["default"];
const addFormats = require("ajv-formats") as typeof import("ajv-formats")["default"];

function getValidator(): ValidateFunction {
  if (!compiledSchema) {
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    const validator = ajv.compile(getCanonicalReportSchema());
    compiledSchema = validator;
    return validator;
  }
  return compiledSchema;
}

function schemaIssue(error: ErrorObject): ValidationIssue {
  return {
    code: "SCHEMA_INVALID",
    severity: "P1",
    path: error.instancePath || "$",
    message: error.message ?? "Schema validation failed"
  };
}

function issue(
  issues: ValidationIssue[],
  code: string,
  message: string,
  path = "$",
  severity: ValidationIssue["severity"] = "P1"
): void {
  issues.push({ code, severity, path, message });
}

export function validateEvaluationRequest(request: EvaluationRequest): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (request.schemaVersion !== "evaluation_request.v1") {
    issue(issues, "INPUT_VERSION", "schemaVersion must be evaluation_request.v1");
  }
  if (typeof request.idea !== "string" || request.idea.trim().length < 5) {
    issue(issues, "INPUT_IDEA", "idea must contain at least 5 non-whitespace characters");
  }
  if (request.mode && !["quick", "deep"].includes(request.mode)) {
    issue(issues, "INPUT_MODE", "mode must be quick or deep");
  }
  if (request.language && !["zh-CN", "en"].includes(request.language)) {
    issue(issues, "INPUT_LANGUAGE", "language must be zh-CN or en");
  }
  if ((request.industryPacks?.length ?? 0) > 2) {
    issue(issues, "INPUT_INDUSTRY_PACKS", "At most two industry packs can be active");
  }
  return { valid: issues.length === 0, issues };
}

export interface SemanticValidationOptions {
  allowedCitationUrls?: Set<string>;
}

export function validateReport(
  report: EvaluationReport,
  options: SemanticValidationOptions = {}
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const schemaValid = getValidator()(report);
  if (!schemaValid) {
    issues.push(...(getValidator().errors ?? []).map(schemaIssue));
  }

  const claims = new Map<string, EvaluationReport["claims"][number]>();
  const evidence = new Map<string, EvaluationReport["evidence"][number]>();

  for (const [index, claim] of (report.claims ?? []).entries()) {
    if (claims.has(claim.id)) {
      issue(issues, "DUPLICATE_CLAIM", `Duplicate claim id ${claim.id}`, `$.claims[${index}].id`);
    }
    claims.set(claim.id, claim);
  }
  for (const [index, item] of (report.evidence ?? []).entries()) {
    if (evidence.has(item.id)) {
      issue(
        issues,
        "DUPLICATE_EVIDENCE",
        `Duplicate evidence id ${item.id}`,
        `$.evidence[${index}].id`
      );
    }
    evidence.set(item.id, item);
  }

  function checkReferences(value: unknown, path = "$"): void {
    if (Array.isArray(value)) {
      value.forEach((item, index) => checkReferences(item, `${path}[${index}]`));
      return;
    }
    if (!value || typeof value !== "object") return;
    const object = value as Record<string, unknown>;

    if (
      typeof object.min === "number" &&
      typeof object.max === "number" &&
      object.min > object.max
    ) {
      issue(issues, "INVALID_RANGE", "Range min exceeds max", path);
    }

    for (const [key, child] of Object.entries(object)) {
      const childPath = `${path}.${key}`;
      if (["claim_ids", "rationale_claim_ids", "supports_claim_ids"].includes(key)) {
        for (const id of Array.isArray(child) ? child : []) {
          if (typeof id === "string" && !claims.has(id)) {
            issue(issues, "UNKNOWN_CLAIM", `Unknown claim id ${id}`, childPath);
          }
        }
      }
      if (key === "evidence_ids") {
        for (const id of Array.isArray(child) ? child : []) {
          if (typeof id === "string" && !evidence.has(id)) {
            issue(issues, "UNKNOWN_EVIDENCE", `Unknown evidence id ${id}`, childPath);
          }
        }
      }
      checkReferences(child, childPath);
    }
  }
  checkReferences(report);

  for (const claim of claims.values()) {
    for (const evidenceId of claim.evidence_ids ?? []) {
      const item = evidence.get(evidenceId);
      if (item && !item.supports_claim_ids.includes(claim.id)) {
        issue(
          issues,
          "ASYMMETRIC_REFERENCE",
          `Claim ${claim.id} references ${evidenceId}, but evidence does not reference the claim`
        );
      }
    }
    if (claim.claim_type === "external_fact") {
      if (report.evaluation_mode === "quick") {
        issue(
          issues,
          "QUICK_EXTERNAL_FACT",
          `Quick-mode claim ${claim.id} cannot present an externally variable fact as verified`
        );
      }
      if (claim.evidence_ids.length === 0) {
        issue(issues, "UNSUPPORTED_EXTERNAL_FACT", `External fact ${claim.id} has no evidence`);
      }
      for (const evidenceId of claim.evidence_ids) {
        const item = evidence.get(evidenceId);
        if (item && item.evidence_type !== "E") {
          issue(
            issues,
            "WRONG_EVIDENCE_TYPE",
            `External fact ${claim.id} uses non-external evidence ${evidenceId}`
          );
        }
      }
    }
    if (claim.claim_type === "calculation") {
      for (const evidenceId of claim.evidence_ids) {
        const item = evidence.get(evidenceId);
        if (item && item.evidence_type !== "C") {
          issue(
            issues,
            "WRONG_EVIDENCE_TYPE",
            `Calculation ${claim.id} uses non-calculation evidence ${evidenceId}`
          );
        }
      }
    }
  }

  for (const item of evidence.values()) {
    for (const claimId of item.supports_claim_ids) {
      const claim = claims.get(claimId);
      if (claim && !claim.evidence_ids.includes(item.id)) {
        issue(
          issues,
          "ASYMMETRIC_REFERENCE",
          `Evidence ${item.id} references ${claimId}, but claim does not reference the evidence`
        );
      }
    }
    if (item.evidence_type === "E") {
      if (!item.url || !item.accessed_at || item.source_tier === null) {
        issue(
          issues,
          "INCOMPLETE_EXTERNAL_EVIDENCE",
          `External evidence ${item.id} requires URL, access date and source tier`
        );
      }
      if (
        item.url &&
        options.allowedCitationUrls &&
        !options.allowedCitationUrls.has(normalizeUrl(item.url))
      ) {
        issue(
          issues,
          "UNOBSERVED_CITATION",
          `External evidence ${item.id} was not returned by the research step`,
          "$.evidence",
          "P1"
        );
      }
    }
  }

  const dimensions = report.dimension_assessments
    .map((item) => item.dimension_id)
    .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  const expectedDimensions = Array.from({ length: 12 }, (_, index) => `D${index + 1}`);
  if (JSON.stringify(dimensions) !== JSON.stringify(expectedDimensions)) {
    issue(
      issues,
      "DIMENSION_SET",
      `Dimensions must contain D1-D12 exactly once; received ${dimensions.join(", ")}`
    );
  }

  const scenarioNames = report.scenarios.map((item) => item.name);
  if (scenarioNames.length > 0) {
    const actual = [...new Set(scenarioNames)].sort();
    const expected = ["base", "bear", "bull"];
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      issue(
        issues,
        "SCENARIO_SET",
        `Scenarios must contain bear, base and bull together; received ${scenarioNames.join(", ")}`
      );
    }
  }

  const active = ["pursue", "validate", "reframe"].includes(report.verdict.label);
  if (active && report.disposition_plan.mode !== "active_validation") {
    issue(
      issues,
      "DISPOSITION_MISMATCH",
      `${report.verdict.label} requires active_validation disposition`
    );
  }
  if (active && report.experiments.length === 0) {
    issue(
      issues,
      "MISSING_EXPERIMENT",
      `${report.verdict.label} requires at least one active experiment`
    );
  }
  if (report.verdict.label === "park") {
    if (report.disposition_plan.mode !== "parked_watch") {
      issue(issues, "DISPOSITION_MISMATCH", "park requires parked_watch disposition");
    }
    if (report.experiments.length > 0) {
      issue(issues, "PROHIBITED_EXPERIMENT", "park must not prescribe active experiments");
    }
    if (report.disposition_plan.reactivation_triggers.length === 0) {
      issue(issues, "MISSING_REACTIVATION", "park requires a reactivation trigger");
    }
  }
  if (report.verdict.label === "stop") {
    if (report.disposition_plan.mode !== "stop_and_close") {
      issue(issues, "DISPOSITION_MISMATCH", "stop requires stop_and_close disposition");
    }
    if (report.experiments.length > 0) {
      issue(issues, "PROHIBITED_EXPERIMENT", "stop must not prescribe experiments");
    }
    if (report.disposition_plan.closure_actions.length === 0) {
      issue(issues, "MISSING_CLOSURE", "stop requires at least one closure action");
    }
  }
  if (report.verdict.does_not_mean.length === 0) {
    issue(issues, "VERDICT_BOUNDARY", "Verdict must say what it does not mean");
  }

  for (const risk of report.risks) {
    if (risk.is_fatal && risk.fatal_scope === "not_fatal") {
      issue(issues, "FATAL_SCOPE", `Fatal risk ${risk.id} has not_fatal scope`);
    }
    if (!risk.is_fatal && risk.fatal_scope !== "not_fatal") {
      issue(
        issues,
        "FATAL_SCOPE",
        `Non-fatal risk ${risk.id} has fatal scope ${risk.fatal_scope}`
      );
    }
  }

  if (report.validation.human_review_status === "expert_reviewed") {
    issue(
      issues,
      "FALSE_HUMAN_REVIEW",
      "Model-generated reports cannot mark themselves expert reviewed"
    );
  }

  return { valid: issues.length === 0, issues };
}

export function normalizeUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_")) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return value;
  }
}

export function validationMessages(result: ValidationResult): string[] {
  return result.issues.map(
    (item) => `[${item.severity}] ${item.code} at ${item.path}: ${item.message}`
  );
}
