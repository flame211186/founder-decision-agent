export interface ReleaseGateInput {
  event: {
    action?: string;
    release?: {
      tag_name?: string;
      prerelease?: boolean;
      draft?: boolean;
      body?: string | null;
    };
  };
  manifest: {
    version: string;
  };
  sourceSha: string;
  environment: Record<string, string | undefined>;
}

export interface ReleaseGateResult {
  schemaVersion: "release_gate.v1";
  channel: "beta" | "stable";
  version: string;
  sourceCommitSha: string;
  distTag: "beta" | "latest";
  stableEvidenceRequired: boolean;
  auditSha256?: string;
  decisionSha256?: string;
}

export function verifyReleaseGate(
  input: ReleaseGateInput
): ReleaseGateResult;

export function parseReleaseGateArgs(
  arguments_: string[]
): Record<string, unknown>;
