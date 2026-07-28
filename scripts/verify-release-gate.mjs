#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const stableSemver =
  /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/;
const sha256 = /^[a-f0-9]{64}$/;
const gitSha = /^[a-f0-9]{40}$/;

export function parseReleaseGateArgs(arguments_) {
  const parsed = {};
  const allowed = new Set(["--event", "--package", "--source-sha"]);
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--help" || argument === "-h") {
      return { help: true };
    }
    if (!allowed.has(argument)) {
      throw gateError("INVALID_INPUT", `Unknown argument: ${argument}`);
    }
    const value = arguments_[index + 1];
    if (!value || value.startsWith("--")) {
      throw gateError("INVALID_INPUT", `${argument} requires a value`);
    }
    parsed[argument.slice(2).replaceAll("-", "_")] = value;
    index += 1;
  }
  for (const field of ["event", "package", "source_sha"]) {
    if (!parsed[field]) {
      throw gateError(
        "INVALID_INPUT",
        `--${field.replaceAll("_", "-")} is required`
      );
    }
  }
  return { ...parsed, help: false };
}

export function verifyReleaseGate({
  event,
  manifest,
  sourceSha,
  environment
}) {
  if (event.action !== "published" || !event.release) {
    throw gateError(
      "RELEASE_EVENT_INVALID",
      "Expected a published GitHub release event."
    );
  }
  if (event.release.draft) {
    throw gateError(
      "RELEASE_DRAFT_FORBIDDEN",
      "A draft release cannot publish npm artifacts."
    );
  }
  const version = manifest.version;
  if (event.release.tag_name !== `v${version}`) {
    throw gateError(
      "RELEASE_TAG_VERSION_MISMATCH",
      `Expected release tag v${version}.`
    );
  }
  if (!gitSha.test(sourceSha)) {
    throw gateError(
      "RELEASE_SOURCE_SHA_INVALID",
      "The checked-out release source must be a full lowercase Git SHA."
    );
  }

  const prereleaseVersion = version.includes("-");
  if (prereleaseVersion) {
    if (event.release.prerelease !== true) {
      throw gateError(
        "BETA_RELEASE_FLAG_REQUIRED",
        "A prerelease package version must use a GitHub prerelease."
      );
    }
    return {
      schemaVersion: "release_gate.v1",
      channel: "beta",
      version,
      sourceCommitSha: sourceSha,
      distTag: "beta",
      stableEvidenceRequired: false
    };
  }

  if (!stableSemver.test(version)) {
    throw gateError(
      "STABLE_VERSION_INVALID",
      "A stable release requires a stable semantic version."
    );
  }
  if (event.release.prerelease !== false) {
    throw gateError(
      "STABLE_RELEASE_FLAG_MISMATCH",
      "A stable package version cannot use a GitHub prerelease."
    );
  }

  const expected = {
    version: environment.FOUNDER_DECISION_STABLE_APPROVED_VERSION,
    sourceSha:
      environment.FOUNDER_DECISION_STABLE_APPROVED_SOURCE_SHA,
    auditSha256: environment.FOUNDER_DECISION_STABLE_AUDIT_SHA256,
    decisionSha256:
      environment.FOUNDER_DECISION_STABLE_DECISION_SHA256
  };
  if (expected.version !== version) {
    throw gateError(
      "STABLE_APPROVED_VERSION_MISMATCH",
      "The protected stable-release approved version does not match package.json."
    );
  }
  if (
    !gitSha.test(expected.sourceSha ?? "") ||
    expected.sourceSha !== sourceSha
  ) {
    throw gateError(
      "STABLE_APPROVED_SOURCE_MISMATCH",
      "The protected stable-release source SHA does not match the checked-out tag."
    );
  }
  if (!sha256.test(expected.auditSha256 ?? "")) {
    throw gateError(
      "STABLE_AUDIT_SHA_MISSING",
      "A protected stable audit SHA-256 is required."
    );
  }
  if (!sha256.test(expected.decisionSha256 ?? "")) {
    throw gateError(
      "STABLE_DECISION_SHA_MISSING",
      "A protected stable decision SHA-256 is required."
    );
  }

  const body = event.release.body ?? "";
  requireMarker(body, "Stable-Approval", "approved");
  requireMarker(
    body,
    "Stable-Source-SHA",
    expected.sourceSha
  );
  requireMarker(
    body,
    "Stable-Audit-SHA256",
    expected.auditSha256
  );
  requireMarker(
    body,
    "Stable-Decision-SHA256",
    expected.decisionSha256
  );

  return {
    schemaVersion: "release_gate.v1",
    channel: "stable",
    version,
    sourceCommitSha: sourceSha,
    distTag: "latest",
    stableEvidenceRequired: true,
    auditSha256: expected.auditSha256,
    decisionSha256: expected.decisionSha256
  };
}

function requireMarker(body, name, expectedValue) {
  const lines = body.split(/\r?\n/);
  const prefix = `${name}:`;
  const values = lines
    .filter((line) => line.startsWith(prefix))
    .map((line) => line.slice(prefix.length).trim());
  if (values.length !== 1 || values[0] !== expectedValue) {
    throw gateError(
      "STABLE_RELEASE_MARKER_MISMATCH",
      `Release notes must contain exactly "${name}: ${expectedValue}".`
    );
  }
}

function gateError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function usage() {
  return [
    "Usage: node scripts/verify-release-gate.mjs --event PATH --package PATH --source-sha SHA",
    "",
    "Prerelease versions require a GitHub prerelease. Stable versions additionally require protected approval variables and matching release-note hash markers."
  ].join("\n");
}

async function main() {
  let options;
  try {
    options = parseReleaseGateArgs(process.argv.slice(2));
  } catch (error) {
    writeError(error);
    process.exitCode = 2;
    return;
  }
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  try {
    const event = JSON.parse(await readFile(resolve(options.event), "utf8"));
    const manifest = JSON.parse(
      await readFile(resolve(options.package), "utf8")
    );
    const result = verifyReleaseGate({
      event,
      manifest,
      sourceSha: options.source_sha,
      environment: process.env
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    writeError(error);
    process.exitCode = 1;
  }
}

function writeError(error) {
  process.stderr.write(
    `${JSON.stringify({
      error: {
        code:
          error && typeof error === "object" && "code" in error
            ? error.code
            : "RELEASE_GATE_FAILED",
        message: error instanceof Error ? error.message : String(error)
      }
    })}\n`
  );
}

if (
  process.argv[1] &&
  realpathSync(resolve(process.argv[1])) ===
    realpathSync(fileURLToPath(import.meta.url))
) {
  main().catch((error) => {
    writeError(error);
    process.exitCode = 1;
  });
}
