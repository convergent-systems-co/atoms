# GOALS — convergent-systems-co/atoms

> The umbrella repository for the `*-atoms.com` catalog ecosystem.
> This file is the north-star for every sprint and the source of truth for milestone acceptance.

---

## Purpose

`atoms` is the catalog-of-catalogs: a single repository that indexes, validates, and surface-links all 25 `*-atoms.com` catalog sites under `convergent-systems.co`. It publishes the normative [Atom Spec](spec/atom-spec-v1.2.0.md) that every catalog must conform to, runs the fleet health script (`scripts/atom-status.sh`), and will host the `atoms` CLI and the aggregator site at `atoms.convergent-systems.co`.

---

## Civilization-grade thesis

Every AI agent, design tool, build pipeline, and runtime reinvents the same domain primitives — channel definitions, identity types, policy rules, schema contracts. Without a shared vocabulary these artifacts are opaque, ephemeral, and locked to one vendor.

The `*-atoms` ecosystem makes these primitives **typed, versioned, signed, composable, machine-readable, and open** — the properties that let knowledge survive tool deprecation, support multi-author governance, and compose correctly across organizational boundaries. The umbrella repo is the index that makes the whole network discoverable and trustworthy.

---

## Roadmap

### v0.1 — Fleet parity and catalog bootstrap *(current)*

**Goal:** Every catalog site is live, licensed, governed, and deploying green. The fleet status tool covers all 25 sites.

**Success criteria:**
- All 25 `*-atoms.com` sites deploy green on push to `main`
- All catalogs carry Apache-2.0 + CC-BY-4.0 dual license
- All catalogs conform to `atoms-spec/v1.1.0` (`ATOMS.yml` present)
- `scripts/atom-status.sh` covers all 25 catalogs and reports deploy / DNS / apex / /ai/index.json / schema / Terraform / license

**Work:**
- [x] Expand fleet from 19 → 25 catalogs (action, amendment, constitution, context, doc, key)
- [x] Register all 25 as submodules under `src/`
- [x] Update `atom-status` skill and script to cover 25 catalogs
- [x] Fix context-atoms CI (build-exports.py pre-build step)
- [x] Fix action-atoms CI (package-lock.json) + relicense to Apache-2.0
- [x] Add `infra/cloudflare/pages-project/` Terraform module to brand-atoms and theme-atoms
- [x] Import brand-atoms and theme-atoms CF Pages projects into Terraform state
- [ ] Replace SECURITY.md stubs with full policy across all 25 catalogs
- [ ] Cut v0.1.0 release tag on all 25 catalogs
- [ ] Create context-atoms CF Pages project (Cloudflare API 500 — manual dashboard action)
- [ ] Resolve action-atoms and pipeline-atoms AGPL license (convert or document exception)
- [ ] Add 6 new catalogs to `catalogs/*.toml` index (action, amendment, constitution, context, doc, key)

---

### v0.2 — Atom content and cross-catalog composition

**Goal:** Each catalog ships its first real atoms and compositions; the umbrella hub is live.

**Success criteria:**
- `atoms.convergent-systems.co` site live (Go CLI + aggregator hub, from `go-tf-app-template`)
- `atoms` CLI supports: `atoms brand`, `atoms theme`, `atoms channel`, `atoms list`, `atoms get <ref>`, `atoms validate <file>`
- At least 5 catalogs have ≥10 published (non-draft) atoms signed at `lifecycle: published`
- `/ai/index.json` live on all 25 apex domains
- Cross-catalog reference resolution works (`atom://channel-atoms/channels/anthropic-api`)

**Work:**
- [ ] Bootstrap `atoms.convergent-systems.co` from `go-tf-app-template`
- [ ] Implement `atoms` CLI skeleton (list, get, validate subcommands)
- [ ] Promote channel-atoms compositions from draft → published (8 channels)
- [ ] Promote context-atoms compositions from draft → published (4 contexts)
- [ ] Publish `/ai/index.json` on all apex domains
- [ ] Add `catalog_index.json` to umbrella exports
- [ ] Wire DeployAfterMerge trigger fix: push-only deploys across fleet (currently 23/25 fire on PR)

---

### v1.0 — Ecosystem and federation

**Goal:** The ecosystem is self-sustaining: external contributors can publish atoms, runtimes consume them, and governance is transparent.

**Success criteria:**
- All 25 catalogs at `lifecycle: published` with ≥5 atoms each
- Atom signing pipeline live (catalog-maintainer key, verifiable chain)
- `atoms validate` enforces spec conformance and signature validity
- At least one external runtime (aish or Olympus) consumes atoms in production
- Contribution guide and atom-submission process documented

**Work:**
- [ ] Design and implement atom signing (Ed25519, catalog-maintainer key)
- [ ] `atoms validate` enforces signature + spec_version
- [ ] Publish contribution guides for all 25 catalogs
- [ ] aish v0.1 integration: prompt-atoms primitives for intent classification
- [ ] Olympus integration: context-atoms and policy-atoms in broker dispatch
- [ ] Federation: cross-org atom references resolving via `atoms.convergent-systems.co`
- [ ] `atoms.convergent-systems.co` public directory of all 25 catalogs with search

---

## Adoption strategy

1. **Reference implementations first.** Brand-atoms and theme-atoms are the design reference. Every new catalog mirrors their structure.
2. **Template-driven bootstrap.** New catalogs use `astro-tf-app-template` for the Astro site and `infra/cloudflare/pages-project/` for Terraform. The umbrella `xdao` repo governs the template.
3. **Runtime pull.** aish and Olympus are the first runtime consumers. Adoption grows as those runtimes mature and pull in more catalog types.
4. **Open contribution.** v1.0 opens atom submission to external contributors with a signed, reviewable PR workflow.

---

## North-star constraint

Every decision in this repo MUST advance at least one of the three goals above. Issues that don't map to a goal milestone are escalated to the user before work begins.
