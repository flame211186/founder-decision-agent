#!/usr/bin/env node

import { existsSync } from "node:fs";
import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const mode = parseMode(process.argv.slice(2));
const workingDirectoryEnvPath = resolve(process.cwd(), ".env");
const projectEnvPath = resolve(projectRoot, ".env");

if (existsSync(workingDirectoryEnvPath)) {
  loadEnvFile(workingDirectoryEnvPath);
} else if (
  projectEnvPath !== workingDirectoryEnvPath &&
  existsSync(projectEnvPath)
) {
  loadEnvFile(projectEnvPath);
}

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  fail("MISSING_API_KEY", "Set OPENAI_API_KEY in the environment or in the ignored .env file.");
}

let sdk;
try {
  sdk = await import("../dist/index.js");
} catch (error) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "ERR_MODULE_NOT_FOUND"
  ) {
    fail("BUILD_REQUIRED", "Build the package with npm run build before running live smoke.");
  }
  throw error;
}
const {
  FounderDecisionAgent,
  OpenAiAdapter,
  validateReport,
  validationMessages
} = sdk;

const syntheticIdea = [
  "A solo developer is considering a B2B SaaS for 10–30 person design agencies.",
  "It would turn client feedback from email and chat into prioritized, auditable tasks.",
  "The founder has interviewed three agency owners but has no paying users.",
  "They can spend 10 hours per week and US$1,000, and want a sustainable small business",
  "rather than a venture-scale company."
].join(" ");

try {
  const agent = new FounderDecisionAgent({
    model: new OpenAiAdapter()
  });
  const outcome = await agent.evaluate({
    schemaVersion: "evaluation_request.v1",
    idea: syntheticIdea,
    mode,
    language: "en",
    objectives: ["sustainable_business"],
    industryPacks: ["b2b_saas"],
    jurisdiction: "unknown",
    safetyIdentifier: "founder-decision-agent-live-smoke-v1",
    persist: false
  });

  assertLiveOutcome(outcome, mode, syntheticIdea, apiKey, validateReport, validationMessages);

  const artifactDirectory = await mkdtemp(join(tmpdir(), "founder-decision-live-smoke-"));
  await chmod(artifactDirectory, 0o700);
  const artifactPath = join(artifactDirectory, `${mode}-outcome.json`);
  await writeFile(artifactPath, `${JSON.stringify(outcome, null, 2)}\n`, {
    flag: "wx",
    mode: 0o600
  });

  const totalTokens = outcome.manifest.calls.reduce(
    (sum, call) => sum + (call.usage?.totalTokens ?? 0),
    0
  );
  process.stdout.write(
    `${JSON.stringify(
      {
        status: "passed",
        mode,
        reportId: outcome.report.report_id,
        verdict: outcome.report.verdict.label,
        modelCalls: outcome.manifest.budgetUsed.modelCalls,
        searchCalls: outcome.manifest.budgetUsed.searchCalls,
        models: [...new Set(outcome.manifest.calls.map((call) => call.model))],
        totalTokens,
        canonicalValidation: "passed",
        humanReview: outcome.report.validation.human_review_status,
        artifact: artifactPath
      },
      null,
      2
    )}\n`
  );
} catch (error) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "LIVE_SMOKE_FAILED";
  const message = error instanceof Error ? error.message : "Unknown live smoke failure";
  fail(code, message);
}

function parseMode(arguments_) {
  if (arguments_.includes("--help") || arguments_.includes("-h")) {
    process.stdout.write("Usage: npm run eval:live -- --mode quick|deep\n");
    process.exit(0);
  }
  if (arguments_.length === 0) return "quick";
  if (arguments_.length === 2 && arguments_[0] === "--mode") {
    if (arguments_[1] === "quick" || arguments_[1] === "deep") return arguments_[1];
  }
  fail("INVALID_INPUT", "Usage: npm run eval:live -- --mode quick|deep");
}

function assertLiveOutcome(
  outcome,
  expectedMode,
  expectedIdea,
  key,
  validate,
  formatValidationMessages
) {
  const issues = [];
  if (outcome.manifest.status !== "completed") {
    issues.push(`manifest status is ${outcome.manifest.status}`);
  }
  if (!outcome.manifest.validation.valid) {
    issues.push("workflow manifest validation did not pass");
  }
  if (outcome.report.evaluation_mode !== expectedMode) {
    issues.push(`report mode is ${outcome.report.evaluation_mode}`);
  }
  if (outcome.report.input_snapshot.original_text !== expectedIdea) {
    issues.push("input snapshot does not match the synthetic idea");
  }
  if (outcome.report.validation.human_review_status !== "not_reviewed") {
    issues.push("model output incorrectly claims human review");
  }
  if (outcome.manifest.calls.length !== outcome.manifest.budgetUsed.modelCalls) {
    issues.push("manifest call list does not match the model-call counter");
  }
  if (outcome.manifest.budgetUsed.modelCalls > outcome.manifest.budget.maxModelCalls) {
    issues.push("model-call cap was exceeded");
  }
  if (outcome.manifest.budgetUsed.searchCalls > outcome.manifest.budget.maxSearchCalls) {
    issues.push("search-call cap was exceeded");
  }
  if (expectedMode === "quick") {
    if (outcome.manifest.budgetUsed.searchCalls !== 0) {
      issues.push("quick mode performed a search");
    }
    if (outcome.report.information_quality.research_status !== "not_performed") {
      issues.push("quick mode incorrectly reports external research");
    }
    if (outcome.report.claims.some((claim) => claim.claim_type === "external_fact")) {
      issues.push("quick mode emitted an external_fact claim");
    }
  }

  const independentValidation = validate(outcome.report);
  if (!independentValidation.valid) {
    issues.push(...formatValidationMessages(independentValidation));
  }

  const serialized = JSON.stringify(outcome);
  if (key.length >= 8 && serialized.includes(key)) {
    issues.push("API key appeared in the evaluation outcome");
  }
  if (serialized.includes("founder-decision-agent-live-smoke-v1")) {
    issues.push("raw safety identifier appeared in the evaluation outcome");
  }
  if (issues.length > 0) {
    throw new Error(`Live outcome assertions failed:\n- ${issues.join("\n- ")}`);
  }
}

function fail(code, message) {
  process.stderr.write(`${JSON.stringify({ error: { code, message } }, null, 2)}\n`);
  process.exit(1);
}
