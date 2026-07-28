import OpenAI from "openai";
import { AgentError } from "../errors.js";
import { stableSafetyIdentifier } from "../ids.js";
import {
  deepReportPrompt,
  quickReportPrompt,
  researchPrompt,
  rolePrompt
} from "../prompts.js";
import type {
  AnalysisInput,
  AnalysisResult,
  Citation,
  EvaluationReport,
  ModelAdapter,
  ModelRunMetadata,
  ReportGenerationInput,
  ReportGenerationResult,
  ResearchInput,
  ResearchResult,
  TokenUsage
} from "../types.js";

export interface OpenAiAdapterOptions {
  apiKey?: string;
  baseURL?: string;
  organization?: string;
  project?: string;
  client?: OpenAiResponsesClient;
}

export interface OpenAiResponsesClient {
  responses: {
    create(
      request: Record<string, unknown>,
      options?: { signal?: AbortSignal }
    ): Promise<unknown>;
  };
}

type ResponseLike = {
  id?: string;
  status?: string;
  model?: string;
  output_text?: string;
  output?: unknown[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    output_tokens_details?: { reasoning_tokens?: number };
  };
  error?: { message?: string } | null;
  incomplete_details?: { reason?: string } | null;
};

export class OpenAiAdapter implements ModelAdapter {
  readonly id = "openai.responses";
  private readonly client: OpenAiResponsesClient;

  constructor(options: OpenAiAdapterOptions = {}) {
    if (options.client) {
      this.client = options.client;
      return;
    }
    const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new AgentError(
        "MISSING_API_KEY",
        "OPENAI_API_KEY is required for the default BYOK adapter"
      );
    }
    this.client = new OpenAI({
      apiKey,
      ...(options.baseURL ? { baseURL: options.baseURL } : {}),
      ...(options.organization ? { organization: options.organization } : {}),
      ...(options.project ? { project: options.project } : {})
    });
  }

  async analyze(input: AnalysisInput): Promise<AnalysisResult> {
    const prompt = rolePrompt(input.role, input.request, input.context);
    const response = await this.createResponse(
      this.requestBase(input.request.safetyIdentifier, {
        model: input.model,
        input: prompt,
        max_output_tokens: input.maxOutputTokens,
        reasoning: { effort: input.reasoningEffort },
        text: { verbosity: "medium" }
      }),
      input.signal
    );
    const text = this.extractText(response);
    return { text, metadata: this.metadata(response) };
  }

  async research(input: ResearchInput): Promise<ResearchResult> {
    const response = await this.createResponse(
      this.requestBase(input.request.safetyIdentifier, {
        model: input.model,
        input: researchPrompt(input.request),
        max_output_tokens: input.maxOutputTokens,
        max_tool_calls: input.maxSearchCalls,
        reasoning: { effort: input.reasoningEffort },
        tools: [{ type: "web_search" }],
        include: ["web_search_call.action.sources"],
        text: { verbosity: "medium" }
      }),
      input.signal
    );
    const text = this.extractText(response);
    const citations = extractCitations(response.output ?? []);
    return {
      text,
      citations,
      queries: extractSearchQueries(response.output ?? []),
      model: response.model ?? input.model,
      ...(response.usage ? { usage: mapUsage(response.usage) } : {})
    };
  }

  async generateReport(input: ReportGenerationInput): Promise<ReportGenerationResult> {
    const prompt =
      input.request.mode === "deep"
        ? deepReportPrompt(
            input.request,
            input.context,
            extractAllowedUrls(input.context),
            input.repairErrors
          )
        : quickReportPrompt(input.request, input.repairErrors);
    const response = await this.createResponse(
      this.requestBase(input.request.safetyIdentifier, {
        model: input.model,
        input: prompt,
        max_output_tokens: input.maxOutputTokens,
        reasoning: { effort: input.reasoningEffort },
        text: {
          verbosity: "medium",
          format: {
            type: "json_schema",
            name: "evaluation_report_v1",
            strict: true,
            schema: input.schema
          }
        }
      }),
      input.signal
    );
    const text = this.extractText(response);
    let report: EvaluationReport;
    try {
      report = JSON.parse(text) as EvaluationReport;
    } catch (error) {
      throw new AgentError("MODEL_OUTPUT_INVALID", "Model did not return valid JSON", {
        retryable: true,
        cause: error
      });
    }
    return { report, metadata: this.metadata(response) };
  }

  private requestBase(
    safetyIdentifier: string | undefined,
    request: Record<string, unknown>
  ): Record<string, unknown> {
    return {
      ...request,
      store: false,
      ...(safetyIdentifier
        ? { safety_identifier: stableSafetyIdentifier(safetyIdentifier) }
        : {})
    };
  }

  private async createResponse(
    request: Record<string, unknown>,
    signal: AbortSignal | undefined
  ): Promise<ResponseLike> {
    return (await this.client.responses.create(
      request,
      signal ? { signal } : undefined
    )) as ResponseLike;
  }

  private extractText(response: ResponseLike): string {
    const refusal = findRefusal(response.output ?? []);
    if (refusal) {
      throw new AgentError("MODEL_REFUSAL", refusal, { retryable: false });
    }
    if (response.status === "incomplete") {
      throw new AgentError(
        "MODEL_INCOMPLETE",
        response.incomplete_details?.reason ?? "OpenAI response was incomplete",
        { retryable: true }
      );
    }
    if (response.error) {
      throw new AgentError("INTERNAL_ERROR", response.error.message ?? "OpenAI response failed", {
        retryable: true
      });
    }
    const text = response.output_text;
    if (!text) {
      throw new AgentError("MODEL_OUTPUT_INVALID", "OpenAI response contained no output text", {
        retryable: true
      });
    }
    return text;
  }

  private metadata(response: ResponseLike): ModelRunMetadata {
    return {
      model: response.model ?? "unknown",
      ...(response.id ? { responseId: response.id } : {}),
      ...(response.usage ? { usage: mapUsage(response.usage) } : {}),
      citations: extractCitations(response.output ?? [])
    };
  }
}

function mapUsage(usage: NonNullable<ResponseLike["usage"]>): TokenUsage {
  return {
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    reasoningTokens: usage.output_tokens_details?.reasoning_tokens ?? 0,
    totalTokens: usage.total_tokens ?? 0
  };
}

function findRefusal(output: unknown[]): string | undefined {
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown[] }).content ?? [];
    for (const part of content) {
      if (
        part &&
        typeof part === "object" &&
        (part as { type?: string }).type === "refusal"
      ) {
        return (part as { refusal?: string }).refusal ?? "The model refused the request";
      }
    }
  }
  return undefined;
}

function extractCitations(output: unknown[]): Citation[] {
  const byUrl = new Map<string, Citation>();
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown[] }).content ?? [];
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const annotations = (part as { annotations?: unknown[] }).annotations ?? [];
      for (const annotation of annotations) {
        if (
          annotation &&
          typeof annotation === "object" &&
          (annotation as { type?: string }).type === "url_citation"
        ) {
          const item = annotation as {
            url?: string;
            title?: string;
            start_index?: number;
            end_index?: number;
          };
          if (item.url) {
            byUrl.set(item.url, {
              url: item.url,
              title: item.title ?? item.url,
              ...(item.start_index !== undefined ? { startIndex: item.start_index } : {}),
              ...(item.end_index !== undefined ? { endIndex: item.end_index } : {})
            });
          }
        }
      }
    }
  }
  return [...byUrl.values()];
}

function extractSearchQueries(output: unknown[]): string[] {
  const queries = new Set<string>();
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const typed = item as {
      type?: string;
      action?: { query?: string; queries?: string[] };
      queries?: string[];
    };
    if (typed.type !== "web_search_call") continue;
    if (typed.action?.query) queries.add(typed.action.query);
    for (const query of typed.action?.queries ?? typed.queries ?? []) queries.add(query);
  }
  return [...queries];
}

function extractAllowedUrls(context: string): string[] {
  const marker = "ALLOWED_SOURCE_URLS_JSON:";
  const index = context.lastIndexOf(marker);
  if (index < 0) return [];
  const line = context.slice(index + marker.length).split("\n", 1)[0]?.trim();
  if (!line) return [];
  try {
    const urls = JSON.parse(line) as unknown;
    return Array.isArray(urls) ? urls.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}
