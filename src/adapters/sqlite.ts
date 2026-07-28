import { chmodSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import { AgentError } from "../errors.js";
import type {
  EvaluationOutcome,
  EvaluationSummary,
  FounderProfile,
  StorageAdapter
} from "../types.js";

const SCHEMA_VERSION = 1;

export class SqliteStorage implements StorageAdapter {
  private readonly database: Database.Database;

  constructor(path: string) {
    const absolute = resolve(path);
    mkdirSync(dirname(absolute), { recursive: true, mode: 0o700 });
    this.database = new Database(absolute);
    this.database.pragma("journal_mode = WAL");
    this.database.pragma("foreign_keys = ON");
    this.migrate();
    try {
      chmodSync(absolute, 0o600);
    } catch {
      // Some platforms do not implement POSIX permissions. The security guide
      // documents the platform-specific responsibility.
    }
  }

  async saveEvaluation(outcome: EvaluationOutcome): Promise<void> {
    try {
      this.database
        .prepare(
          `INSERT INTO evaluations (
            report_id, idea_id, generated_at, verdict, report_json, markdown, manifest_json
          ) VALUES (
            @reportId, @ideaId, @generatedAt, @verdict, @reportJson, @markdown, @manifestJson
          )
          ON CONFLICT(report_id) DO UPDATE SET
            report_json = excluded.report_json,
            markdown = excluded.markdown,
            manifest_json = excluded.manifest_json`
        )
        .run({
          reportId: outcome.report.report_id,
          ideaId: outcome.report.idea_id,
          generatedAt: outcome.report.generated_at,
          verdict: outcome.report.verdict.label,
          reportJson: JSON.stringify(outcome.report),
          markdown: outcome.markdown,
          manifestJson: JSON.stringify(outcome.manifest)
        });
    } catch (error) {
      throw new AgentError("STORAGE_ERROR", "Failed to save evaluation", { cause: error });
    }
  }

  async getEvaluation(reportId: string): Promise<EvaluationOutcome | null> {
    const row = this.database
      .prepare(
        `SELECT report_json AS reportJson, markdown, manifest_json AS manifestJson
         FROM evaluations WHERE report_id = ?`
      )
      .get(reportId) as
      | { reportJson: string; markdown: string; manifestJson: string }
      | undefined;
    if (!row) return null;
    return {
      report: JSON.parse(row.reportJson) as EvaluationOutcome["report"],
      markdown: row.markdown,
      manifest: JSON.parse(row.manifestJson) as EvaluationOutcome["manifest"]
    };
  }

  async listEvaluations(): Promise<EvaluationSummary[]> {
    const rows = this.database
      .prepare(
        `SELECT report_id AS reportId, idea_id AS ideaId, generated_at AS generatedAt,
                verdict
         FROM evaluations ORDER BY generated_at DESC`
      )
      .all() as Array<{
      reportId: string;
      ideaId: string;
      generatedAt: string;
      verdict: EvaluationSummary["verdict"];
    }>;
    return rows.map((row) => ({
      report_id: row.reportId,
      idea_id: row.ideaId,
      generated_at: row.generatedAt,
      verdict: row.verdict
    }));
  }

  async deleteEvaluation(reportId: string): Promise<boolean> {
    return this.database.prepare("DELETE FROM evaluations WHERE report_id = ?").run(reportId)
      .changes > 0;
  }

  async saveProfile(profile: FounderProfile): Promise<void> {
    try {
      this.database
        .prepare(
          `INSERT INTO profiles (profile_id, version, profile_json, updated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(profile_id) DO UPDATE SET
             version = excluded.version,
             profile_json = excluded.profile_json,
             updated_at = excluded.updated_at`
        )
        .run(profile.profileId, profile.version, JSON.stringify(profile), new Date().toISOString());
    } catch (error) {
      throw new AgentError("STORAGE_ERROR", "Failed to save founder profile", {
        cause: error
      });
    }
  }

  async getProfile(profileId: string): Promise<FounderProfile | null> {
    const row = this.database
      .prepare("SELECT profile_json AS profileJson FROM profiles WHERE profile_id = ?")
      .get(profileId) as { profileJson: string } | undefined;
    return row ? (JSON.parse(row.profileJson) as FounderProfile) : null;
  }

  async deleteProfile(profileId: string): Promise<boolean> {
    return this.database.prepare("DELETE FROM profiles WHERE profile_id = ?").run(profileId)
      .changes > 0;
  }

  async exportAll(): Promise<Record<string, unknown>> {
    const evaluations = this.database
      .prepare(
        "SELECT report_json AS reportJson, markdown, manifest_json AS manifestJson FROM evaluations ORDER BY generated_at"
      )
      .all() as Array<{ reportJson: string; markdown: string; manifestJson: string }>;
    const profiles = this.database
      .prepare("SELECT profile_json AS profileJson FROM profiles ORDER BY profile_id")
      .all() as Array<{ profileJson: string }>;
    return {
      schemaVersion: "founder_decision_export.v1",
      exportedAt: new Date().toISOString(),
      evaluations: evaluations.map((row) => ({
        report: JSON.parse(row.reportJson),
        markdown: row.markdown,
        manifest: JSON.parse(row.manifestJson)
      })),
      profiles: profiles.map((row) => JSON.parse(row.profileJson))
    };
  }

  async close(): Promise<void> {
    this.database.close();
  }

  private migrate(): void {
    const current = this.database.pragma("user_version", { simple: true }) as number;
    if (current > SCHEMA_VERSION) {
      throw new AgentError(
        "STORAGE_ERROR",
        `Database version ${current} is newer than supported version ${SCHEMA_VERSION}`
      );
    }
    if (current < 1) {
      this.database.exec(`
        CREATE TABLE evaluations (
          report_id TEXT PRIMARY KEY,
          idea_id TEXT NOT NULL,
          generated_at TEXT NOT NULL,
          verdict TEXT NOT NULL,
          report_json TEXT NOT NULL,
          markdown TEXT NOT NULL,
          manifest_json TEXT NOT NULL
        );
        CREATE INDEX evaluations_idea_id_idx ON evaluations (idea_id);
        CREATE INDEX evaluations_generated_at_idx ON evaluations (generated_at);

        CREATE TABLE profiles (
          profile_id TEXT PRIMARY KEY,
          version INTEGER NOT NULL,
          profile_json TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        PRAGMA user_version = 1;
      `);
    }
  }
}
