#!/usr/bin/env node

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, extname, resolve } from "node:path";
import { Command, Option } from "commander";
import { OpenAiAdapter } from "./adapters/openai.js";
import { SqliteStorage } from "./adapters/sqlite.js";
import { AgentError, toAgentError } from "./errors.js";
import { newId } from "./ids.js";
import { analyzePortfolio } from "./portfolio.js";
import type {
  EvaluationOutcome,
  EvaluationRequest,
  FounderProfile,
  IndustryPackId,
  PortfolioRequest,
  ResourceBudget
} from "./types.js";
import { validateFounderProfile, validationMessages } from "./validation.js";
import { FounderDecisionAgent } from "./workflow.js";
import { VERSION } from "./version.js";

const program = new Command();
program
  .name("founder-decision")
  .description("Evidence-calibrated startup idea decision support")
  .version(VERSION);

const defaultDb = resolve(homedir(), ".founder-decision", "data.sqlite");

program
  .command("evaluate")
  .description("Evaluate one idea")
  .argument("[idea]", "Natural-language idea")
  .option("-f, --file <path>", "Read the idea from a UTF-8 text file")
  .addOption(new Option("-m, --mode <mode>").choices(["quick", "deep"]).default("quick"))
  .addOption(new Option("-l, --language <language>").choices(["zh-CN", "en"]).default("zh-CN"))
  .option("--objective <text...>", "User objective; can be repeated")
  .option("--answers <path>", "JSON object containing clarification answers")
  .option("--profile <path>", "Founder profile JSON file")
  .option("--industry <id...>", "Industry pack: b2b_saas or ai_native")
  .option("--jurisdiction <value>", "Applicable jurisdiction", "unknown")
  .option("--db <path>", "SQLite history database", defaultDb)
  .option("--no-persist", "Do not write this run to local history")
  .addOption(new Option("--format <format>").choices(["markdown", "json", "both"]).default("markdown"))
  .option("-o, --output <path>", "Output file or directory")
  .option("--max-model-calls <number>", "Override model-call budget", integer)
  .option("--max-search-calls <number>", "Override search-call budget", integer)
  .option("--max-minutes <number>", "Override wall-time budget in minutes", number)
  .option("--verbose", "Write workflow events to stderr")
  .action(async (ideaArgument: string | undefined, options) => {
    const idea = options.file
      ? await readFile(resolve(options.file), "utf8")
      : ideaArgument;
    if (!idea) throw new AgentError("INVALID_INPUT", "Provide an idea or --file");

    const profile = options.profile
      ? (JSON.parse(await readFile(resolve(options.profile), "utf8")) as FounderProfile)
      : undefined;
    const answers = options.answers
      ? (JSON.parse(await readFile(resolve(options.answers), "utf8")) as Record<string, string>)
      : undefined;
    const budget: Partial<ResourceBudget> = {};
    if (options.maxModelCalls !== undefined) budget.maxModelCalls = options.maxModelCalls;
    if (options.maxSearchCalls !== undefined) budget.maxSearchCalls = options.maxSearchCalls;
    if (options.maxMinutes !== undefined) budget.maxWallTimeMs = options.maxMinutes * 60_000;

    const storage = options.persist ? new SqliteStorage(options.db) : undefined;
    try {
      const agent = new FounderDecisionAgent({
        model: new OpenAiAdapter(),
        ...(storage ? { storage } : {}),
        ...(options.verbose
          ? {
              onEvent: (event) => {
                process.stderr.write(`${JSON.stringify(event)}\n`);
              }
            }
          : {})
      });
      const request: EvaluationRequest = {
        schemaVersion: "evaluation_request.v1",
        idea,
        mode: options.mode,
        language: options.language,
        objectives: options.objective ?? [],
        industryPacks: normalizeIndustries(options.industry),
        jurisdiction: options.jurisdiction,
        persist: options.persist,
        ...(profile ? { profile } : {}),
        ...(answers ? { answers } : {}),
        ...(Object.keys(budget).length > 0 ? { budget } : {}),
        ...(process.env.FOUNDER_DECISION_SAFETY_IDENTIFIER
          ? { safetyIdentifier: process.env.FOUNDER_DECISION_SAFETY_IDENTIFIER }
          : {})
      };
      const outcome = await agent.evaluate(request);
      await outputEvaluation(outcome, options.format, options.output);
    } finally {
      await storage?.close();
    }
  });

const profile = program.command("profile").description("Manage local founder profiles");
profile
  .command("save")
  .argument("<file>", "Founder profile JSON")
  .option("--db <path>", "SQLite history database", defaultDb)
  .action(async (file, options) => {
    const storage = new SqliteStorage(options.db);
    try {
      const parsed = JSON.parse(await readFile(resolve(file), "utf8")) as FounderProfile;
      const validation = validateFounderProfile(parsed);
      if (!validation.valid) {
        throw new AgentError("INVALID_INPUT", validationMessages(validation).join("\n"), {
          details: { issues: validation.issues }
        });
      }
      await storage.saveProfile(parsed);
      process.stdout.write(`${parsed.profileId}\n`);
    } finally {
      await storage.close();
    }
  });
profile
  .command("show")
  .argument("<profile-id>")
  .option("--db <path>", "SQLite history database", defaultDb)
  .action(async (profileId, options) => {
    const storage = new SqliteStorage(options.db);
    try {
      const result = await storage.getProfile(profileId);
      if (!result) throw new AgentError("NOT_FOUND", `Profile ${profileId} not found`);
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } finally {
      await storage.close();
    }
  });
profile
  .command("delete")
  .argument("<profile-id>")
  .option("--db <path>", "SQLite history database", defaultDb)
  .option("-y, --yes", "Confirm permanent local deletion")
  .action(async (profileId, options) => {
    if (!options.yes) {
      throw new AgentError("INVALID_INPUT", "Profile deletion requires --yes");
    }
    const storage = new SqliteStorage(options.db);
    try {
      process.stdout.write(`${await storage.deleteProfile(profileId)}\n`);
    } finally {
      await storage.close();
    }
  });

const history = program.command("history").description("Inspect, export or delete local history");
history
  .command("list")
  .option("--db <path>", "SQLite history database", defaultDb)
  .action(async (options) => {
    const storage = new SqliteStorage(options.db);
    try {
      process.stdout.write(`${JSON.stringify(await storage.listEvaluations(), null, 2)}\n`);
    } finally {
      await storage.close();
    }
  });
history
  .command("show")
  .argument("<report-id>")
  .option("--db <path>", "SQLite history database", defaultDb)
  .action(async (reportId, options) => {
    const storage = new SqliteStorage(options.db);
    try {
      const result = await storage.getEvaluation(reportId);
      if (!result) throw new AgentError("NOT_FOUND", `Report ${reportId} not found`);
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } finally {
      await storage.close();
    }
  });
history
  .command("delete")
  .argument("<report-id>")
  .option("--db <path>", "SQLite history database", defaultDb)
  .option("-y, --yes", "Confirm permanent local deletion")
  .action(async (reportId, options) => {
    if (!options.yes) {
      throw new AgentError("INVALID_INPUT", "History deletion requires --yes");
    }
    const storage = new SqliteStorage(options.db);
    try {
      process.stdout.write(`${await storage.deleteEvaluation(reportId)}\n`);
    } finally {
      await storage.close();
    }
  });
history
  .command("export")
  .option("--db <path>", "SQLite history database", defaultDb)
  .option("-o, --output <path>", "Export JSON path", "founder-decision-export.json")
  .action(async (options) => {
    const storage = new SqliteStorage(options.db);
    try {
      await writeFile(resolve(options.output), JSON.stringify(await storage.exportAll(), null, 2));
      process.stdout.write(`${resolve(options.output)}\n`);
    } finally {
      await storage.close();
    }
  });

program
  .command("portfolio")
  .description("Analyze two or more evaluation-report JSON files")
  .argument("<reports...>")
  .option("--profile <path>", "Founder profile JSON")
  .addOption(new Option("-l, --language <language>").choices(["zh-CN", "en"]).default("zh-CN"))
  .option("-o, --output <path>", "Output JSON path")
  .action(async (reports: string[], options) => {
    const parsedReports = await Promise.all(
      reports.map(async (path) => JSON.parse(await readFile(resolve(path), "utf8")))
    );
    const founderProfile = options.profile
      ? (JSON.parse(await readFile(resolve(options.profile), "utf8")) as FounderProfile)
      : undefined;
    const request: PortfolioRequest = {
      schemaVersion: "portfolio_request.v1",
      reports: parsedReports,
      language: options.language,
      ...(founderProfile ? { profile: founderProfile } : {})
    };
    const result = analyzePortfolio(request);
    const text = `${JSON.stringify(result, null, 2)}\n`;
    if (options.output) await writeFile(resolve(options.output), text);
    else process.stdout.write(text);
  });

program
  .command("init-profile")
  .description("Write a minimal editable founder-profile template")
  .argument("[path]", "Output path", "founder-profile.json")
  .action(async (path) => {
    const value: FounderProfile = {
      schemaVersion: "founder_profile.v1",
      profileId: newId("profile"),
      version: 1,
      geographies: [],
      currentRoles: [],
      industries: [],
      skills: [],
      reachableUsers: [],
      channels: [],
      objectives: []
    };
    await writeFile(resolve(path), `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
    process.stdout.write(`${resolve(path)}\n`);
  });

program.parseAsync().catch((error: unknown) => {
  const agentError = toAgentError(error);
  process.stderr.write(
    `${JSON.stringify(
      {
        error: {
          code: agentError.code,
          message: agentError.message,
          retryable: agentError.retryable,
          details: agentError.details
        }
      },
      null,
      2
    )}\n`
  );
  process.exitCode = 1;
});

function integer(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) throw new Error(`${value} is not an integer`);
  return parsed;
}

function number(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${value} is not a number`);
  return parsed;
}

function normalizeIndustries(values: string[] | undefined): IndustryPackId[] {
  const ids = values ?? [];
  for (const id of ids) {
    if (!["b2b_saas", "ai_native"].includes(id)) {
      throw new AgentError("INVALID_INPUT", `Unknown industry pack ${id}`);
    }
  }
  return [...new Set(ids)] as IndustryPackId[];
}

async function outputEvaluation(
  outcome: EvaluationOutcome,
  format: string,
  target?: string
): Promise<void> {
  if (!target) {
    if (format === "json") process.stdout.write(`${JSON.stringify(outcome, null, 2)}\n`);
    else if (format === "both") {
      process.stdout.write(`${outcome.markdown}\n${JSON.stringify(outcome, null, 2)}\n`);
    } else process.stdout.write(outcome.markdown);
    return;
  }
  const absolute = resolve(target);
  if (format === "both") {
    await mkdir(absolute, { recursive: true });
    await Promise.all([
      writeFile(resolve(absolute, `${outcome.report.report_id}.md`), outcome.markdown),
      writeFile(
        resolve(absolute, `${outcome.report.report_id}.json`),
        `${JSON.stringify(outcome, null, 2)}\n`
      )
    ]);
    process.stdout.write(`${absolute}\n`);
    return;
  }
  const expectedExtension = format === "json" ? ".json" : ".md";
  const path =
    extname(absolute) === expectedExtension
      ? absolute
      : resolve(dirname(absolute), `${basename(absolute, extname(absolute))}${expectedExtension}`);
  await writeFile(
    path,
    format === "json" ? `${JSON.stringify(outcome, null, 2)}\n` : outcome.markdown
  );
  process.stdout.write(`${path}\n`);
}
