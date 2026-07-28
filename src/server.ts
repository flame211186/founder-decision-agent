#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { createServer as createNodeServer, type IncomingMessage, type ServerResponse } from "node:http";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { OpenAiAdapter } from "./adapters/openai.js";
import { SqliteStorage } from "./adapters/sqlite.js";
import { AgentError, toAgentError } from "./errors.js";
import { analyzePortfolio } from "./portfolio.js";
import type {
  EvaluationRequest,
  FounderProfile,
  PortfolioRequest,
  StorageAdapter
} from "./types.js";
import { validateFounderProfile, validationMessages } from "./validation.js";
import { FounderDecisionAgent } from "./workflow.js";
import { VERSION } from "./version.js";

export interface HttpServerOptions {
  agent: FounderDecisionAgent;
  storage: StorageAdapter;
  token?: string;
  maxBodyBytes?: number;
}

export function createFounderDecisionHttpServer(options: HttpServerOptions) {
  const maxBodyBytes = options.maxBodyBytes ?? 1_000_000;
  return createNodeServer(async (request, response) => {
    try {
      setSecurityHeaders(response);
      const url = new URL(request.url ?? "/", "http://localhost");
      if (request.method === "GET" && url.pathname === "/health") {
        return json(response, 200, {
          status: "ok",
          service: "founder-decision-agent",
          version: VERSION
        });
      }
      authorize(request, options.token);

      if (request.method === "POST" && url.pathname === "/v1/evaluations") {
        const body = await readJson<EvaluationRequest>(request, maxBodyBytes);
        return json(response, 200, await options.agent.evaluate(body));
      }
      if (request.method === "GET" && url.pathname === "/v1/evaluations") {
        return json(response, 200, await options.storage.listEvaluations());
      }
      const evaluationId = matchId(url.pathname, "/v1/evaluations/");
      if (evaluationId && request.method === "GET") {
        const value = await options.storage.getEvaluation(evaluationId);
        if (!value) throw new AgentError("NOT_FOUND", `Report ${evaluationId} not found`);
        return json(response, 200, value);
      }
      if (evaluationId && request.method === "DELETE") {
        return json(response, 200, { deleted: await options.storage.deleteEvaluation(evaluationId) });
      }
      if (request.method === "POST" && url.pathname === "/v1/portfolio-analyses") {
        const body = await readJson<PortfolioRequest>(request, maxBodyBytes);
        return json(response, 200, analyzePortfolio(body));
      }
      const profileId = matchId(url.pathname, "/v1/profiles/");
      if (profileId && request.method === "GET") {
        const value = await options.storage.getProfile(profileId);
        if (!value) throw new AgentError("NOT_FOUND", `Profile ${profileId} not found`);
        return json(response, 200, value);
      }
      if (profileId && request.method === "PUT") {
        const body = await readJson<FounderProfile>(request, maxBodyBytes);
        const validation = validateFounderProfile(body);
        if (!validation.valid) {
          throw new AgentError("INVALID_INPUT", validationMessages(validation).join("\n"), {
            details: { issues: validation.issues }
          });
        }
        if (body.profileId !== profileId) {
          throw new AgentError("INVALID_INPUT", "Path profile ID must match body profileId");
        }
        await options.storage.saveProfile(body);
        return json(response, 200, body);
      }
      if (profileId && request.method === "DELETE") {
        return json(response, 200, { deleted: await options.storage.deleteProfile(profileId) });
      }
      if (request.method === "GET" && url.pathname === "/v1/export") {
        return json(response, 200, await options.storage.exportAll());
      }
      return json(response, 404, {
        error: { code: "NOT_FOUND", message: "Route not found" }
      });
    } catch (error) {
      const agentError = toAgentError(error);
      const status =
        agentError.code === "NOT_FOUND"
          ? 404
          : agentError.code === "UNAUTHORIZED"
            ? 401
          : agentError.code === "INVALID_INPUT"
            ? 400
            : agentError.code === "MISSING_API_KEY"
              ? 503
              : agentError.code === "BUDGET_EXHAUSTED"
                ? 429
                : 500;
      return json(response, status, {
        error: {
          code: agentError.code,
          message: agentError.message,
          retryable: agentError.retryable,
          details: agentError.details
        }
      });
    }
  });
}

function authorize(request: IncomingMessage, token: string | undefined): void {
  if (!token) return;
  if (request.headers.authorization !== `Bearer ${token}`) {
    throw new AgentError("UNAUTHORIZED", "Unauthorized");
  }
}

async function readJson<T>(request: IncomingMessage, maxBytes: number): Promise<T> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maxBytes) throw new AgentError("INVALID_INPUT", "Request body is too large");
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
  } catch (error) {
    throw new AgentError("INVALID_INPUT", "Request body must be valid JSON", { cause: error });
  }
}

function json(response: ServerResponse, status: number, body: unknown): void {
  const value = `${JSON.stringify(body)}\n`;
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(value)
  });
  response.end(value);
}

function setSecurityHeaders(response: ServerResponse): void {
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("cache-control", "no-store");
  response.setHeader("referrer-policy", "no-referrer");
}

function matchId(path: string, prefix: string): string | undefined {
  if (!path.startsWith(prefix)) return undefined;
  const value = path.slice(prefix.length);
  return value && !value.includes("/") ? decodeURIComponent(value) : undefined;
}

async function main(): Promise<void> {
  const host = process.env.FOUNDER_DECISION_HOST ?? "127.0.0.1";
  const port = Number(process.env.PORT ?? "8787");
  const token = process.env.FOUNDER_DECISION_SERVER_TOKEN;
  if (!["127.0.0.1", "::1", "localhost"].includes(host) && !token) {
    throw new AgentError(
      "INVALID_INPUT",
      "FOUNDER_DECISION_SERVER_TOKEN is required when binding outside loopback"
    );
  }
  const model = new OpenAiAdapter();
  const storage = new SqliteStorage(
    process.env.FOUNDER_DECISION_DB ??
      resolve(homedir(), ".founder-decision", "server.sqlite")
  );
  const agent = new FounderDecisionAgent({
    model,
    storage
  });
  const server = createFounderDecisionHttpServer({
    agent,
    storage,
    ...(token ? { token } : {})
  });
  server.listen(port, host, () => {
    process.stderr.write(`Founder Decision Agent listening on http://${host}:${port}\n`);
  });
  const shutdown = () => {
    server.close(() => {
      void storage.close().finally(() => process.exit(0));
    });
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

if (isMainModule()) {
  main().catch((error: unknown) => {
    const agentError = toAgentError(error);
    process.stderr.write(`${agentError.code}: ${agentError.message}\n`);
    process.exitCode = 1;
  });
}

function isMainModule(): boolean {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}
