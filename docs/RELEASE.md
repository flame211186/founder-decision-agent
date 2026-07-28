# Release process

## Beta

1. Confirm `package.json` version is a prerelease such as `0.1.0-beta.0`.
2. Run all commands in `docs/EVALS.md`.
3. Run a live smoke evaluation with a non-sensitive test idea and BYOK key.
4. Review `docs/KNOWN_LIMITATIONS.md` and `CHANGELOG.md`.
5. Create and push a `v0.1.0-beta.0` tag, then publish a GitHub prerelease.
6. Publish npm with the `beta` dist-tag.
7. Install the published package in a clean temporary directory and run `founder-decision --help`.

The GitHub publish workflow uses npm trusted publishing (OIDC), `id-token: write` and provenance. Before it can publish, the npm package must be associated with the exact GitHub repository/workflow in npm trusted-publisher settings. If npm requires a one-time bootstrap publish, perform it interactively with 2FA and no saved long-lived repository token, then enable trusted publishing.

## Stable

Do not remove the prerelease suffix or publish the `latest` dist-tag until the stable gate in `docs/EVALS.md` passes.

## Rollback

npm package versions are immutable. Do not overwrite or unpublish a version as a normal rollback. Deprecate the affected version with a reason, fix forward with a new version, and move the relevant dist-tag only after validation.

## Supply-chain controls

- Public Apache-2.0 repository.
- Lockfile committed.
- CI uses `npm ci`.
- npm provenance enabled.
- GitHub secret scanning and Dependabot configuration.
- CodeQL and dependency review workflows.
- No API keys or long-lived npm tokens committed.
