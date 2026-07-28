import { describe, expect, it } from "vitest";
import { analyzePortfolio } from "../src/portfolio.js";
import { fixtureReport } from "./helpers.js";

describe("portfolio analysis", () => {
  it("does not infer a pattern from one idea", () => {
    const result = analyzePortfolio({
      schemaVersion: "portfolio_request.v1",
      reports: [fixtureReport("002_niche_agency_feedback_saas")],
      language: "en"
    });
    expect(result.insights).toHaveLength(1);
    expect(result.insights[0]?.kind).toBe("pending");
  });

  it("requires at least two idea IDs for every non-pending insight", () => {
    const result = analyzePortfolio({
      schemaVersion: "portfolio_request.v1",
      reports: [
        fixtureReport("002_niche_agency_feedback_saas"),
        fixtureReport("012_agency_saas_low_founder_fit"),
        fixtureReport("003_everything_local_helper_marketplace")
      ],
      language: "en"
    });
    for (const insight of result.insights.filter((item) => item.kind !== "pending")) {
      expect(new Set(insight.evidenceIdeaIds).size).toBeGreaterThanOrEqual(2);
    }
    expect(result.priorities).toHaveLength(3);
    expect(result.warnings.join(" ")).toContain("personality");
  });
});
