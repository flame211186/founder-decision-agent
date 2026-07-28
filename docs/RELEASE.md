# Release process

## Beta

1. Confirm `package.json` version is a prerelease such as `0.1.0-beta.0`.
2. Run all commands in `docs/EVALS.md`.
3. Put the BYOK key in the environment or the ignored, mode-`0600` `.env` file, then run:

   ```bash
   npm run eval:live -- --mode quick
   ```

   The script uses a fixed synthetic idea, disables persistence, verifies canonical output and
   budget/privacy invariants, and writes the full outcome to a mode-`0600` temporary file for
   inspection. Do not publish that artifact as a real-case evaluation.

4. Review `docs/KNOWN_LIMITATIONS.md` and `CHANGELOG.md`.
5. Commit the final release state, require a clean worktree, create
   `v0.1.0-beta.0`, and push the tag.
6. Use the exact npm version declared by `packageManager`, then pack once from that exact tag.
   If the npm package does not yet exist, perform the one-time
   bootstrap from that tarball:

   ```bash
   npm publish ./sangfei-founder-decision-agent-0.1.0-beta.0.tgz \
     --access public \
     --tag beta \
     --provenance=false
   ```

   This interactive bootstrap may require 2FA. The explicit override is needed because local
   machines cannot create GitHub provenance even though this repository defaults
   `provenance=true`.

7. Once the package exists, configure its trusted publisher:

   ```bash
   npm trust github @sangfei/founder-decision-agent \
     --file publish.yml \
     --repository flame211186/founder-decision-agent \
     --allow-publish
   npm trust list @sangfei/founder-decision-agent
   ```

8. Publish a GitHub prerelease for the pushed tag. The release workflow:
   - reruns the release quality gate;
   - packs the exact tagged source;
   - skips only an existing bootstrap version with identical registry integrity;
   - otherwise publishes through trusted OIDC with provenance;
   - verifies the registry integrity and `beta` dist-tag;
   - installs the published artifact in a clean directory and runs the packaged CLI.

The first interactive bootstrap cannot carry GitHub provenance. Its GitHub release workflow still
requires byte-integrity equivalence with the artifact packed from the release tag. Later versions
publish directly through OIDC and receive automatic provenance. Do not store a long-lived npm token
in GitHub.

## Stable

Do not remove the prerelease suffix or publish the `latest` dist-tag until every stable gate in
`docs/EVALS.md` has direct evidence. Freeze and approve the release policy before inspecting the
final aggregate result, then run:

```bash
npm run audit:stable -- \
  --consents /private/path/to/consents \
  --reviews /private/path/to/expert-reviews \
  --reports /private/path/to/frozen-reports \
  --quality-summary /private/path/to/live-quality-summary.json \
  --quality-review /private/path/to/live-quality-review.json \
  --release-evidence /private/path/to/stable-release-evidence.json
```

The audit checks declared schemas, hashes, version links and frozen thresholds. Its highest status
is `evidence_ready_for_human_release_decision`, never “stable approved.” The product owner and
independent review group must still verify authenticity, record their release decision and confirm
zero unresolved P0/P1 findings:

```bash
npm run validate:stable-decision -- \
  /private/path/to/stable-audit.json \
  /private/path/to/stable-decision.json
```

Before publishing the GitHub release, configure the protected `stable-release` environment with an
independent required reviewer and these environment variables:

- `FOUNDER_DECISION_STABLE_APPROVED_VERSION`
- `FOUNDER_DECISION_STABLE_APPROVED_SOURCE_SHA`
- `FOUNDER_DECISION_STABLE_AUDIT_SHA256`
- `FOUNDER_DECISION_STABLE_DECISION_SHA256`

The stable GitHub release notes must contain exactly one matching line for each marker:

```text
Stable-Approval: approved
Stable-Source-SHA: <40-character source commit>
Stable-Audit-SHA256: <64-character audit hash>
Stable-Decision-SHA256: <64-character decision-record hash>
```

The publish workflow routes prereleases through `beta-release` and stable versions through the
protected `stable-release` environment. It rejects a prerelease version published as a normal
release, a stable version published as a prerelease, or any stable version whose protected values
and release-note markers do not exactly match. These controls create an auditable fail-closed
release path; they still cannot authenticate private evidence on their own.

## Rollback

npm package versions are immutable. Do not overwrite or unpublish a version as a normal rollback. Deprecate the affected version with a reason, fix forward with a new version, and move the relevant dist-tag only after validation.

## Supply-chain controls

- Public Apache-2.0 repository.
- Lockfile committed.
- CI uses `npm ci --strict-allow-scripts`.
- Trusted OIDC releases use npm provenance; the documented one-time local bootstrap cannot.
- GitHub secret scanning and Dependabot configuration.
- CodeQL and dependency review workflows.
- No API keys or long-lived npm tokens committed.
