import { mkdtemp, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SqliteStorage } from "../src/adapters/sqlite.js";
import { renderReport } from "../src/renderer.js";
import type { EvaluationOutcome, FounderProfile } from "../src/types.js";
import { fixtureReport } from "./helpers.js";

describe("SQLite storage", () => {
  it("saves, exports and deletes evaluations and profiles", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "founder-decision-test-"));
    const path = resolve(directory, "data.sqlite");
    const storage = new SqliteStorage(path);
    const report = fixtureReport("002_niche_agency_feedback_saas");
    const outcome: EvaluationOutcome = {
      report,
      markdown: renderReport(report),
      manifest: {
        schemaVersion: "run_manifest.v1",
        runId: "run_test",
        reportId: report.report_id,
        ideaId: report.idea_id,
        mode: "quick",
        startedAt: report.generated_at,
        completedAt: report.generated_at,
        workflowVersion: "test",
        promptVersion: "test",
        schemaVersionUsed: "evaluation_report.v1",
        provider: "fixture",
        calls: [],
        budget: {
          maxModelCalls: 2,
          maxSearchCalls: 0,
          maxWallTimeMs: 1_000,
          maxOutputTokensPerCall: 1_000
        },
        budgetUsed: { modelCalls: 1, searchCalls: 0, elapsedMs: 1 },
        validation: { valid: true, issues: [] },
        status: "completed",
        warnings: []
      }
    };
    const profile: FounderProfile = {
      schemaVersion: "founder_profile.v1",
      profileId: "profile_test",
      version: 1,
      currentRoles: ["developer"]
    };

    await storage.saveEvaluation(outcome);
    await storage.saveProfile(profile);
    expect((await storage.getEvaluation(report.report_id))?.report.idea_id).toBe(report.idea_id);
    expect((await storage.getProfile(profile.profileId))?.currentRoles).toEqual(["developer"]);
    expect((await storage.exportAll()).evaluations).toHaveLength(1);
    expect((await stat(path)).mode & 0o777).toBe(0o600);
    expect(await storage.deleteEvaluation(report.report_id)).toBe(true);
    expect(await storage.deleteProfile(profile.profileId)).toBe(true);
    await storage.close();
  });
});
