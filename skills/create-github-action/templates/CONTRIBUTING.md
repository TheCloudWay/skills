# Contributing

Thanks for contributing to this {{ORG}} GitHub Action.

## Requirements

- Node.js 20 (see `.nvmrc`).
- `pre-commit` (optional but recommended): `pipx install pre-commit` or `brew install pre-commit`.

## Setup

```bash
npm install        # installs deps and builds dist/ via the prepare hook
pre-commit install # enable local hooks (rebuild/stage dist, run tests)
```

## Development workflow

1. Edit the logic in `src/index.js`.
2. Rebuild the bundle and run the tests:

   ```bash
   npm run build
   npm test
   ```

3. Commit `src/` AND the regenerated `dist/`. The committed bundle must always match the source
   (CI verifies it, and the pre-commit hook rebuilds/stages it automatically).

## Local testing without publishing

Run the bundle like GitHub does (inputs as `INPUT_<NAME>` uppercased):

```bash
INPUT_EXAMPLE_INPUT=value node dist/index.js
```

Or run the whole workflow with [`act`](https://github.com/nektos/act), referencing the action
by relative path (`uses: ./`).

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/). The type drives the release:

- `fix:` -> patch
- `feat:` -> minor
- `feat!:` or a `BREAKING CHANGE:` footer -> major
- `docs:` / `chore:` / `ci:` / `refactor:` / `test:` -> no release

## Branches and publishing

- `master`: stable channel. Merging here publishes `vX.Y.Z` and moves the floating major tag
  (`v1`, `v2`, ...).
- `beta`: prerelease channel. Merging here publishes `vX.Y.Z-beta.N`.

Releases are fully automated by `semantic-release` (see `.github/workflows/release.yml`). Do not
bump versions or tag manually.

## Branch protection

`master` and `beta` are protected (PR + CODEOWNERS review + `Test`/`Build` checks; no
force-push or deletion). The release workflow uses the org secret `ACTIONS_TOKEN` (admin PAT) to
push the `chore(release)` commit and tags, bypassing the ruleset via the admin role.

## Pull requests

Open PRs against `master` (or `beta`). Fill in the template, keep `dist/` in sync, and update
the `README.md` if inputs/outputs or usage changed.
