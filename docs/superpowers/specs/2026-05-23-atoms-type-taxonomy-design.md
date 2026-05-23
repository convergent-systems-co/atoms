# Atoms Type Taxonomy — Design Spec

| Field | Value |
|---|---|
| **Status** | Draft — awaiting principal review |
| **Date** | 2026-05-23 |
| **Author** | Thomas Polliard (Claude Opus 4.7 assisting) |
| **Scope** | Type taxonomy only — sub-project 1 of a 6-part decomposition |
| **Supersedes** | The `atomTypes` enumeration currently in `src/persona-atoms/ATOMS.yml` |
| **Related** | `convergent-systems-co/atoms-spec` (catalog manifest layer); `~/.ai/governance/personas/` + `~/.ai/governance/prompts/` (source-of-truth for migration) |

---

## 1. Context

The Convergent Atoms catalog system aspires to one canonical type taxonomy that every catalog repo, every site (`persona-atoms.com`, `skill-atoms.com`, …), and every runtime consumer agrees on. The starting state on 2026-05-23 is incoherent:

- `src/persona-atoms/ATOMS.yml` declares five `atomTypes` (`voice-profile`, `role-definition`, `behavioural-constraint`, `knowledge-boundary`, `tone-parameter`) — none of which match how persona content is actually organized.
- `~/.ai/governance/personas/` ships content under two **directory-level partitions**: `agentic/` (12 actor markdown files) and `domains/` (7 reviewer YAML files conforming to `persona.schema.json`).
- `~/.ai/governance/prompts/` ships a third body of artifacts (29 prompt templates) that share lineage with personas but aren't personas.
- `convergent-systems-co/skill-atoms` and `convergent-systems-co/schema-atoms` do not yet exist as repos. `skill-atoms.com` is a target public site; `schema-atoms` is the planned home for instance-file schemas.

This spec settles the **canonical type vocabulary** so that downstream sub-projects (schema-atoms creation, skill-atoms creation, ATOMS.yml migration, conformance work, site deployment) can proceed against a fixed contract.

### Decomposition context

This spec covers sub-project 1 only. The five sibling sub-projects are:

1. **Type taxonomy** *(this spec)*
2. schema-atoms repo creation + scaffolding
3. skill-atoms repo creation + Cloudflare Pages site at skill-atoms.com
4. ATOMS.yml migration across persona / profile / brand / theme atoms
5. Schema authoring + conformance wiring for persona, profile, brand, theme
6. Migration of `~/.ai/governance/personas/*` and `~/.ai/governance/prompts/*` into persona-atoms

Each gets its own spec → plan → implementation cycle, gated on this one being approved.

---

## 2. Top-level types and source-of-truth

Every instance file in the catalog system has exactly one **top-level type**, drawn from a closed enum. A catalog repo MAY host multiple types (one catalog ≠ one type). Types MAY have a closed enum of **sub-types**.

| Top-level type | Sub-types | Source-of-truth (initial) | Catalog repo |
|---|---|---|---|
| `agentic` | `actor`, `reviewer` | `~/.ai/governance/personas/agentic/*.md` (actors) <br> `~/.ai/governance/personas/domains/*.yaml` (reviewers) | persona-atoms |
| `prompt` | *(none)* | `~/.ai/governance/prompts/*.md` | persona-atoms |
| `skill` | *(TBD — deferred to sub-project 2's schema authoring step)* | TBD (likely `~/.ai/skills/` parallel) | skill-atoms |
| `profile` | TBD — own sub-project | TBD | profile-atoms |
| `brand` | TBD — own sub-project | TBD | brand-atoms |
| `theme` | TBD — own sub-project | TBD | theme-atoms |

### Type definitions

**`agentic`** — content that defines an identity an AI takes on. The agent loads the content as part of its operating context. Two sub-types:

- **`agentic.actor`** — markdown brief defining a role the AI executes (e.g., `coder`, `tech-lead`, `executor`). Body is freeform markdown describing behaviour, constraints, and decision rules.
- **`agentic.reviewer`** — structured YAML defining a role the AI inhabits to *judge* work products (e.g., `code-reviewer`, `security-reviewer`). Conforms to the existing `~/.ai/governance/schemas/persona.schema.json` shape (severity_weights, evaluate_for, principles, anti_patterns, domain enum). The body is structured fields, not narrative.

**`prompt`** — content that defines a reusable invocation the AI runs against work (e.g., `debug`, `refactor`, `commit`, `code-review`). Distinguished from `agentic` by *intent*: a prompt is *applied to* work, an agentic persona *is* the AI doing work. No sub-types yet — the existing prompts in `~/.ai/governance/prompts/` are flat.

**`skill`** — deferred. Schema authored in a follow-on sub-project.

**`profile`**, **`brand`**, **`theme`** — out of scope for taxonomy v0.1. Each gets its own sub-project to define top-level shape, sub-types (if any), and source-of-truth. Listed here only to fix the canonical type-name vocabulary so other sub-projects don't bikeshed names.

### Why these types and not the existing `ATOMS.yml` enum

`persona-atoms/ATOMS.yml` currently lists `voice-profile`, `role-definition`, `behavioural-constraint`, `knowledge-boundary`, `tone-parameter`. These are **facets of a persona's content**, not types of catalog instance. They describe what a persona contains, not what a persona is. A reviewer persona and an actor persona both have voice profiles and role definitions; that's not the dimension the catalog system needs to discriminate on.

The dimension that *does* matter is: how is this catalog instance consumed? An `agentic` instance is loaded into a runtime as an identity. A `prompt` instance is invoked against work. A `reviewer` (sub-type of `agentic`) emits structured judgement with weighted severity. That's the dimension schemas need to validate against.

The existing `atomTypes` enum gets retired — see sub-project 4 (ATOMS.yml migration).

---

## 3. schema-atoms repo layout

`schema-atoms` holds **one JSON Schema per top-level type**. When a type has sub-types, the schema uses `oneOf` whose branches each pin `properties.subtype.const` to a sub-type value. (JSON Schema 2020-12 has no native `discriminator` keyword — that is an OpenAPI construct — so `const` is the mechanism.) Schemas are versioned at the repo level (one version applies to all schemas at a given tag).

### Repo structure

```
schema-atoms/
├── ATOMS.yml                          # catalog manifest (conforms to atoms-spec/v1)
├── README.md
├── CHANGELOG.md
├── LICENSE
├── schemas/
│   ├── v1/
│   │   ├── agentic.schema.json        # one schema, discriminates actor/reviewer
│   │   ├── prompt.schema.json
│   │   ├── skill.schema.json          # placeholder until sub-project authors it
│   │   ├── profile.schema.json        # placeholder
│   │   ├── brand.schema.json          # placeholder
│   │   ├── theme.schema.json          # placeholder
│   │   └── common.defs.json           # shared $defs: SemVer, name slug, timestamp, signed_by
│   └── index.json                     # machine-readable directory of v1 schemas
├── web/                               # Astro site → schema-atoms.com (sub-project 2 scope)
└── .github/workflows/
    └── validate-self.yml              # CI: schemas validate their own examples
```

### Versioning

- Top-level repo SemVer (`0.1.0` → `0.2.0` → `1.0.0`) released as git tags.
- Schema files MUST embed their `$id` as a public URL: `https://schema-atoms.com/v1/<type>.schema.json`. The URL is content-addressable by version path, so old consumers can pin: `https://schema-atoms.com/v0.1/agentic.schema.json`.
- Breaking changes bump the major version path (`/v1/` → `/v2/`). Both versions remain hosted. Common.md §11.2 conventional-commit `feat!:` or `chore!:` BREAKING marker required.

### JSON Schema draft

All new schemas in `schema-atoms` MUST use **JSON Schema draft 2020-12** (`"$schema": "https://json-schema.org/draft/2020-12/schema"`). Rationale: 28 of the 31 existing governance schemas already use draft 2020-12; the existing `persona.schema.json` is the outlier on draft-07 and gets migrated to 2020-12 as part of sub-project 5.

### Relationship to atoms-spec

Both `atoms-spec` and `schema-atoms` continue to exist with **separate, non-overlapping** roles:

| Repo | Governs | Example artifacts |
|---|---|---|
| `atoms-spec` | The shape of `ATOMS.yml` (a catalog manifest) and the conventions a catalog repo must follow to be a catalog. | `atoms-spec/v1` referenced by every catalog's ATOMS.yml. |
| `schema-atoms` | The shape of **instance files within a catalog** — what makes a valid `agentic`, `prompt`, etc. | `agentic.schema.json` validates `persona-atoms/agentic/coder.md` frontmatter. |

Mental model: `atoms-spec` is for catalog *manifests*; `schema-atoms` is for catalog *contents*. They are two layers of the same concern (validation), separated cleanly by what they validate.

### Cross-schema references

Common types (SemVer string, name slug, timestamp, ed25519 signature block) live in `common.defs.json` and are referenced via `$ref`:

```json
{
  "version": { "$ref": "https://schema-atoms.com/v1/common.defs.json#/$defs/SemVer" }
}
```

### Validation tooling

Implementation choice (Python `jsonschema` vs Node `ajv` vs Go `gojsonschema`) deferred to sub-project 5 (conformance wiring). The schemas themselves are tool-agnostic — any draft-2020-12-compliant validator works.

---

## 4. Frontmatter contract

Every instance file in any atoms catalog repo MUST declare a frontmatter block. Markdown files use YAML frontmatter delimited by `---`. YAML files use the YAML document directly.

### Required fields (all types)

| Field | Type | Description |
|---|---|---|
| `type` | string, enum | One of: `agentic`, `prompt`, `skill`, `profile`, `brand`, `theme` |
| `subtype` | string | Required iff the type declares sub-types in `schema-atoms`. Absent otherwise. |
| `name` | string | Slug, kebab-case, unique within `(type, subtype)`. Pattern: `^[a-z][a-z0-9-]*$`. |
| `version` | string | SemVer (`^\d+\.\d+\.\d+$`). |
| `schema_version` | string | The `schema-atoms` version this file conforms to, in `<repo>/vN` form matching the established `atoms-spec/v1` convention — e.g., `schema-atoms/v1`. Pins the validation contract. |

### Optional fields (all types)

| Field | Type | Description |
|---|---|---|
| `description` | string | One-line human summary. |
| `created_at` | string | ISO-8601 UTC. |
| `updated_at` | string | ISO-8601 UTC. |
| `authored_by` | string | Identifier — e.g., `ed25519:<pubkey>` to align with the existing `catalogs/*.toml` signing pattern. |
| `tags` | array of strings | Free-form discovery tags. |
| `federation` | string | Cross-repo binding (e.g., `xdao.co`) — preserves the pattern already used in `persona-atoms/ATOMS.yml`. |

### Per-type / per-sub-type fields

Each schema in `schema-atoms` defines additional required and optional fields. Examples for what we know today:

**`agentic.actor` (markdown body + frontmatter)**

```yaml
---
type: agentic
subtype: actor
name: coder
version: 0.1.0
schema_version: schema-atoms/v1
description: "Implements code per a brief, runs the test suite, fixes failures."
capabilities: [code-generation, refactoring, test-execution]
---
# Markdown body — the persona brief.
```

**`agentic.reviewer` (YAML, structured fields per `persona.schema.json`)**

```yaml
type: agentic
subtype: reviewer
name: code-reviewer
version: 0.1.0
schema_version: schema-atoms/v1
domain: engineering          # enum from persona.schema.json
role: "Reviews diffs for correctness, style, and security risk."
capabilities: [diff-review, regression-detection, security-pattern-matching]
evaluate_for: [correctness, style, security, performance]
principles:
  - "Targeted fixes over rewrites."
  - "Evidence before assertions."
anti_patterns:
  - "Sycophantic approval without findings."
  - "Unverified severity claims."
severity_weights: { critical: 1.0, high: 0.7, medium: 0.4, low: 0.1 }
```

**`prompt` (markdown body + frontmatter)**

```yaml
---
type: prompt
name: debug
version: 0.1.0
schema_version: schema-atoms/v1
description: "Five-phase systematic debugging: reproduce → isolate → root-cause → fix → verify."
applies_to: [code, infrastructure, ci]
---
# Markdown body — the prompt itself.
```

### Discrimination signal — canonical order

When a validator needs to determine `(type, subtype)`:

1. **Authoritative:** frontmatter `type` + `subtype` fields. *(Schema-atoms validates against these.)*
2. **Convention only:** directory placement (`agentic/`, `domains/`, `prompts/`). Recommended but not load-bearing — sites and mirrors may flatten directory structure.
3. **Incidental:** file extension. A reviewer authored as `.md` with correct frontmatter is still a valid reviewer. The current `.yaml` extension for reviewers reflects authoring convenience, not the contract.

---

## 5. Deferred questions and out-of-scope

### Deferred (will be answered by other sub-projects, not by this spec)

| Question | Owning sub-project |
|---|---|
| What sub-types (if any) does `profile` / `brand` / `theme` have? | sub-projects 5 (per repo) |
| What does the `skill` schema look like? Is `skill-atoms` content structured like Claude Code skills (frontmatter `name`/`description` + body)? | sub-project 2 (skill-atoms scaffolding + schema authoring) |
| Which validation tooling (jsonschema, ajv, gojsonschema, ...) goes into CI? | sub-project 5 (conformance wiring) |
| Which schema-authoring sequencing approach — A (brand-first vertical slice), B (big-bang), C (skeleton-then-parallel)? | sub-project 5 (its implementation plan) |
| How is `persona-atoms.com` (and skill-atoms.com etc.) deployed and DNS-configured? | sub-project 3 (site deploy) |
| Federation semantics between `persona-atoms` (hosts `agentic`, `prompt`) and sibling repos `agent-atoms`, `prompt-atoms` (do they hold a third typing, do they consume persona-atoms output, or do they overlap and need resolution)? | Separate brainstorm — not yet sub-projected. Flagged as an architectural question with no immediate forcing function. |

### Out of scope of this spec entirely

- Code, scaffolding, CI workflows, site deploy, repo creation. This is taxonomy only.
- Migration timing (when do governance/personas/ files move to persona-atoms?). The taxonomy is forward-looking; existing files conform when migration runs.
- Backwards-compatibility for the obsolete `ATOMS.yml` `atomTypes` enum. ATOMS.yml gets rewritten in sub-project 4; no shim layer.

### Open questions for principal review

These are decisions made unilaterally in this draft that should be sanity-checked before any sub-project locks in:

1. **`agentic` and `prompt` are the only top-level types in persona-atoms.** Other plausible types (e.g., `policy`, `rule`, `panel`) are not introduced. If a top-level type is missing, name it.
2. **`schema-atoms.com` is assumed as the `$id` host** for schema URLs. If schemas should be served from somewhere else (e.g., a path under `atoms-spec`-style hosting, or a GitHub Pages URL pattern), correct here.
3. **JSON Schema 2020-12 is mandated**, forcing migration of the existing draft-07 `persona.schema.json`. If you'd rather hold the existing draft-07 file at its draft level forever, say so — but mixing drafts in one repo will hurt.
4. **`atoms-spec` and `schema-atoms` stay as two separate repos** with distinct layers (manifest vs. instance). If you'd rather collapse them into one, the resulting repo absorbs both roles and atoms-spec is deprecated.
5. **The `agentic.reviewer` sub-type adopts the existing `persona.schema.json` shape** (severity_weights, evaluate_for, etc.) wholesale. If reviewer should be a different shape, say so.

---

## 6. Alternatives considered

Per Common.md §11.1 — at least two alternatives at every load-bearing decision.

| Decision | Chosen | Alternative(s) | Reason |
|---|---|---|---|
| Number of top-level types in persona-atoms | Two (`agentic`, `prompt`) | One unified type with a `kind` field; three types (`agentic`, `prompt`, `reviewer`) | Matches user-stated taxonomy and on-disk reality (two governance trees). Reviewer as a sub-type of agentic preserves the conceptual unity (both are identities the AI takes on) while keeping severity_weights validation scoped. |
| Sub-type discrimination signal | Frontmatter `type` + `subtype` | Directory placement; file extension; JSON Schema `if/then/else` on filename | Frontmatter survives flattening for site routing, mirrors, and CDN deployment. Directory placement is convention; extension is incidental. |
| Schema versioning model | Repo-level SemVer, hosted under `/vN/` path prefix in `$id` | Per-schema versioning; commit-hash-pinned URLs | Repo-level SemVer is what consumers can actually pin to in their `schema_version` frontmatter. Per-schema versioning makes cross-schema consistency intractable. |
| atoms-spec vs schema-atoms | Keep both, separate layers (manifest vs instance) | Collapse into one repo; deprecate one in favor of the other | atoms-spec already exists with a clear charter ("conventions every catalog must follow"). schema-atoms has a distinct charter ("shape of instance files within a catalog"). Collapsing risks one of the two charters drifting under the other's gravity. |
| Reviewer schema base | Adopt existing `persona.schema.json` (governance) | Author a new reviewer schema in schema-atoms from scratch | Existing schema is concrete, in-use, and ships from the source-of-truth tree. Migrating to draft 2020-12 is mechanical. |

---

## 7. Changelog

- **0.1** (2026-05-23) — Initial draft. Two top-level types (`agentic`, `prompt`) for persona-atoms with `agentic.actor` / `agentic.reviewer` sub-types. `skill`, `profile`, `brand`, `theme` reserved as type names; their shapes are deferred. schema-atoms layout, frontmatter contract, and atoms-spec layering specified. Five open questions surfaced for principal review.
