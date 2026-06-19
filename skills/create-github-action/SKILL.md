---
name: create-github-action
description: >-
  Scaffold a new JavaScript GitHub Action repository following solid conventions:
  action.yml, a committed @vercel/ncc dist/ bundle, node:test tests, semantic-release
  (master stable + beta prerelease), a floating major tag, pre-commit hooks, community
  health files, and an optional protected-branch release flow. Use when the user wants to
  create a new GitHub Action, a reusable action repo, or mentions gh-action, JavaScript/composite
  action, action.yml, inputs/outputs for an action, or publishing an action to a GitHub org.
---

# Create a GitHub Action

Scaffold a new JavaScript GitHub Action repository that is production-ready from commit one:
typed inputs/outputs, a committed `dist/` bundle, tests, automated semantic versioning, and full
community health files.

Write everything in **English** and use [Conventional Commits](https://www.conventionalcommits.org/)
for every commit.

## Workflow

Copy this checklist and track progress:

```
- [ ] Step 1: Gather requirements (org, name, repo, description, inputs, outputs, idea)
- [ ] Step 2: Scaffold files from templates/ and fill placeholders
- [ ] Step 3: Implement src/index.js (logic or placeholder) + tests
- [ ] Step 4: Install, build and test locally
- [ ] Step 5: git init + initial conventional commit
- [ ] Step 6: Create the org repo and push master + beta
- [ ] Step 7: (Optional) branch protection + release token
- [ ] Step 8: Verify the release pipeline
```

### Step 1: Gather requirements

Ask the user (use AskQuestion when available) for:

- **GitHub org/owner** (e.g. `TheCloudWay`).
- **Action name** (human readable, e.g. `Hello World`).
- **Repository name** (kebab-case, e.g. `gh-action-hello-world`).
- **One-line description**.
- **Inputs**: for each, `name`, `required` (yes/no), and a short description. Secrets are passed
  from org/repo secrets, never hardcoded.
- **Outputs**: name + description (may be none yet).
- **The idea / logic**: what the action should do. If not ready, scaffold a placeholder that logs
  a greeting and the received inputs.

### Step 2: Scaffold from templates

Copy every file from [templates/](templates/) into the new repo directory, then replace the
placeholders in all files:

| Placeholder | Replace with |
|-------------|--------------|
| `{{ORG}}` | GitHub org/owner (e.g. `TheCloudWay`) |
| `{{REPO_NAME}}` | Repository name (kebab-case) |
| `{{ACTION_NAME}}` | Human-readable action name |
| `{{ACTION_DESCRIPTION}}` | One-line description |
| `{{YEAR}}` | Current year (for the LICENSE) |

Then edit `action.yml` to declare the real `inputs:` and `outputs:`, and update the README
Inputs/Outputs tables and usage example to match.

Templates use Node 20 (`runs.using: node20`) and a committed `dist/index.js`.

### Step 3: Implement logic + tests

- Put the logic in `src/index.js`. Keep `run()` exported and the
  `if (require.main === module) run();` guard so the module stays testable.
- Read inputs with `core.getInput`, set results with `core.setOutput`, and mask any secret with
  `core.setSecret(value)`.
- Add/adjust tests in `test/*.test.js` (Node's built-in runner). Cover at least: success with
  required inputs, optional inputs, and failure when a required input is missing.

### Step 4: Build and test

```bash
npm install      # installs deps and builds dist/ via the prepare hook
npm test
npm run build    # rebuild after changing src/, then commit dist/
```

`dist/` is committed (do NOT gitignore it): GitHub runs `dist/index.js` directly.

### Step 5: Initial commit

```bash
git init -b master
git add -A
git commit -m "feat: scaffold {{ACTION_NAME}} GitHub Action"
pre-commit install   # optional: hooks that rebuild/stage dist and run tests
```

### Step 6: Create the org repo and push

```bash
gh repo create {{ORG}}/{{REPO_NAME}} --public --source=. --remote=origin \
  --description "{{ACTION_DESCRIPTION}}" --push
git branch beta && git push -u origin beta
```

semantic-release publishes `v1.0.0` (master) and a `v1.0.0-beta.1` prerelease (beta) on the first
push, and moves the floating major tag `v1`.

### Step 7: (Optional) branch protection + release token

If you protect `master`/`beta` (PR required, etc.), semantic-release still needs to push the
`chore(release)` commit and tags. Either keep the branches unprotected (the default
`GITHUB_TOKEN` can push), or add an admin PAT as a secret (e.g. `ACTIONS_TOKEN`) and let the
ruleset bypass the admin role. See [references/repo-setup.md](references/repo-setup.md).

### Step 8: Verify

Confirm the `Release` workflow is green, `v1.0.0` exists, the `v1` tag points to it, and
`master`/`beta` are in sync. To validate end to end, land a small `fix:` and confirm
semantic-release publishes a patch.

## Conventions

- **Language**: everything in English (code, comments, docs, commit messages).
- **Commits**: Conventional Commits drive versioning (`fix`→patch, `feat`→minor,
  `feat!`/`BREAKING CHANGE`→major; `docs`/`chore`/`ci`/`refactor`/`test`→no release).
- **Branches**: `master` (stable) and `beta` (prerelease). Keep `beta` synced by merging
  `master` into it.
- **dist/**: always committed and kept in sync with `src/` (CI + pre-commit enforce this).
- **CODEOWNERS**: `@{{ORG}}/maintainers` (adjust to a real team).
- **License**: MIT (or your org's standard license).

See [references/conventions.md](references/conventions.md) for the full rationale and the
file-by-file breakdown.

## Additional resources

- [references/conventions.md](references/conventions.md) — best practices and what each file is for.
- [references/repo-setup.md](references/repo-setup.md) — gh commands for repo creation, the
  optional branch-protection ruleset, and the release-token flow.
- [templates/](templates/) — the complete boilerplate to copy.
