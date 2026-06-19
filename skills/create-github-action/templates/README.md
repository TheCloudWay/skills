# {{ACTION_NAME}}

[![Release](https://github.com/{{ORG}}/{{REPO_NAME}}/actions/workflows/release.yml/badge.svg)](https://github.com/{{ORG}}/{{REPO_NAME}}/actions/workflows/release.yml)
[![CI](https://github.com/{{ORG}}/{{REPO_NAME}}/actions/workflows/ci.yml/badge.svg)](https://github.com/{{ORG}}/{{REPO_NAME}}/actions/workflows/ci.yml)

{{ACTION_DESCRIPTION}}

## Usage

```yaml
- name: {{ACTION_NAME}}
  uses: {{ORG}}/{{REPO_NAME}}@v1
  with:
    example_input: some-value
    optional_input: extra # optional
```

### Version pinning

- `@v1` - latest stable major (recommended; gets non-breaking updates).
- `@v1.2.3` - exact version.
- `@<sha>` - immutable commit, maximum reproducibility.
- `@beta` - prerelease channel for testing.

## Inputs

| Name | Required | Description |
|------|----------|-------------|
| `example_input` | yes | Describe what this input is for. |
| `optional_input` | no | An optional input. |

## Outputs

<!-- Document outputs here, or remove this section if there are none. -->

| Name | Description |
|------|-------------|
| `result` | Describe the output. |

## Versioning

This action follows [Semantic Versioning](https://semver.org/) and is released automatically
with [semantic-release](https://semantic-release.gitbook.io/) based on
[Conventional Commits](https://www.conventionalcommits.org/):

- `master` -> stable releases (`vX.Y.Z`) and the floating `v1` tag.
- `beta` -> prereleases (`vX.Y.Z-beta.N`).

> The `version` field in `package.json` stays at `0.0.0-development` on purpose: the action is
> consumed by git tag, so the published version lives in git tags/releases, not in `package.json`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security issues: [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) - {{ORG}}.
