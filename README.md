# The Cloud Way Skills

Shared Agent Skills for **Cursor** and **Claude Code**, plus a Claude Code **plugin
marketplace**. Each skill lives under [`skills/`](skills/) with its own `SKILL.md`.

These are the companion repos for the blog posts on building GitHub Actions and running your own
skills marketplace.

## Available skills

| Skill | Description |
|-------|-------------|
| [`create-github-action`](skills/create-github-action/) | Scaffold a new JavaScript GitHub Action repo (action.yml, committed dist/, tests, semantic-release master+beta, pre-commit, community health files). |

## Use with Claude Code (marketplace)

```bash
# In Claude Code:
/plugin marketplace add TheCloudWay/skills
/plugin install thecloudway-skills@thecloudway-skills
```

Or from a shell: `claude plugin marketplace add TheCloudWay/skills && claude plugin install thecloudway-skills@thecloudway-skills`.

Updates: `claude plugin marketplace update thecloudway-skills`.

## Use with Cursor

Cursor loads skills from `~/.cursor/skills/`. Clone and symlink so they update with `git pull`:

```bash
git clone https://github.com/TheCloudWay/skills.git ~/tcw-skills
mkdir -p ~/.cursor/skills
for d in ~/tcw-skills/skills/*/; do
  ln -sfn "$d" ~/.cursor/skills/$(basename "$d")
done
```

## Versioning (automated)

The plugin version (`.claude-plugin/plugin.json`) is bumped automatically by
[semantic-release](https://semantic-release.gitbook.io/) on every push to `master`, from
[Conventional Commits](https://www.conventionalcommits.org/) (`feat` -> minor, `fix` -> patch,
`feat!`/`BREAKING CHANGE` -> major; `docs`/`chore`/`ci` -> no bump). Do not edit the version by
hand.

## License

[MIT](LICENSE) - The Cloud Way.
