#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const reportPath = process.argv[2];

if (!reportPath) {
  console.error("Usage: node scripts/validate-report-semantics.mjs <report.json>");
  process.exit(2);
}

const absoluteReportPath = path.resolve(reportPath);
const report = JSON.parse(fs.readFileSync(absoluteReportPath, "utf8"));
const errors = [];

function indexById(items, label) {
  const index = new Map();
  for (const item of items ?? []) {
    if (index.has(item.id)) {
      errors.push(`Duplicate ${label} id: ${item.id}`);
    }
    index.set(item.id, item);
  }
  return index;
}

const claims = indexById(report.claims, "claim");
const evidence = indexById(report.evidence, "evidence");

function checkReferences(value, location = "$") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => checkReferences(item, `${location}[${index}]`));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    const childLocation = `${location}.${key}`;

    if (
      key === "claim_ids" ||
      key === "rationale_claim_ids" ||
      key === "supports_claim_ids"
    ) {
      for (const claimId of child) {
        if (!claims.has(claimId)) {
          errors.push(`Unknown claim id ${claimId} at ${childLocation}`);
        }
      }
    }

    if (key === "evidence_ids") {
      for (const evidenceId of child) {
        if (!evidence.has(evidenceId)) {
          errors.push(`Unknown evidence id ${evidenceId} at ${childLocation}`);
        }
      }
    }

    if (
      Object.hasOwn(value, "min") &&
      Object.hasOwn(value, "max") &&
      typeof value.min === "number" &&
      typeof value.max === "number" &&
      value.min > value.max
    ) {
      errors.push(`Range min exceeds max at ${location}`);
    }

    checkReferences(child, childLocation);
  }
}

checkReferences(report);

for (const claim of claims.values()) {
  for (const evidenceId of claim.evidence_ids ?? []) {
    const item = evidence.get(evidenceId);
    if (item && !(item.supports_claim_ids ?? []).includes(claim.id)) {
      errors.push(
        `Claim ${claim.id} references ${evidenceId}, but the evidence does not reference the claim`,
      );
    }
  }

  if (claim.claim_type === "external_fact") {
    if ((claim.evidence_ids ?? []).length === 0) {
      errors.push(`External fact ${claim.id} has no evidence`);
    }
    for (const evidenceId of claim.evidence_ids ?? []) {
      const item = evidence.get(evidenceId);
      if (item && item.evidence_type !== "E") {
        errors.push(
          `External fact ${claim.id} uses non-external evidence ${evidenceId}`,
        );
      }
    }
  }

  if (claim.claim_type === "calculation") {
    for (const evidenceId of claim.evidence_ids ?? []) {
      const item = evidence.get(evidenceId);
      if (item && item.evidence_type !== "C") {
        errors.push(
          `Calculation ${claim.id} uses non-calculation evidence ${evidenceId}`,
        );
      }
    }
  }
}

for (const item of evidence.values()) {
  for (const claimId of item.supports_claim_ids ?? []) {
    const claim = claims.get(claimId);
    if (claim && !(claim.evidence_ids ?? []).includes(item.id)) {
      errors.push(
        `Evidence ${item.id} references ${claimId}, but the claim does not reference the evidence`,
      );
    }
  }
}

const expectedDimensions = Array.from({ length: 12 }, (_, index) => `D${index + 1}`);
const actualDimensions = (report.dimension_assessments ?? [])
  .map((item) => item.dimension_id)
  .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));

if (JSON.stringify(actualDimensions) !== JSON.stringify(expectedDimensions)) {
  errors.push(
    `Dimensions must contain D1-D12 exactly once; received ${actualDimensions.join(", ")}`,
  );
}

const scenarioNames = (report.scenarios ?? []).map((item) => item.name);
if (scenarioNames.length > 0) {
  const expectedScenarios = ["bear", "base", "bull"];
  const actualScenarios = [...new Set(scenarioNames)].sort();
  const sortedExpectedScenarios = [...expectedScenarios].sort();
  if (JSON.stringify(actualScenarios) !== JSON.stringify(sortedExpectedScenarios)) {
    errors.push(
      `Scenarios must contain bear, base and bull together; received ${scenarioNames.join(", ")}`,
    );
  }
}

if ((report.verdict?.does_not_mean ?? []).length === 0) {
  errors.push("Verdict must state at least one thing it does not mean");
}

const verdictLabel = report.verdict?.label;
const dispositionMode = report.disposition_plan?.mode;
const experiments = report.experiments ?? [];

if (
  ["pursue", "validate", "reframe"].includes(verdictLabel) &&
  dispositionMode !== "active_validation"
) {
  errors.push(
    `Verdict ${verdictLabel} requires active_validation disposition; received ${dispositionMode}`,
  );
}

if (
  ["pursue", "validate", "reframe"].includes(verdictLabel) &&
  experiments.length === 0
) {
  errors.push(`Verdict ${verdictLabel} requires at least one active experiment`);
}

if (verdictLabel === "park") {
  if (dispositionMode !== "parked_watch") {
    errors.push(`Verdict park requires parked_watch disposition; received ${dispositionMode}`);
  }
  if (experiments.length > 0) {
    errors.push("Verdict park must not prescribe active experiments");
  }
  if ((report.disposition_plan?.reactivation_triggers ?? []).length === 0) {
    errors.push("Verdict park requires at least one reactivation trigger");
  }
}

if (verdictLabel === "stop") {
  if (dispositionMode !== "stop_and_close") {
    errors.push(`Verdict stop requires stop_and_close disposition; received ${dispositionMode}`);
  }
  if (experiments.length > 0) {
    errors.push("Verdict stop must not prescribe experiments on the stopped idea");
  }
  if ((report.disposition_plan?.closure_actions ?? []).length === 0) {
    errors.push("Verdict stop requires at least one closure action");
  }
}

for (const risk of report.risks ?? []) {
  if (risk.is_fatal && risk.fatal_scope === "not_fatal") {
    errors.push(`Fatal risk ${risk.id} has not_fatal scope`);
  }
  if (!risk.is_fatal && risk.fatal_scope !== "not_fatal") {
    errors.push(`Non-fatal risk ${risk.id} has fatal scope ${risk.fatal_scope}`);
  }
}

if (errors.length > 0) {
  console.error(`Semantic validation failed for ${absoluteReportPath}:`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      report: absoluteReportPath,
      claims: claims.size,
      evidence_items: evidence.size,
      dimensions: actualDimensions.length,
      scenarios: scenarioNames.length,
      status: "passed"
    },
    null,
    2,
  ),
);
