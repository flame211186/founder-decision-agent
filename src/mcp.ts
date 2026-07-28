#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { realpathSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { OpenAiAdapter } from "./adapters/openai.js";
import { SqliteStorage } from "./adapters/sqlite.js";
import { AgentError, toAgentError } from "./errors.js";
import { analyzePortfolio } from "./portfolio.js";
import type {
  EvaluationRequest,
  FounderProfile,
  IndustryPackId,
  PortfolioRequest,
  StorageAdapter
} from "./types.js";
import {
  isFounderProfile,
  validateFounderProfile,
  validationMessages
} from "./validation.js";
import { FounderDecisionAgent } from "./workflow.js";
import { VERSION } from "./version.js";

export async function createFounderDecisionMcpServer(options?: {
  agent?: FounderDecisionAgent;
  storage?: StorageAdapter;
}) {
  const defaultModel = options?.agent ? undefined : new OpenAiAdapter();
  const storage =
    options?.storage ??
    new SqliteStorage(
      process.env.FOUNDER_DECISION_DB ??
        resolve(homedir(), ".founder-decision", "mcp.sqlite")
    );
  const agent =
    options?.agent ??
    new FounderDecisionAgent({
      model: defaultModel!,
      storage
    });
  const server = new McpServer({
    name: "founder-decision-agent",
    version: VERSION
  });

  server.registerTool(
    "evaluate_idea",
    {
      description:
        "Evaluate a startup or product idea. Deep mode explicitly uses web research and costs more.",
      inputSchema: {
        idea: z.string().min(5),
        mode: z.enum(["quick", "deep"]).default("quick"),
        language: z.enum(["zh-CN", "en"]).default("zh-CN"),
        objectives: z.array(z.string()).default([]),
        profile: z.record(z.string(), z.unknown()).optional(),
        industryPacks: z.array(z.enum(["b2b_saas", "ai_native"])).max(2).default([]),
        jurisdiction: z.string().default("unknown"),
        persist: z.boolean().default(true),
        maxModelCalls: z.number().int().positive().optional(),
        maxSearchCalls: z.number().int().nonnegative().optional(),
        maxMinutes: z.number().positive().optional()
      }
    },
    async (input) => {
      const budget = {
        ...(input.maxModelCalls !== undefined ? { maxModelCalls: input.maxModelCalls } : {}),
        ...(input.maxSearchCalls !== undefined ? { maxSearchCalls: input.maxSearchCalls } : {}),
        ...(input.maxMinutes !== undefined
          ? { maxWallTimeMs: input.maxMinutes * 60_000 }
          : {})
      };
      const request: EvaluationRequest = {
        schemaVersion: "evaluation_request.v1",
        idea: input.idea,
        mode: input.mode,
        language: input.language,
        objectives: input.objectives,
        industryPacks: input.industryPacks as IndustryPackId[],
        jurisdiction: input.jurisdiction,
        persist: input.persist,
        ...(input.profile ? { profile: input.profile as unknown as FounderProfile } : {}),
        ...(Object.keys(budget).length ? { budget } : {})
      };
      const result = await agent.evaluate(request);
      return {
        content: [{ type: "text" as const, text: result.markdown }],
        structuredContent: {
          report: result.report,
          manifest: result.manifest
        }
      };
    }
  );

  server.registerTool(
    "analyze_portfolio",
    {
      description:
        "Analyze two or more evaluation report JSON documents for repeated strengths, blind spots and priorities.",
      inputSchema: {
        reportFiles: z.array(z.string()).min(2),
        language: z.enum(["zh-CN", "en"]).default("zh-CN")
      }
    },
    async (input) => {
      const reports = await Promise.all(
        input.reportFiles.map(async (path) =>
          JSON.parse(await readFile(resolve(path), "utf8"))
        )
      );
      const request: PortfolioRequest = {
        schemaVersion: "portfolio_request.v1",
        reports,
        language: input.language
      };
      const report = analyzePortfolio(request);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(report, null, 2) }],
        structuredContent: { report }
      };
    }
  );

  server.registerTool(
    "get_evaluation",
    {
      description: "Read one locally stored evaluation by report ID.",
      inputSchema: { reportId: z.string().min(1) }
    },
    async ({ reportId }) => {
      const result = await storage.getEvaluation(reportId);
      return {
        content: [
          {
            type: "text" as const,
            text: result ? result.markdown : `Report ${reportId} was not found.`
          }
        ],
        structuredContent: { found: Boolean(result), result: result ?? null }
      };
    }
  );

  server.registerTool(
    "list_evaluations",
    {
      description: "List locally stored evaluation summaries.",
      inputSchema: {}
    },
    async () => {
      const evaluations = await storage.listEvaluations();
      return {
        content: [{ type: "text" as const, text: JSON.stringify(evaluations, null, 2) }],
        structuredContent: { evaluations }
      };
    }
  );

  server.registerTool(
    "delete_evaluation",
    {
      description:
        "Delete one locally stored evaluation. The caller must obtain explicit user confirmation before invoking this tool.",
      inputSchema: {
        reportId: z.string().min(1),
        confirm: z.literal(true).describe("Explicit confirmation of permanent local deletion.")
      }
    },
    async ({ reportId }) => {
      const deleted = await storage.deleteEvaluation(reportId);
      return {
        content: [{ type: "text" as const, text: deleted ? "Deleted." : "Not found." }],
        structuredContent: { deleted }
      };
    }
  );

  server.registerTool(
    "save_founder_profile",
    {
      description:
        "Save a local founder profile. The profile contains sensitive data and must only be saved with user consent.",
      inputSchema: {
        profile: z.record(z.string(), z.unknown()),
        confirm: z.literal(true).describe("Explicit consent to persist this sensitive profile locally.")
      }
    },
    async ({ profile }) => {
      if (!isFounderProfile(profile)) {
        const validation = validateFounderProfile(profile);
        throw new AgentError("INVALID_INPUT", validationMessages(validation).join("\n"), {
          details: { issues: validation.issues }
        });
      }
      await storage.saveProfile(profile);
      return {
        content: [{ type: "text" as const, text: "Profile saved locally." }],
        structuredContent: { saved: true }
      };
    }
  );

  server.registerTool(
    "delete_founder_profile",
    {
      description:
        "Delete a local founder profile. The caller must obtain explicit user confirmation before invoking this tool.",
      inputSchema: {
        profileId: z.string().min(1),
        confirm: z.literal(true).describe("Explicit confirmation of permanent local deletion.")
      }
    },
    async ({ profileId }) => {
      const deleted = await storage.deleteProfile(profileId);
      return {
        content: [{ type: "text" as const, text: deleted ? "Deleted." : "Not found." }],
        structuredContent: { deleted }
      };
    }
  );

  return { server, storage };
}

async function main(): Promise<void> {
  const { server, storage } = await createFounderDecisionMcpServer();
  const transport = new StdioServerTransport();
  const close = async () => {
    await storage.close();
  };
  process.once("SIGINT", () => void close().finally(() => process.exit(0)));
  process.once("SIGTERM", () => void close().finally(() => process.exit(0)));
  await server.connect(transport);
}

if (isMainModule()) {
  main().catch((error: unknown) => {
    const agentError = toAgentError(error);
    process.stderr.write(`${agentError.code}: ${agentError.message}\n`);
    process.exitCode = 1;
  });
}

function isMainModule(): boolean {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}
