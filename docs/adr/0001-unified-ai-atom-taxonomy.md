# 0001. Unified AI atom taxonomy (clean-sheet)

- Status: proposed
- Date: 2026-08-16
- Supersedes: `docs/superpowers/specs/2026-05-23-atoms-type-taxonomy-design.md` (Draft, never approved, never executed)

## Context

`ai-atoms` becomes the single catalog for all AI-runtime primitives. **Eight**
catalogs fold in: `persona-atoms`, `agent-atoms`, `prompt-atoms`, `model-atoms`,
`skill-atoms`, `workflow-atoms`, `context-atoms`, `knowledge-atoms`.
`aiConstitution` stays separate — it is Apache-2.0 executable code that
*consumes* the catalog.

> **Corrected 2026-08-16.** `workflow-atoms` was omitted from the original
> scope. Its `step-type` (31) and `gate-type` (9) atoms are workflow primitives
> and belong under this ADR's `workflow` type; its 4 agentic workflows are
> compositions. Only the 14 CI/CD workflows stay out.

This is a **clean-sheet taxonomy**. The existing types are treated as input
material, not as constraints. Where today's vocabulary does not survive
first-principles design, it is retired rather than preserved as a sub-type.

### Measured starting state

Actual `.json` instance counts under `atoms/`.

> **Corrected 2026-08-16.** The original table was measured from the *pinned
> submodule commits*, which lagged the catalogs' actual HEADs. Re-measured
> against the source repositories' HEADs during migration
> (convergent-systems-co/ai-atoms#46). Four rows were wrong, one type was
> missing entirely, and the scope omitted a catalog. Superseded values below;
> the taxonomy decision is unchanged.

| Catalog | Atoms | Types (instances) |
|---|---:|---|
| `ai-atoms` | 302 | skill 284, hook 18 |
| `model-atoms` | 84 | model-card 77, capability 7 |
| `persona-atoms` | **78** | role-definition 28, knowledge-boundary 23, behavioural-constraint 13, **work-contract 6**, tone-parameter 4, voice-profile 4 |
| `prompt-atoms` | **61** | persona 21, constraint 15, format-instruction 10, output-schema 5, refusal-pattern 5, tool-use-template 5 |
| `agent-atoms` | 48 | tool-definition 20, persona 10, capability-declaration 8, isolation-constraint 5, role-boundary 5 |
| `workflow-atoms` | **40** | step-type 31, gate-type 9 |
| `skill-atoms` | 22 | skill 22 |
| `knowledge-atoms` | 3 | entity-type 1, fact-type 1, provenance-atom 1 |
| `context-atoms` | 0 | — |
| **Total** | **638** | **37 declared types** |

Corrections against the original figures: `persona-atoms` 53 → **78** (and it has
a **`work-contract`** type the first pass missed entirely); `prompt-atoms`
60 → **61**; `ai-atoms` 298 → **302**; `workflow-atoms` added as an eighth
source catalog, contributing 40 atoms. Total 568 → **638**.

Beyond the `atoms/` trees, the source catalogs also ship **52 composition
files** — 40 personas, 4 agents, 4 workflows, 3 prompts, 1 skill — which the
original measurement did not count at all.

Roughly a third of the declared vocabulary is empty: four `model-atoms` types,
all five `context-atoms` types, and two `knowledge-atoms` types have zero
instances.

### Why the existing vocabulary cannot be carried forward

**It fragments one concept across three catalogs.** Permission and restriction
appear as six differently-named types — `isolation-constraint`,
`behavioural-constraint`, `knowledge-boundary`, `role-boundary`,
`capability-declaration`, `refusal-pattern` — spread across three repos, with no
stated relationship. A runtime asking "what is this agent forbidden to do?" must
query six types and reconcile six shapes.

**It types facets as instances.** `voice-profile` (4) and `tone-parameter` (4)
are *fields of a persona*, not things that exist independently. Nothing consumes
a tone parameter on its own. The 2026-05-23 draft spec made exactly this
argument and was never executed; `persona-atoms` still ships them.

**Composition is untyped.** 638 primitives, and while 52 composition files do
exist across the catalogs, no *atom type* represents them — so a composition
cannot be versioned, referenced by canonical URL, or resolved as a dependency.
The thing users actually want to install — "a tech lead that plans, writes ADRs,
and gates merges" — exists as a file in `persona-atoms/personas/` but is
unaddressable from the taxonomy.

> **Corrected 2026-08-16.** The original text claimed there was "no composition
> layer." There is one, per-catalog and untyped; the defect is that it sits
> outside the type system, not that it is absent.

**It confuses layers.** `agent-atoms/tool-definition` carries `tool_spec` and
declares an executable affordance. `prompt-atoms/tool-use-template` carries
`content` + `applicable_turns` and is prose telling a model how to behave around
tools. Same word, disjoint field sets, disjoint consumers.

## Decision

### 1. Six primitives, two compositions

The discriminator is **what a runtime does with the atom**.

| # | Type | Runtime action | Sub-types |
|---|---|---|---|
| 1 | `prompt` | injects text into the context window | `persona`, `constraint`, `format`, `output-schema`, `refusal`, `tool-use` |
| 2 | `tool` | exposes an executable affordance | `command`, `http`, `mcp`, `builtin` |
| 3 | `policy` | permits, forbids, or bounds an action | `capability`, `isolation`, `boundary`, `refusal` |
| 4 | `skill` | invokes a bounded capability | *(none)* |
| 5 | `hook` | fires on a runtime event | `pre-tool-use`, `post-tool-use`, `session`, `notification` |
| 6 | `model` | looks up reference data | `card`, `capability`, `pricing`, `modality`, `deprecation`, `tool-shape` |
| 7 | `agent` | **composes** 1–6 into a bindable identity | `persona`, `actor`, `reviewer` |
| 8 | `workflow` | **composes** agents into a pipeline | `sequence`, `fan-out`, `gate` |

Eight types replace thirty-four.

### 2. `policy` unifies all permission and restriction

Five types collapse into one with three populated sub-types. Every rule that
permits, forbids, or bounds is a `policy`, regardless of whether it constrains a
tool call, a topic, or a role:

```
agent/capability-declaration   →  policy/capability   8
agent/isolation-constraint     →  policy/isolation    5
agent/role-boundary            →  policy/boundary     5
persona/knowledge-boundary     →  policy/boundary    17
persona/behavioural-constraint →  policy/boundary    11
                                                    ── 46
```

A runtime asking "what is this agent forbidden to do?" queries one type.

`prompt/refusal-pattern` stays in `prompt` — it is text a model reads, not a
rule a runtime enforces. The `policy/refusal` sub-type is reserved for
runtime-enforced refusals and ships with zero instances.

### 3. Every atom has a destination

> **Corrected 2026-08-16** to the destinations actually used by the migration
> (convergent-systems-co/ai-atoms#46).

| Destination | Sources | Atoms |
|---|---|---:|
| `skill` | `ai-atoms/skill` 284 + `skill-atoms` net-new 11 | **295** |
| `model` | `model-atoms/*` *(pending)* | 84 |
| `prompt` | `prompt-atoms/*`, subtypes preserved | **61** |
| `policy` | `capability` 8, `isolation` 5, `boundary` 41 | **54** |
| `workflow` | `step` 31, `gate` 9 | **40** |
| `agent/persona` | `persona-atoms/role-definition` | **28** |
| `tool/command` | `agent-atoms/tool-definition` | 20 |
| `hook` | `ai-atoms/hook` | **18** |
| `agent/_facets` | `work-contract` 6, `voice-profile` 4, `tone-parameter` 4 | **14** |
| `agent/actor` | `agent-atoms/persona` | **10** |
| *deferred — different contract* | `skill-atoms/skills/ai-hook` | 3 |
| *out of scope* | `knowledge-atoms` | 3 |
| *dropped* | `context-atoms` | 0 |
| **compositions** | personas 40, agents 4, workflows 4, prompts 3, skills 1 | **52** |

Four corrections to the original mapping:

- **`skill` is 295, not 306.** Eleven of `skill-atoms`' 22 atoms were *already*
  in `ai-atoms`. The original figure double-counted the overlap.
- **`agent-atoms/persona` lands in `agent/actor`, not `agent/persona`.** Both
  sources contain `code-reviewer.json` and `devops-engineer.json`; a flat merge
  silently clobbered one with the other. They split cleanly on this ADR's own
  criterion — `persona_profile` (behaviour) → `actor`, `job_to_be_done` (role
  spec) → `persona`.
- **`policy` is 54, not 46**, following the corrected `persona-atoms` counts.
- **`work-contract` (6) joins the facets**, which the original omitted.

The claim that "`agent/actor`, `agent/reviewer`, and all of `workflow` begin
empty and are authored fresh" was **wrong**. `agent/actor` inherits 10 atoms,
`workflow` inherits 40, and 52 compositions already existed — including the
complete delivery-pipeline persona set (`planner-tech-lead`, `executor-coder`,
`executor-tdd-test-writer`, `reviewer-adversarial-test-writer`,
`coordinator-devops-engineer`, and others). Only `agent/reviewer` is genuinely
empty.

### 4. Persona is not a type — it is an unbound agent

`agent` has three sub-types on one axis: how much is bound.

- `agent/persona` — identity only. Voice, tone, role, judgment style. No tools,
  no skills. Portable across runtimes. This is what `persona-atoms` was reaching
  for.
- `agent/actor` — a persona bound to skills, tools, and policies. Executes work.
- `agent/reviewer` — a persona bound to evaluation criteria. Judges work
  products and emits structured verdicts.

`voice-profile`, `tone-parameter`, and `role-definition` become **fields on
`agent/persona`**, not types. Nothing consumed them independently.

### 5. Composition is a first-class atom

```
agent/actor/tech-lead@1.0.0
  extends:   agent/persona/staff-engineer@1.0.0
  skills:  [ skill/write-adr@1.2.0, skill/plan-work@1.0.0 ]
  tools:   [ tool/command/shell-exec@1.0.0 ]
  policies:[ policy/isolation/container-allowlist@1.0.0,
             policy/boundary/no-prod-data@1.0.0 ]
  hooks:   [ hook/pre-tool-use/secret-block@1.1.0 ]

workflow/sequence/delivery@1.0.0
  steps: [ agent/actor/tech-lead@1.0.0     → gate: plan-approved
           agent/actor/coder@1.0.0
           agent/reviewer/adversarial@1.0.0 → gate: no-high-findings
           agent/actor/tech-lead@1.0.0 ]
```

References are canonical URLs with pinned versions. A composition is installable
as a unit — this is what `/plugin marketplace add` resolves against.

### 6. Dropped and deferred

- **`context-atoms` — dropped.** Five declared types, zero instances, three
  months. Attention budgets and working-memory shapes are runtime configuration,
  not portable catalog data. Reserve the name; ship nothing.
- **`knowledge-atoms` — out of scope.** Three atoms. Entity types and provenance
  belong to a knowledge-graph catalog, not AI-runtime primitives. It does not
  fold into `ai-atoms`.
- **`voice-profile`, `tone-parameter`, `role-definition` — retired as types.**
  Become fields on `agent/persona`.

### 7. Envelope normalization

All atoms use `schema` (not `$schema`), holding an absolute URL under
`https://ai-atoms.com/schemas/`. Today: `$schema` in `persona-atoms`, absent
entirely in `model-atoms`, `schema` elsewhere. No single validator works across
the catalog until this is uniform. This migration lands first, before any
re-typing.

### 8. One schema per top-level type

Eight schemas under `schemas/v1/`, each using `oneOf` with
`properties.subtype.const` branches. JSON Schema 2020-12 has no native
`discriminator`; `const` is the mechanism.

## Consequences

- **This is a rewrite, not a migration.** All 638 atoms are re-typed. 336 change
  canonical URL; the rest change shape. There is no in-place upgrade path.
- **Seven domains must serve 301s from `infra/` in the same release** — 
  `persona`, `agent`, `prompt`, `model`, `skill`, `workflow`, `context` — or
  every existing reference breaks. `knowledge-atoms.com` stays live.
- **`model-atoms` and `context-atoms` must leave the registry.** Both are
  currently listed in `catalogs/index.toml`; this ADR folds one in and drops the
  other. Removal requires re-signing (`make sign`, needs a 1Password session).
  `ai-atoms` itself is already registered (`catalogs/ai-atoms.toml`).
- **`spec_version` is unresolved.** `ai-atoms/ATOMS.yml` pins
  `atoms-spec/v1.1.0`; `spec/` publishes v1.0.0, v1.2.0, v1.3.0. v1.1.0 does not
  exist there.
- **`skill` absorbs 306 atoms with one field rename** (`invocation_contract` →
  `invocation`). It is the only mechanical part of this.
- **`policy` needs per-atom judgment** across 58 atoms from six source types.
- **`agent` and `workflow` have no existing instances.** They are authored fresh.
- The published vocabulary drops from 34 names to 8, which is the point: an
  agent reading `/ai/index.json` can hold the whole taxonomy at once.

## Alternatives considered

- **Reconcile the existing 34 types into ~20 with sub-types.** Rejected by the
  principal: the target is net-new, and preserving `tool-use-template` alongside
  `tool-definition` carries forward the confusion that motivated the rewrite.
- **Keep `persona` as a top-level type separate from `agent`.** Rejected — a
  persona is an agent with nothing bound. Two types would require duplicate
  schemas and leave "when do I use which?" unanswered.
- **Keep the six permission types distinct.** Rejected — no consumer
  distinguishes them; all six answer "what may this agent do?"
- **Fold `knowledge-atoms` in because it is nominally AI.** Rejected — RAG
  vocabulary is not a runtime primitive; three atoms do not justify a type.
- **Absorb `aiConstitution`.** Rejected — Apache-2.0 code on its own release
  cadence versus CC-BY-4.0 data.
- **Namespace by source catalog during migration** (`skill` vs `skill-legacy`).
  Rejected — encodes migration history in permanent public URL space.
