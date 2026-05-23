# Process — bootstrap a new `<name>-atoms` catalog

This document defines the canonical sequence for adding a new catalog repo to the
`convergent-systems-co` atoms ecosystem. Each step has a clear output and a clear
"done when" criterion; PR gates are called out so the work moves through the
full delivery cycle (`aiConstitution#15`):

```
worktree+branch  →  commit(s)  →  push  →  PR  →  CI green  →  merge
```

No `--admin` bypass. If CI is flaky, fix the flakiness; don't bypass.

## Inputs

- **Catalog name** (`<name>`) — kebab-case (e.g., `skill`, `schema`, `pipeline`).
- **Purpose statement** — one paragraph for `ATOMS.yml` + `README.md`.
- **Top-level type(s)** — per the [taxonomy spec](../superpowers/specs/2026-05-23-atoms-type-taxonomy-design.md). May be one or many; sub-types may be declared in `schema-atoms`.
- **`composition_dir`** and **`composition_type`** — e.g., `skills` / `skill`.

## Prereqs (operator, one-time per catalog)

NOT assistant-executable. These use the Cloudflare dashboard or the core-infra Global API Key, neither of which is in the narrow split-token scope.

- [ ] Register `<name>-atoms.com` at a registrar (Cloudflare Registrar preferred).
- [ ] Add the domain as a Cloudflare zone (delegate nameservers if registered elsewhere).
- [ ] Add the zone ID to `convergent-systems-co/core-infra/terraform/cloudflare/dns-token/main.tf` (`local.zone_ids` — sorted by ID, with inline `# <name>-atoms.com` comment).
- [ ] Apply `dns-token` in core-infra (requires Global API Key; rotate the GAK after).
- [ ] Confirm: the value in 1Password `Convergent Systems - DNS` now sees the new zone (`gh api ".../zones?name=<name>-atoms.com"` returns it).

Once these are done, the rest of the process is fully assistant-executable.

---

## Phase 1 — Submodule customization (one PR)

| # | Step | Where | Output | Done when |
|---|---|---|---|---|
| 1.0 | `gh repo create convergent-systems-co/<name>-atoms --template convergent-systems-co/astro-tf-app-template --public --description "..."` | org-level | new repo on `main` with template scaffold | `gh repo view` returns 200; `main` has 1 commit |
| 1.1 | Branch in submodule (`feat/initial-customization`) | repo | working tree on new branch | `git rev-parse --abbrev-ref HEAD` = the branch |
| 1.2 | Write `ATOMS.yml` | repo root | catalog manifest conforming to `atoms-spec/v1` | manifest fields complete (name, version, spec, domain, atomTypes/composition_*/federation/runtime_consumers/license) |
| 1.3 | Write `README.md` | repo root | repo overview (purpose, layout, status) | passes Stranger Test (a competent stranger understands what this is from the file alone) |
| 1.4 | Write `infra/terraform/envs/prod/main.tf` | infra | aliased-provider terraform (`cloudflare.account` + `cloudflare.dns`), pages_project + pages_domain + dns_record at apex, sensitive `account_token` and `dns_token` vars | `tofu validate` passes |
| 1.5 | Write `infra/terraform/envs/prod/backend.tf` | infra | R2 backend, key = `state-bucket/convergent-systems-co/<name>-atoms/pages-project.tfstate` | `tofu init` succeeds (against R2) |
| 1.6 | Append terraform entries to `.gitignore` | repo root | `**/.terraform/`, `*.tfstate*`, `.terraform.lock.hcl`, `*.tfvars` (except `terraform.tfvars`) | `git check-ignore .terraform/` confirms |
| 1.7 | Write `web/site/src/pages/index.astro` | site source | branded placeholder using the `<NAME>-Atoms` SHOUTED-prefix title pattern | astro build produces `dist/index.html` with correct `<title>` |
| 1.8 | Set `web/site/astro.config.mjs` site URL | site config | `site: 'https://<name>-atoms.com'` | astro build clean, no example.com references |
| 1.9 | Create empty content dirs | repo root | `<composition_dir>/.gitkeep`, `schemas/.gitkeep` (or `schemas/v1/` if this catalog hosts canonical schemas) | dirs exist and `.gitkeep` tracked |
| **PR #1** | Commit + push + PR + CI green + merge (`--merge --auto --delete-branch`) | submodule repo | branch merged to main, deleted | `gh pr view --json state` = `MERGED` |

Steps **1.2 through 1.9 can be parallelized** — each is a separate file on the same branch.

## Phase 2 — Infra apply + content deploy (post-merge, no PR)

These run against the merged `main` of the submodule, not against a branch. No source change → no PR.

| # | Step | Where | Output | Done when |
|---|---|---|---|---|
| 2.1 | `tofu init && tofu apply` | submodule, on `main` | Pages project created, apex `pages_domain` attached, apex CNAME created | `tofu output` shows `project_name`, `subdomain`, `custom_domain` |
| 2.2 | `cd web/site && npm ci && npm run build && wrangler pages deploy dist --project-name <name>-atoms --branch main` | submodule, on `main` | content uploaded, deployment URL returned | `curl https://<name>-atoms.pages.dev` returns 200 |
| 2.3 | Verify apex resolves | external | dig + curl pass | `dig +short @1.1.1.1 <name>-atoms.com` returns Cloudflare IPs; `curl --resolve <name>-atoms.com:443:<ip> https://<name>-atoms.com` returns 200 with the SHOUTED title |

## Phase 3 — Register in parent atoms (one PR)

| # | Step | Where | Output | Done when |
|---|---|---|---|---|
| 3.1 | Branch in parent atoms (`chore/register-<name>-atoms`) | parent atoms | new branch | working tree on branch |
| 3.2 | `git submodule add` for the new repo | parent atoms | `.gitmodules` entry + `src/<name>-atoms` SHA ref pointing at merged-main HEAD | `git ls-tree HEAD src/<name>-atoms` resolves to a commit on the submodule's `main` |
| 3.3 | Update parent `README.md` catalog table | parent atoms | new row matching the existing format | row visible in rendered README |
| **PR #2** | Commit + push + PR + CI green + merge | parent atoms | branch merged to main, deleted | `gh pr view --json state` = `MERGED` |

## Phase 4 — Catalog signing (one PR)

| # | Step | Where | Output | Done when |
|---|---|---|---|---|
| 4.1 | Branch in parent atoms (`chore/sign-<name>-atoms-catalog`) | parent atoms | new branch | working tree on branch |
| 4.2 | `node scripts/sign-atoms.mjs` (requires 1Password CLI signed in to `Convergent Systems LLC / atoms-root`) | parent atoms | `catalogs/<name>-atoms.toml` generated + signed; `catalogs/index.toml` updated; existing catalog timestamps may refresh (bootstrap caveat per the script's header comment) | `jq` parses output as valid TOML; signature field present |
| **PR #3** | Commit + push + PR + CI green + merge | parent atoms | branch merged to main, deleted | `gh pr view --json state` = `MERGED` |

## Phase 5 — Smoke test the chain

| # | Step | Output | Done when |
|---|---|---|---|
| 5.1 | `<name>-atoms.com` apex live | HTTP 200, branded title | curl from external resolver returns 200 with the SHOUTED title |
| 5.2 | `<name>-atoms.pages.dev` live | HTTP 200 | curl returns 200 |
| 5.3 | Parent README lists the catalog | row present | grep finds the row |
| 5.4 | `catalogs/<name>-atoms.toml` signed and committed to parent `main` | file exists, signed | `jq` + signature check pass |

---

## Companion process — align an existing catalog to the split-token pattern

For repos that already exist but don't yet have the aliased-provider terraform (the 18 we ran in this session). Shorter; no submodule creation, no signing.

| # | Step | Output | PR? |
|---|---|---|---|
| A1 | Branch `chore/adopt-split-token-apex` | branch | — |
| A2 | Replace `infra/terraform/envs/prod/main.tf` with the aliased-provider template (apex pinned to `<name>.com`) | new main.tf | in PR |
| A3 | Replace `infra/terraform/envs/prod/backend.tf` with the R2 backend block (per-repo key path) | new backend.tf | in PR |
| A4 | Append terraform entries to `.gitignore` | gitignore | in PR |
| **PR A** | Commit + push + PR + CI green + merge | merged | ✅ |
| A5 | `tofu apply` (post-merge). If an existing out-of-state Pages project: add `import {}` blocks BEFORE the apply — verify the v5 cloudflare provider's `cloudflare_pages_domain` import ID format first; both `<account>/<project>/<uuid>` and `<account>/<project>/<name>` failed in the 2026-05-23 session | imported + applied | — |
| A6 | Bump submodule SHA in parent atoms | parent in sync | separate PR (per Phase 3 shape) |

---

## Why this process exists

Codifies the patterns learned during the 2026-05-23 atoms expedite session, including the discipline gap surfaced in [`aiConstitution#15`](https://github.com/convergent-systems-co/aiConstitution/issues/15). The full delivery cycle is the contract; no step skips. Bulk operations that bypass CI or skip PR are defects, even when authorized one-time.

## References

- [`aiConstitution#15`](https://github.com/convergent-systems-co/aiConstitution/issues/15) — delivery cycle discipline (the underlying rule).
- [`aiConstitution#11`](https://github.com/convergent-systems-co/aiConstitution/issues/11) — task tracking governance (sibling cycle).
- [`docs/superpowers/specs/2026-05-23-atoms-type-taxonomy-design.md`](../superpowers/specs/2026-05-23-atoms-type-taxonomy-design.md) — taxonomy that drives type/composition decisions per catalog.
- `~/.ai/Common.md §11.2` — commit + PR discipline.
- `~/.ai/Code.md §3` — testing + CI requirements.
- `convergent-systems-co/core-infra/scripts/cs-tofu` — wrapper that loads narrow tokens from 1Password per module.
- `convergent-systems-co/atoms/scripts/sign-atoms.mjs` — catalog signing pass.
