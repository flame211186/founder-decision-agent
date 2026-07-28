export type AgentErrorCode =
  | "INVALID_INPUT"
  | "UNAUTHORIZED"
  | "MISSING_API_KEY"
  | "MODEL_REFUSAL"
  | "MODEL_INCOMPLETE"
  | "MODEL_OUTPUT_INVALID"
  | "BUDGET_EXHAUSTED"
  | "RESEARCH_UNAVAILABLE"
  | "VALIDATION_FAILED"
  | "STORAGE_ERROR"
  | "NOT_FOUND"
  | "INTERNAL_ERROR";

export class AgentError extends Error {
  readonly code: AgentErrorCode;
  readonly retryable: boolean;
  readonly details?: Record<string, unknown>;

  constructor(
    code: AgentErrorCode,
    message: string,
    options: { retryable?: boolean; details?: Record<string, unknown>; cause?: unknown } = {}
  ) {
    super(message, { cause: options.cause });
    this.name = "AgentError";
    this.code = code;
    this.retryable = options.retryable ?? false;
    if (options.details !== undefined) this.details = options.details;
  }
}

export function toAgentError(error: unknown): AgentError {
  if (error instanceof AgentError) return error;
  if (error instanceof Error) {
    return new AgentError("INTERNAL_ERROR", error.message, { cause: error });
  }
  return new AgentError("INTERNAL_ERROR", "Unknown error", {
    details: { value: String(error) }
  });
}
