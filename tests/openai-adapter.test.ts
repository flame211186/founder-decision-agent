import { afterEach, describe, expect, it } from "vitest";
import {
  OpenAiAdapter,
  type OpenAiResponsesClient
} from "../src/adapters/openai.js";
import type {
  AnalysisInput,
  EvaluationRequest,
  ReportGenerationInput,
  ResearchInput
} from "../src/types.js";
import { fixtureReport } from "./helpers.js";

const originalApiKey = process.env.OPENAI_API_KEY;

afterEach(() => {
  if (originalApiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalApiKey;
});

function request(mode: "quick" | "deep" = "quick"): EvaluationRequest {
  return {
    schemaVersion: "evaluation_request.v1",
    idea: "A focused feedback SaaS for small agencies",
    mode,
    language: "en",
    jurisdiction: "United States",
    persist: false
  };
}

function analysisInput(): AnalysisInput {
  return {
    role: "opponent",
    request: request(),
    context: "prior context",
    model: "fixture-model",
    reasoningEffort: "medium",
    maxOutputTokens: 1_000
  };
}

function researchInput(): ResearchInput {
  return {
    request: request("deep"),
    model: "fixture-model",
    reasoningEffort: "high",
    maxOutputTokens: 2_000,
    maxSearchCalls: 3
  };
}

function reportInput(mode: "quick" | "deep" = "quick"): ReportGenerationInput {
  return {
    request: request(mode),
    context:
      mode === "deep"
        ? 'RESEARCH_TEXT:\ntext\nALLOWED_SOURCE_URLS_JSON:["https://example.com/source"]'
        : "",
    model: "fixture-model",
    reasoningEffort: mode === "deep" ? "high" : "medium",
    maxOutputTokens: 10_000,
    schema: { type: "object" }
  };
}

function fakeClient(response: unknown) {
  const requests: Array<{
    request: Record<string, unknown>;
    options?: { signal?: AbortSignal };
  }> = [];
  const client: OpenAiResponsesClient = {
    responses: {
      async create(value, options) {
        requests.push({ request: value, ...(options ? { options } : {}) });
        return structuredClone(response);
      }
    }
  };
  return { client, requests };
}

describe("OpenAI Responses adapter", () => {
  it("fails fast when the default BYOK key is absent", () => {
    delete process.env.OPENAI_API_KEY;
    expect(() => new OpenAiAdapter()).toThrowError(
      expect.objectContaining({ code: "MISSING_API_KEY" })
    );
  });

  it("sends privacy, safety and reasoning controls and maps usage", async () => {
    const fake = fakeClient({
      id: "resp_1",
      status: "completed",
      model: "returned-model",
      output_text: "opponent analysis",
      output: [],
      usage: {
        input_tokens: 10,
        output_tokens: 5,
        total_tokens: 15,
        output_tokens_details: { reasoning_tokens: 2 }
      }
    });
    const adapter = new OpenAiAdapter({ client: fake.client });
    const input = analysisInput();
    input.request.safetyIdentifier = "user-123";
    input.signal = new AbortController().signal;
    const result = await adapter.analyze(input);

    expect(result.text).toBe("opponent analysis");
    expect(result.metadata).toMatchObject({
      model: "returned-model",
      responseId: "resp_1",
      usage: {
        inputTokens: 10,
        outputTokens: 5,
        reasoningTokens: 2,
        totalTokens: 15
      }
    });
    const sent = fake.requests[0];
    expect(sent?.request).toMatchObject({
      model: "fixture-model",
      store: false,
      reasoning: { effort: "medium" },
      text: { verbosity: "medium" }
    });
    expect(sent?.request.safety_identifier).not.toBe("user-123");
    expect(String(sent?.request.safety_identifier)).toHaveLength(64);
    expect(sent?.options?.signal).toBe(input.signal);
  });

  it("runs web search and extracts deduplicated citations and queries", async () => {
    const fake = fakeClient({
      model: "search-model",
      output_text: "research",
      output: [
        {
          type: "web_search_call",
          action: {
            query: "primary query",
            queries: ["secondary query"]
          }
        },
        {
          type: "web_search_call",
          queries: ["third query"]
        },
        {
          type: "message",
          content: [
            {
              type: "output_text",
              annotations: [
                {
                  type: "url_citation",
                  url: "https://example.com/source",
                  title: "Primary source",
                  start_index: 0,
                  end_index: 8
                },
                {
                  type: "url_citation",
                  url: "https://example.com/source"
                }
              ]
            }
          ]
        }
      ]
    });
    const adapter = new OpenAiAdapter({ client: fake.client });
    const result = await adapter.research(researchInput());
    expect(result).toMatchObject({
      text: "research",
      model: "search-model",
      searchCalls: 2,
      queries: ["primary query", "secondary query", "third query"]
    });
    expect(result.citations).toEqual([
      {
        url: "https://example.com/source",
        title: "https://example.com/source"
      }
    ]);
    expect(fake.requests[0]?.request).toMatchObject({
      max_tool_calls: 3,
      tools: [{ type: "web_search" }],
      include: ["web_search_call.action.sources"],
      store: false
    });
  });

  it("parses strict report JSON for quick and deep prompts", async () => {
    const report = fixtureReport("002_niche_agency_feedback_saas");
    const fake = fakeClient({
      output_text: JSON.stringify(report),
      output: []
    });
    const adapter = new OpenAiAdapter({ client: fake.client });
    const quick = await adapter.generateReport(reportInput("quick"));
    const deep = await adapter.generateReport(reportInput("deep"));
    expect(quick.report.report_id).toBe(report.report_id);
    expect(deep.report.report_id).toBe(report.report_id);
    expect(fake.requests[0]?.request.text).toMatchObject({
      format: {
        type: "json_schema",
        name: "evaluation_report_v1",
        strict: true
      }
    });
    expect(String(fake.requests[1]?.request.input)).toContain(
      "https://example.com/source"
    );
  });

  it.each([
    [
      "refusal",
      {
        output: [
          {
            content: [{ type: "refusal", refusal: "Cannot comply" }]
          }
        ]
      },
      "MODEL_REFUSAL"
    ],
    [
      "incomplete",
      {
        status: "incomplete",
        incomplete_details: { reason: "max_output_tokens" },
        output: []
      },
      "MODEL_INCOMPLETE"
    ],
    [
      "provider error",
      {
        error: { message: "provider failed" },
        output: []
      },
      "INTERNAL_ERROR"
    ],
    ["missing text", { output: [] }, "MODEL_OUTPUT_INVALID"]
  ])("maps a %s response to a typed error", async (_name, response, code) => {
    const fake = fakeClient(response);
    const adapter = new OpenAiAdapter({ client: fake.client });
    await expect(adapter.analyze(analysisInput())).rejects.toMatchObject({ code });
  });

  it("rejects non-JSON structured output", async () => {
    const fake = fakeClient({ output_text: "not-json", output: [] });
    const adapter = new OpenAiAdapter({ client: fake.client });
    await expect(adapter.generateReport(reportInput())).rejects.toMatchObject({
      code: "MODEL_OUTPUT_INVALID",
      retryable: true
    });
  });
});
