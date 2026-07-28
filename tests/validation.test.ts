import { describe, expect, it } from "vitest";
import { getOpenAiReportSchema } from "../src/openai-schema.js";
import {
  validateEvaluationRequest,
  validateFounderProfile,
  validatePortfolioRequest,
  validateReport
} from "../src/validation.js";
import { fixtureReport } from "./helpers.js";

describe("canonical report validation", () => {
  it.each([
    "001_idea_evaluator_agent",
    "002_niche_agency_feedback_saas",
    "003_everything_local_helper_marketplace",
    "012_agency_saas_low_founder_fit",
    "018_nonconsensual_data_sale"
  ])("accepts the %s target report", (name) => {
    const report = fixtureReport(name);
    const allowedCitationUrls = new Set(
      report.evidence
        .filter((item) => item.evidence_type === "E" && item.url)
        .map((item) => item.url as string)
    );
    expect(validateReport(report, { allowedCitationUrls })).toEqual({
      valid: true,
      issues: []
    });
  });

  it("rejects a stopped idea that still prescribes experiments", () => {
    const report = fixtureReport("002_niche_agency_feedback_saas");
    report.verdict.label = "stop";
    report.disposition_plan.mode = "stop_and_close";
    report.disposition_plan.closure_actions = ["Close the current plan"];
    const result = validateReport(report);
    expect(result.valid).toBe(false);
    expect(result.issues.some((item) => item.code === "PROHIBITED_EXPERIMENT")).toBe(true);
  });

  it("rejects quick-mode external facts", () => {
    const report = fixtureReport("002_niche_agency_feedback_saas");
    report.claims[0]!.claim_type = "external_fact";
    const result = validateReport(report);
    expect(result.issues.some((item) => item.code === "QUICK_EXTERNAL_FACT")).toBe(true);
  });
});

describe("public input validation", () => {
  it("rejects malformed evaluation requests before normalization", () => {
    const result = validateEvaluationRequest({
      schemaVersion: "evaluation_request.v1",
      idea: "     ",
      unexpected: true
    });
    expect(result.valid).toBe(false);
    expect(result.issues.map((item) => item.code)).toContain("INPUT_SCHEMA_INVALID");
    expect(result.issues.map((item) => item.code)).toContain("INPUT_IDEA");
  });

  it("validates founder profiles and portfolio requests against public schemas", () => {
    expect(
      validateFounderProfile({
        schemaVersion: "founder_profile.v1",
        profileId: "profile_test",
        version: 0
      }).valid
    ).toBe(false);

    expect(
      validatePortfolioRequest({
        schemaVersion: "portfolio_request.v1",
        reports: [fixtureReport("002_niche_agency_feedback_saas")],
        language: "en"
      })
    ).toEqual({ valid: true, issues: [] });
  });
});

describe("OpenAI generation schema", () => {
  it("removes unsupported conditional keywords and requires every object property", () => {
    const schema = getOpenAiReportSchema();
    const encoded = JSON.stringify(schema);
    expect(encoded).not.toContain('"allOf"');
    expect(encoded).not.toContain('"if"');
    expect(encoded).not.toContain('"then"');
    expect(encoded).not.toContain('"else"');
    expect(encoded).toContain('"$defs"');

    const visit = (value: unknown): void => {
      if (Array.isArray(value)) return value.forEach(visit);
      if (!value || typeof value !== "object") return;
      const object = value as Record<string, unknown>;
      if (object.type === "object" && object.properties) {
        expect(new Set(object.required as string[])).toEqual(
          new Set(Object.keys(object.properties as Record<string, unknown>))
        );
        expect(object.additionalProperties).toBe(false);
      }
      Object.values(object).forEach(visit);
    };
    visit(schema);
  });
});
