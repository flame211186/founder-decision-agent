export type EvaluationMode = "quick" | "deep";
export type ReportLanguage = "zh-CN" | "en";
export type VerdictLabel = "pursue" | "validate" | "reframe" | "park" | "stop";
export type DispositionMode = "active_validation" | "parked_watch" | "stop_and_close";
export type Confidence = "low" | "medium" | "high";
export type Stage =
  | "S0_idea"
  | "S1_problem_discovery"
  | "S2_solution_validation"
  | "S3_early_traction"
  | "S4_repeatable_growth";
export type IndustryPackId = "b2b_saas" | "ai_native";
export type ClaimType =
  | "user_provided"
  | "external_fact"
  | "calculation"
  | "inference"
  | "assumption"
  | "unknown";

export interface ResourceBudget {
  maxModelCalls: number;
  maxSearchCalls: number;
  maxWallTimeMs: number;
  maxOutputTokensPerCall: number;
}

export interface EvaluationRequest {
  schemaVersion: "evaluation_request.v1";
  ideaId?: string;
  idea: string;
  mode?: EvaluationMode;
  language?: ReportLanguage;
  objectives?: string[];
  answers?: Record<string, string>;
  profile?: FounderProfile;
  industryPacks?: IndustryPackId[];
  jurisdiction?: string;
  asOfDate?: string;
  budget?: Partial<ResourceBudget>;
  safetyIdentifier?: string;
  persist?: boolean;
}

export interface FounderProfile {
  schemaVersion: "founder_profile.v1";
  profileId: string;
  version: number;
  locale?: string;
  geographies?: string[];
  currentRoles?: string[];
  industries?: string[];
  skills?: string[];
  proofOfWork?: string[];
  reachableUsers?: string[];
  channels?: string[];
  weeklyHours?: number;
  availableCapital?: {
    amount: number;
    currency: string;
  };
  runwayMonths?: number;
  collaborators?: string[];
  riskTolerance?: "low" | "medium" | "high";
  objectives?: Array<"learning" | "cash_flow" | "sustainable_business" | "venture_scale">;
  unacceptableTradeoffs?: string[];
  ethicalBoundaries?: string[];
  excludedIndustries?: string[];
  notes?: string[];
  correctedAt?: string;
}

export interface Citation {
  url: string;
  title: string;
  startIndex?: number;
  endIndex?: number;
}

export interface ResearchResult {
  text: string;
  citations: Citation[];
  queries: string[];
  searchCalls?: number;
  model: string;
  usage?: TokenUsage;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
}

export interface ModelRunMetadata {
  model: string;
  responseId?: string;
  usage?: TokenUsage;
  citations?: Citation[];
}

export interface AnalysisResult {
  text: string;
  metadata: ModelRunMetadata;
}

export interface ReportGenerationResult {
  report: EvaluationReport;
  metadata: ModelRunMetadata;
}

export interface ModelAdapter {
  readonly id: string;
  analyze(input: AnalysisInput): Promise<AnalysisResult>;
  generateReport(input: ReportGenerationInput): Promise<ReportGenerationResult>;
  research?(input: ResearchInput): Promise<ResearchResult>;
}

export interface AnalysisInput {
  role: "supporter" | "opponent" | "verifier";
  request: EvaluationRequest;
  context: string;
  model: string;
  reasoningEffort: "low" | "medium" | "high" | "xhigh";
  maxOutputTokens: number;
  signal?: AbortSignal;
}

export interface ReportGenerationInput {
  request: EvaluationRequest;
  context: string;
  model: string;
  reasoningEffort: "low" | "medium" | "high" | "xhigh";
  maxOutputTokens: number;
  schema: Record<string, unknown>;
  repairErrors?: string[];
  signal?: AbortSignal;
}

export interface ResearchInput {
  request: EvaluationRequest;
  model: string;
  reasoningEffort: "medium" | "high";
  maxOutputTokens: number;
  maxSearchCalls: number;
  signal?: AbortSignal;
}

export interface ValidationIssue {
  code: string;
  severity: "P0" | "P1" | "P2" | "P3";
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface WorkflowEvent {
  runId: string;
  at: string;
  type:
    | "run.started"
    | "stage.started"
    | "stage.completed"
    | "model.called"
    | "budget.exhausted"
    | "validation.failed"
    | "run.completed"
    | "run.failed";
  stage?: string;
  detail?: Record<string, unknown>;
}

export interface RunManifest {
  schemaVersion: "run_manifest.v1";
  runId: string;
  reportId?: string;
  ideaId: string;
  mode: EvaluationMode;
  startedAt: string;
  completedAt?: string;
  workflowVersion: string;
  promptVersion: string;
  schemaVersionUsed: string;
  provider: string;
  calls: Array<{
    role: string;
    model: string;
    startedAt: string;
    completedAt: string;
    usage?: TokenUsage;
  }>;
  budget: ResourceBudget;
  budgetUsed: {
    modelCalls: number;
    searchCalls: number;
    elapsedMs: number;
  };
  validation: ValidationResult;
  status: "running" | "completed" | "partial" | "failed";
  warnings: string[];
}

export interface EvaluationOutcome {
  report: EvaluationReport;
  markdown: string;
  manifest: RunManifest;
}

export interface EvaluationSummary {
  report_id: string;
  idea_id: string;
  generated_at: string;
  verdict: VerdictLabel;
}

export interface StorageAdapter {
  saveEvaluation(outcome: EvaluationOutcome): Promise<void>;
  getEvaluation(reportId: string): Promise<EvaluationOutcome | null>;
  listEvaluations(): Promise<EvaluationSummary[]>;
  deleteEvaluation(reportId: string): Promise<boolean>;
  saveProfile(profile: FounderProfile): Promise<void>;
  getProfile(profileId: string): Promise<FounderProfile | null>;
  deleteProfile(profileId: string): Promise<boolean>;
  exportAll(): Promise<Record<string, unknown>>;
  close(): Promise<void>;
}

export interface EvaluationReport {
  schema_version: "evaluation_report.v1";
  report_id: string;
  idea_id: string;
  generated_at: string;
  as_of_date: string;
  report_language: string;
  evaluation_mode: EvaluationMode;
  disclaimer: {
    decision_support_only: true;
    not_investment_advice: true;
    not_legal_or_tax_advice: true;
    limitations: string[];
  };
  input_snapshot: {
    original_text: string;
    user_objectives: string[];
    profile_included: boolean;
    profile_summary?: string | null;
    attachments_included: boolean;
  };
  idea_normalization: {
    one_sentence: string;
    problem: string;
    target_users: string[];
    proposed_solution: string;
    stage: Stage;
    business_archetypes: string[];
    geographies: string[];
    assumptions: string[];
  };
  information_quality: {
    completeness: Confidence;
    research_status: "not_performed" | "partial" | "complete_for_scope";
    missing_critical_information: string[];
    clarification_questions: Array<{
      id: string;
      question: string;
      rationale: string;
      could_change: string[];
    }>;
  };
  verdict: {
    label: VerdictLabel;
    confidence: Confidence;
    one_sentence: string;
    rationale_claim_ids: string[];
    what_would_change: string[];
    authorized_next_step: string;
    does_not_mean: string[];
    next_review_condition: string;
  };
  executive_summary: {
    opportunity: string;
    main_problem: string;
    recommended_next_move: string;
  };
  value_assessments: Record<string, ValueAssessment>;
  risk_assessments: Record<string, RiskAssessment>;
  dimension_assessments: DimensionAssessment[];
  theses: {
    supporting: ThesisPoint[];
    opposing: ThesisPoint[];
    synthesis: string;
  };
  key_unknowns: KeyUnknown[];
  risks: RiskItem[];
  improvements: Improvement[];
  scenarios: Scenario[];
  disposition_plan: {
    mode: DispositionMode;
    rationale: string;
    allowed_actions: string[];
    prohibited_actions: string[];
    reactivation_triggers: string[];
    closure_actions: string[];
  };
  experiments: Experiment[];
  resource_plan: ResourceHorizon[];
  funding: FundingAssessment;
  claims: Claim[];
  evidence: EvidenceItem[];
  validation: {
    schema_status: "not_run" | "passed" | "failed";
    cross_reference_status: "not_run" | "passed" | "failed";
    citation_structure_status: "not_run" | "passed" | "failed";
    citation_support_status:
      | "not_run"
      | "draft_reviewed"
      | "expert_reviewed"
      | "failed"
      | "not_applicable";
    numerical_status: "not_run" | "passed" | "failed" | "not_applicable";
    human_review_status: "not_reviewed" | "draft_reviewed" | "expert_reviewed";
    warnings: string[];
  };
}

export interface ValueAssessment {
  score_status: "scored" | "insufficient_information" | "not_applicable";
  score: number | null;
  label: string;
  summary: string;
  rationale_claim_ids: string[];
}

export interface RiskAssessment {
  risk_level: "low" | "medium" | "high" | "critical" | "unknown";
  summary: string;
  rationale_claim_ids: string[];
}

export interface DimensionAssessment {
  dimension_id: `D${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12}`;
  name: string;
  score_status: "scored" | "insufficient_information" | "not_applicable";
  score: number | null;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  rationale_claim_ids: string[];
}

export interface ThesisPoint {
  statement: string;
  claim_ids: string[];
}

export interface KeyUnknown {
  id: string;
  question: string;
  importance: "critical" | "major" | "minor";
  why_it_matters: string;
  cheapest_test: string;
  could_change_verdict: boolean;
}

export interface RiskItem {
  id: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  likelihood: "low" | "medium" | "high" | "unknown";
  description: string;
  mitigation: string;
  is_fatal: boolean;
  fatal_scope: "not_fatal" | "current_plan" | "current_solution" | "current_business_model" | "whole_idea";
  claim_ids: string[];
}

export interface Improvement {
  title: string;
  description: string;
  expected_effect: string;
  validation_needed: string;
  claim_ids: string[];
}

export interface Scenario {
  name: "bear" | "base" | "bull";
  assumptions: string[];
  outcome: string;
  decision_implication: string;
}

export interface NumberRange {
  min: number;
  max: number;
}

export interface MoneyRange extends NumberRange {
  currency: string;
  basis: "user_provided" | "external_evidence" | "calculation" | "scenario_assumption";
}

export interface ResourceInputs {
  time_hours: NumberRange;
  cash: MoneyRange;
  people: string[];
  skills: string[];
  channels: string[];
  dependencies: string[];
}

export interface Experiment {
  id: string;
  horizon: "7d" | "30d" | "90d" | "custom";
  hypothesis: string;
  method: string;
  inputs: ResourceInputs;
  expected_outputs: string[];
  success_criteria: string[];
  failure_criteria: string[];
  decision_on_success: string;
  decision_on_failure: string;
}

export interface ResourceHorizon {
  horizon: string;
  inputs: ResourceInputs;
  expected_outputs: string[];
  decision_gate: string;
}

export interface FundingAssessment {
  readiness: "not_ready" | "early" | "ready_for_conversations" | "raise_ready" | "not_applicable";
  recommended_path:
    | "not_now"
    | "bootstrap"
    | "revenue_financing"
    | "grant"
    | "crowdfunding"
    | "angel"
    | "venture"
    | "debt"
    | "mixed"
    | "undetermined";
  rationale: string;
  current_blockers: string[];
  next_fundable_milestone: string;
  estimated_capital_need: MoneyRange | null;
  likely_investor_questions: string[];
  materials_needed: string[];
  jurisdiction_notes: string[];
}

export interface Claim {
  id: string;
  text: string;
  claim_type: ClaimType;
  importance: "critical" | "major" | "minor";
  confidence: Confidence;
  verification_status: "verified" | "partially_verified" | "unverified" | "not_applicable";
  evidence_ids: string[];
}

export interface EvidenceItem {
  id: string;
  evidence_type: "U" | "E" | "C" | "I" | "A" | "K";
  source_kind: string;
  title: string;
  url: string | null;
  published_at: string | null;
  accessed_at: string | null;
  statement: string;
  supports_claim_ids: string[];
  limitations: string[];
  verification_status: "verified" | "partially_verified" | "unverified" | "not_applicable";
  source_tier: number | null;
}

export interface PortfolioRequest {
  schemaVersion: "portfolio_request.v1";
  profile?: FounderProfile;
  reports: EvaluationReport[];
  language?: ReportLanguage;
}

export interface PortfolioInsight {
  id: string;
  kind: "strength" | "blind_spot" | "pattern" | "opportunity" | "pending";
  statement: string;
  evidenceIdeaIds: string[];
  confidence: Confidence;
  correctionStatus: "unreviewed" | "confirmed" | "corrected" | "rejected";
}

export interface PortfolioReport {
  schemaVersion: "portfolio_report.v1";
  reportId: string;
  generatedAt: string;
  ideaIds: string[];
  clusters: Array<{
    label: string;
    ideaIds: string[];
    sharedAttributes: string[];
  }>;
  insights: PortfolioInsight[];
  resourceReuse: string[];
  conflicts: string[];
  thesis: string;
  priorities: Array<{
    ideaId: string;
    rank: number;
    rationale: string;
  }>;
  warnings: string[];
}
