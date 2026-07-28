import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

type JsonSchema = Record<string, unknown>;

let canonicalCache: JsonSchema | undefined;
let openAiCache: JsonSchema | undefined;
let evaluationRequestCache: JsonSchema | undefined;
let founderProfileCache: JsonSchema | undefined;
let portfolioRequestCache: JsonSchema | undefined;

function schemaPath(name: string): string {
  return fileURLToPath(new URL(`../schemas/${name}`, import.meta.url));
}

function readSchema(name: string): JsonSchema {
  return JSON.parse(readFileSync(schemaPath(name), "utf8")) as JsonSchema;
}

export function getCanonicalReportSchema(): JsonSchema {
  canonicalCache ??= readSchema("evaluation-report.v1.schema.json");
  return structuredClone(canonicalCache);
}

export function getEvaluationRequestSchema(): JsonSchema {
  evaluationRequestCache ??= readSchema("evaluation-request.v1.schema.json");
  return structuredClone(evaluationRequestCache);
}

export function getFounderProfileSchema(): JsonSchema {
  founderProfileCache ??= readSchema("founder-profile.v1.schema.json");
  return structuredClone(founderProfileCache);
}

export function getPortfolioRequestSchema(): JsonSchema {
  portfolioRequestCache ??= readSchema("portfolio-request.v1.schema.json");
  return structuredClone(portfolioRequestCache);
}

function nullable(schema: JsonSchema): JsonSchema {
  if (Array.isArray(schema.type)) {
    if (!schema.type.includes("null")) {
      return { ...schema, type: [...schema.type, "null"] };
    }
    return schema;
  }
  if (typeof schema.type === "string") {
    return { ...schema, type: [schema.type, "null"] };
  }
  if (schema.anyOf !== undefined) {
    return {
      ...schema,
      anyOf: [...(schema.anyOf as unknown[]), { type: "null" }]
    };
  }
  return { anyOf: [schema, { type: "null" }] };
}

function transformNode(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(transformNode);
  if (value === null || typeof value !== "object") return value;

  const input = value as JsonSchema;
  const output: JsonSchema = {};

  for (const [key, child] of Object.entries(input)) {
    if (["$schema", "$id", "allOf", "if", "then", "else"].includes(key)) continue;
    if (key === "definitions") {
      output.$defs = transformNode(child);
      continue;
    }
    if (key === "$ref" && typeof child === "string") {
      output.$ref = child.replace("#/definitions/", "#/$defs/");
      continue;
    }
    output[key] = transformNode(child);
  }

  if (output.type === "object" && output.properties && typeof output.properties === "object") {
    const properties = output.properties as Record<string, JsonSchema>;
    const existingRequired = new Set(
      Array.isArray(output.required) ? (output.required as string[]) : []
    );
    for (const [key, propertySchema] of Object.entries(properties)) {
      if (!existingRequired.has(key)) {
        properties[key] = nullable(propertySchema);
      }
    }
    output.required = Object.keys(properties);
    output.additionalProperties = false;
  }

  return output;
}

/**
 * OpenAI Structured Outputs supports a strict JSON-Schema subset. The canonical
 * schema keeps conditional Draft-7 rules; this derived schema removes those
 * rules and makes optional fields nullable. Canonical and semantic validation
 * still run after generation.
 */
export function getOpenAiReportSchema(): JsonSchema {
  openAiCache ??= transformNode(getCanonicalReportSchema()) as JsonSchema;
  return structuredClone(openAiCache);
}
