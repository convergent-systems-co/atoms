# Design — Atoms Template Alignment

**Date:** 2026-05-22
**Author:** Thomas Polliard (with AI assist; see §11)
**Status:** Approved (brainstorming phase complete; implementation plan to follow)
**Supersedes:** none
**Scope:** Umbrella repo `convergent-systems-co/atoms` and its 16 catalog submodules under `src/`

---

## 1. Objective

Bring all 16 `*-atoms` submodules into structural alignment with `convergent-systems-co/astro-tf-app-template`, without breaking the two production sites (`theme-atoms.com`, `brand-atoms.com`). Apply the same alignment pass to the umbrella's own Go-based scaffold against `convergent-systems-co/go-tf-app-template`. Make the migration deterministic and repeatable via an idempotent script that becomes permanent org tooling.

Success means: every `*-atoms` repo carries identical scaffolding (workflows, infra, docs, tooling, devcontainer, license bundle); the two production sites continue to build and deploy unchanged; every catalog gains a working single-site Astro shell or preserves the one it has; the umbrella aligns with `go-tf-app-template`; a future contributor can re-run the same script against a brand-new catalog and produce the same structure.

## 2. Rationale and Alternatives

`GOALS.md` mandates that all `*-atoms.com` sites use `astro-tf-app-template` and that the umbrella `atoms.convergent-systems.co` use `go-tf-app-template`. Currently:

- 5 catalogs have partial Astro sites at `web/` (varying versions, pnpm vs. npm)
- 11 catalogs have no `web/` at all (catalog data only)
- None have the template's GitHub workflows, devcontainer, or terraform infra wiring
- License coverage is inconsistent (4 Apache-2.0, 1 unlicensed, 11 unlicensed)
- The umbrella has partial `go-tf-app-template` adoption (recent commits `c1378d3`, `552d838`) but is missing the `stg` environment and several standard docs

### Alternatives table

| Alternative | Pros | Cons | Verdict |
|---|---|---|---|
| **A.** One PR per submodule, hand-crafted | Clean per-repo review; easy rollback; no shared script state | 17 manual cycles; drift between repos as each is hand-tuned | Rejected — drift risk |
| **B.** `/spawn` waves with parallel TLs | Fast wall-clock; mirrors prior wave pattern | Spawn-checkpoint flakiness noted in lessons-learned; harder cross-repo lockstep | Rejected — flakiness |
| **C.** Idempotent script + per-repo PRs | Deterministic; identical scaffold everywhere; script becomes durable org tooling; idempotency provable; matches existing project pattern (validator scripts) | Half-day upfront cost on the script | **Chosen** |

---

## 3. Architecture

```
atoms/                                    UMBRELLA
├── scripts/
│   └── apply-template-scaffold.sh        ← new, idempotent, re-runnable
└── src/<catalog>-atoms/                  ← submodules (PR each separately)
```

### `apply-template-scaffold.sh` contract

**Inputs:**

- `--template <path>` — default `../astro-tf-app-template` (org-local clone)
- `--target <path>` — the catalog repo directory
- `--catalog <name>` — e.g. `channel-atoms`
- `--site <strategy>` — one of:
  - `existing` → leave `web/` alone (band A: agent, brand, profile, prompt, theme)
  - `single` → scaffold `web/` at root, NOT `web/site/` (band B greenfield)
- `--license-bundle` — applies the Apache-2.0 + CC-BY-4.0 + NOTICE bundle
- `[--dry-run]` — print diff without writing

**Behavior:**

1. Copy non-web template files into target, NEVER overwriting unless `--force`:
   - `.devcontainer/`, `.github/{workflows,ISSUE_TEMPLATE,seed-issues}`, `.github/{dependabot.yml,FUNDING.yml,PULL_REQUEST_TEMPLATE.md}`
   - `docs/adr/0000-record-architecture-decisions.md`
   - `infra/terraform/{modules,envs/{dev,stg,prod}}/`
   - `Makefile`, `.editorconfig`, `.gitattributes`, `.tool-versions`
   - `ARCHITECTURE.md`, `CHANGELOG.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `CODEOWNERS`, `COPYRIGHT`, `SECURITY.md`
2. Token substitution: `{{PROJECT_NAME}}` → `<catalog>-atoms`; site URL → `https://<catalog>-atoms.com`
3. **Single-site transform** (always applied to our catalogs):
   - `Makefile`: replace `cd web/$(SITE)` with `cd web`; drop the `SITE ?=` variable
   - `.github/workflows/ci.yml` and `release.yml`: replace path references `web/site` → `web`
   - When `--site single`: write template's `web/site/*` into target's `web/*` (subdir collapsed)
4. License bundle (always applied):
   - Write `LICENSE` (Apache-2.0)
   - Write `LICENSE-data` (CC-BY-4.0)
   - Write `NOTICE` documenting the code-vs-data boundary
   - Skip overwrite if existing `LICENSE` matches Apache-2.0 byte-for-byte (idempotency)
5. Print a summary of changed files; `--dry-run` exits without writing.

**Idempotency contract:** re-running the script on a fully-migrated repo produces zero diff. Verifiable via `git diff --quiet` exit code after re-run.

**Locality:** the script lives in the umbrella's `scripts/`, not in the template repo. It is org tooling, not template magic. Future template consumers can copy or reference it.

---

## 4. Per-repo migration matrix

### Band A — existing single-site `web/` (5 repos, minimal-touch)

`agent-atoms`, `brand-atoms`, `profile-atoms`, `prompt-atoms`, `theme-atoms`

| Apply | Skip |
|---|---|
| Non-web scaffold (workflows, infra, docs, Makefile, devcontainer) | `web/` tree (preserve pnpm/Astro/React verbatim) |
| License bundle (Apache-2.0 + CC-BY-4.0 + NOTICE) | `GOALS.md`, `README.md`, `ATOMS.yml`, `schemas/`, catalog-specific dirs |
| Add `web/README.md` documenting "single-site at `web/`" convention | Existing `LICENSE` (if Apache-2.0 already) — byte-equal, no rewrite |

`profile-atoms` gets one extra: copy `~/Downloads/design-profile-atoms_1.md` into `docs/design/profile-atoms-v1.0.0.md`. See §5 for build-out reminders.

### Band B — no `web/`, scaffold single-site `web/` (11 repos, full)

`channel-atoms`, `compliance-atoms`, `event-atoms`, `identity-atoms`, `knowledge-atoms`, `model-atoms`, `persona-atoms`, `plugin-atoms`, `policy-atoms`, `service-atoms`, `workflow-atoms`

| Apply | Skip |
|---|---|
| Full non-web scaffold (as Band A) | Catalog-specific dirs (`ATOMS.yml`, `schemas/`, etc.) |
| Web shell at `web/` (NOT `web/site/`) — single-site form | `GOALS.md`, `README.md` (each repo has its own) |
| Index page rendering catalog name, repo link, ATOMS.yml summary | |
| License bundle (Apache-2.0 + CC-BY-4.0 + NOTICE) | |

### Band C — umbrella (Go) — separate go-tf-app-template alignment pass

`convergent-systems-co/atoms` itself. Out of scope for the Astro script; handled as Phase 4 below.

| Apply | Skip |
|---|---|
| Missing `infra/terraform/envs/stg/` (template expects dev/stg/prod) | Existing Go code at `src/cmd/atoms/`, `src/internal/cli/` |
| Missing standard docs (`CODEOWNERS`, `COPYRIGHT`, `SECURITY.md`, `ARCHITECTURE.md` if absent) | Existing workflows (review and merge with template's set, do not blanket-overwrite) |
| License bundle (Apache-2.0 + CC-BY-4.0 + NOTICE) | |

### Files the script copies verbatim (with token substitution only)

```
DOCS         ARCHITECTURE.md, CHANGELOG.md, CODE_OF_CONDUCT.md,
             CONTRIBUTING.md, COPYRIGHT, SECURITY.md, CODEOWNERS
TOOLING      Makefile (single-site transform applied),
             .editorconfig, .gitattributes, .tool-versions,
             .devcontainer/devcontainer.json
WORKFLOWS    .github/workflows/* (8 files: bootstrap, ci, label-cleanup,
             label-sync, release, secret-scan, tf-plan, triage)
             ci.yml + release.yml get single-site transform
ISSUE TPL    .github/ISSUE_TEMPLATE/*, PULL_REQUEST_TEMPLATE.md,
             FUNDING.yml, dependabot.yml
SEED ISSUES  .github/seed-issues/00-10*.md
INFRA        infra/terraform/modules/.keep,
             infra/terraform/envs/{dev,stg,prod}/{main.tf,backend.tf,terraform.tfvars}
ADR STARTER  docs/adr/0000-record-architecture-decisions.md
LICENSES     LICENSE (Apache-2.0), LICENSE-data (CC-BY-4.0), NOTICE
WEB (B only) web/{astro.config.mjs, package.json, package-lock.json,
             tsconfig.json, public/, src/pages/index.astro, README.md}
```

### Files the script never touches

- `ATOMS.yml`, `schemas/`, `atoms/`, `exports/`, `rules/`, per-repo `scripts/` (catalog tooling), `docs/` content (only `docs/adr/` starter is added)
- Catalog-specific data dirs: `themes/`, `brands/`, `profiles/`, `prompts/`, `agents/`, etc.
- Band A: entire `web/` tree
- `GOALS.md`, `README.md` (template stubs not applied; existing content preserved)

---

## 5. Profile-atoms shell scope

This work applies the template shell only. The v1.0.0 design at `~/Downloads/design-profile-atoms_1.md` becomes a follow-up plan.

**What profile-atoms gets in this work:**

- Non-web template scaffold (same as every other catalog)
- License bundle (Apache-2.0 + CC-BY-4.0 + NOTICE)
- `web/` untouched (existing 9-file Astro shell preserved)
- Design doc committed to `docs/design/profile-atoms-v1.0.0.md`
- Existing `schemas/`, `profiles/`, `exports/` preserved

**What it does NOT get:**

- Qualifier-class schemas
- Governance-stack composition primitives
- Subjects-registry implementation
- Seed profile-atoms
- Update-policy and trust-requirements validation
- Persona/theme/budget/channel reference resolution machinery

### Build-out reminders (three durable markers)

1. **Repo artifact** — `src/profile-atoms/docs/design/profile-atoms-v1.0.0.md`
2. **GitHub issue** filed in `convergent-systems-co/profile-atoms`:
   - Title: "Build out v1.0.0 spec per docs/design/profile-atoms-v1.0.0.md"
   - Labels: `epic`, `design-ready`
   - Body: links design doc, lists workstreams (schema, qualifier classes, governance stacks, subjects, trust requirements, validator, seed atoms, site rendering)
3. **GOALS.md pointer** in `profile-atoms`:
   - Append line: *"Implementation status: scaffold complete. v1.0.0 design at `docs/design/profile-atoms-v1.0.0.md` — build-out tracked in #N."*

---

## 6. License bundle

Per `Common.md §1.P1` (civilization-grade output), the catalog repos are dual-licensed by artifact class:

| Class | License | Rationale |
|---|---|---|
| **Code** (`.go`, `.ts`, `.py`, `.astro`, `.mjs`, validators, scripts) | Apache-2.0 | Industry standard for civilization-grade infrastructure (Kubernetes, OpenTelemetry, gRPC, TensorFlow). Explicit patent grant matters for identity, compliance, and governance frameworks. Maximum adoption. |
| **Data** (atoms, schemas, exports, design docs, encyclopedia content) | CC-BY-4.0 | Attribution-preserving open data license. Aligns with IETF RFCs, Schema.org, Unicode publishing model. CC-BY (not -SA) maximizes downstream reuse including commercial. |

**Files at root of every repo:**

```
LICENSE          Apache-2.0 (full text)
LICENSE-data     CC-BY-4.0 (full text)
NOTICE           Documents the boundary:
                   "Source code under Apache-2.0 (see LICENSE).
                    Atom data and documentation under CC-BY-4.0
                    (see LICENSE-data)."
```

**Why not AGPL-3.0** (template default): AGPL's network-trigger doesn't fire on data files; explicitly banned by many enterprise consumers (Google internal policy, parts of Apple, AWS embedding); empirically caps adoption (MongoDB, Elastic, Grafana all moved away). The atom architecture's protection mechanism is federation-by-signing, not license-policing — AGPL adds adoption friction without adding meaningful protection.

**Why not MIT/BSD**: no patent grant. For identity/compliance/governance primitives that may touch patent-bearing concepts, Apache-2.0's explicit grant is protective.

**Relicensing risk:** none. Apache stays Apache for the 4 catalogs that have it. `brand-atoms` has no prior license to override. Band B is greenfield. CC-BY-4.0 for data is additive — applied to files that previously had no explicit license attached. **No public relicensing event.**

**Template-repo follow-up:** `astro-tf-app-template` itself currently defaults to AGPL-3.0. A separate PR against the template repo can change its default to the Apache + CC-BY bundle. That work is out of scope here.

---

## 7. Rollout order

### Phase 0 — Tooling

| Step | Action |
|---|---|
| P0.1 | Write `scripts/apply-template-scaffold.sh` in umbrella |
| P0.2 | Dry-run against one Band B catalog (e.g. `channel-atoms`); review diff |
| P0.3 | Iterate on script until diff is clean |
| P0.4 | Dry-run against one Band A catalog (e.g. `theme-atoms`); **verify `web/` untouched** |
| P0.5 | Commit script + PR against umbrella; merge |

### Phase 1 — Band B pilot

| Step | Action |
|---|---|
| P1.1 | `channel-atoms`: branch → run script → review → commit → PR |
| P1.2 | Merge; bump umbrella submodule pointer |
| P1.3 | Verify bootstrap workflow fires and site builds in CI |
| P1.4 | **Pause; confirm before scaling** |

### Phase 2 — Band B remainder (10 catalogs)

`compliance`, `event`, `identity`, `knowledge`, `model`, `persona`, `plugin`, `policy`, `service`, `workflow`

One PR per repo; merge in sequence; bump umbrella submodule pointer after each batch of 3.

### Phase 3 — Band A (5 catalogs, minimal-touch)

`agent`, `brand`, `profile`, `prompt`, `theme`. **Extra caution on `theme` and `brand`** (working production sites).

Per PR:

1. Run script with `--site existing`
2. Verify `web/` directory unchanged (`git diff --stat web/` empty)
3. Review non-web diff
4. Open PR with description noting "no changes to web/; production site unaffected"
5. Merge; bump pointer
6. **`profile-atoms` additionally:** copy design doc to `docs/design/`; file build-out issue; update GOALS.md pointer

### Phase 4 — Umbrella (Go) alignment

| Step | Action |
|---|---|
| P4.1 | Add `infra/terraform/envs/stg/` per `go-tf-app-template` |
| P4.2 | Reconcile workflow set; add missing standard docs (`CODEOWNERS`, `COPYRIGHT`, `SECURITY.md`, `ARCHITECTURE.md` if absent) |
| P4.3 | Apply license bundle (Apache + CC-BY + NOTICE) |
| P4.4 | Single PR against umbrella for all the above |

### Phase 5 — Final submodule pointer consolidation

Single commit on umbrella's `main` consolidating any remaining pointer updates. Verify: `git submodule status` shows every submodule on its latest `main` commit (no `+` or `-` markers).

---

## 8. Success criteria

All criteria are independently verifiable per `Common.md U14`.

| ID | Criterion | Verification |
|---|---|---|
| SC-1 | Every `*-atoms` repo carries identical `.github/`, `.devcontainer/`, `Makefile`, `infra/terraform/`, `docs/adr/`, standard docs | `diff -r` of those paths across any two repos returns only token-substituted lines |
| SC-2 | `theme-atoms.com` still builds and deploys | CI green on theme-atoms PR; preview deploy succeeds |
| SC-3 | `brand-atoms.com` still builds and deploys | CI green on brand-atoms PR; preview deploy succeeds |
| SC-4 | All 11 Band B sites build in CI | Each Band B PR's CI is green |
| SC-5 | License bundle (LICENSE + LICENSE-data + NOTICE) present in all 16 catalog repos and the umbrella | File presence + first-line sha256 check via a verification script |
| SC-6 | `profile-atoms` has `docs/design/profile-atoms-v1.0.0.md` + a "build out v1.0.0" issue filed | File exists; `gh issue list --repo convergent-systems-co/profile-atoms --label epic` shows it |
| SC-7 | Umbrella's `make tf-plan ENV=stg` succeeds | Run the make target; non-zero exit fails the criterion |
| SC-8 | Umbrella submodule pointers all point to merged-main commits | `git submodule status` shows no `+` or `-` markers |
| SC-9 | Re-running `apply-template-scaffold.sh` on any migrated repo produces zero diff | `git diff --quiet` after re-run on 3 sample repos (one Band A, one Band B, one mid-Band-A) |

---

## 9. Risk assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| theme-atoms.com or brand-atoms.com breaks | Medium | Phase 0 dry-run against theme-atoms catches this; `--site existing` mode explicitly leaves `web/` untouched; PR description requires confirming `git diff --stat web/` is empty |
| Script writes a wrong path / clobbers content | Medium | Idempotency contract; dry-run as default in early phases; per-repo branch isolation; revert-by-PR if discovered post-merge |
| Single-site Makefile transform misses a reference | Medium | Phase 0 dry-run catches; CI fails fast on path mismatch |
| `bootstrap.yml` workflow re-fires on repos that already ran it | Low | Template's bootstrap workflow self-deletes after first run; the copied version detects existing seed issues and exits |
| Token leak (PACKAGE_PUBLISH_TOKEN, CLOUDFLARE_API_TOKEN) | Low | Already inherited at org level per memory; `gitleaks` workflow in template scans every push |
| Submodule pointer drift during long rollout | Medium | Bump pointer after each merge or every 3 merges, not at end |
| Profile-atoms design doc gets out of sync with `~/Downloads/` original | Low | After this work, the in-repo copy is canonical; `~/Downloads/` version is no longer the source of truth |
| AGPL template default surprises future template consumers | Low | Documented as an out-of-scope template-repo issue in §6 |

---

## 10. Dependencies and backward compatibility

### Dependencies

- `astro-tf-app-template` exists and is current — confirmed (org-local clone at `/Users/itsfwcp/workspace/convergent-system-co/astro-tf-app-template`)
- `go-tf-app-template` exists and umbrella has partially adopted it — confirmed (commits `c1378d3`, `552d838`)
- `gh` CLI authenticated for `convergent-systems-co` org operations — confirmed
- `PACKAGE_PUBLISH_TOKEN` available at org level per `~/.ai/memory/reference_package_publish_token.md`
- `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` available at org level per project memory

### Backward compatibility

- Existing production sites: preserved. Band A's `web/` is not touched.
- Existing CI workflows in catalog repos: replaced by the template's set. Any catalog with bespoke CI workflows gets them merged manually during its PR review.
- Submodule pointers: every commit bump is reversible via `git checkout <prev-sha> -- src/<catalog>` followed by a commit.
- License: Apache-2.0 for code is identical to current state in 4 of 5 Band A repos; additive (no removal of prior rights) in all other cases.

---

## 11. Out of scope

These are explicitly excluded from this work and tracked for later:

- **profile-atoms v1.0.0 implementation** — schemas, qualifier classes, governance stacks, subjects, validators, seed atoms, site rendering. Tracked via issue (§5).
- **astro-tf-app-template default-license change** — separate PR against the template repo.
- **astro-tf-app-template single-site native support** — separate PR against the template repo.
- **Catalog content authoring** — actual atoms for the 11 Band B catalogs. Bootstrapping (schema + 2 seed atoms per type) was the prior `/spawn` wave; further content is its own work.
- **Cloudflare Pages project provisioning via Terraform** — the infra scaffold is in place; provisioning the actual Pages projects per catalog is a separate apply.
- **Domain registration and DNS for the 11 new `*-atoms.com` sites** — not in this work.
- **Custom workflow needs per catalog** — addressed in each catalog's per-PR review if surfaced.

---

## 12. Open questions

These are not blocking the implementation plan but warrant resolution before or during execution:

- **Q1.** Should `astro-tf-app-template` itself gain single-site native support, or do we leave the multi-site convention there and apply the single-site transform in our scaffolding script forever? Recommendation: file an issue against the template repo after this work ships.
- **Q2.** Do we want a `LICENSES/` directory using SPDX file-level headers (machine-readable per-file licensing) in addition to the root LICENSE/LICENSE-data/NOTICE bundle? Useful for downstream package managers and SBOM generators. Defer to follow-up.
- **Q3.** The umbrella's existing `.github/workflows/` set has 5 workflows; `go-tf-app-template` likely has more or different. Reconciliation strategy: union with manual review, not blanket-overwrite. Confirmed in §7 P4.2.
- **Q4.** Should the 11 Band B sites' Cloudflare Pages projects be provisioned as part of this work, or scoped to a follow-up Terraform apply? Currently scoped to follow-up (§11).

---

## 13. AI involvement (provenance)

This design was produced collaboratively in a Claude Code session on 2026-05-22. The human author (Thomas Polliard) directed the scope, made all material choices (band partitioning, license direction, script-vs-spawn approach, profile-atoms scope), and approved each design section. The AI assistant explored the codebase, surfaced trade-offs, proposed alternatives, and drafted this document. Per `Common.md U4`.
