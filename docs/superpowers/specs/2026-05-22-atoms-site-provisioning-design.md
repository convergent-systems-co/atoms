# Design — Atoms Site Provisioning

**Date:** 2026-05-22
**Author:** Thomas Polliard (with AI assist; see §11)
**Status:** Approved (brainstorming phase complete; implementation plan to follow)
**Supersedes:** none
**Companion spec:** `docs/superpowers/specs/2026-05-22-atoms-template-alignment-design.md` (prerequisite work, already shipped)

---

## 1. Objective

Bring 13 currently-offline `*-atoms.com` sites online (agent, channel, compliance, event, identity, knowledge, model, persona, plugin, policy, profile, service, workflow) and bring the 2 existing live sites (theme, brand) under the same Terraform-managed pattern as the umbrella site `atoms.convergent-systems.co`.

Success means: every `*-atoms.com` domain returns a 200 OK at its root via a Cloudflare Pages project whose lifecycle is managed by OpenTofu using a shared module sourced from `convergent-systems-co/core-infra`. State for each catalog lives in the existing `cs-tfstate` R2 bucket. CI/CD deploys site content on every merge to `main` via `wrangler pages deploy`. theme-atoms.com and brand-atoms.com remain continuously available during the import.

---

## 2. Rationale and Alternatives

The prior template-alignment work (spec `2026-05-22-atoms-template-alignment-design.md`) put scaffold infrastructure in place: every catalog has `infra/terraform/envs/{dev,stg,prod}/` and `.github/workflows/release.yml`. None of that scaffold has been applied yet — no Pages projects exist for the 13 Band B catalogs, and theme + brand are managed out-of-band (Cloudflare dashboard / wrangler-only).

`core-infra/GOALS.md §2` is explicit: shared infrastructure available to every Convergent Systems system lives in `core-infra`, not in any consumer. The Pages-project Terraform module currently in the atoms umbrella is shared infrastructure by definition (16 consumers + future ones), so it belongs in `core-infra`.

`core-infra` uses OpenTofu (`.opentofu-version`). The atoms repos use Terraform. Two toolchains in one org. The tooling divergence is technical debt that should be resolved as part of this work, not deferred indefinitely.

### Alternatives table

| Alternative | Pros | Cons | Verdict |
|---|---|---|---|
| **A.** Per-catalog state, central module via Git source, OpenTofu (chosen) | Module lives in one place; catalogs reference by pinned tag; independent state per catalog; matches `core-infra` posture | Adds Phase 0 module migration; introduces Git-source module-fetch dependency at `tofu init` time | **Chosen** |
| **B.** Per-catalog state, module copied into each repo | No Git-source dependency at apply time; fully self-contained | Module duplicated 17×; updates require touching every repo; defeats the "civilization-grade" reuse goal | Rejected — duplication |
| **C.** Centralized in umbrella — single TF state for all 16 | Single `tofu apply`; one state file; simplest ops | Couples lifecycles (any catalog's drift blocks all others); state file is large; doesn't match the per-catalog repo model | Rejected — lifecycle coupling |
| **D.** Keep Terraform; defer OpenTofu alignment | No tooling migration churn | Two toolchains in one org indefinitely; new contributors confused; `core-infra` shared-infra posture undermined | Rejected — deferred problem grows |

---

## 3. Architecture

```
SHARED INFRA                  convergent-systems-co/core-infra
                              ──────────────────────────────────────
                              terraform/cloudflare/state-bucket/
                                  (existing — provisions cs-tfstate R2 bucket)
                              terraform/cloudflare/pages-project/   ← NEW
                                  (moved from atoms umbrella)

PER-CATALOG INFRA             convergent-systems-co/<catalog>-atoms
                              ──────────────────────────────────────
                              infra/terraform/envs/prod/
                                  main.tf       references core-infra
                                                module via git source @
                                                pinned ref
                                  backend.tf    R2 backend, per-catalog key
                                  versions.tf   OpenTofu ≥ 1.10, CF ~> 5.0

UMBRELLA INFRA                convergent-systems-co/atoms
                              ──────────────────────────────────────
                              infra/terraform/envs/prod/main.tf
                                  module source updated to git::core-infra
                                  (already uses provider 5.x — only the
                                   source path changes)

TOOLING                       OpenTofu (matches core-infra). All atoms
                              repos and umbrella drop `.terraform-version`,
                              add `.opentofu-version` ("1.10").

STATE                         R2 bucket cs-tfstate (existing). Per-catalog
                              key under existing prefix:
                                state-bucket/convergent-systems-co/
                                    <catalog>-atoms/pages-project.tfstate

DEPLOY TRIGGER                tofu apply (one-time per catalog) creates
                              the Pages project + custom domain + DNS.
                              release.yml deploys site content on every
                              merge to main via wrangler pages deploy.
```

Two-phase model per catalog: **infrastructure** (one-time `tofu apply`) and **content** (CI on every merge).

The S3 backend block is identical to the one core-infra uses (verified byte-for-byte against `core-infra/terraform/cloudflare/state-bucket/versions.tf` and `workers-ai/versions.tf`):

```hcl
backend "s3" {
  bucket = "cs-tfstate"
  key    = "state-bucket/convergent-systems-co/<catalog>-atoms/pages-project.tfstate"
  region = "auto"
  endpoints = {
    s3 = "https://e1fe0f0ce8ff18da4edc118372c30022.r2.cloudflarestorage.com"
  }
  skip_credentials_validation = true
  skip_region_validation      = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
  skip_s3_checksum            = true
  use_path_style              = false
  use_lockfile                = true     # OpenTofu ≥ 1.10 conditional-write lock
}
```

---

## 4. The pages-project module migration

### Source

`atoms/infra/terraform/modules/pages-project/` — five files (main, variables, outputs, versions, README).

### Destination

`core-infra/terraform/cloudflare/pages-project/` — same five files, copied verbatim. The module is already at provider `cloudflare/cloudflare ~> 5.0` and is OpenTofu-compatible, so no code change is required.

### Naming convention

Matches the existing `core-infra/terraform/cloudflare/<module-name>/` layout (`state-bucket/`, `workers-ai/`, `auth/`, `pages-project/` ← new).

### Consumer references

Umbrella:

```hcl
module "pages_project" {
- source = "../../modules/pages-project"
+ source = "git::https://github.com/convergent-systems-co/core-infra.git//terraform/cloudflare/pages-project?ref=v0.1.0"
  ...
}
```

A new release tag on `core-infra` (e.g., `v0.1.0`) pins the module version. Tag bumps are how consumers pick up module changes.

Catalogs reference the same Git source at the same tag.

### Cleanup

After umbrella + first 3 catalogs (Wave 1) verify cleanly, the module is deleted from atoms umbrella in a follow-up PR. Two locations briefly during transition; one location long-term.

---

## 5. Per-catalog TF refactor pattern

### Current state (from astro-tf-app-template scaffold)

```
<catalog>-atoms/infra/terraform/
├── .terraform-version           "1.7"          ← drop
├── envs/
│   ├── dev/   main.tf           cloudflare provider ~> 4.0
│   ├── stg/                       inline cloudflare_pages_project
│   └── prod/                      build_config { root_dir = "web/site" }
│         main.tf, backend.tf, terraform.tfvars
└── modules/  (empty, .keep)
```

### Target state

```
<catalog>-atoms/
├── .opentofu-version            "1.10"         ← add at REPO root, not infra root
└── infra/terraform/envs/prod/
    ├── main.tf              module "pages_project" {
    │                          source = "git::https://github.com/convergent-systems-co/core-infra.git//terraform/cloudflare/pages-project?ref=v0.1.0"
    │                          cloudflare_account_id = var.cloudflare_account_id
    │                          project_name          = "<catalog>-atoms"
    │                          production_branch     = "main"
    │                          custom_domain         = "<catalog>-atoms.com"
    │                          zone_id               = var.zone_id
    │                        }
    │                        variable "cloudflare_account_id" { type = string }
    │                        variable "zone_id"               { type = string }
    │                        output "subdomain"      { value = module.pages_project.subdomain }
    │                        output "custom_domain"  { value = module.pages_project.custom_domain }
    ├── backend.tf           S3/R2 backend block from §3
    ├── versions.tf          required_version = ">= 1.10.0"; cloudflare ~> 5.0
    └── terraform.tfvars     # operator sets cloudflare_account_id, zone_id
                             # (or sources via TF_VAR_* environment vars)
```

### `envs/dev` and `envs/stg`

Stay scaffolded but inert (matching the umbrella's pattern). The pages-project module can be invoked there for non-prod previews; in this work we only wire `prod`.

### Delta the plan applies, per catalog

- Delete `infra/terraform/.terraform-version`
- Add `.opentofu-version` at repo root (`"1.10"`)
- Rewrite `infra/terraform/envs/prod/main.tf` (module reference)
- Add or update `infra/terraform/envs/prod/versions.tf`
- Rewrite `infra/terraform/envs/prod/backend.tf` (R2 + use_lockfile)
- Update `infra/terraform/envs/prod/terraform.tfvars` (real values or empty + `TF_VAR_*`)
- Delete `infra/terraform/modules/` if `.keep`-only (no local module needed)

### Files NOT touched

- `envs/dev` and `envs/stg` (inert; same template scaffold)
- `web/`, `ATOMS.yml`, `schemas/`, `atoms/`, `exports/`, per-catalog `scripts/`, `docs/`

---

## 6. Theme + brand import flow

The two production sites are already running. We bring them under the new TF pattern *without* destroying and recreating the Pages project.

### Current live state

| Property | theme-atoms.com | brand-atoms.com |
|---|---|---|
| Cloudflare Pages project name | `theme-atoms` | `brand-atoms` |
| Custom domain attachment | attached out-of-band via Cloudflare dashboard | attached out-of-band |
| DNS record | proxied CNAME at theme-atoms.com → theme-atoms.pages.dev (Cloudflare-managed; zone at Cloudflare) | same shape for brand-atoms.com |
| TF state | NONE — never under management | NONE |
| Deploy mechanism | `wrangler pages deploy` from `web/package.json` + GitHub Action | same |

### Import flow (per repo, theme then brand)

1. Open feature branch.
2. Refactor `infra/terraform/envs/prod/{main.tf, backend.tf, versions.tf}` to the §5 target pattern (`project_name`, `custom_domain`, `zone_id` values match what's live in Cloudflare).
3. `tofu init`.
4. `tofu import` per resource:

```bash
tofu import module.pages_project.cloudflare_pages_project.this \
    "<account_id>/theme-atoms"
tofu import 'module.pages_project.cloudflare_pages_domain.custom[0]' \
    "<account_id>/theme-atoms/theme-atoms.com"
tofu import 'module.pages_project.cloudflare_dns_record.pages_cname[0]' \
    "<zone_id>/<record_id>"
```

`record_id` is obtained via a one-shot Cloudflare API call (`GET /zones/<zone>/dns_records?type=CNAME&name=theme-atoms.com`) or via `tofu console`.

5. **CRITICAL CHECKPOINT: `tofu plan` must be empty.** If it shows additions, changes, or destructions, STOP. Investigate drift between live attributes and module defaults (likely `build_config`, `proxied`, or `production_branch`). Fix the module or the variable inputs until the plan is empty.

6. Open PR with a comment in the body asserting the plan is empty (paste the no-op `tofu plan` output).

7. Merge.

### What to watch for during import

- **`build_config` attributes.** Live project may have build settings (`root_dir`, `build_command`, `deploy_command`) that differ from module defaults. Compare before importing; align the module or pass extra var values that match live.
- **DNS proxied state.** Live record may not be proxied; module defaults `proxied = true`. Adjust the module input or change the record (the latter changes traffic flow — needs explicit user approval).
- **Pages domain status.** Live attachment may be `active` or `pending`. Verify via dashboard before/after.

### Rollback

- **Per-resource:** `tofu state rm <address>` removes the resource from TF state without deleting the live resource. Net effect: TF "forgets" the resource; live site continues running unmanaged. Recoverable.
- **Full:** revert the PR. Branch is local-only until merged, so reverting before merge is `git switch main && git branch -D <branch>`.
- The Pages project itself is **never** deleted by `import`. The risk is destroy-recreate from a drift-bearing `apply`, which the empty-plan checkpoint (step 5) prevents.

---

## 7. CI deploy trigger (wrangler on merge)

Every catalog's `release.yml` already exists from the template-alignment work. It needs the production-ready Cloudflare Pages deploy step.

### Pre-flight (already true after template-alignment)

- Every catalog has `.github/workflows/release.yml` from the scaffold.
- Org-level secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` inherited (`~/.ai/memory/reference_cloudflare_pages_org_secrets.md`).
- Each Band A catalog has `wrangler` in `web/devDependencies`; Band B catalogs need it added.

### What changes in `release.yml`

```yaml
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4      # Band A; Band B uses npm
        with: { version: 10 }
      - uses: actions/setup-node@v4
        with: { node-version: "22" }
      - working-directory: web
        run: pnpm install --frozen-lockfile && pnpm run build
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy web/dist --project-name=<catalog>-atoms
```

### Project name coupling

The `--project-name` flag must match the `project_name` passed to the pages-project module. Pattern: `<catalog>-atoms`. Mismatch = wrangler creates a second Pages project — the failure mode that motivated this work. Each catalog's PR review checks the TF input and the workflow `--project-name` side-by-side.

### Gating

- The deploy step requires the Pages project to exist. Sequence per catalog: `tofu apply` first, then merge the `release.yml` update, then subsequent merges trigger deploys.
- Org-level secrets inherit, but each catalog gets a one-shot verification before its first deploy:

```bash
gh secret list --repo convergent-systems-co/<catalog>-atoms
# must show CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID
```

---

## 8. Rollout phases

### Phase 0 — Module migration to core-infra

| Step | Action |
|---|---|
| P0.1 | Copy `atoms/infra/terraform/modules/pages-project/` → `core-infra/terraform/cloudflare/pages-project/` |
| P0.2 | Tag a release on `core-infra` (`v0.1.0`) to pin the module ref |
| P0.3 | Update atoms umbrella's `envs/prod/main.tf` to source the module from `git::core-infra` at `v0.1.0`. `tofu init && tofu plan` must be empty |
| P0.4 | PR + merge against atoms umbrella |
| P0.5 | Delete `atoms/infra/terraform/modules/pages-project/` in a follow-up PR |

### Phase 1 — OpenTofu migration

| Step | Action |
|---|---|
| P1.1 | Atoms umbrella: replace `.terraform-version` with `.opentofu-version`. Update Makefile (`terraform → tofu`). Update CI `tf-plan` workflow to use OpenTofu. PR + merge. |
| P1.2 | Apply the same delta across all 16 catalog repos. Parallel batches of 4. |

### Phase 2 — Pilot 1 of 13: channel-atoms

| Step | Action |
|---|---|
| P2.1 | Branch channel-atoms |
| P2.2 | Replace `envs/prod/main.tf` with the §5 target pattern |
| P2.3 | Configure `backend.tf` per §3 |
| P2.4 | `tofu init && tofu apply` — creates Pages project + custom domain + DNS |
| P2.5 | Update `release.yml` to wrangler-deploy to `channel-atoms` project |
| P2.6 | PR + merge — first real deploy fires |
| P2.7 | Verify https://channel-atoms.com loads the placeholder index |
| P2.8 | **PAUSE** — confirm pilot before scaling |

### Phase 3 — Pilot 2: theme-atoms import

| Step | Action |
|---|---|
| P3.1 | Refactor TF to target pattern |
| P3.2 | `tofu init` |
| P3.3 | `tofu import` per §6 (project + domain + DNS) |
| P3.4 | `tofu plan` — MUST be empty. Stop if not. |
| P3.5 | PR + merge with empty-plan attestation |
| P3.6 | Verify theme-atoms.com still serves traffic, no preview interruption |
| P3.7 | **PAUSE** — confirm import flow before scaling |

### Phase 4 — Scale to 12 remaining

| Step | Action |
|---|---|
| P4.1 | Batch 1 (6 parallel): compliance, event, identity, knowledge, model, persona |
| P4.2 | Batch 2 (6 parallel): plugin, policy, service, workflow, agent, prompt |
| P4.3 | Verify each site loads at `<catalog>-atoms.com` |

(`agent` and `prompt` are Band A by template-alignment classification, but their Pages projects don't exist yet — they were never deployed — so they go through the same `tofu apply` flow as Band B, not an import.)

### Phase 5 — brand-atoms import + profile-atoms apply

| Step | Action |
|---|---|
| P5.1 | brand-atoms IMPORT (same flow as theme-atoms in Phase 3) |
| P5.2 | profile-atoms APPLY (Band A by classification, but never deployed) |
| P5.3 | Verify |

### Phase 6 — Verification + xdao deprecation note

| Step | Action |
|---|---|
| P6.1 | Extend `scripts/verify-template-alignment.sh` (or write a new `verify-sites-online.sh`) with site-online checks: for each of 16 catalogs, `curl -sI https://<c>.com \| grep '200 OK'`, and `tofu plan` empty |
| P6.2 | File a follow-up issue against `convergent-systems-co/xdao` documenting the deprecation decision (xdao → archive; `atoms.convergent-systems.co` is canonical federation) |

---

## 9. Success criteria

All verifiable per `Common.md U14`.

| ID | Criterion | Verification |
|---|---|---|
| SC-1 | All 16 `*-atoms.com` domains serve `200 OK` at root | `curl -sI https://<catalog>-atoms.com \| head -1` returns `HTTP/2 200` or `HTTP/1.1 200 OK` for all 16 |
| SC-2 | Each Pages project name matches `<catalog>-atoms` | TF state inspection: `tofu state show module.pages_project.cloudflare_pages_project.this \| grep '^ *name'` |
| SC-3 | Each catalog's `tofu plan` in `envs/prod` is empty | Run `tofu plan` per catalog; exit code 0 with "No changes" output |
| SC-4 | DNS records at `<catalog>-atoms.com` proxied (orange-cloud on) | Cloudflare API query or `tofu state show` of the dns_record resource: `proxied = true` |
| SC-5 | `release.yml` `--project-name` matches TF `project_name` | Per-catalog diff; mismatches fail |
| SC-6 | Module sourced from core-infra at pinned tag | grep across all catalog `main.tf` for `source = "git::https://github.com/convergent-systems-co/core-infra` |
| SC-7 | TF state for each catalog at the canonical R2 key | `aws s3 ls` (or wrangler equivalent) against `cs-tfstate/state-bucket/convergent-systems-co/<catalog>-atoms/` |
| SC-8 | No out-of-band Pages projects created during this work | Pre-/post-work count of Pages projects in the Cloudflare account; diff matches expected 13-new |
| SC-9 | theme-atoms.com + brand-atoms.com never returned non-200 during import | Cloudflare analytics health-check during the 30-min import window per site |

---

## 10. Risk assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| `tofu import` on theme/brand produces drift-bearing plan that would destroy-recreate | Medium | Empty-plan checkpoint (§6 step 5) blocks merge; rollback is `state rm` |
| Module ref tag bumped during in-flight migration | Low | Pin tag at start; only bump after Phase 5 completes |
| Wrangler `--project-name` mismatch creates orphan Pages project | Medium | Per-catalog PR review (§7) compares TF input and workflow side-by-side |
| OpenTofu migration breaks existing umbrella plan/apply | Medium | Pilot OpenTofu on the umbrella (Phase 1.1) before scaling; `tofu plan` must be empty against existing R2 state |
| DNS proxied state changes user-visible behavior (TLS, caching) | Low | Module defaults `proxied = true`; theme/brand currently proxied (verify) |
| Module Git-source fetch fails at `tofu init` time | Low | Pinned tag plus HTTPS-archive download is robust; document the fallback (`source = "../../modules/pages-project"` as a local override during outage) |
| Cost from Cloudflare Pages free-tier limits across 16 projects | Low | Free tier allows 100 projects per account; well within bounds |
| Concurrent `tofu apply` across catalogs corrupts state | Low | `use_lockfile = true` on the S3 backend uses S3 conditional writes for per-key locking |

---

## 11. Dependencies and backward compatibility

### Dependencies

- `core-infra` repo exists and the `terraform/cloudflare/` layout is already established (`state-bucket/`, `workers-ai/`, `auth/`)
- `cs-tfstate` R2 bucket exists (provisioned via `core-infra/scripts/bootstrap-tf-state.sh`)
- `CLOUDFLARE_API_TOKEN` available in operator environment + GitHub org-level secrets
- Cloudflare account ID + zone IDs for the 16 `*-atoms.com` zones (all 13 missing domains confirmed registered to the same Cloudflare account)
- OpenTofu ≥ 1.10 installed on operator workstations and CI runners (the CI workflows need updating)

### Backward compatibility

- Existing live sites (theme + brand) stay live throughout the import via the empty-plan checkpoint.
- The umbrella `atoms.convergent-systems.co` keeps its existing Pages project + custom domain; only the module source path changes (existing TF state is unchanged in shape).
- Catalogs that were unmanaged before this work gain TF management; no existing user-visible URL changes.
- `release.yml` workflow files are updated; old workflow files (`deploy.yml` in some Band A repos) are removed in the same PR to avoid double-deploys.

---

## 12. Out of scope

These are explicitly excluded from this work and tracked for later:

- **xdao deprecation.** Documented as a decision (`atoms.convergent-systems.co` is canonical federation). The actual archive of `convergent-systems-co/xdao` is a separate, smaller plan.
- **`envs/dev` and `envs/stg` wiring.** Only `envs/prod` gets a Pages project in this work. Non-prod previews come later if needed.
- **profile-atoms v1.0.0 implementation.** Tracked in `convergent-systems-co/profile-atoms#3`. The provisioning here just gets profile-atoms.com online with the placeholder site.
- **Site content.** The 13 new sites serve the template-scaffolded placeholder index. Real catalog-rendering content is per-catalog future work.
- **Cloudflare Pages free-tier monitoring.** Setting up alerting for build/deploy quota usage. Currently well under limits; revisit if usage grows.
- **Cross-catalog navigation / federation UX at atoms.convergent-systems.co.** The umbrella site's content (catalog directory, search, governance pages) is its own design.

---

## 13. Open questions

These are not blocking the implementation plan but warrant resolution before or during execution:

- **Q1.** Wrangler version pin. The Band A catalogs have `wrangler ^4.0` in their `web/devDependencies`; Band B will be added. Should we pin to a specific minor across the org (e.g., `wrangler@4.x`) and propagate via Dependabot, or float? Recommendation: pin to a minor at this work's start; let Dependabot bump.
- **Q2.** `astro check` failures in some catalogs that were marked `continue-on-error` during template-alignment. Do those need addressing now (so the type-check is a real gate) or stay non-blocking? Recommendation: stay non-blocking; address per-catalog as a separate cleanup.
- **Q3.** `dependabot.yml` will fire many PRs across 16 newly-aligned repos. Should we set `open-pull-requests-limit: 5` org-wide to avoid PR sprawl? Recommendation: yes, in a small org-wide chore PR.
- **Q4.** The `record_id` for the import step requires a Cloudflare API call. Document the lookup recipe in `core-infra/docs/runbooks/` so future imports don't re-invent it.

---

## 14. AI involvement (provenance)

This design was produced collaboratively in a Claude Code session on 2026-05-22. The human author (Thomas Polliard) directed the scope, made all material choices (module home, tooling alignment, rollout sequence, xdao deprecation), and approved each design section. The AI assistant explored the codebase including the sibling `core-infra` repo, surfaced trade-offs, proposed alternatives, and drafted this document. Per `Common.md U4`.

A `CLOUDFLARE_API_TOKEN` was inadvertently echoed to the conversation transcript during exploration (`Common.md §4.1` violation). The violation is logged at `~/.ai/audit/violations/2026-05-22T145028Z.md` and the user was alerted in-line to rotate the token. This design assumes the token has been rotated before any execution begins.
