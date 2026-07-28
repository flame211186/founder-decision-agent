import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it } from "vitest";
import { SqliteStorage } from "../src/adapters/sqlite.js";
import { createFounderDecisionMcpServer } from "../src/mcp.js";
import { FounderDecisionAgent } from "../src/workflow.js";
import { FixtureModel, fixtureReport } from "./helpers.js";

const cleanup: Array<() => Promise<unknown>> = [];

afterEach(async () => {
  await Promise.allSettled(cleanup.splice(0).reverse().map((close) => close()));
});

async function createHarness() {
  const directory = await mkdtemp(resolve(tmpdir(), "founder-decision-mcp-"));
  const storage = new SqliteStorage(resolve(directory, "data.sqlite"));
  const agent = new FounderDecisionAgent({
    model: new FixtureModel([fixtureReport("002_niche_agency_feedback_saas")]),
    storage,
    now: () => new Date("2026-07-28T10:00:00.000Z")
  });
  const { server } = await createFounderDecisionMcpServer({ agent, storage });
  const client = new Client({
    name: "founder-decision-agent-test",
    version: "1.0.0"
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  cleanup.push(
    () => storage.close(),
    () => server.close(),
    () => client.close()
  );
  return { client, directory, storage };
}

describe("MCP protocol", () => {
  it("lists tools and evaluates through an in-memory MCP connection", async () => {
    const { client } = await createHarness();
    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
      "analyze_portfolio",
      "delete_evaluation",
      "delete_founder_profile",
      "evaluate_idea",
      "get_evaluation",
      "list_evaluations",
      "save_founder_profile"
    ]);

    const evaluation = await client.callTool({
      name: "evaluate_idea",
      arguments: {
        idea: "A focused feedback SaaS for small design agencies",
        language: "en",
        persist: true
      }
    });
    expect(evaluation.isError).not.toBe(true);
    const structured = evaluation.structuredContent as {
      report: { report_id: string; verdict: { label: string } };
      manifest: { status: string };
    };
    expect(structured.report.verdict.label).toBe("pursue");
    expect(structured.manifest.status).toBe("completed");

    const stored = await client.callTool({
      name: "list_evaluations",
      arguments: {}
    });
    expect(
      (stored.structuredContent as { evaluations: unknown[] }).evaluations
    ).toHaveLength(1);

    const denied = await client.callTool({
      name: "delete_evaluation",
      arguments: {
        reportId: structured.report.report_id,
        confirm: false
      }
    });
    expect(denied.isError).toBe(true);

    const deleted = await client.callTool({
      name: "delete_evaluation",
      arguments: {
        reportId: structured.report.report_id,
        confirm: true
      }
    });
    expect(deleted.structuredContent).toEqual({ deleted: true });
  });

  it("validates sensitive profiles and requires explicit consent", async () => {
    const { client, storage } = await createHarness();
    const profile = {
      schemaVersion: "founder_profile.v1",
      profileId: "profile_mcp",
      version: 1,
      currentRoles: ["developer"]
    };

    const noConsent = await client.callTool({
      name: "save_founder_profile",
      arguments: { profile, confirm: false }
    });
    expect(noConsent.isError).toBe(true);
    expect(await storage.getProfile(profile.profileId)).toBeNull();

    const invalid = await client.callTool({
      name: "save_founder_profile",
      arguments: {
        profile: { ...profile, version: 0 },
        confirm: true
      }
    });
    expect(invalid.isError).toBe(true);
    expect(await storage.getProfile(profile.profileId)).toBeNull();

    const saved = await client.callTool({
      name: "save_founder_profile",
      arguments: { profile, confirm: true }
    });
    expect(saved.structuredContent).toEqual({ saved: true });
    expect(await storage.getProfile(profile.profileId)).toEqual(profile);
  });

  it("analyzes report files through the MCP portfolio tool", async () => {
    const { client, directory } = await createHarness();
    const first = resolve(directory, "first.json");
    const second = resolve(directory, "second.json");
    await Promise.all([
      writeFile(first, JSON.stringify(fixtureReport("001_idea_evaluator_agent"))),
      writeFile(second, JSON.stringify(fixtureReport("002_niche_agency_feedback_saas")))
    ]);

    const result = await client.callTool({
      name: "analyze_portfolio",
      arguments: {
        reportFiles: [first, second],
        language: "en"
      }
    });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({
      report: {
        schemaVersion: "portfolio_report.v1",
        ideaIds: expect.arrayContaining([
          "case_001_idea_evaluator_agent",
          "case_002_niche_agency_feedback_saas"
        ])
      }
    });
  });
});
