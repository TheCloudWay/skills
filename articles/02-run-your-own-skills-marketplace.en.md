# Run your own Agent Skills marketplace (Cursor + Claude Code)

*One repo to rule your team's skills — versioned, shareable, and auto-installing.*

In the [previous post](https://github.com/TheCloudWay/gh-action-hello-world) we built a GitHub
Action and a skill that scaffolds new ones. Great. Now multiply that by a team: everyone hand-
copying `SKILL.md` files into their own machines, versions drifting, "wait, which skill do you
have?" chaos.

The fix is a **single source of truth**: one Git repo that holds all your skills, works in *both*
Cursor and Claude Code, versions itself, and — for Claude Code — doubles as an installable
**plugin marketplace**. That's exactly what [`TheCloudWay/skills`](https://github.com/TheCloudWay/skills)
is. Let's build it.

## The two clients load skills differently

This is the key insight that shapes everything:

- **Cursor** reads skills from a folder: `~/.cursor/skills/` (personal) or `.cursor/skills/`
  (per project). No marketplace concept. If the files are there, the skill exists.
- **Claude Code** has a **plugin marketplace** system. You point it at a Git repo, it clones it,
  finds a `marketplace.json`, and installs plugins (which can bundle skills).

The beautiful part: both consume the same `SKILL.md` format. So one repo can serve both — we just
present it two ways.

## The repo layout

```
skills/                          # the actual skills (one folder each, with SKILL.md)
└── create-github-action/
    ├── SKILL.md
    ├── references/
    └── templates/
.claude-plugin/
├── marketplace.json             # Claude Code marketplace definition
└── plugin.json                  # the plugin that bundles everything in skills/
.releaserc.json                  # auto-versioning (more on this below)
package.json
README.md
```

Skills go under `skills/`. The `.claude-plugin/` folder turns the whole repo into a Claude Code
marketplace whose single plugin bundles every skill in `skills/`.

## The Claude Code manifests

`marketplace.json` advertises the catalog and its plugins:

```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "thecloudway-skills",
  "description": "The Cloud Way shared Agent Skills.",
  "owner": { "name": "The Cloud Way", "url": "https://github.com/TheCloudWay" },
  "plugins": [
    {
      "name": "thecloudway-skills",
      "description": "Scaffold GitHub Actions and more.",
      "source": "./",
      "category": "development"
    }
  ]
}
```

`source: "./"` means "the plugin is this repo." Claude then looks for a `skills/` folder at the
plugin root — which is exactly where ours live.

`plugin.json` is the plugin's identity card:

```json
{
  "name": "thecloudway-skills",
  "version": "1.0.0",
  "description": "The Cloud Way shared Agent Skills.",
  "author": { "name": "The Cloud Way" }
}
```

Tip: validate before you push with `claude plugin validate .`.

## Installing it — and how Claude even knows it exists

Here's a question that trips people up: on a brand-new laptop, how does Claude Code know your repo
is a marketplace?

It doesn't. There's no central registry. *You* tell it, with a GitHub `owner/repo` shorthand:

```bash
claude plugin marketplace add TheCloudWay/skills
claude plugin install thecloudway-skills@thecloudway-skills
```

Under the hood, `add` resolves `TheCloudWay/skills` to a Git URL, **clones it** using the user's
own Git credentials, validates `marketplace.json`, and records the source locally. It's basically
`git remote add` with extra steps. The only marketplace Claude knows out of the box is the
official Anthropic one; everything else you add explicitly (or push via managed settings — see
below).

For **Cursor**, there's no marketplace, so you clone once and symlink the skills you want:

```bash
git clone https://github.com/TheCloudWay/skills.git ~/tcw-skills
mkdir -p ~/.cursor/skills
for d in ~/tcw-skills/skills/*/; do
  ln -sfn "$d" ~/.cursor/skills/$(basename "$d")
done
```

Symlinks are the secret sauce: a `git pull` instantly updates every skill, no re-copying.

## Make it version itself

Manually bumping `plugin.json` on every change is exactly the kind of chore we're trying to kill.
So we point semantic-release at the repo, but with a twist: the version of record lives in
`.claude-plugin/plugin.json`, not `package.json`. We use `@semantic-release/exec` to write the
computed version into the plugin manifest:

```json
{
  "branches": ["master"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    ["@semantic-release/exec", {
      "prepareCmd": "node scripts/set-plugin-version.js ${nextRelease.version}"
    }],
    ["@semantic-release/git", {
      "assets": [".claude-plugin/plugin.json", "CHANGELOG.md"],
      "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
    }],
    "@semantic-release/github"
  ]
}
```

The little script is unglamorous and reliable:

```javascript
const fs = require('fs');
const version = process.argv[2];
const file = '.claude-plugin/plugin.json';
const json = JSON.parse(fs.readFileSync(file, 'utf8'));
json.version = version;
fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
```

Now the workflow is: add a skill with a `feat:` commit, merge to `master`, and the plugin version
bumps itself. Add a skill → `feat` → minor. Fix a typo in a template → `fix` → patch. Edit a doc →
`docs` → no release. Consumers pick up the new version with
`claude plugin marketplace update thecloudway-skills`.

> Why a version bump matters: Claude caches the installed plugin **by version**. A marketplace
> refresh alone won't pull new skills into an existing install — the version has to change. That's
> the whole reason we automated it.

## Going org-wide: managed settings

Telling every teammate to run two commands works, but you can do better. Claude Code's **managed
settings** can declare the marketplace and enable the plugin automatically on every machine:

```json
{
  "extraKnownMarketplaces": {
    "thecloudway-skills": {
      "source": { "source": "github", "repo": "TheCloudWay/skills" }
    }
  },
  "enabledPlugins": {
    "thecloudway-skills@thecloudway-skills": true
  }
}
```

You deliver this one of two ways:

1. **Admin console** (Claude for Teams/Enterprise): *Admin Settings → Claude Code → Managed
   settings*, paste the JSON. It reaches devices at login and refreshes hourly. Highest priority,
   users can't override it. This needs you to be an admin **of your own Claude org** — not of
   Anthropic.
2. **MDM / file** (`/Library/Application Support/ClaudeCode/managed-settings.json` on macOS, or a
   plist/registry policy via Jamf/Intune). Use this if you don't have a Teams/Enterprise plan or
   need offline enforcement.

One honest caveat: managed settings declare the marketplace and enable the plugin, but they
**don't ship Git credentials**. If your repo is private, each machine still needs read access to
clone it. Make sure your team has that, or the install silently fails.

## Public, private, and the Anthropic directory

- **Private team repo** (recommended for internal skills): keep it private, distribute via
  `marketplace add` or managed settings. Done.
- **Anthropic's public directory**: that's a separate, curated catalog. You submit third-party
  plugins through a [submission form](https://clau.de/plugin-directory-submission) and they review
  for quality and security. You don't need to be an Anthropic admin — but the repo must be public
  with a real license. Use this only for skills you genuinely want to share with the world.

## The payoff

One repo. It versions itself from your commit messages. It serves Cursor through symlinks and
Claude Code through a real marketplace. New teammates are one command (or zero, with managed
settings) away from your whole skill library — at the version you intended.

Pair this with the [GitHub Action skill from part one](https://github.com/TheCloudWay/gh-action-hello-world)
and you've got a self-reinforcing loop: a skill that scaffolds your tooling, distributed by an
infrastructure that updates itself. That's the cloud way.

*Repo: [TheCloudWay/skills](https://github.com/TheCloudWay/skills). MIT. Fork it and make it yours.*
