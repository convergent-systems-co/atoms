# schema-atoms Issue Decomposition — Design

**Date:** 2026-05-23
**Source spec:** `atoms/specs/atom-schema-spec-v1.0.0-draft.md`
**Target repo:** `convergent-systems-co/schema-atoms`
**Status:** approved (Polliard, 2026-05-23)

---

## Goal

Decompose the Atom Schema Spec v1.0.0-draft into a complete, hierarchically-linked GitHub issue tree filed in `convergent-systems-co/schema-atoms`. Introduce a new `agile/*` label family (`epic` / `feature` / `story` / `task`) for the agile hierarchy, distinct from the existing `kind/*` family which becomes type-only.

The work decomposes by **deliverable** — six epics that each ship something concrete — rather than by the spec's structural Parts. This gives a usable sequencing (bootstrap-first, volume-work later) instead of a 1:1 document mirror.

---

## Label scheme

### Create in `convergent-systems-co/schema-atoms`

| Label | Color | Description |
|---|---|---|
| `agile/epic` | `#5319e7` | Multi-feature initiative spanning weeks or more |
| `agile/feature` | `#0e8a16` | Net-new user-visible capability slice |
| `agile/story` | `#1d76db` | Single contributor-week-sized chunk |
| `agile/task` | `#c5def5` | Single commit/PR-sized chunk |

### Migrate existing issues

`kind/feature` is currently in use on schema-atoms issues #5, #6, #7. For each:

1. Add `agile/feature` (the hierarchy slot).
2. Re-evaluate the true `kind/*` (type slot). Examples:
   - #6 "Wire Cloudflare Pages deployment" → likely `kind/chore`.
   - #5 "Define minimum-viable infra" → likely `kind/feature` retained.
   - #7 "Add web vitals monitoring" → likely `kind/feature` retained.
3. Remove the misused `kind/feature` only if the re-evaluation says it isn't truly a `kind/feature` under the post-migration meaning.

After all issues are migrated, **delete the `kind/feature` label** in schema-atoms only if no issue still legitimately needs it as a type marker. (If the post-migration `kind/feature` definition stays "net-new capability," it can co-exist with `agile/feature` — the former is type, the latter is hierarchy.)

### Tidy the umbrella

`convergent-systems-co/atoms` has unused `kind/{epic,feature,story,task}` labels (no issue uses them). Delete all four from the umbrella as a one-line tidy task.

### Spike labeling

Spikes use `agile/story` + `status/needs-info`. No new `agile/spike` label — keep the family small.

---

## Hierarchy linking

GitHub native **sub-issues** (confirmed enabled in the repo via the GraphQL `subIssuesSummary` field). Epics list features as sub-issues; features list stories as sub-issues. Tracking checklists in issue bodies are NOT used for hierarchy — only for cross-cutting references (e.g., depends-on links).

---

## Standard labels per issue

Every issue carries:

- `agile/<level>` — hierarchy slot
- `kind/<type>` — type marker (chore, refactor, docs, feature, security, rfc)
- `area/<surface>` — schema-atoms area family (`core`, `api`, `cli`, `infra`, `ci`, `docs`, `release`)
- `priority/<level>` — default `priority/medium`
- `status/triage` — initial state; dropped on first triage

---

## Issue tree

### Pre-flight (3 tasks; no epic parent)

| # | Title | Labels |
|---|---|---|
| pf-1 | Create `agile/{epic,feature,story,task}` labels in schema-atoms | `agile/task`, `kind/chore`, `area/release` |
| pf-2 | Re-label #5/#6/#7 — add `agile/feature`, re-evaluate `kind/*` | `agile/task`, `kind/chore`, `area/release` |
| pf-3 | Delete unused `kind/{epic,feature,story,task}` from `atoms` umbrella | `agile/task`, `kind/chore`, `area/release` |

### Epic 1 — Conform schema-atoms catalog to atom-schema-spec v1.0.0

**Goal:** ATOMS.yml, repo layout, URL routing, and signing/quorum match Atom Schema Spec v1.0.0.

- **Feature:** Rewrite ATOMS.yml to spec v1.1.0 shape
  - Story: snake_case migration (`atomTypes` → `atom_types`, `compositionType` → `composition_type`, `compositionDir` → `composition_dir`, `runtimeConsumers` → `runtime_consumers`)
  - Story: Update `spec_version` from `atoms-spec/v1` to `atoms-spec/v1.1.0`
  - Story (spike, blocks rest of Epic 1): Resolve federation discrepancy — current ATOMS.yml says `xdao.co`, spec says `convergent-systems.co`
  - Story: Declare all 20 `atom_types` per spec Part II
  - Story: Encode `quorum_rules` per class (default, design-spec, governance, rfc/w3c/iso/fips)
  - Story: Configure `signing` (required `ml-dsa-65`; accepted `ml-dsa-44`, `ml-dsa-65`, `ml-dsa-87`)
- **Feature:** URL routing & catalog endpoints
  - Story: Implement `/<class>/`, `/<class>/<slug>/`, `/<class>/<slug>/<version>/` resolution
  - Story: Generate `/exports/catalog.json`
  - Story: Generate `/exports/by-class.json`
  - Story: Generate `/exports/by-lifecycle.json`
  - Story: Publish `/mirror.toml`
- **Feature:** Repo scaffold conformance
  - Story: Add `compositions/` directory (`composition_type: spec-compositions`)
  - Story: Wire `atoms validate` in CI on every PR
  - Story: Establish per-class subdirectory layout under `/<class>/`

### Epic 2 — Implement design-spec class & publish foundational specs

**Goal:** `design-spec` is the first fully working class; this very spec ships as proof.

- **Feature:** design-spec class implementation
  - Story: `[spec]` TOML payload parser/validator
  - Story: `[[spec.amendments]]` log support
  - Story: `conforms_to` chain resolution
- **Feature:** Publish `atom-schema-spec@1.0.0-draft` (this spec) per Part VIII
  - Story: Author `spec.md` from `atom-schema-spec-v1.0.0-draft.md`
  - Story: Canonicalize TOML + compute `content_hash` (Steps 3–4)
  - Story: Sign with `catalog-maintainer` + `editor` (Step 5)
  - Story: Validate + open PR (Steps 6–7)
- **Feature:** Publish remaining foundational design-specs
  - Story: `atom-spec@1.1.0` at new `design-spec/` path (precedes Epic 6)
  - Story: `ai-constitution-spec@1.0.0-draft`
  - Story: `olympus-spec@1.0.0-draft`
  - Story: `atom-key-spec`, `atom-cache-spec`, `atom-cli-spec` (one story per spec)
  - Story: Per-catalog spec **stubs** + tracking issues (persona, policy, channel, prompt, skill, theme, brand, profile, agent, model, service, knowledge, identity, workflow, pipeline, event, compliance, plugin) — full text deferred

### Epic 3 — Migrate JSON Schemas to schema-atoms as `json-schema` atoms

**Goal:** every JSON schema in the ecosystem becomes an independently versioned, signed `json-schema` atom.

- **Feature:** `json-schema` class implementation
  - Story: `[schema]` TOML payload (json-schema class)
  - Story: Validator: confirm schema `$id` matches atom id
  - Story: Validator: confirm JSON Schema draft version matches `schema_version`
- **Feature:** Migrate existing schemas
  - Story (spike, blocks the rest of this feature): Inventory all JSON schemas across `src/*-atoms/schemas/` and produce migration list
  - Stories ×N: One per discovered schema (~50 from current `src/*-atoms/schemas/` count; final N from inventory spike)
  - Examples called out in spec: `panels-config@1.0.0`, `project-config@1.0.0`, `agent-envelope@1.0.0`

### Epic 4 — Import protocol-specs from standards bodies

**Goal:** foundational external standards live as signed `protocol-spec` atoms with full provenance.

- **Feature:** Provenance toolchain
  - Story: `[protocol.provenance]` block validator
  - Story: Import workflow CLI (`atoms import` — download → checksum → atom assembly)
  - Story: Document upstream license handling per class (RFC = IETF Trust; FIPS = public-domain; W3C = W3C Document License; ISO = subscription)
- **Feature:** Import foundational standards
  - Story: `schema-atoms/fips/fips-204@1.0.0` (ML-DSA)
  - Story: `schema-atoms/rfc/rfc-3339@1.0.0` (timestamps)
  - Story: `schema-atoms/rfc/rfc-7517@1.0.0` (JWK)

### Epic 5 — Implement remaining type families

**Goal:** `api-spec`, `language-spec`, and `taxonomy-spec` families are usable.

- **Feature:** `api-spec` family
  - Story: `openapi-spec` class
  - Story: `asyncapi-spec` class
  - Story: `graphql-schema` class
  - Story: `grpc-spec` class
  - Story: `json-rpc-spec` class
- **Feature:** `language-spec` family
  - Story: `ebnf-grammar` (+ `bnf-grammar`) classes
  - Story: `language-reference` class
  - Story: `query-language-spec` class
  - Story: `regex-spec` class
- **Feature:** `taxonomy-spec` family
  - Story: `controlled-vocabulary` class (inline + asset modes)
  - Story: `code-list` class
  - Story: `ontology` class
- **Feature:** Publish initial atoms in new classes
  - Story: `controlled-vocabulary/atom-lifecycle-states@1.0.0`
  - Story: `controlled-vocabulary/signer-roles@1.0.0`
  - Story: `controlled-vocabulary/persona-domains@1.0.0`
  - Story: `ebnf-grammar/toml-1-0@1.0.0`

### Epic 6 — Execute spec → design-spec supersession (Part IX)

**Goal:** `atom-spec@1.1.0` lives at the new `design-spec/` path; the old `spec` class is historic.

- Story: Publish `schema-atoms/design-spec/atom-spec@1.1.0` with `supersedes` + `migration_notes`
- Story: Republish `schema-atoms/spec/atom-spec@1.1.0` with `superseded_by` + `lifecycle = historic`
- Story: ATOMS.yml — remove `spec` from `atom_types`, add `design-spec` (depends on Epic 1)
- Story: Update downstream consumers (`ai-constitution`, `olympus`, `atoms-tools`) to use new path

### Spikes — Part XI Open Questions (5 standalone stories)

Each labeled `agile/story` + `status/needs-info` + `kind/rfc`:

| # | Question |
|---|---|
| Q1 | conformance-spec class location (schema-atoms vs separate test-atoms catalog) |
| Q2 | math-spec class (theorem statements, crypto primitives) |
| Q3 | legal-spec class (contracts, license texts, regulations) |
| Q4 | versioning policy for imported RFCs with errata |
| Q5 | inline-vs-asset size threshold for `controlled-vocabulary` |

---

## Volume estimate

| Layer | Count |
|---|---|
| Pre-flight tasks | 3 |
| Epics | 6 |
| Features | ~14 |
| Stories | ~50 (Epic 3 dominates) |
| Spikes (Part XI) | 5 |
| **Total** | **~80 issues** |

Epic 3's story count is provisional; the inventory spike determines the final per-schema count.

---

## Execution order

1. **Pre-flight first** — create `agile/*` labels, re-label issues #5/#6/#7, delete `kind/feature` (in schema-atoms) and tidy `kind/{epic,feature,story,task}` (in atoms umbrella).
2. **Create epics 1–6** with goal statements and empty sub-issue trays.
3. **Create features under each epic** and link as sub-issues.
4. **Create stories under each feature** and link as sub-issues.
5. **Create 5 spikes** as orphan stories (not under any epic).
6. **Mark Epic 1's federation-discrepancy spike as a blocker** on the rest of Epic 1.
7. **Mark Epic 3's inventory spike as a blocker** on per-schema migration stories.

GitHub has no native "blocked-by" edge; blockers are expressed via `Blocks: #<n>` / `Blocked by: #<n>` lines in the issue body. The mass-create runs roughly 80 `gh issue create` calls; sub-issue linking is a separate GraphQL mutation per child.

---

## Open questions

All resolved per user approval 2026-05-23:

- **A.** Bottom hierarchy slot is `agile/task` (not `agile/issue`).
- **B.** Spikes use `agile/story` + `status/needs-info` (no `agile/spike`).
- **C.** Federation mismatch surfaced as a blocker spike under Epic 1.
- **D.** Per-catalog design-specs ship as stubs + tracking issues; full text deferred.
- **E.** Tidy `kind/{epic,feature,story,task}` deletion from atoms umbrella included as pre-flight #3.
- **F.** No initiative tag added.

---

## Non-goals

- This design does NOT cover the actual implementation of any issue's body content beyond a one-paragraph goal statement and acceptance criteria.
- This design does NOT touch other submodule repos (`agent-atoms`, `channel-atoms`, etc.). Cross-repo work surfaces as referenced links in Epic 3 / Epic 6 stories, not as new issues in those repos.
- This design does NOT propose new label families beyond `agile/*`. Existing `kind/*`, `area/*`, `priority/*`, `status/*` remain unchanged.

---

## Changelog

- **2026-05-23** — Initial design. Approved by Polliard.
