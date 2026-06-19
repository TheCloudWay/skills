#!/usr/bin/env bash
#
# Moves (or creates) the floating major version tag (e.g. v1) so it points to
# the latest stable release. This lets consumers use the action with `@v1`.
#
# It is invoked from semantic-release (successCmd) with the version that was
# just published. Prereleases (e.g. 1.2.0-beta.1) are skipped: only `master`
# moves the major tag.

set -euo pipefail

VERSION="${1:-}"

if [[ -z "${VERSION}" ]]; then
  echo "::error::No version was passed as an argument."
  exit 1
fi

# Skip prereleases (they contain a hyphen, e.g. 1.2.0-beta.1).
if [[ "${VERSION}" == *-* ]]; then
  echo "Prerelease ${VERSION}: skipping major tag update."
  exit 0
fi

MAJOR="v${VERSION%%.*}"

echo "Updating major tag ${MAJOR} -> v${VERSION}"
git tag -f "${MAJOR}"
git push origin "${MAJOR}" --force
