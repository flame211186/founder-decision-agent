import { describe, expect, it } from "vitest";
import {
  parseReleaseGateArgs,
  verifyReleaseGate
} from "../scripts/verify-release-gate.mjs";

const sourceSha = "a".repeat(40);
const auditSha = "b".repeat(64);
const decisionSha = "c".repeat(64);

function releaseEvent(
  tag: string,
  prerelease: boolean,
  body = ""
) {
  return {
    action: "published",
    release: {
      tag_name: tag,
      prerelease,
      draft: false,
      body
    }
  };
}

function stableEnvironment() {
  return {
    FOUNDER_DECISION_STABLE_APPROVED_VERSION: "1.0.0",
    FOUNDER_DECISION_STABLE_APPROVED_SOURCE_SHA: sourceSha,
    FOUNDER_DECISION_STABLE_AUDIT_SHA256: auditSha,
    FOUNDER_DECISION_STABLE_DECISION_SHA256: decisionSha
  };
}

function stableBody() {
  return [
    "Stable-Approval: approved",
    `Stable-Source-SHA: ${sourceSha}`,
    `Stable-Audit-SHA256: ${auditSha}`,
    `Stable-Decision-SHA256: ${decisionSha}`
  ].join("\n");
}

function errorCode(action: () => unknown) {
  try {
    action();
    return null;
  } catch (error) {
    return (error as Error & { code?: string }).code;
  }
}

describe("GitHub release channel gate", () => {
  it("accepts an explicitly marked GitHub prerelease for a prerelease package", () => {
    expect(
      verifyReleaseGate({
        event: releaseEvent("v0.1.0-beta.0", true),
        manifest: { version: "0.1.0-beta.0" },
        sourceSha,
        environment: {}
      })
    ).toMatchObject({
      channel: "beta",
      version: "0.1.0-beta.0",
      distTag: "beta",
      stableEvidenceRequired: false
    });
  });

  it("rejects a prerelease package published as a normal GitHub release", () => {
    expect(
      errorCode(() =>
        verifyReleaseGate({
          event: releaseEvent("v0.1.0-beta.0", false),
          manifest: { version: "0.1.0-beta.0" },
          sourceSha,
          environment: {}
        })
      )
    ).toBe("BETA_RELEASE_FLAG_REQUIRED");
  });

  it("accepts stable only with matching protected values and release-note markers", () => {
    expect(
      verifyReleaseGate({
        event: releaseEvent("v1.0.0", false, stableBody()),
        manifest: { version: "1.0.0" },
        sourceSha,
        environment: stableEnvironment()
      })
    ).toMatchObject({
      channel: "stable",
      version: "1.0.0",
      sourceCommitSha: sourceSha,
      distTag: "latest",
      stableEvidenceRequired: true,
      auditSha256: auditSha,
      decisionSha256: decisionSha
    });
  });

  it("rejects stable when protected approval state or release markers are absent", () => {
    expect(
      errorCode(() =>
        verifyReleaseGate({
          event: releaseEvent("v1.0.0", false),
          manifest: { version: "1.0.0" },
          sourceSha,
          environment: {}
        })
      )
    ).toBe("STABLE_APPROVED_VERSION_MISMATCH");

    const environment = stableEnvironment();
    environment.FOUNDER_DECISION_STABLE_DECISION_SHA256 = "d".repeat(64);
    expect(
      errorCode(() =>
        verifyReleaseGate({
          event: releaseEvent("v1.0.0", false, stableBody()),
          manifest: { version: "1.0.0" },
          sourceSha,
          environment
        })
      )
    ).toBe("STABLE_RELEASE_MARKER_MISMATCH");
  });

  it("rejects tag, source and GitHub release-channel mismatches", () => {
    expect(
      errorCode(() =>
        verifyReleaseGate({
          event: releaseEvent("v1.0.1", false, stableBody()),
          manifest: { version: "1.0.0" },
          sourceSha,
          environment: stableEnvironment()
        })
      )
    ).toBe("RELEASE_TAG_VERSION_MISMATCH");

    expect(
      errorCode(() =>
        verifyReleaseGate({
          event: releaseEvent("v1.0.0", false, stableBody()),
          manifest: { version: "1.0.0" },
          sourceSha: "d".repeat(40),
          environment: stableEnvironment()
        })
      )
    ).toBe("STABLE_APPROVED_SOURCE_MISMATCH");

    expect(
      errorCode(() =>
        verifyReleaseGate({
          event: releaseEvent("v1.0.0", true, stableBody()),
          manifest: { version: "1.0.0" },
          sourceSha,
          environment: stableEnvironment()
        })
      )
    ).toBe("STABLE_RELEASE_FLAG_MISMATCH");
  });

  it("rejects non-published events, drafts and malformed source commits", () => {
    expect(
      errorCode(() =>
        verifyReleaseGate({
          event: {
            action: "edited",
            release: {
              tag_name: "v0.1.0-beta.0",
              prerelease: true,
              draft: false,
              body: ""
            }
          },
          manifest: { version: "0.1.0-beta.0" },
          sourceSha,
          environment: {}
        })
      )
    ).toBe("RELEASE_EVENT_INVALID");

    const draft = releaseEvent("v0.1.0-beta.0", true);
    draft.release.draft = true;
    expect(
      errorCode(() =>
        verifyReleaseGate({
          event: draft,
          manifest: { version: "0.1.0-beta.0" },
          sourceSha,
          environment: {}
        })
      )
    ).toBe("RELEASE_DRAFT_FORBIDDEN");

    expect(
      errorCode(() =>
        verifyReleaseGate({
          event: releaseEvent("v0.1.0-beta.0", true),
          manifest: { version: "0.1.0-beta.0" },
          sourceSha: "not-a-git-sha",
          environment: {}
        })
      )
    ).toBe("RELEASE_SOURCE_SHA_INVALID");
  });

  it("rejects malformed stable versions and missing protected hashes", () => {
    expect(
      errorCode(() =>
        verifyReleaseGate({
          event: releaseEvent("v1.0", false),
          manifest: { version: "1.0" },
          sourceSha,
          environment: stableEnvironment()
        })
      )
    ).toBe("STABLE_VERSION_INVALID");

    const missingAudit = stableEnvironment();
    missingAudit.FOUNDER_DECISION_STABLE_AUDIT_SHA256 = "";
    expect(
      errorCode(() =>
        verifyReleaseGate({
          event: releaseEvent("v1.0.0", false, stableBody()),
          manifest: { version: "1.0.0" },
          sourceSha,
          environment: missingAudit
        })
      )
    ).toBe("STABLE_AUDIT_SHA_MISSING");

    const missingDecision = stableEnvironment();
    missingDecision.FOUNDER_DECISION_STABLE_DECISION_SHA256 = "";
    expect(
      errorCode(() =>
        verifyReleaseGate({
          event: releaseEvent("v1.0.0", false, stableBody()),
          manifest: { version: "1.0.0" },
          sourceSha,
          environment: missingDecision
        })
      )
    ).toBe("STABLE_DECISION_SHA_MISSING");
  });

  it("rejects duplicate stable markers and invalid CLI argument shapes", () => {
    expect(
      errorCode(() =>
        verifyReleaseGate({
          event: releaseEvent(
            "v1.0.0",
            false,
            `${stableBody()}\nStable-Approval: approved`
          ),
          manifest: { version: "1.0.0" },
          sourceSha,
          environment: stableEnvironment()
        })
      )
    ).toBe("STABLE_RELEASE_MARKER_MISMATCH");

    expect(parseReleaseGateArgs(["--help"])).toEqual({ help: true });
    expect(
      errorCode(() => parseReleaseGateArgs(["--unknown", "value"]))
    ).toBe("INVALID_INPUT");
    expect(
      errorCode(() => parseReleaseGateArgs(["--event"]))
    ).toBe("INVALID_INPUT");
    expect(
      errorCode(() =>
        parseReleaseGateArgs([
          "--event",
          "event.json",
          "--package",
          "package.json"
        ])
      )
    ).toBe("INVALID_INPUT");
  });
});
