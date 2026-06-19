# Build a GitHub Action — and a Skill that writes the next one for you

*Or: how I stopped copy-pasting boilerplate and taught my AI to do it instead.*

We've all been there. You need "just a small GitHub Action." Forty-five minutes later you're
knee-deep in `action.yml` syntax, googling why your `dist/` folder matters, wiring up
semantic-release, and questioning your life choices. Then next week you need *another* action and
you do the whole dance again.

This post is the cure. We'll build a clean, production-grade JavaScript Action **once**, and then
package that knowledge into an **Agent Skill** so that Cursor or Claude Code can scaffold the next
one for you in seconds — following the exact same conventions.

Two example repos accompany this post:

- The action: [`TheCloudWay/gh-action-hello-world`](https://github.com/TheCloudWay/gh-action-hello-world)
- The skill (inside the marketplace): [`TheCloudWay/skills`](https://github.com/TheCloudWay/skills)

Let's go.

## Part 1 — The action

### Anatomy of a JavaScript action

A JS action is surprisingly small. At its heart are three things:

1. `action.yml` — the manifest: name, inputs, outputs, and how to run it.
2. `src/index.js` — your logic, using the `@actions/core` toolkit.
3. `dist/index.js` — the **bundled** version that GitHub actually runs.

Here's our manifest:

```yaml
name: 'Hello World'
description: 'A friendly Hello World GitHub Action written in JavaScript.'
author: 'The Cloud Way'

branding:
  icon: 'smile'
  color: 'purple'

inputs:
  name:
    description: 'Who to greet.'
    required: true
  greeting:
    description: 'The greeting word to use.'
    required: false
    default: 'Hello'

outputs:
  message:
    description: 'The full greeting message that was produced.'

runs:
  using: 'node20'
  main: 'dist/index.js'
```

Notice `main: 'dist/index.js'`. Not `src/`. That's the plot twist of the whole post.

### Why on earth do we commit `dist/`?

When someone writes `uses: TheCloudWay/gh-action-hello-world@v1`, GitHub checks out your repo at
that ref and runs `dist/index.js` **directly**. There is no `npm install`. No build step. No
mercy. Whatever is in `dist/` at that tag is what runs.

So we bundle our source (plus its dependencies) into a single file with
[`@vercel/ncc`](https://github.com/vercel/ncc) and commit the result. Yes, committing build
output feels dirty. Do it anyway — it's the accepted convention for JS actions, and we'll add
guard rails so the bundle never drifts from the source.

### The logic

```javascript
const core = require('@actions/core');

async function run() {
  try {
    const name = core.getInput('name', { required: true });
    const greeting = core.getInput('greeting') || 'Hello';

    const message = `${greeting}, ${name}!`;

    core.info(message);
    core.setOutput('message', message);
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

module.exports = { run };

// Only auto-run when executed as the entrypoint (not when imported in tests).
if (require.main === module) {
  run();
}
```

Two small touches that pay off later:

- We **export `run`** and only auto-execute when the file is the entrypoint. That makes the
  module importable from tests without it firing on `require`.
- Inputs arrive as environment variables named `INPUT_<NAME>` (uppercased). That's why you can
  test locally with `INPUT_NAME=Cloud node dist/index.js`.

### Tests, the cheap kind

No test framework, no config. Node 20 ships a test runner:

```javascript
const { test } = require('node:test');
const assert = require('node:assert');
const { run } = require('../src/index.js');

test('fails when name is missing', async () => {
  await run();
  assert.strictEqual(process.exitCode, 1);
});
```

Run it with `node --test`. One gotcha: `core.setFailed()` sets `process.exitCode = 1` globally,
so reset it in an `afterEach` hook to keep tests from contaminating each other.

### Bundling

```json
{
  "scripts": {
    "build": "ncc build src/index.js -o dist --source-map --license licenses.txt",
    "test": "node --test",
    "prepare": "npm run build"
  }
}
```

The `prepare` hook means `npm install` also builds `dist/`. After editing `src/`, run
`npm run build` and commit the regenerated bundle.

### Automated releases (the part nobody enjoys setting up)

We let [semantic-release](https://semantic-release.gitbook.io/) do the versioning, driven by
[Conventional Commits](https://www.conventionalcommits.org/):

- `fix:` → patch (`1.0.1`)
- `feat:` → minor (`1.1.0`)
- `feat!:` or a `BREAKING CHANGE:` footer → major (`2.0.0`)
- `docs:` / `chore:` / `ci:` → no release

Two channels: `master` for stable, `beta` for prereleases (`1.2.0-beta.1`). On every stable
release we also move a **floating major tag** (`v1`) so consumers can pin `@v1` and get
non-breaking updates automatically. That last bit is a tiny shell script wired into
semantic-release's `successCmd`.

The CI workflow runs on PRs and does something delightfully paranoid — it rebuilds `dist/` and
fails if it differs from what you committed:

```bash
if [ -n "$(git status --porcelain dist)" ]; then
  echo "::error::dist/ is out of date. Run 'npm run build' and commit the changes."
  exit 1
fi
```

No more "works on my machine but the published action runs last week's code."

### Ship it

```bash
npm install && npm test && npm run build
git init -b master && git add -A && git commit -m "feat: hello world github action"
gh repo create TheCloudWay/gh-action-hello-world --public --source=. --push
git branch beta && git push -u origin beta
```

semantic-release publishes `v1.0.0`, tags `v1`, and writes a changelog. Now anyone can:

```yaml
- uses: TheCloudWay/gh-action-hello-world@v1
  with:
    name: Cloud
    greeting: Hey
```

That's a real, versioned, self-publishing action. Pretty good. But we're not doing this by hand
ever again.

## Part 2 — The Skill that writes the next one

Cursor and Claude Code both support **Agent Skills**: a folder with a `SKILL.md` that teaches the
agent how to perform a task. A great skill is concise, points to reference files for the heavy
detail, and ships **templates** the agent can copy.

Our `create-github-action` skill has exactly that shape:

```
create-github-action/
├── SKILL.md                 # the workflow + conventions (kept short)
├── references/
│   ├── conventions.md       # why dist is committed, versioning, file-by-file
│   └── repo-setup.md        # gh commands, optional branch protection
└── templates/               # the entire boilerplate, parameterized
    ├── action.yml
    ├── src/index.js
    ├── test/index.test.js
    ├── package.json
    ├── .releaserc.json
    ├── .github/workflows/{release,ci}.yml
    └── ... (LICENSE, README, dependabot, editorconfig, ...)
```

The `SKILL.md` frontmatter is what makes the agent reach for it:

```markdown
---
name: create-github-action
description: >-
  Scaffold a new JavaScript GitHub Action repository following solid conventions...
  Use when the user wants to create a new GitHub Action, mentions action.yml,
  inputs/outputs for an action, or publishing an action to a GitHub org.
---
```

That `description` is doing real work: it's injected into the agent's context, and a good one (in
the third person, with both **what** it does and **when** to use it) is the difference between a
skill that triggers and one that gathers dust.

The body is a short, numbered workflow: gather requirements (org, name, inputs, outputs, idea) →
copy templates and replace placeholders (`{{ORG}}`, `{{REPO_NAME}}`, `{{ACTION_NAME}}`, …) →
implement `src/index.js` → build + test → create the repo and push. The fragile, must-be-exact
parts (the release config, the CI dist check) live as **template files**, not as prose the agent
might paraphrase. That's the trick: low freedom for the boilerplate, high freedom for the logic.

### Using it

In Cursor or Claude Code, you just say:

> "Create a new GitHub Action called *Slack Notifier* with inputs `webhook` (required, secret)
> and `message` (required), that posts the message to Slack."

The agent loads the skill, asks for anything missing, scaffolds the whole repo from the templates,
writes the actual logic, runs the tests, and pushes. Forty-five minutes of boilerplate becomes a
two-minute conversation — and every action your team ships looks the same.

## The payoff

We did the hard thinking once: the `dist/` discipline, the release pipeline, the floating tag, the
CI guard. Then we froze that thinking into a skill. The first action took real effort. The next
hundred are a sentence.

In the [next post](https://github.com/TheCloudWay/skills) we'll go one level up: how to host your
own **Agent Skills marketplace** so your whole team — in both Cursor and Claude Code — gets these
skills automatically.

*Repos: [gh-action-hello-world](https://github.com/TheCloudWay/gh-action-hello-world) ·
[skills](https://github.com/TheCloudWay/skills). Both MIT. Steal freely.*
