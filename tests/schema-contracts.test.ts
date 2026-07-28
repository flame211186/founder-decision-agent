import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import type { ValidateFunction } from "ajv";
import { describe, expect, it } from "vitest";
import { analyzePortfolio } from "../src/portfolio.js";
import { fixtureReport } from "./helpers.js";

const require = createRequire(import.meta.url);
const Ajv = require("ajv") as typeof import("ajv")["default"];
const addFormats = require("ajv-formats") as typeof import("ajv-formats")["default"];

const schemaNames = [
  "evaluation-report.v1.schema.json",
  "founder-profile.v1.schema.json",
  "evaluation-request.v1.schema.json",
  "portfolio-request.v1.schema.json",
  "run-manifest.v1.schema.json",
  "portfolio-report.v1.schema.json",
  "live-quality-eval.v1.schema.json",
  "live-quality-review.v1.schema.json",
  "real-case-consent.v1.schema.json",
  "stable-release-evidence.v1.schema.json"
];

function loadSchema(name: string): Record<string, unknown> {
  const path = fileURLToPath(new URL(`../schemas/${name}`, import.meta.url));
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

function compileContracts(): Map<string, ValidateFunction> {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const schemas = schemaNames.map(loadSchema);
  for (const schema of schemas) ajv.addSchema(schema);
  return new Map(
    schemas.map((schema) => {
      const id = String(schema.$id);
      const validator = ajv.getSchema(id);
      if (!validator) throw new Error(`Missing compiled schema ${id}`);
      return [id, validator];
    })
  );
}

describe("public JSON Schema contracts", () => {
  it("compile together with resolvable cross-schema references", () => {
    expect(compileContracts().size).toBe(schemaNames.length);
  });

  it("validate an evaluation request containing a founder profile", () => {
    const validators = compileContracts();
    const validate = validators.get(
      "urn:founder-decision-agent:schema:evaluation-request:v1"
    );
    expect(
      validate?.({
        schemaVersion: "evaluation_request.v1",
        idea: "A focused B2B workflow product",
        profile: {
          schemaVersion: "founder_profile.v1",
          profileId: "profile_test",
          version: 1,
          currentRoles: ["developer"]
        }
      })
    ).toBe(true);
    expect(validate?.errors).toBeNull();
  });

  it("validates deterministic portfolio output", () => {
    const validators = compileContracts();
    const validate = validators.get(
      "urn:founder-decision-agent:schema:portfolio-report:v1"
    );
    const report = analyzePortfolio(
      {
        schemaVersion: "portfolio_request.v1",
        reports: [
          fixtureReport("001_idea_evaluator_agent"),
          fixtureReport("002_niche_agency_feedback_saas")
        ],
        language: "en"
      },
      () => new Date("2026-07-28T10:00:00.000Z")
    );
    expect(validate?.(report)).toBe(true);
    expect(validate?.errors).toBeNull();
  });
});
