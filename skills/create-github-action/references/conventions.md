# Conventions and file-by-file breakdown

Rationale behind the {{ORG}} GitHub Action scaffold. Read this when you need to explain or adapt
the structure.

## Why dist/ is committed

When a workflow uses `uses: org/action@ref`, GitHub checks out the action repo at that ref and
runs `dist/index.js` **directly** — there is no `npm install` or build step. Therefore the
bundled `dist/` must be committed and kept in sync with `src/`. Two safety nets enforce this:

- **CI** fails a PR if `dist/` is out of date (`git status --porcelain dist`).
- **pre-commit** rebuilds and stages `dist/` whenever `src/` changes.

The bundle is produced with `@vercel/ncc` (`npm run build`).

## Versioning (semantic-release)

- `master` → stable channel: publishes `vX.Y.Z`, updates `CHANGELOG.md`, and moves the floating
  major tag (`v1`, `v2`, …) via `scripts/update-major-tag.sh`.
- `beta` → prerelease channel: publishes `vX.Y.Z-beta.N`; never moves the major tag.
- The version bump comes from Conventional Commits. `package.json` `version` stays
  `0.0.0-development`; the source of truth is git tags/releases (the action is consumed by git
  ref, not via npm), so `@semantic-release/npm` is intentionally NOT used.
- Plugins: `commit-analyzer`, `release-notes-generator`, `changelog`, `exec` (build +
  major-tag script), `git` (commits dist/CHANGELOG/package.json), `github`.

## Releasing on protected branches

semantic-release pushes the `chore(release)` commit and tags back to the branch. Because
`master`/`beta` are protected, the workflow authenticates with the org secret `ACTIONS_TOKEN`
(an admin PAT) which bypasses the ruleset via the repository admin role. The default
`GITHUB_TOKEN` (github-actions[bot]) is NOT a repo admin and cannot be added as a ruleset
bypass actor at repo scope, so the admin PAT is required to keep `@semantic-release/git`.

## File-by-file

| File | Purpose |
|------|---------|
| `action.yml` | Action metadata: name, description, branding, inputs, outputs, `runs.using: node20`, `main: dist/index.js`. |
| `src/index.js` | Logic. Exports `run()`; auto-runs only as entrypoint; masks secrets with `core.setSecret`. |
| `dist/` | Committed `@vercel/ncc` bundle. Never gitignored. |
| `test/index.test.js` | Tests with Node's built-in runner (`node --test`). |
| `package.json` | `version: 0.0.0-development`, `MIT`, scripts `build`/`test`/`prepare`, `engines.node >=20`, repo metadata. |
| `.releaserc.json` | semantic-release config (branches + plugins). |
| `scripts/update-major-tag.sh` | Moves the floating major tag on stable releases (skips prereleases). |
| `.github/workflows/release.yml` | On push to master/beta: install, test, build, semantic-release (uses `ACTIONS_TOKEN`). |
| `.github/workflows/ci.yml` | On PR: Test job + Build job that verifies `dist/` is up to date. |
| `.github/CODEOWNERS` | `* @{{ORG}}/DevOps`. |
| `.github/dependabot.yml` | Weekly npm + github-actions updates. |
| `.github/pull_request_template.md` | PR checklist (conventional commits, dist rebuild). |
| `.github/ISSUE_TEMPLATE/` | Bug + feature forms; blank issues disabled. |
| `CONTRIBUTING.md` | Dev workflow, tests, commits, branches, branch protection. |
| `SECURITY.md` | Vulnerability reporting + secret handling. |
| `CODE_OF_CONDUCT.md` | Contributor Covenant 2.1. |
| `LICENSE` | MIT license notice. |
| `.editorconfig`, `.nvmrc` | Editor + Node version consistency. |
| `.gitignore` | Ignores `node_modules/`; explicitly does NOT ignore `dist/`. |
| `.pre-commit-config.yaml` | Local hooks (build+stage dist, run tests) + standard checks. |
| `README.md` | Badges, usage, pinning, inputs/outputs, versioning. |

## Local testing (without publishing)

- Unit tests: `npm test`.
- Run the bundle as GitHub does (inputs via `INPUT_<NAME>` uppercased):
  `INPUT_SERVICE=svc INPUT_STAGE=staging-4 INPUT_ENDPOINT=https://x INPUT_TOKEN=t node dist/index.js`
- Full workflow with [`act`](https://github.com/nektos/act) referencing the action by relative
  path (`uses: ./`).
