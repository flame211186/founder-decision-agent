import { describe, expect, it } from "vitest";
import { AgentError } from "../src/errors.js";
import { FounderDecisionAgent } from "../src/workflow.js";
import { FixtureModel, fixtureReport } from "./helpers.js";

const now = () => new Date("2026-07-28T10:00:00.000Z");

describe("explicit evaluation workflow", () => {
  it("runs quick mode in one valid model call", async () => {
    const model = new FixtureModel([
      fixtureReport("002_niche_agency_feedback_saas")
    ]);
    const agent = new FounderDecisionAgent({ model, now });
    const result = await agent.evaluate({
      schemaVersion: "evaluation_request.v1",
      idea: "A focused feedback SaaS for small agencies",
      mode: "quick",
      language: "en",
      persist: false
    });

    expect(result.report.input_snapshot.original_text).toBe(
      "A focused feedback SaaS for small agencies"
    );
    expect(result.report.generated_at).toBe("2026-07-28T10:00:00.000Z");
    expect(result.report.validation.schema_status).toBe("passed");
    expect(result.manifest.status).toBe("completed");
    expect(result.manifest.budgetUsed.modelCalls).toBe(1);
    expect(model.calls).toEqual(["synthesizer"]);
    expect(result.markdown).toContain("Founder Idea Decision Report");
  });

  it("uses the second quick-mode call as a repair", async () => {
    const invalid = fixtureReport("002_niche_agency_feedback_saas");
    invalid.verdict.label = "park";
    const valid = fixtureReport("002_niche_agency_feedback_saas");
    const model = new FixtureModel([invalid, valid]);
    const agent = new FounderDecisionAgent({ model, now });
    const result = await agent.evaluate({
      schemaVersion: "evaluation_request.v1",
      idea: "A focused feedback SaaS for small agencies",
      mode: "quick",
      persist: false
    });
    expect(model.calls).toEqual(["synthesizer", "repair"]);
    expect(result.manifest.budgetUsed.modelCalls).toBe(2);
  });

  it("returns a typed validation failure when the budget ends", async () => {
    const invalid = fixtureReport("002_niche_agency_feedback_saas");
    invalid.verdict.label = "park";
    const model = new FixtureModel([invalid, invalid]);
    const agent = new FounderDecisionAgent({ model, now });
    await expect(
      agent.evaluate({
        schemaVersion: "evaluation_request.v1",
        idea: "A focused feedback SaaS for small agencies",
        mode: "quick",
        persist: false
      })
    ).rejects.toMatchObject({
      code: "VALIDATION_FAILED"
    });
  });

  it("runs independent research, supporter, opponent, verifier and synthesis passes", async () => {
    const report = fixtureReport("001_idea_evaluator_agent");
    const citations = report.evidence
      .filter((item) => item.evidence_type === "E" && item.url)
      .map((item) => ({ url: item.url as string, title: item.title }));
    const model = new FixtureModel([report], {
      text: "Primary-source research",
      citations,
      queries: ["idea evaluation agent alternatives"],
      model: "fixture-model"
    });
    const agent = new FounderDecisionAgent({ model, now });
    const result = await agent.evaluate({
      schemaVersion: "evaluation_request.v1",
      idea: "An evidence-calibrated founder idea decision agent",
      mode: "deep",
      language: "zh-CN",
      persist: false,
      industryPacks: ["ai_native"]
    });
    expect(model.calls).toEqual([
      "researcher",
      "supporter",
      "opponent",
      "verifier",
      "synthesizer"
    ]);
    expect(result.manifest.budgetUsed.modelCalls).toBe(5);
    expect(result.manifest.budgetUsed.searchCalls).toBe(1);
    expect(result.report.validation.citation_support_status).toBe("draft_reviewed");
  });
});
