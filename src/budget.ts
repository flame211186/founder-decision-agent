import { AgentError } from "./errors.js";
import type { EvaluationMode, ResourceBudget } from "./types.js";

export const DEFAULT_BUDGETS: Record<EvaluationMode, ResourceBudget> = {
  quick: {
    maxModelCalls: 2,
    maxSearchCalls: 0,
    maxWallTimeMs: 2 * 60 * 1000,
    maxOutputTokensPerCall: 24_000
  },
  deep: {
    maxModelCalls: 8,
    maxSearchCalls: 10,
    maxWallTimeMs: 15 * 60 * 1000,
    maxOutputTokensPerCall: 32_000
  }
};

export function resolveBudget(
  mode: EvaluationMode,
  override: Partial<ResourceBudget> | undefined
): ResourceBudget {
  const result = { ...DEFAULT_BUDGETS[mode], ...override };
  for (const [key, value] of Object.entries(result)) {
    const valid =
      key === "maxSearchCalls"
        ? Number.isFinite(value) && value >= 0
        : Number.isFinite(value) && value > 0;
    if (!valid) {
      throw new AgentError(
        "INVALID_INPUT",
        `${key} must be ${key === "maxSearchCalls" ? "non-negative" : "positive"} and finite`
      );
    }
  }
  if (mode === "quick" && result.maxSearchCalls !== 0) {
    result.maxSearchCalls = 0;
  }
  return result;
}

export class BudgetTracker {
  readonly startedAt = Date.now();
  modelCalls = 0;
  searchCalls = 0;

  constructor(readonly budget: ResourceBudget) {}

  consumeModelCall(role: string): void {
    this.assertTime();
    if (this.modelCalls >= this.budget.maxModelCalls) {
      throw new AgentError("BUDGET_EXHAUSTED", "Model-call budget exhausted", {
        details: { role, used: this.modelCalls, limit: this.budget.maxModelCalls }
      });
    }
    this.modelCalls += 1;
  }

  consumeSearchCall(): void {
    this.consumeSearchCalls(1);
  }

  consumeSearchCalls(count: number): void {
    this.assertTime();
    if (!Number.isInteger(count) || count < 0) {
      throw new AgentError("INVALID_INPUT", "Search-call count must be a non-negative integer");
    }
    if (this.searchCalls + count > this.budget.maxSearchCalls) {
      throw new AgentError("BUDGET_EXHAUSTED", "Search-call budget exhausted", {
        details: {
          used: this.searchCalls,
          requested: count,
          limit: this.budget.maxSearchCalls
        }
      });
    }
    this.searchCalls += count;
  }

  assertTime(): void {
    if (this.elapsedMs > this.budget.maxWallTimeMs) {
      throw new AgentError("BUDGET_EXHAUSTED", "Wall-time budget exhausted", {
        details: { elapsedMs: this.elapsedMs, limitMs: this.budget.maxWallTimeMs }
      });
    }
  }

  get elapsedMs(): number {
    return Date.now() - this.startedAt;
  }

  get remainingModelCalls(): number {
    return this.budget.maxModelCalls - this.modelCalls;
  }
}
