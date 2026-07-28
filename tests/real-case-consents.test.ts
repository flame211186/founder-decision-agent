import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const script = fileURLToPath(
  new URL("../scripts/validate-real-case-consents.mjs", import.meta.url)
);

function eligibleConsentRecord() {
  return {
    schema_version: "real_case_consent.v1",
    consent_record_id: "consent_8f31ab20",
    case_id: "real_71c8a2d4",
    case_version: "1",
    participant_id: "participant_a27c12f4",
    jurisdiction: "CN",
    record_status: "eligible",
    consent: {
      obtained_at: "2026-07-28T10:00:00.000Z",
      method: "digital_affirmation",
      obtained_by: "coordinator_a912fbb2",
      withdrawal_process_explained: true,
      data_processors_disclosed: true,
      retention_policy_disclosed: true,
      scopes: {
        agent_evaluation: true,
        external_model_processing: true,
        deidentified_expert_review: true,
        public_release: false
      }
    },
    withdrawal: {
      state: "active",
      requested: false,
      requested_at: null,
      processed_at: null
    },
    deidentification: {
      status: "completed",
      completed_at: "2026-07-28T10:10:00.000Z",
      completed_by: "operator_b93a71c4",
      direct_identifiers_removed: true,
      indirect_identifiers_generalized: true,
      organization_and_person_names_replaced: true,
      secrets_removed: true,
      free_text_manually_reviewed: true,
      reidentification_risk: "low",
      verification: {
        method: "independent_second_person",
        status: "verified",
        verified_at: "2026-07-28T10:20:00.000Z",
        verified_by: "verifier_c81e4d93",
        deidentified_case_sha256:
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
      }
    },
    data_handling: {
      raw_source_storage: "restricted_outside_repository",
      repository_contains_raw_source: false,
      consent_record_contains_direct_identifiers: false,
      deidentified_artifact_location: "private_eval_workspace",
      deletion_process_available: true
    }
  };
}

async function writeRecord(
  directory: string,
  name: string,
  record: unknown
) {
  const path = resolve(directory, name);
  await writeFile(path, JSON.stringify(record));
  return path;
}

function run(...paths: string[]) {
  return spawnSync(process.execPath, [script, ...paths], {
    encoding: "utf8"
  });
}

describe("real-case consent validation", () => {
  it("publishes the validator and public consent Schema", async () => {
    const packagePath = fileURLToPath(new URL("../package.json", import.meta.url));
    const manifest = JSON.parse(await readFile(packagePath, "utf8")) as {
      bin: Record<string, string>;
      exports: Record<string, unknown>;
    };
    expect(manifest.bin["founder-consent-validate"]).toBe(
      "./scripts/validate-real-case-consents.mjs"
    );
    expect(
      manifest.exports["./schemas/real-case-consent.v1.schema.json"]
    ).toBe("./schemas/real-case-consent.v1.schema.json");
  });

  it("runs through an npm-style executable symlink", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "founder-consent-bin-"));
    const executable = resolve(directory, "founder-consent-validate");
    await symlink(script, executable);
    const result = spawnSync(process.execPath, [executable, "--help"], {
      encoding: "utf8"
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Usage:");
  });

  it("accepts an eligible private case without requiring public-release consent", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "founder-consent-valid-"));
    const path = await writeRecord(
      directory,
      "consent.json",
      eligibleConsentRecord()
    );
    const result = run(path);
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      status: "passed",
      summary: {
        recordCount: 1,
        eligibleCaseCount: 1,
        publicReleaseConsentCount: 0,
        stableGateStatus: "not_assessed"
      }
    });
  });

  it("rejects a non-independent verifier and impossible timestamps", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "founder-consent-order-"));
    const record = eligibleConsentRecord();
    record.deidentification.completed_at = "2026-07-28T09:50:00.000Z";
    record.deidentification.verification.verified_by =
      record.deidentification.completed_by;
    const path = await writeRecord(directory, "consent.json", record);
    const result = run(path);
    expect(result.status).toBe(1);
    const output = JSON.parse(result.stderr) as {
      issues: Array<{ code: string }>;
    };
    expect(output.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "CONSENT_DEIDENTIFICATION_TIME_ORDER",
        "VERIFIER_NOT_INDEPENDENT"
      ])
    );
  });

  it("rejects revoked eligibility and incomplete processing consent", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "founder-consent-scope-"));
    const record = eligibleConsentRecord();
    record.consent.scopes.external_model_processing = false;
    Object.assign(record.withdrawal, {
      state: "withdrawn_excluded",
      requested: true,
      requested_at: "2026-07-28T11:00:00.000Z",
      processed_at: "2026-07-28T11:05:00.000Z"
    });
    const path = await writeRecord(directory, "consent.json", record);
    const result = run(path);
    expect(result.status).toBe(1);
    const output = JSON.parse(result.stderr) as {
      issues: Array<{ code: string }>;
    };
    expect(output.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "RECORD_WITHDRAWAL_STATUS_MISMATCH",
        "ELIGIBILITY_STATUS_MISMATCH"
      ])
    );
  });

  it("rejects duplicate consent IDs and case versions", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "founder-consent-dupe-"));
    const first = await writeRecord(
      directory,
      "first.json",
      eligibleConsentRecord()
    );
    const second = await writeRecord(
      directory,
      "second.json",
      eligibleConsentRecord()
    );
    const result = run(first, second);
    expect(result.status).toBe(1);
    const output = JSON.parse(result.stderr) as {
      issues: Array<{ code: string }>;
    };
    expect(output.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "DUPLICATE_CONSENT_RECORD_ID",
        "DUPLICATE_CASE_VERSION"
      ])
    );
  });
});
