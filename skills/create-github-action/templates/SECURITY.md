# Security Policy

## Supported versions

Only the latest major version (the floating `v1`, `v2`, ... tag) and the latest stable release
receive fixes.

## Reporting a vulnerability

Do NOT open a public issue for security problems. Report them privately to the {{ORG}} DevOps /
Security team (for example via a private security advisory in this repository, or the internal
security channel). Include a description, reproduction steps, and impact. You will get an
acknowledgement and a remediation timeline.

## Handling secrets

- Never hardcode tokens, endpoints, or credentials. Pass them as action inputs sourced from
  org/repo secrets.
- Mask sensitive inputs in logs with `core.setSecret(value)`.
- Do not paste real secrets into issues, PRs, or logs.
