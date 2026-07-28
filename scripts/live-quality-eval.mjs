#!/usr/bin/env node

import { existsSync, realpathSync } from "node:fs";
import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const summarySchemaPath = resolve(
  projectRoot,
  "schemas/live-quality-eval.v1.schema.json"
);
const verdictOrder = ["pursue", "validate", "reframe", "park", "stop"];
const stageOrder = [
  "S0_idea",
  "S1_problem_discovery",
  "S2_solution_validation",
  "S3_early_traction",
  "S4_repeatable_growth"
];
const dimensions = Array.from({ length: 12 }, (_, index) => `D${index + 1}`);
const defaultBudgets = {
  quick: {
    maxModelCalls: 2,
    maxSearchCalls: 0,
    maxWallTimeMs: 2 * 60 * 1000
  },
  deep: {
    maxModelCalls: 8,
    maxSearchCalls: 10,
    maxWallTimeMs: 15 * 60 * 1000
  }
};

const baselineIdea = [
  "A solo developer is considering a B2B SaaS for 10–30 person design agencies.",
  "It would turn client feedback from email and chat into prioritized, auditable tasks.",
  "The founder has interviewed three agency owners but has no paying users.",
  "The goal is a sustainable small business rather than a venture-scale company."
].join(" ");

const strongerTractionIdea = [
  "A solo developer is considering a B2B SaaS for 10–30 person design agencies.",
  "It turns client feedback from email and chat into prioritized, auditable tasks.",
  "Twelve agencies have paid the standard monthly price for four months, ten have renewed,",
  "and product logs show weekly use by each renewed agency.",
  "The goal is a sustainable small business rather than a venture-scale company."
].join(" ");

const baselineProfile = {
  schemaVersion: "founder_profile.v1",
  profileId: "profile_quality_eval_v1",
  version: 1,
  currentRoles: ["solo developer"],
  skills: ["TypeScript product development"],
  reachableUsers: ["small design agency owners"],
  weeklyHours: 10,
  availableCapital: {
    amount: 1000,
    currency: "USD"
  },
  objectives: ["sustainable_business"],
  riskTolerance: "medium"
};

export function parseQualityEvalArgs(arguments_, environment = {}) {
  const parsed = {
    mode: "quick",
    repeats: parseOptionalInteger(
      environment.FOUNDER_DECISION_QUALITY_REPEATS,
      3,
      "FOUNDER_DECISION_QUALITY_REPEATS"
    ),
    execute: false,
    help: false,
    budget: {}
  };

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--help" || argument === "-h") {
      parsed.help = true;
      continue;
    }
    if (argument === "--execute") {
      parsed.execute = true;
      continue;
    }
    if (argument === "--mode") {
      const value = arguments_[index + 1];
      if (value !== "quick" && value !== "deep") {
        throw invalidInput("--mode must be quick or deep");
      }
      parsed.mode = value;
      index += 1;
      continue;
    }
    if (argument === "--repeats") {
      parsed.repeats = parseIntegerArgument(
        arguments_[index + 1],
        "--repeats"
      );
      index += 1;
      continue;
    }
    if (argument === "--max-model-calls") {
      parsed.budget.maxModelCalls = parseIntegerArgument(
        arguments_[index + 1],
        "--max-model-calls"
      );
      index += 1;
      continue;
    }
    if (argument === "--max-search-calls") {
      parsed.budget.maxSearchCalls = parseIntegerArgument(
        arguments_[index + 1],
        "--max-search-calls"
      );
      index += 1;
      continue;
    }
    if (argument === "--max-wall-time-minutes") {
      const minutes = parseIntegerArgument(
        arguments_[index + 1],
        "--max-wall-time-minutes"
      );
      parsed.budget.maxWallTimeMs = minutes * 60 * 1000;
      index += 1;
      continue;
    }
    throw invalidInput(`Unknown argument: ${argument}`);
  }

  return parsed;
}

export function buildQualityEvalPlan(options) {
  if (!Number.isInteger(options.repeats) || options.repeats < 2 || options.repeats > 5) {
    throw invalidInput("repeats must be an integer from 2 through 5");
  }
  if (options.mode !== "quick" && options.mode !== "deep") {
    throw invalidInput("mode must be quick or deep");
  }

  const defaults = defaultBudgets[options.mode];
  const budget = {
    maxModelCalls: options.budget?.maxModelCalls ?? defaults.maxModelCalls,
    maxSearchCalls: options.budget?.maxSearchCalls ?? defaults.maxSearchCalls,
    maxWallTimeMs: options.budget?.maxWallTimeMs ?? defaults.maxWallTimeMs
  };
  validateBudget(options.mode, budget);

  const runs = [
    ...Array.from({ length: options.repeats }, (_, index) => ({
      caseId: "baseline_repeat",
      runKind: "repeat",
      repeatIndex: index + 1
    })),
    {
      caseId: "stronger_traction",
      runKind: "counterfactual",
      repeatIndex: 1
    },
    {
      caseId: "limited_founder_time",
      runKind: "counterfactual",
      repeatIndex: 1
    }
  ];
  const evaluationCount = runs.length;
  return {
    schemaVersion: "live_quality_eval_plan.v1",
    status: "planned",
    mode: options.mode,
    repeatRuns: options.repeats,
    evaluationCount,
    budget: {
      perEvaluation: budget,
      totalMaxModelCalls: evaluationCount * budget.maxModelCalls,
      totalMaxSearchCalls: evaluationCount * budget.maxSearchCalls,
      totalMaxWallTimeMs: evaluationCount * budget.maxWallTimeMs
    },
    runs,
    executionRequires: "--execute",
    stableGateStatus: "not_assessed",
    notes: [
      "The listed values are hard ceilings, not expected usage or a price estimate.",
      "The API-key owner pays provider model and web-search charges.",
      "A completed run produces diagnostics and a human citation-review sample; it does not self-approve stable v1."
    ]
  };
}

export function summarizeQualityEval(executions, options) {
  const baselineRuns = executions.filter(
    (execution) => execution.caseId === "baseline_repeat"
  );
  if (baselineRuns.length < 2) {
    throw invalidInput("At least two baseline repeat outcomes are required");
  }
  const runRecords = executions.map(toRunRecord);
  const baselineRecords = runRecords.filter(
    (record) => record.case_id === "baseline_repeat"
  );

  return {
    schema_version: "live_quality_eval.v1",
    generated_at: options.generatedAt,
    mode: options.mode,
    repeat_runs: baselineRecords.length,
    evaluation_count: runRecords.length,
    budget_ceiling: {
      per_evaluation: {
        max_model_calls: options.plan.budget.perEvaluation.maxModelCalls,
        max_search_calls: options.plan.budget.perEvaluation.maxSearchCalls,
        max_wall_time_ms: options.plan.budget.perEvaluation.maxWallTimeMs
      },
      total_max_model_calls: options.plan.budget.totalMaxModelCalls,
      total_max_search_calls: options.plan.budget.totalMaxSearchCalls,
      total_max_wall_time_ms: options.plan.budget.totalMaxWallTimeMs
    },
    providers: unique(
      executions.map((execution) => execution.outcome.manifest.provider)
    ),
    models: unique(runRecords.flatMap((record) => record.models)),
    runs: runRecords,
    repeat_stability: summarizeRepeatStability(baselineRecords),
    counterfactuals: [
      summarizeCounterfactual(
        baselineRecords,
        requiredRun(runRecords, "stronger_traction"),
        {
          changedVariable: "traction_evidence",
          expectation:
            "Stronger paid-retention evidence should not move the assessed stage earlier; any verdict change still requires human judgment.",
          targetDimensionId: "D11"
        }
      ),
      summarizeCounterfactual(
        baselineRecords,
        requiredRun(runRecords, "limited_founder_time"),
        {
          changedVariable: "founder_weekly_hours",
          expectation:
            "Changing only weekly founder time from 10 hours to 1 hour should affect founder-fit analysis without being treated as evidence that the underlying user problem disappeared.",
          targetDimensionId: "D10"
        }
      )
    ],
    citation_review_sample: buildCitationReviewSample(executions, options.mode),
    stable_gate_status: "not_assessed",
    notes: [
      "Repeat stability is reported separately from factuality and judgment quality.",
      "Counterfactual observations are diagnostics, not automatic correctness verdicts.",
      "Citation structure and URLs do not prove semantic entailment; every sampled claim remains not_reviewed.",
      "Stable v1 still requires consented real cases, independent expert review, adjudication and frozen thresholds."
    ]
  };
}

export function buildCitationReviewSample(executions, mode, limit = 12) {
  const claimsByText = new Map();
  for (const execution of executions) {
    const report = execution.outcome.report;
    const evidenceById = new Map(
      report.evidence.map((evidence) => [evidence.id, evidence])
    );
    for (const claim of report.claims) {
      if (claim.claim_type !== "external_fact") continue;
      const fingerprint = normalizeClaimText(claim.text);
      const evidence = claim.evidence_ids
        .map((evidenceId) => evidenceById.get(evidenceId))
        .filter((item) => item?.url)
        .map((item) => ({
          evidence_id: item.id,
          url: item.url,
          title: item.title,
          source_tier: item.source_tier,
          published_at: item.published_at,
          accessed_at: item.accessed_at,
          verification_status: item.verification_status
        }));
      const existing = claimsByText.get(fingerprint);
      if (existing) {
        existing.observedInCases.add(execution.caseId);
        existing.observedInReports.add(report.report_id);
        for (const item of evidence) {
          if (!existing.evidence.some((candidate) => candidate.url === item.url)) {
            existing.evidence.push(item);
          }
        }
        continue;
      }
      claimsByText.set(fingerprint, {
        claimId: claim.id,
        text: claim.text,
        importance: claim.importance,
        observedInCases: new Set([execution.caseId]),
        observedInReports: new Set([report.report_id]),
        evidence
      });
    }
  }

  const importanceOrder = { critical: 0, major: 1, minor: 2 };
  const allClaims = [...claimsByText.values()].sort(
    (left, right) =>
      importanceOrder[left.importance] - importanceOrder[right.importance] ||
      left.text.localeCompare(right.text)
  );
  const sampledClaims = allClaims.slice(0, limit).map((claim) => ({
    claim_id: claim.claimId,
    claim_text: claim.text,
    importance: claim.importance,
    observed_in_cases: [...claim.observedInCases].sort(),
    observed_in_reports: claim.observedInReports.size,
    evidence: claim.evidence,
    human_support_status: "not_reviewed"
  }));

  return {
    applicable: mode === "deep",
    selection_method:
      "Deduplicate normalized external-fact text, prioritize critical then major then minor claims, and select up to 12 in deterministic text order.",
    total_unique_external_claims: allClaims.length,
    sampled_claims: sampledClaims,
    human_review_status: "not_reviewed"
  };
}

export async function validateQualityEvalSummary(summary) {
  const schema = JSON.parse(await readFile(summarySchemaPath, "utf8"));
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  return {
    valid: Boolean(validate(summary)),
    errors: validate.errors ?? []
  };
}

// Provider execution is exercised by the explicit BYOK quality gate, not offline unit coverage.
/* v8 ignore start */
async function main() {
  let options;
  let plan;
  try {
    options = parseQualityEvalArgs(process.argv.slice(2), process.env);
    if (options.help) {
      process.stdout.write(`${usage()}\n`);
      return;
    }
    plan = buildQualityEvalPlan(options);
  } catch (error) {
    fail(
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "INVALID_INPUT",
      error instanceof Error ? error.message : String(error)
    );
  }

  if (!options.execute) {
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    return;
  }

  loadIgnoredEnvironment();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    fail(
      "MISSING_API_KEY",
      "Set OPENAI_API_KEY in the environment or in the ignored .env file."
    );
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
      fail(
        "BUILD_REQUIRED",
        "Build the package with npm run build before running the live quality evaluation."
      );
    }
    throw error;
  }

  const {
    FounderDecisionAgent,
    OpenAiAdapter,
    validateReport,
    validationMessages
  } = sdk;
  const artifactDirectory = await mkdtemp(
    join(tmpdir(), "founder-decision-live-quality-")
  );
  await chmod(artifactDirectory, 0o700);
  const agent = new FounderDecisionAgent({
    model: new OpenAiAdapter()
  });
  const executions = [];

  process.stderr.write(
    `${JSON.stringify({
      status: "executing",
      evaluationCount: plan.evaluationCount,
      budgetCeiling: plan.budget,
      artifactDirectory
    })}\n`
  );

  try {
    for (let index = 0; index < plan.runs.length; index += 1) {
      const plannedRun = plan.runs[index];
      const request = requestForRun(plannedRun, options.mode, plan.budget.perEvaluation);
      const outcome = await agent.evaluate(request);
      assertQualityOutcome(
        outcome,
        options.mode,
        request.idea,
        apiKey,
        request.safetyIdentifier,
        validateReport,
        validationMessages
      );
      const artifactFile = join(
        artifactDirectory,
        `${String(index + 1).padStart(2, "0")}-${plannedRun.caseId}-${plannedRun.repeatIndex}.json`
      );
      await writePrivateJson(artifactFile, outcome);
      executions.push({
        ...plannedRun,
        artifactFile,
        outcome
      });
    }

    const summary = summarizeQualityEval(executions, {
      mode: options.mode,
      plan,
      generatedAt: new Date().toISOString()
    });
    const validation = await validateQualityEvalSummary(summary);
    if (!validation.valid) {
      throw new Error(
        `Live quality summary failed its public Schema:\n${validation.errors
          .map((error) => `${error.instancePath || "$"} ${error.message}`)
          .join("\n")}`
      );
    }
    const summaryFile = join(artifactDirectory, "summary.json");
    await writePrivateJson(summaryFile, summary);
    process.stdout.write(
      `${JSON.stringify(
        {
          status: "completed",
          mode: options.mode,
          evaluationCount: summary.evaluation_count,
          actualModelCalls: summary.runs.reduce(
            (sum, run) => sum + run.model_calls,
            0
          ),
          actualSearchCalls: summary.runs.reduce(
            (sum, run) => sum + run.search_calls,
            0
          ),
          repeatStability: summary.repeat_stability,
          counterfactuals: summary.counterfactuals,
          citationReviewSample: {
            applicable: summary.citation_review_sample.applicable,
            totalUniqueExternalClaims:
              summary.citation_review_sample.total_unique_external_claims,
            sampledClaims:
              summary.citation_review_sample.sampled_claims.length,
            humanReviewStatus:
              summary.citation_review_sample.human_review_status
          },
          stableGateStatus: summary.stable_gate_status,
          summaryArtifact: summaryFile
        },
        null,
        2
      )}\n`
    );
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "LIVE_QUALITY_EVAL_FAILED";
    fail(code, error instanceof Error ? error.message : String(error));
  }
}

function requestForRun(run, mode, budget) {
  const profile =
    run.caseId === "limited_founder_time"
      ? { ...baselineProfile, weeklyHours: 1 }
      : baselineProfile;
  return {
    schemaVersion: "evaluation_request.v1",
    ideaId: `idea_quality_${run.caseId}_v1`,
    idea: run.caseId === "stronger_traction" ? strongerTractionIdea : baselineIdea,
    mode,
    language: "en",
    objectives: ["sustainable_business"],
    profile,
    industryPacks: ["b2b_saas"],
    jurisdiction: "unknown",
    budget,
    safetyIdentifier: `founder-decision-agent-live-quality-v1-${run.caseId}-${run.repeatIndex}`,
    persist: false
  };
}

function assertQualityOutcome(
  outcome,
  expectedMode,
  expectedIdea,
  key,
  rawSafetyIdentifier,
  validateReport,
  validationMessages
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
    issues.push("input snapshot does not match the planned synthetic case");
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
    if (outcome.report.claims.some((claim) => claim.claim_type === "external_fact")) {
      issues.push("quick mode emitted an external_fact claim");
    }
  } else if (outcome.manifest.budgetUsed.searchCalls < 1) {
    issues.push("deep mode did not perform an observed web search");
  }

  const independentValidation = validateReport(outcome.report);
  if (!independentValidation.valid) {
    issues.push(...validationMessages(independentValidation));
  }
  const serialized = JSON.stringify(outcome);
  if (key.length >= 8 && serialized.includes(key)) {
    issues.push("API key appeared in the evaluation outcome");
  }
  if (serialized.includes(rawSafetyIdentifier)) {
    issues.push("raw safety identifier appeared in the evaluation outcome");
  }
  if (issues.length > 0) {
    throw new Error(`Live outcome assertions failed:\n- ${issues.join("\n- ")}`);
  }
}
/* v8 ignore stop */

function toRunRecord(execution) {
  const report = execution.outcome.report;
  const dimensionScores = Object.fromEntries(
    dimensions.map((dimensionId) => {
      const dimension = report.dimension_assessments.find(
        (item) => item.dimension_id === dimensionId
      );
      return [dimensionId, dimension?.score ?? null];
    })
  );
  return {
    case_id: execution.caseId,
    run_kind: execution.runKind,
    repeat_index: execution.repeatIndex,
    report_id: report.report_id,
    idea_id: report.idea_id,
    verdict: report.verdict.label,
    stage: report.idea_normalization.stage,
    disposition: report.disposition_plan.mode,
    dimension_scores: dimensionScores,
    model_calls: execution.outcome.manifest.budgetUsed.modelCalls,
    search_calls: execution.outcome.manifest.budgetUsed.searchCalls,
    total_tokens: execution.outcome.manifest.calls.reduce(
      (sum, call) => sum + (call.usage?.totalTokens ?? 0),
      0
    ),
    models: unique(
      execution.outcome.manifest.calls.map((call) => call.model)
    ),
    artifact_file: execution.artifactFile
  };
}

function summarizeRepeatStability(records) {
  const verdictCounts = count(records.map((record) => record.verdict));
  const stageCounts = count(records.map((record) => record.stage));
  const dispositionCounts = count(
    records.map((record) => record.disposition)
  );
  const dimensionScoreRanges = {};
  for (const dimensionId of dimensions) {
    const scores = records
      .map((record) => record.dimension_scores[dimensionId])
      .filter((score) => typeof score === "number");
    if (scores.length === 0) continue;
    const minimum = Math.min(...scores);
    const maximum = Math.max(...scores);
    dimensionScoreRanges[dimensionId] = {
      min: minimum,
      max: maximum,
      span: maximum - minimum
    };
  }
  const verdictIndices = records.map((record) =>
    verdictOrder.indexOf(record.verdict)
  );
  return {
    verdict_counts: verdictCounts,
    stage_counts: stageCounts,
    disposition_counts: dispositionCounts,
    verdict_agreement_rate:
      Math.max(...Object.values(verdictCounts)) / records.length,
    unanimous_verdict: Object.keys(verdictCounts).length === 1,
    unanimous_stage: Object.keys(stageCounts).length === 1,
    unanimous_disposition: Object.keys(dispositionCounts).length === 1,
    max_verdict_distance:
      Math.max(...verdictIndices) - Math.min(...verdictIndices),
    dimension_score_ranges: dimensionScoreRanges
  };
}

function summarizeCounterfactual(baselineRecords, variant, configuration) {
  const targetScores = baselineRecords
    .map(
      (record) =>
        record.dimension_scores[configuration.targetDimensionId]
    )
    .filter((score) => typeof score === "number");
  const variantScore =
    variant.dimension_scores[configuration.targetDimensionId];
  return {
    case_id: variant.case_id,
    changed_variable: configuration.changedVariable,
    expectation: configuration.expectation,
    target_dimension_id: configuration.targetDimensionId,
    baseline_reference: {
      verdicts: baselineRecords.map((record) => record.verdict),
      stages: baselineRecords.map((record) => record.stage),
      target_dimension_scores: targetScores
    },
    variant: {
      verdict: variant.verdict,
      stage: variant.stage,
      target_dimension_score: variantScore
    },
    observations: {
      verdict_distance_from_baseline: range(
        baselineRecords.map(
          (record) =>
            Math.abs(
              verdictOrder.indexOf(variant.verdict) -
                verdictOrder.indexOf(record.verdict)
            )
        )
      ),
      stage_delta_from_baseline: range(
        baselineRecords.map(
          (record) =>
            stageOrder.indexOf(variant.stage) -
            stageOrder.indexOf(record.stage)
        )
      ),
      target_score_delta_from_baseline:
        typeof variantScore === "number" && targetScores.length > 0
          ? range(targetScores.map((score) => variantScore - score))
          : null
    },
    human_review_status: "not_reviewed"
  };
}

function requiredRun(records, caseId) {
  const record = records.find((candidate) => candidate.case_id === caseId);
  if (!record) throw invalidInput(`Missing quality evaluation case ${caseId}`);
  return record;
}

function count(values) {
  const counts = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}

function range(values) {
  return {
    min: Math.min(...values),
    max: Math.max(...values)
  };
}

function unique(values) {
  return [...new Set(values)].sort();
}

function normalizeClaimText(value) {
  return value.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}

function validateBudget(mode, budget) {
  if (
    !Number.isInteger(budget.maxModelCalls) ||
    budget.maxModelCalls < (mode === "deep" ? 3 : 2) ||
    budget.maxModelCalls > 20
  ) {
    throw invalidInput(
      `maxModelCalls must be an integer from ${mode === "deep" ? 3 : 2} through 20`
    );
  }
  if (
    !Number.isInteger(budget.maxSearchCalls) ||
    budget.maxSearchCalls < 0 ||
    budget.maxSearchCalls > 100
  ) {
    throw invalidInput("maxSearchCalls must be an integer from 0 through 100");
  }
  if (mode === "quick" && budget.maxSearchCalls !== 0) {
    throw invalidInput("quick mode requires maxSearchCalls to be 0");
  }
  if (mode === "deep" && budget.maxSearchCalls < 1) {
    throw invalidInput("deep mode requires at least one allowed search call");
  }
  if (
    !Number.isInteger(budget.maxWallTimeMs) ||
    budget.maxWallTimeMs < 60_000 ||
    budget.maxWallTimeMs > 3_600_000
  ) {
    throw invalidInput("maxWallTimeMs must be from 1 through 60 minutes");
  }
}

function parseOptionalInteger(value, fallback, name) {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw invalidInput(`${name} must be an integer`);
  }
  return parsed;
}

function parseIntegerArgument(value, name) {
  if (value === undefined) throw invalidInput(`${name} requires a value`);
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw invalidInput(`${name} must be an integer`);
  }
  return parsed;
}

function invalidInput(message) {
  const error = new Error(message);
  error.code = "INVALID_INPUT";
  return error;
}

// Process environment, private-file I/O and exit behavior are covered by CLI smoke processes.
/* v8 ignore start */
function loadIgnoredEnvironment() {
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
}

async function writePrivateJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, {
    flag: "wx",
    mode: 0o600
  });
}

function usage() {
  return [
    "Usage: founder-quality-eval [options]",
    "",
    "Without --execute, prints a no-cost plan.",
    "",
    "Options:",
    "  --mode quick|deep              Evaluation mode (default: quick)",
    "  --repeats 2..5                 Identical baseline runs (default: 3)",
    "  --max-model-calls N            Per-evaluation model-call cap",
    "  --max-search-calls N           Per-evaluation search-call cap",
    "  --max-wall-time-minutes N      Per-evaluation wall-time cap (1..60)",
    "  --execute                      Confirm BYOK provider usage and run",
    "  --help                         Show this help"
  ].join("\n");
}

function fail(code, message) {
  process.stderr.write(
    `${JSON.stringify({ error: { code, message } }, null, 2)}\n`
  );
  process.exit(1);
}

if (
  process.argv[1] &&
  realpathSync(resolve(process.argv[1])) ===
    realpathSync(fileURLToPath(import.meta.url))
) {
  await main();
}
/* v8 ignore stop */
