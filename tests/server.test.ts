import { mkdtemp } from "node:fs/promises";
import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SqliteStorage } from "../src/adapters/sqlite.js";
import { createFounderDecisionHttpServer } from "../src/server.js";
import { FounderDecisionAgent } from "../src/workflow.js";
import { FixtureModel, fixtureReport } from "./helpers.js";

const openStorages: SqliteStorage[] = [];

afterEach(async () => {
  await Promise.all(openStorages.splice(0).map((storage) => storage.close()));
});

async function createTestServer(options: {
  token?: string;
  maxBodyBytes?: number;
} = { token: "test-token" }) {
  const directory = await mkdtemp(resolve(tmpdir(), "founder-decision-http-"));
  const storage = new SqliteStorage(resolve(directory, "data.sqlite"));
  const model = new FixtureModel([fixtureReport("002_niche_agency_feedback_saas")]);
  const agent = new FounderDecisionAgent({
    model,
    storage,
    now: () => new Date("2026-07-28T10:00:00.000Z")
  });
  const server = createFounderDecisionHttpServer({
    agent,
    storage,
    ...(options.token ? { token: options.token } : {}),
    ...(options.maxBodyBytes ? { maxBodyBytes: options.maxBodyBytes } : {})
  });
  openStorages.push(storage);
  return { server, model };
}

async function invoke(
  server: ReturnType<typeof createFounderDecisionHttpServer>,
  input: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: unknown;
    rawBody?: string;
  }
): Promise<{
  status: number;
  headers: Record<string, string>;
  body: unknown;
}> {
  const body =
    input.rawBody ?? (input.body === undefined ? "" : JSON.stringify(input.body));
  const request = Readable.from(body ? [Buffer.from(body)] : []) as IncomingMessage;
  Object.assign(request, {
    method: input.method,
    url: input.path,
    headers: input.headers ?? {}
  });

  return new Promise((resolveResponse, rejectResponse) => {
    const headers: Record<string, string> = {};
    let status = 200;
    const response = {
      setHeader(name: string, value: string | number | readonly string[]) {
        headers[name.toLowerCase()] = Array.isArray(value) ? value.join(", ") : String(value);
        return this;
      },
      writeHead(code: number, values?: Record<string, string | number>) {
        status = code;
        for (const [name, value] of Object.entries(values ?? {})) {
          headers[name.toLowerCase()] = String(value);
        }
        return this;
      },
      end(value?: string | Buffer) {
        try {
          const text = value?.toString() ?? "";
          resolveResponse({
            status,
            headers,
            body: text ? (JSON.parse(text) as unknown) : null
          });
        } catch (error) {
          rejectResponse(error);
        }
        return this;
      }
    } as unknown as ServerResponse;
    server.emit("request", request, response);
  });
}

describe("HTTP API", () => {
  it("exposes unauthenticated health and protects application routes", async () => {
    const { server } = await createTestServer();
    const health = await invoke(server, { method: "GET", path: "/health" });
    expect(health.status).toBe(200);
    expect(health.headers["cache-control"]).toBe("no-store");
    expect(health.body).toMatchObject({
      status: "ok",
      service: "founder-decision-agent"
    });

    const unauthorized = await invoke(server, {
      method: "GET",
      path: "/v1/evaluations"
    });
    expect(unauthorized.status).toBe(401);
    expect(unauthorized.body).toMatchObject({
      error: { code: "UNAUTHORIZED" }
    });
  });

  it("evaluates, persists, lists and deletes a report", async () => {
    const { server } = await createTestServer();
    const headers: Record<string, string> = {
      authorization: "Bearer test-token",
      "content-type": "application/json"
    };
    const response = await invoke(server, {
      method: "POST",
      path: "/v1/evaluations",
      headers,
      body: {
        schemaVersion: "evaluation_request.v1",
        idea: "A focused feedback SaaS for small agencies",
        mode: "quick",
        language: "en"
      }
    });
    expect(response.status).toBe(200);
    const outcome = response.body as {
      report: { report_id: string };
      manifest: { status: string };
    };
    expect(outcome.manifest.status).toBe("completed");

    const list = await invoke(server, {
      method: "GET",
      path: "/v1/evaluations",
      headers
    });
    expect(list.body).toEqual([
      expect.objectContaining({
        report_id: outcome.report.report_id,
        verdict: "pursue"
      })
    ]);

    const deletion = await invoke(server, {
      method: "DELETE",
      path: `/v1/evaluations/${encodeURIComponent(outcome.report.report_id)}`,
      headers
    });
    expect(deletion.body).toEqual({ deleted: true });
  });

  it("supports profile, portfolio and export routes", async () => {
    const { server } = await createTestServer();
    const headers = {
      authorization: "Bearer test-token",
      "content-type": "application/json"
    };
    const profile = {
      schemaVersion: "founder_profile.v1",
      profileId: "profile_http",
      version: 1,
      currentRoles: ["developer"]
    };

    const mismatch = await invoke(server, {
      method: "PUT",
      path: "/v1/profiles/other",
      headers,
      body: profile
    });
    expect(mismatch.status).toBe(400);

    const saved = await invoke(server, {
      method: "PUT",
      path: "/v1/profiles/profile_http",
      headers,
      body: profile
    });
    expect(saved.body).toEqual(profile);
    const read = await invoke(server, {
      method: "GET",
      path: "/v1/profiles/profile_http",
      headers
    });
    expect(read.body).toEqual(profile);

    const portfolio = await invoke(server, {
      method: "POST",
      path: "/v1/portfolio-analyses",
      headers,
      body: {
        schemaVersion: "portfolio_request.v1",
        reports: [
          fixtureReport("001_idea_evaluator_agent"),
          fixtureReport("002_niche_agency_feedback_saas")
        ],
        language: "en"
      }
    });
    expect(portfolio.status).toBe(200);
    expect(portfolio.body).toMatchObject({
      schemaVersion: "portfolio_report.v1"
    });

    const exported = await invoke(server, {
      method: "GET",
      path: "/v1/export",
      headers
    });
    expect(exported.body).toMatchObject({
      schemaVersion: "founder_decision_export.v1",
      profiles: [profile]
    });

    const deleted = await invoke(server, {
      method: "DELETE",
      path: "/v1/profiles/profile_http",
      headers
    });
    expect(deleted.body).toEqual({ deleted: true });
  });

  it("returns typed errors for malformed bodies, missing records and routes", async () => {
    const { server } = await createTestServer({ token: "test-token", maxBodyBytes: 20 });
    const headers = {
      authorization: "Bearer test-token",
      "content-type": "application/json"
    };
    const invalidJson = await invoke(server, {
      method: "POST",
      path: "/v1/evaluations",
      headers,
      rawBody: "{"
    });
    expect(invalidJson).toMatchObject({
      status: 400,
      body: { error: { code: "INVALID_INPUT" } }
    });

    const tooLarge = await invoke(server, {
      method: "POST",
      path: "/v1/evaluations",
      headers,
      body: { idea: "This request is intentionally larger than twenty bytes." }
    });
    expect(tooLarge.status).toBe(400);

    const missingReport = await invoke(server, {
      method: "GET",
      path: "/v1/evaluations/missing",
      headers
    });
    expect(missingReport).toMatchObject({
      status: 404,
      body: { error: { code: "NOT_FOUND" } }
    });
    const missingProfile = await invoke(server, {
      method: "GET",
      path: "/v1/profiles/missing",
      headers
    });
    expect(missingProfile.status).toBe(404);

    const unknownRoute = await invoke(server, {
      method: "GET",
      path: "/v1/unknown",
      headers
    });
    expect(unknownRoute.status).toBe(404);
  });

  it("allows application routes when no bearer token is configured", async () => {
    const { server } = await createTestServer({});
    const response = await invoke(server, {
      method: "GET",
      path: "/v1/evaluations"
    });
    expect(response).toMatchObject({ status: 200, body: [] });
  });
});
