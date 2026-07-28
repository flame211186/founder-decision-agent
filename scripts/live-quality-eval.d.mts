import type { EvaluationOutcome, EvaluationReport } from "../src/types.js";

export type QualityEvalMode = "quick" | "deep";

export interface QualityEvalBudgetOverrides {
  maxModelCalls?: number;
  maxSearchCalls?: number;
  maxWallTimeMs?: number;
}

export interface QualityEvalOptions {
  mode: QualityEvalMode;
  repeats: number;
  execute?: boolean;
  help?: boolean;
  budget?: QualityEvalBudgetOverrides;
}

export interface QualityEvalPlan {
  schemaVersion: "live_quality_eval_plan.v1";
  status: "planned";
  mode: QualityEvalMode;
  repeatRuns: number;
  evaluationCount: number;
  budget: {
    perEvaluation: {
      maxModelCalls: number;
      maxSearchCalls: number;
      maxWallTimeMs: number;
    };
    totalMaxModelCalls: number;
    totalMaxSearchCalls: number;
    totalMaxWallTimeMs: number;
  };
  runs: Array<{
    caseId: string;
    runKind: "repeat" | "counterfactual";
    repeatIndex: number;
  }>;
  executionRequires: "--execute";
  stableGateStatus: "not_assessed";
  notes: string[];
}

export interface QualityEvalExecution {
  caseId: string;
  runKind: string;
  repeatIndex: number;
  artifactFile: string;
  outcome: EvaluationOutcome;
}

export interface CitationReviewSample {
  applicable: boolean;
  selection_method: string;
  total_unique_external_claims: number;
  sampled_claims: Array<{
    claim_id: string;
    claim_text: string;
    importance: "critical" | "major" | "minor";
    observed_in_cases: string[];
    observed_in_reports: number;
    evidence: Array<Record<string, unknown>>;
    human_support_status: "not_reviewed";
  }>;
  human_review_status: "not_reviewed";
}

export interface QualityEvalSummary {
  repeat_stability: {
    verdict_counts: Partial<Record<string, number>>;
    verdict_agreement_rate: number;
    unanimous_verdict: boolean;
    max_verdict_distance: number;
  };
  counterfactuals: Array<Record<string, unknown>>;
  citation_review_sample: CitationReviewSample;
  stable_gate_status: "not_assessed";
  [key: string]: unknown;
}

export function parseQualityEvalArgs(
  arguments_: string[],
  environment?: Record<string, string | undefined>
): Required<Pick<QualityEvalOptions, "mode" | "repeats" | "execute" | "help">> & {
  budget: QualityEvalBudgetOverrides;
};

export function buildQualityEvalPlan(
  options: Pick<QualityEvalOptions, "mode" | "repeats" | "budget">
): QualityEvalPlan;

export function summarizeQualityEval(
  executions: QualityEvalExecution[],
  options: {
    mode: QualityEvalMode;
    plan: QualityEvalPlan;
    generatedAt: string;
  }
): QualityEvalSummary;

export function buildCitationReviewSample(
  executions: Array<{
    caseId: string;
    outcome: { report: EvaluationReport };
  }>,
  mode: QualityEvalMode,
  limit?: number
): CitationReviewSample;

export function validateQualityEvalSummary(
  summary: unknown
): Promise<{ valid: boolean; errors: unknown[] }>;
