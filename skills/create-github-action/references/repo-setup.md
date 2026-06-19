# Repository setup: org repo, ACTIONS_TOKEN and branch protection

Exact commands to create the repo in the {{ORG}} org and protect the release branches
without breaking the semantic-release pipeline. Requires `gh` authenticated with an account
that is admin of the org/repo.

## 1. Create and push

```bash
gh repo create {{ORG}}/{{REPO_NAME}} --private --source=. --remote=origin \
  --description "{{ACTION_DESCRIPTION}}" --push
git branch beta && git push -u origin beta
```

## 2. ACTIONS_TOKEN

The release workflow reads the org secret `ACTIONS_TOKEN` (admin PAT) for both `checkout` and
`semantic-release`, falling back to the default token when unset:

```yaml
token: ${{ secrets.ACTIONS_TOKEN || github.token }}
```

Confirm the secret is available to the repo:

```bash
gh api repos/{{ORG}}/{{REPO_NAME}}/actions/organization-secrets --jq '.secrets[].name'
```

The token owner MUST be a repository admin (or org owner) so it bypasses the ruleset. If
`ACTIONS_TOKEN` does not exist, create an admin fine-grained PAT (Contents: read/write) and add
it: `gh secret set ACTIONS_TOKEN --repo {{ORG}}/{{REPO_NAME}}`.

## 3. Branch protection ruleset

Create a ruleset targeting `master` and `beta`. Write this payload to a file and POST it.
`actor_id: 5` is the repository **Admin** role (lets admins and the admin PAT bypass).

```json
{
  "name": "protect-release-branches",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/heads/master", "refs/heads/beta"], "exclude": [] } },
  "bypass_actors": [
    { "actor_id": 5, "actor_type": "RepositoryRole", "bypass_mode": "always" }
  ],
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 1,
        "require_code_owner_review": true,
        "dismiss_stale_reviews_on_push": true,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": false,
        "required_status_checks": [ { "context": "Test" }, { "context": "Build" } ]
      }
    }
  ]
}
```

```bash
gh api --method POST repos/{{ORG}}/{{REPO_NAME}}/rulesets --input ruleset.json
```

Notes:
- The status check contexts `Test` and `Build` are the job names in `ci.yml`.
- Do NOT add the GitHub Actions integration as a bypass actor at repo scope — GitHub rejects it
  (`Actor GitHub Actions integration must be part of the ... organization`). The admin role
  bypass + `ACTIONS_TOKEN` is the working approach.
- With `require_code_owner_review`, a solo maintainer cannot approve their own PR; admins merge
  via the bypass. To drop that, set `required_approving_review_count: 0` and
  `require_code_owner_review: false`.

## 4. Keep beta in sync

After advancing `master`, sync `beta` (admins bypass, so a direct push is fine):

```bash
git checkout beta && git merge origin/master --no-edit
# resolve CHANGELOG.md by keeping master's version if it conflicts
git push origin beta && git checkout master
```

## 5. Verify

```bash
gh run list --workflow=release.yml --limit 3
gh release list
git ls-remote --tags origin | grep -E 'refs/tags/v1$'
```
