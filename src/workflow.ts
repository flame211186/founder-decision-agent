import { BudgetTracker, resolveBudget } from "./budget.js";
import { AgentError, toAgentError } from "./errors.js";
import { newId } from "./ids.js";
import { getOpenAiReportSchema } from "./openai-schema.js";
import { PROMPT_VERSION, WORKFLOW_VERSION } from "./prompts.js";
import { renderReport } from "./renderer.js";
import type {
  EvaluationOutcome,
  EvaluationReport,
  EvaluationRequest,
  ModelAdapter,
  ModelRunMetadata,
  RunManifest,
  StorageAdapter,
  WorkflowEvent
} from "./types.js";
import {
  normalizeUrl,
  validateEvaluationRequest,
  validateReport,
  validationMessages
} from "./validation.js";

export interface FounderDecisionAgentOptions {
  model: ModelAdapter;
  storage?: StorageAdapter;
  quickModel?: string;
  deepModel?: string;
  now?: () => Date;
  onEvent?: (event: WorkflowEvent) => void | Promise<void>;
}

const DEFAULT_QUICK_MODEL = process.env.FOUNDER_DECISION_QUICK_MODEL ?? "gpt-5.6-terra";
const DEFAULT_DEEP_MODEL = process.env.FOUNDER_DECISION_DEEP_MODEL ?? "gpt-5.6-sol";

export class FounderDecisionAgent {
  private readonly model: ModelAdapter;
  private readonly storage: StorageAdapter | undefined;
  private readonly quickModel: string;
  private readonly deepModel: string;
  private readonly now: () => Date;
  private readonly onEvent: FounderDecisionAgentOptions["onEvent"] | undefined;

  constructor(options: FounderDecisionAgentOptions) {
    this.model = options.model;
    this.storage = options.storage;
    this.quickModel = options.quickModel ?? DEFAULT_QUICK_MODEL;
    this.deepModel = options.deepModel ?? DEFAULT_DEEP_MODEL;
    this.now = options.now ?? (() => new Date());
    this.onEvent = options.onEvent;
  }

  async evaluate(rawRequest: EvaluationRequest): Promise<EvaluationOutcome> {
    const inputValidation = validateEvaluationRequest(rawRequest);
    if (!inputValidation.valid) {
      throw new AgentError("INVALID_INPUT", validationMessages(inputValidation).join("\n"), {
        details: { issues: inputValidation.issues }
      });
    }
    const request = normalizeRequest(rawRequest, this.now());

    const runId = newId("run");
    const ideaId = request.ideaId ?? newId("idea");
    request.ideaId = ideaId;
    const budget = resolveBudget(request.mode ?? "quick", request.budget);
    if (budget.maxModelCalls < 2) {
      throw new AgentError(
        "INVALID_INPUT",
        "maxModelCalls must be at least 2 so one generation and one repair remain possible"
      );
    }
    if (request.mode === "deep" && budget.maxModelCalls < 3) {
      throw new AgentError(
        "INVALID_INPUT",
        "Deep mode requires at least 3 model calls: research, synthesis and repair reserve"
      );
    }
    if (request.mode === "deep" && budget.maxSearchCalls < 1) {
      throw new AgentError(
        "INVALID_INPUT",
        "Deep mode requires at least 1 search call; use quick mode for a zero-search evaluation"
      );
    }

    const tracker = new BudgetTracker(budget);
    const manifest: RunManifest = {
      schemaVersion: "run_manifest.v1",
      runId,
      ideaId,
      mode: request.mode ?? "quick",
      startedAt: this.now().toISOString(),
      workflowVersion: WORKFLOW_VERSION,
      promptVersion: PROMPT_VERSION,
      schemaVersionUsed: "evaluation_report.v1",
      provider: this.model.id,
      calls: [],
      budget,
      budgetUsed: { modelCalls: 0, searchCalls: 0, elapsedMs: 0 },
      validation: { valid: false, issues: [] },
      status: "running",
      warnings: []
    };
    await this.emit(runId, "run.started", undefined, { ideaId, mode: request.mode });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), budget.maxWallTimeMs);
    timeout.unref();

    try {
      const research = request.mode === "deep"
        ? await this.runResearch(request, tracker, manifest, controller.signal)
        : undefined;
      const allowedUrls = new Set(
        (research?.citations ?? []).map((item) => normalizeUrl(item.url))
      );
      let context = research
        ? [
            "RESEARCH_TEXT:",
            research.text,
            "RESEARCH_CITATIONS_JSON:",
            JSON.stringify(research.citations),
            "ALLOWED_SOURCE_URLS_JSON:",
            JSON.stringify([...allowedUrls])
          ].join("\n")
        : "";

      if (request.mode === "deep") {
        for (const role of ["supporter", "opponent", "verifier"] as const) {
          // Keep two calls in reserve: final synthesis and one repair.
          if (tracker.remainingModelCalls <= 2) {
            manifest.warnings.push(`Skipped ${role} pass because of the configured model-call budget.`);
            continue;
          }
          const analysis = await this.callModel(
            role,
            this.deepModel,
            tracker,
            manifest,
            async () =>
              this.model.analyze({
                role,
                request,
                context,
                model: this.deepModel,
                reasoningEffort: "high",
                maxOutputTokens: Math.min(budget.maxOutputTokensPerCall, 12_000),
                signal: controller.signal
              })
          );
          context += `\n\n${role.toUpperCase()}_ANALYSIS:\n${analysis.text}`;
        }
      }

      let finalReport: EvaluationReport | undefined;
      let finalValidation = { valid: false, issues: [] } as ReturnType<typeof validateReport>;
      let repairErrors: string[] | undefined;

      while (tracker.remainingModelCalls > 0) {
        const generated = await this.callModel(
          repairErrors ? "repair" : "synthesizer",
          request.mode === "deep" ? this.deepModel : this.quickModel,
          tracker,
          manifest,
          async () =>
            this.model.generateReport({
              request,
              context,
              model: request.mode === "deep" ? this.deepModel : this.quickModel,
              reasoningEffort: request.mode === "deep" ? "high" : "medium",
              maxOutputTokens: budget.maxOutputTokensPerCall,
              schema: getOpenAiReportSchema(),
              ...(repairErrors ? { repairErrors } : {}),
              signal: controller.signal
            })
        );
        finalReport = finalizeGeneratedReport(generated.report, request, ideaId, this.now());
        finalValidation = validateReport(finalReport, {
          ...(request.mode === "deep" ? { allowedCitationUrls: allowedUrls } : {})
        });
        if (finalValidation.valid) break;

        repairErrors = validationMessages(finalValidation);
        await this.emit(runId, "validation.failed", "canonical_validation", {
          issues: repairErrors
        });
      }

      if (!finalReport || !finalValidation.valid) {
        manifest.validation = finalValidation;
        manifest.status = tracker.remainingModelCalls === 0 ? "partial" : "failed";
        throw new AgentError(
          "VALIDATION_FAILED",
          "The model-call budget ended before a valid canonical report was produced",
          { details: { issues: finalValidation.issues, manifest } }
        );
      }

      finalReport.validation = {
        schema_status: "passed",
        cross_reference_status: "passed",
        citation_structure_status: "passed",
        citation_support_status:
          request.mode === "deep" && allowedUrls.size > 0 ? "draft_reviewed" : "not_applicable",
        numerical_status: "passed",
        human_review_status: "not_reviewed",
        warnings: [
          ...new Set([
            ...finalReport.validation.warnings,
            ...manifest.warnings,
            request.mode === "deep"
              ? "Citation support received automated draft review only; it is not expert validation."
              : "Quick mode did not verify externally variable facts."
          ])
        ]
      };
      finalValidation = validateReport(finalReport, {
        ...(request.mode === "deep" ? { allowedCitationUrls: allowedUrls } : {})
      });
      if (!finalValidation.valid) {
        throw new AgentError(
          "VALIDATION_FAILED",
          "Final validation status update created an invalid report",
          { details: { issues: finalValidation.issues } }
        );
      }

      manifest.reportId = finalReport.report_id;
      manifest.completedAt = this.now().toISOString();
      manifest.validation = finalValidation;
      manifest.status = "completed";
      updateBudgetUsage(manifest, tracker);
      const outcome: EvaluationOutcome = {
        report: finalReport,
        markdown: renderReport(finalReport),
        manifest
      };
      if (request.persist !== false && this.storage) {
        await this.storage.saveEvaluation(outcome);
      }
      await this.emit(runId, "run.completed", undefined, {
        reportId: finalReport.report_id,
        verdict: finalReport.verdict.label
      });
      return outcome;
    } catch (error) {
      const agentError = toAgentError(error);
      manifest.completedAt = this.now().toISOString();
      manifest.status =
        agentError.code === "BUDGET_EXHAUSTED" || agentError.code === "VALIDATION_FAILED"
          ? "partial"
          : "failed";
      updateBudgetUsage(manifest, tracker);
      await this.emit(runId, "run.failed", undefined, {
        code: agentError.code,
        message: agentError.message
      });
      throw agentError;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async runResearch(
    request: EvaluationRequest,
    tracker: BudgetTracker,
    manifest: RunManifest,
    signal: AbortSignal
  ) {
    if (!this.model.research) {
      throw new AgentError(
        "RESEARCH_UNAVAILABLE",
        `Model adapter ${this.model.id} does not implement deep research`
      );
    }
    const result = await this.callModel(
      "researcher",
      this.deepModel,
      tracker,
      manifest,
      async () =>
        this.model.research!({
          request,
          model: this.deepModel,
          reasoningEffort: "high",
          maxOutputTokens: Math.min(tracker.budget.maxOutputTokensPerCall, 16_000),
          maxSearchCalls: tracker.budget.maxSearchCalls,
          signal
        })
    );
    const observedSearches =
      result.searchCalls ??
      Math.max(result.queries.length, result.citations.length > 0 ? 1 : 0);
    tracker.consumeSearchCalls(observedSearches);
    return result;
  }

  private async callModel<T extends { metadata?: ModelRunMetadata; model?: string; usage?: unknown }>(
    role: string,
    configuredModel: string,
    tracker: BudgetTracker,
    manifest: RunManifest,
    operation: () => Promise<T>
  ): Promise<T> {
    tracker.consumeModelCall(role);
    const startedAt = this.now().toISOString();
    await this.emit(manifest.runId, "model.called", role, {
      model: configuredModel,
      call: tracker.modelCalls
    });
    const result = await operation();
    const completedAt = this.now().toISOString();
    const metadata = result.metadata;
    const directUsage = "usage" in result ? result.usage : undefined;
    manifest.calls.push({
      role,
      model: metadata?.model ?? result.model ?? configuredModel,
      startedAt,
      completedAt,
      ...(metadata?.usage
        ? { usage: metadata.usage }
        : directUsage && typeof directUsage === "object"
          ? { usage: directUsage as NonNullable<ModelRunMetadata["usage"]> }
          : {})
    });
    updateBudgetUsage(manifest, tracker);
    return result;
  }

  private async emit(
    runId: string,
    type: WorkflowEvent["type"],
    stage?: string,
    detail?: Record<string, unknown>
  ): Promise<void> {
    if (!this.onEvent) return;
    await this.onEvent({
      runId,
      at: this.now().toISOString(),
      type,
      ...(stage ? { stage } : {}),
      ...(detail ? { detail } : {})
    });
  }
}

function normalizeRequest(request: EvaluationRequest, now: Date): EvaluationRequest {
  return {
    ...request,
    idea: request.idea.trim(),
    mode: request.mode ?? "quick",
    language: request.language ?? "zh-CN",
    objectives: request.objectives ?? [],
    industryPacks: request.industryPacks ?? [],
    jurisdiction: request.jurisdiction ?? "unknown",
    asOfDate: request.asOfDate ?? now.toISOString().slice(0, 10),
    persist: request.persist ?? true
  };
}

function finalizeGeneratedReport(
  report: EvaluationReport,
  request: EvaluationRequest,
  ideaId: string,
  now: Date
): EvaluationReport {
  const generatedAt = now.toISOString();
  return {
    ...report,
    schema_version: "evaluation_report.v1",
    report_id: newId("report"),
    idea_id: ideaId,
    generated_at: generatedAt,
    as_of_date: request.asOfDate ?? generatedAt.slice(0, 10),
    report_language: request.language ?? "zh-CN",
    evaluation_mode: request.mode ?? "quick",
    disclaimer: {
      decision_support_only: true,
      not_investment_advice: true,
      not_legal_or_tax_advice: true,
      limitations: report.disclaimer?.limitations?.length
        ? report.disclaimer.limitations
        : ["This report is decision support, not a prediction or professional advice."]
    },
    input_snapshot: {
      original_text: request.idea,
      user_objectives: request.objectives ?? [],
      profile_included: Boolean(request.profile),
      profile_summary: request.profile
        ? [
            ...(request.profile.currentRoles ?? []),
            ...(request.profile.objectives ?? [])
          ].join("; ") || "Profile supplied"
        : null,
      attachments_included: false
    },
    information_quality: {
      ...report.information_quality,
      research_status:
        request.mode === "quick" ? "not_performed" : report.information_quality.research_status,
      clarification_questions: report.information_quality.clarification_questions.slice(0, 3)
    },
    validation: {
      schema_status: "not_run",
      cross_reference_status: "not_run",
      citation_structure_status: "not_run",
      citation_support_status: "not_run",
      numerical_status: "not_run",
      human_review_status: "not_reviewed",
      warnings: report.validation?.warnings ?? []
    }
  };
}

function updateBudgetUsage(manifest: RunManifest, tracker: BudgetTracker): void {
  manifest.budgetUsed = {
    modelCalls: tracker.modelCalls,
    searchCalls: tracker.searchCalls,
    elapsedMs: tracker.elapsedMs
  };
}
