# schema-atoms Issue Decomposition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create ~87 GitHub issues in `convergent-systems-co/schema-atoms` that decompose the Atom Schema Spec v1.0.0-draft into an epic/feature/story tree, plus five standalone spikes, with native sub-issue parent/child links.

**Architecture:** A data file (`issues.json`) describes the full hierarchy. A Python script (`create-issues.py`) reads it, idempotently creates labels via `gh label create`, creates issues via `gh issue create`, and links sub-issues via the GraphQL `addSubIssue` mutation. Idempotency is by title — a re-run skips existing issues. Dry-run mode prints the plan without mutating GitHub.

**Tech Stack:** GitHub CLI (`gh`), GitHub GraphQL API (sub-issues), Python 3 (stdlib only — `json`, `subprocess`, `argparse`, `sys`).

**Spec reference:** `docs/superpowers/specs/2026-05-23-schema-atoms-issue-decomposition-design.md`

---

## File structure

| Path | Responsibility |
|---|---|
| `scripts/issue-creation/issues.json` | Source of truth — full epic/feature/story/spike hierarchy with labels |
| `scripts/issue-creation/create-issues.py` | Idempotent creator: labels → epics → features → stories → spikes → sub-issue links |
| `scripts/issue-creation/templates.py` | Issue body templates (epic, feature, story, spike) — kept separate for clarity |
| `scripts/issue-creation/README.md` | How to run, dry-run mode, re-run semantics |
| `scripts/issue-creation/.gitignore` | Ignore the `state.json` cache the script writes |

Scripts live in the `atoms` umbrella (not `schema-atoms`) because the plan operates ecosystem-wide and the design doc lives in the umbrella.

---

## Body templates

### Epic body
```markdown
## Goal
{goal}

## Spec reference
- [Atom Schema Spec v1.0.0-draft]({spec_url}) — {spec_sections}
- [Design doc]({design_url})

## Sub-issues
_Populated automatically as features are created._

## Acceptance criteria
- [ ] All child features complete
- [ ] `atoms validate` passes on every atom produced by this epic
- [ ] CI green on schema-atoms `main`
```

### Feature body
```markdown
## Goal
{goal}

## Parent
Epic #{epic_number}

## Spec reference
- {spec_section}

## Sub-issues
_Populated automatically as stories are created._

## Acceptance criteria
- [ ] All child stories complete
- [ ] Behavior matches spec section {spec_section}
- [ ] Tests added/updated
```

### Story body
```markdown
## Goal
{title}

## Parent
Feature #{feature_number}

## Spec reference
- {spec_section}

## Acceptance criteria
- [ ] Implementation complete
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] PR merged
```

### Spike body
```markdown
## Question
{question_text}

## Spec reference
- Atom Schema Spec v1.0.0-draft, Part XI, {question_id}

## Outcome
Decision recorded in:
- An ADR under `docs/adrs/` in schema-atoms
- A `[[spec.amendments]]` entry on `atom-schema-spec` for the next version

## Status
`status/needs-info` — awaiting research and discussion.
```

---

## Phase A — Pre-flight

### Task 1: Verify environment

**Files:** none (read-only checks)

- [ ] **Step 1: Confirm `gh` is authenticated against `convergent-systems-co`**

Run:
```bash
gh auth status
```
Expected output: a logged-in user with access to `convergent-systems-co/schema-atoms`. If not authenticated, run `gh auth login` and re-verify.

- [ ] **Step 2: Confirm sub-issues are accessible via GraphQL**

Run:
```bash
gh api -H "GraphQL-Features: sub_issues" graphql \
  -f query='{ repository(owner:"convergent-systems-co", name:"schema-atoms"){ id } }'
```
Expected: a JSON object with a non-null `repository.id`. Note that ID — you'll need it as `$repositoryId` in later GraphQL calls.

- [ ] **Step 3: Confirm write access to both target repos**

Run:
```bash
gh api repos/convergent-systems-co/schema-atoms --jq '.permissions'
gh api repos/convergent-systems-co/atoms --jq '.permissions'
```
Expected: both show `{"admin": true, "push": true, "...": ...}` (or at least `push: true` and `triage: true` for label management).

- [ ] **Step 4: Commit nothing this task; it's read-only.**

---

### Task 2: Re-label schema-atoms issues #5, #6, #7

**Files:** none (GitHub API mutations)

- [ ] **Step 1: Inspect current labels on each issue**

Run:
```bash
for n in 5 6 7; do
  echo "--- issue #$n ---"
  gh issue view "$n" --repo convergent-systems-co/schema-atoms --json title,labels --jq '{title, labels: [.labels[].name]}'
done
```

Expected: each shows `kind/feature` in its labels.

- [ ] **Step 2: Re-evaluate the true `kind/*` for each issue**

Apply this decision matrix (the design doc's Section 1):

| # | Title | Post-migration kind | Reasoning |
|---|---|---|---|
| 5 | Define minimum-viable infra (Pages project + DNS) | `kind/feature` | Net-new capability |
| 6 | Wire Cloudflare Pages deployment | `kind/chore` | Build/CI/tooling, not user-visible capability |
| 7 | Add web vitals monitoring | `kind/feature` | Net-new capability (observability) |

- [ ] **Step 3: First, ensure `agile/feature` label exists in schema-atoms.** (Skip this step if Task 7 already ran.)

Run:
```bash
gh label create "agile/feature" \
  --color "0e8a16" \
  --description "Net-new user-visible capability slice" \
  --repo convergent-systems-co/schema-atoms || true
```

`|| true` because re-running is harmless once the label exists.

- [ ] **Step 4: Add `agile/feature` to each issue, replacing `kind/feature` with the correct `kind/*`**

For #5 (keep `kind/feature`, add `agile/feature`):
```bash
gh issue edit 5 --repo convergent-systems-co/schema-atoms --add-label "agile/feature"
```

For #6 (replace `kind/feature` with `kind/chore`, add `agile/feature`):
```bash
gh issue edit 6 --repo convergent-systems-co/schema-atoms \
  --remove-label "kind/feature" \
  --add-label "kind/chore,agile/feature"
```

For #7 (keep `kind/feature`, add `agile/feature`):
```bash
gh issue edit 7 --repo convergent-systems-co/schema-atoms --add-label "agile/feature"
```

- [ ] **Step 5: Verify**

Run:
```bash
for n in 5 6 7; do
  gh issue view "$n" --repo convergent-systems-co/schema-atoms --json title,labels --jq '{n: .title, labels: [.labels[].name] | sort}'
done
```

Expected: each shows `agile/feature`. #6 shows `kind/chore` and no `kind/feature`. #5 and #7 show both `kind/feature` and `agile/feature`.

- [ ] **Step 6: Commit nothing — this task only touches GitHub state.**

---

### Task 3: Delete obsolete `kind/{epic,feature,story,task}` from `atoms` umbrella

**Files:** none

- [ ] **Step 1: Confirm none of those labels are in use**

Run:
```bash
for L in kind/epic kind/feature kind/story kind/task; do
  count=$(gh issue list --repo convergent-systems-co/atoms --state all --label "$L" --json number --jq 'length')
  echo "$L: $count issues"
done
```

Expected: every label shows `0 issues`. If any shows >0, **stop** and resolve before continuing — re-label them like Task 2 first.

- [ ] **Step 2: Delete the four labels**

Run:
```bash
for L in kind/epic kind/feature kind/story kind/task; do
  gh label delete "$L" --repo convergent-systems-co/atoms --yes
done
```

- [ ] **Step 3: Verify**

Run:
```bash
gh label list --repo convergent-systems-co/atoms --limit 100 | grep -E '^kind/(epic|feature|story|task)' || echo "all four deleted"
```

Expected: `all four deleted`.

- [ ] **Step 4: Commit nothing — this task only touches GitHub state.**

---

## Phase B — Build the issue-creation toolchain

### Task 4: Scaffold the script directory

**Files:**
- Create: `scripts/issue-creation/README.md`
- Create: `scripts/issue-creation/.gitignore`

- [ ] **Step 1: Create the directory**

Run:
```bash
mkdir -p scripts/issue-creation
```

- [ ] **Step 2: Write `.gitignore`**

```
state.json
*.pyc
__pycache__/
```

- [ ] **Step 3: Write `README.md`**

````markdown
# scripts/issue-creation

Idempotently creates the schema-atoms issue hierarchy from the Atom Schema Spec v1.0.0-draft. See
`docs/superpowers/specs/2026-05-23-schema-atoms-issue-decomposition-design.md` for the design.

## Usage

```bash
# Dry-run (prints what would be created, no GitHub mutations)
python scripts/issue-creation/create-issues.py --dry-run

# Apply
python scripts/issue-creation/create-issues.py --apply
```

## Re-run semantics

- **Labels** — created with `gh label create`; pre-existing labels are skipped.
- **Issues** — matched by exact title against `gh issue list`. If an issue with the same title
  already exists in `convergent-systems-co/schema-atoms`, it is reused (sub-issue links are
  added/checked but the issue is not duplicated or edited).
- **Sub-issue links** — added via GraphQL `addSubIssue` mutation. Existing links are detected
  via `subIssuesSummary.total` + listing and not re-added.

The script writes `state.json` (gitignored) caching title→number mappings to avoid repeated lookups
on re-run. Safe to delete; the script will rebuild it.

## Inputs

- `issues.json` — full hierarchy: labels, epics, features, stories, spikes.
- `templates.py` — body templates (epic, feature, story, spike).

## Outputs

- ~80 issues in `convergent-systems-co/schema-atoms`.
- Updates `state.json` after each successful creation.
````

- [ ] **Step 4: Commit**

```bash
git add scripts/issue-creation/README.md scripts/issue-creation/.gitignore
git commit -m "chore(issue-creation): scaffold script directory"
```

---

### Task 5: Write `issues.json` data file

**Files:**
- Create: `scripts/issue-creation/issues.json`

- [ ] **Step 1: Write the file**

```json
{
  "repo": "convergent-systems-co/schema-atoms",
  "spec_url": "https://github.com/convergent-systems-co/atoms/blob/main/specs/atom-schema-spec-v1.0.0-draft.md",
  "design_url": "https://github.com/convergent-systems-co/atoms/blob/main/docs/superpowers/specs/2026-05-23-schema-atoms-issue-decomposition-design.md",
  "labels": [
    {"name": "agile/epic", "color": "5319e7", "description": "Multi-feature initiative spanning weeks or more"},
    {"name": "agile/feature", "color": "0e8a16", "description": "Net-new user-visible capability slice"},
    {"name": "agile/story", "color": "1d76db", "description": "Single contributor-week-sized chunk"},
    {"name": "agile/task", "color": "c5def5", "description": "Single commit/PR-sized chunk"}
  ],
  "epics": [
    {
      "slug": "E1",
      "title": "Epic: Conform schema-atoms catalog to atom-schema-spec v1.0.0",
      "goal": "ATOMS.yml, repo layout, URL routing, and signing/quorum match Atom Schema Spec v1.0.0.",
      "spec_sections": "Parts II, III, VI, VII",
      "labels": ["agile/epic", "kind/refactor", "area/core", "priority/high", "status/triage"],
      "features": [
        {
          "title": "Rewrite ATOMS.yml to spec v1.1.0 shape",
          "goal": "ATOMS.yml conforms to Part VII of the spec.",
          "spec_section": "Part VII",
          "labels": ["agile/feature", "kind/refactor", "area/core", "priority/high", "status/triage"],
          "stories": [
            {"title": "ATOMS.yml: migrate camelCase fields to snake_case", "spec_section": "Part VII", "kind": "refactor"},
            {"title": "ATOMS.yml: update spec_version to atoms-spec/v1.1.0", "spec_section": "Part VII", "kind": "refactor"},
            {"title": "Spike: ATOMS.yml federation discrepancy (xdao.co vs convergent-systems.co)", "spec_section": "Part VII", "kind": "rfc", "extra_labels": ["status/needs-info"], "is_spike": true},
            {"title": "ATOMS.yml: declare all 20 atom_types per spec Part II", "spec_section": "Part II", "kind": "feature"},
            {"title": "ATOMS.yml: encode quorum_rules per class", "spec_section": "Part VII", "kind": "feature"},
            {"title": "ATOMS.yml: configure signing algorithms (required ml-dsa-65; accepted 44/65/87)", "spec_section": "Part VII", "kind": "feature"}
          ]
        },
        {
          "title": "URL routing & catalog endpoints",
          "goal": "schema-atoms.com serves the routes defined in Part VI.",
          "spec_section": "Part VI",
          "labels": ["agile/feature", "kind/feature", "area/infra", "priority/high", "status/triage"],
          "stories": [
            {"title": "URL routing: per-class / per-atom / per-version path resolution", "spec_section": "Part VI", "kind": "feature"},
            {"title": "Catalog export: /exports/catalog.json", "spec_section": "Part VI", "kind": "feature"},
            {"title": "Catalog export: /exports/by-class.json", "spec_section": "Part VI", "kind": "feature"},
            {"title": "Catalog export: /exports/by-lifecycle.json", "spec_section": "Part VI", "kind": "feature"},
            {"title": "Catalog export: /mirror.toml", "spec_section": "Part VI", "kind": "feature"}
          ]
        },
        {
          "title": "Repo scaffold conformance",
          "goal": "schema-atoms repo layout matches spec conventions.",
          "spec_section": "Part VII",
          "labels": ["agile/feature", "kind/chore", "area/ci", "priority/medium", "status/triage"],
          "stories": [
            {"title": "Add compositions/ directory (composition_type: spec-compositions)", "spec_section": "Part VII", "kind": "chore"},
            {"title": "Wire `atoms validate` in CI on every PR", "spec_section": "Part VIII Step 6", "kind": "chore"},
            {"title": "Establish per-class subdirectory layout under /<class>/", "spec_section": "Part VI", "kind": "chore"}
          ]
        }
      ]
    },
    {
      "slug": "E2",
      "title": "Epic: Implement design-spec class & publish foundational specs",
      "goal": "design-spec is the first fully working class; the Atom Schema Spec itself ships as the proof.",
      "spec_sections": "Part II Family 1, Part IV, Part VIII",
      "labels": ["agile/epic", "kind/feature", "area/core", "priority/high", "status/triage"],
      "features": [
        {
          "title": "design-spec class TOML payload implementation",
          "goal": "[spec] and [[spec.amendments]] sections parse and validate.",
          "spec_section": "Part IV — design-spec payload",
          "labels": ["agile/feature", "kind/feature", "area/core", "priority/high", "status/triage"],
          "stories": [
            {"title": "design-spec: [spec] section parser/validator", "spec_section": "Part IV", "kind": "feature"},
            {"title": "design-spec: [[spec.amendments]] log support", "spec_section": "Part IV", "kind": "feature"},
            {"title": "design-spec: conforms_to chain resolution", "spec_section": "Part IV", "kind": "feature"}
          ]
        },
        {
          "title": "Publish atom-schema-spec@1.0.0-draft (this spec)",
          "goal": "The Atom Schema Spec itself is a published design-spec atom in schema-atoms.",
          "spec_section": "Part VIII",
          "labels": ["agile/feature", "kind/docs", "area/core", "priority/high", "status/triage"],
          "stories": [
            {"title": "Publish atom-schema-spec: author spec.md from this document", "spec_section": "Part VIII Step 1", "kind": "docs"},
            {"title": "Publish atom-schema-spec: canonicalize TOML + compute content_hash", "spec_section": "Part VIII Steps 3-4", "kind": "chore"},
            {"title": "Publish atom-schema-spec: sign with catalog-maintainer + editor", "spec_section": "Part VIII Step 5", "kind": "security"},
            {"title": "Publish atom-schema-spec: validate + open PR", "spec_section": "Part VIII Steps 6-7", "kind": "chore"}
          ]
        },
        {
          "title": "Publish remaining foundational design-specs",
          "goal": "atom-spec, ai-constitution-spec, olympus-spec, atom-key/cache/cli-spec, and per-catalog spec stubs.",
          "spec_section": "Part II Family 1",
          "labels": ["agile/feature", "kind/docs", "area/core", "priority/medium", "status/triage"],
          "stories": [
            {"title": "Publish atom-spec@1.1.0 at new design-spec/ path", "spec_section": "Part IX", "kind": "docs"},
            {"title": "Publish ai-constitution-spec@1.0.0-draft", "spec_section": "Part II Family 1", "kind": "docs"},
            {"title": "Publish olympus-spec@1.0.0-draft", "spec_section": "Part II Family 1", "kind": "docs"},
            {"title": "Publish atom-key-spec@1.0.0-draft", "spec_section": "Part II Family 1", "kind": "docs"},
            {"title": "Publish atom-cache-spec@1.0.0-draft", "spec_section": "Part II Family 1", "kind": "docs"},
            {"title": "Publish atom-cli-spec@1.0.0-draft", "spec_section": "Part II Family 1", "kind": "docs"},
            {"title": "Per-catalog design-spec stubs + tracking issues (persona, policy, channel, prompt, skill, theme, brand, profile, agent, model, service, knowledge, identity, workflow, pipeline, event, compliance, plugin)", "spec_section": "Part II Family 1", "kind": "docs"}
          ]
        }
      ]
    },
    {
      "slug": "E3",
      "title": "Epic: Migrate JSON Schemas to schema-atoms as json-schema atoms",
      "goal": "Every JSON schema in the ecosystem becomes an independently versioned, signed json-schema atom.",
      "spec_sections": "Part II Family 3, Part IV — data-schema payload",
      "labels": ["agile/epic", "kind/refactor", "area/core", "priority/medium", "status/triage"],
      "features": [
        {
          "title": "json-schema class implementation",
          "goal": "[schema] payload + $id-matches-atom-id validator.",
          "spec_section": "Part IV — data-schema payload",
          "labels": ["agile/feature", "kind/feature", "area/core", "priority/high", "status/triage"],
          "stories": [
            {"title": "json-schema: [schema] TOML payload (json-schema class)", "spec_section": "Part IV", "kind": "feature"},
            {"title": "json-schema validator: $id matches atom id", "spec_section": "Part IV", "kind": "feature"},
            {"title": "json-schema validator: JSON Schema draft version matches schema_version", "spec_section": "Part IV", "kind": "feature"}
          ]
        },
        {
          "title": "Migrate existing JSON schemas",
          "goal": "Each schema in src/*-atoms/schemas/ becomes a json-schema atom in schema-atoms.",
          "spec_section": "Part II Family 3",
          "labels": ["agile/feature", "kind/refactor", "area/core", "priority/medium", "status/triage"],
          "stories": [
            {"title": "Spike: inventory all JSON schemas across src/*-atoms/schemas/ and produce migration list", "spec_section": "Part II Family 3", "kind": "rfc", "extra_labels": ["status/needs-info"], "is_spike": true},
            {"title": "Migrate json-schema/panels-config@1.0.0", "spec_section": "Part II Family 3", "kind": "refactor"},
            {"title": "Migrate json-schema/project-config@1.0.0", "spec_section": "Part II Family 3", "kind": "refactor"},
            {"title": "Migrate json-schema/agent-envelope@1.0.0", "spec_section": "Part II Family 3", "kind": "refactor"}
          ]
        }
      ]
    },
    {
      "slug": "E4",
      "title": "Epic: Import protocol-specs from standards bodies",
      "goal": "Foundational external standards (FIPS-204, RFC-3339, RFC-7517) live as signed protocol-spec atoms with full provenance.",
      "spec_sections": "Part II Family 4, Part V",
      "labels": ["agile/epic", "kind/feature", "area/core", "priority/medium", "status/triage"],
      "features": [
        {
          "title": "Provenance toolchain",
          "goal": "[protocol.provenance] validator + import workflow CLI.",
          "spec_section": "Part V",
          "labels": ["agile/feature", "kind/feature", "area/cli", "priority/high", "status/triage"],
          "stories": [
            {"title": "[protocol.provenance] block validator", "spec_section": "Part V", "kind": "feature"},
            {"title": "atoms import CLI: download → checksum → atom assembly", "spec_section": "Part V Import workflow", "kind": "feature"},
            {"title": "Document upstream license handling per class (IETF Trust, FIPS public-domain, W3C, ISO)", "spec_section": "Part V", "kind": "docs"}
          ]
        },
        {
          "title": "Import foundational standards",
          "goal": "FIPS-204, RFC-3339, RFC-7517 imported with full provenance.",
          "spec_section": "Part II Family 4",
          "labels": ["agile/feature", "kind/feature", "area/core", "priority/medium", "status/triage"],
          "stories": [
            {"title": "Import schema-atoms/fips/fips-204@1.0.0 (ML-DSA)", "spec_section": "Part II Family 4", "kind": "feature"},
            {"title": "Import schema-atoms/rfc/rfc-3339@1.0.0 (timestamps)", "spec_section": "Part II Family 4", "kind": "feature"},
            {"title": "Import schema-atoms/rfc/rfc-7517@1.0.0 (JWK)", "spec_section": "Part II Family 4", "kind": "feature"}
          ]
        }
      ]
    },
    {
      "slug": "E5",
      "title": "Epic: Implement remaining type families (api-spec, language-spec, taxonomy-spec)",
      "goal": "All 13 remaining atom classes have working implementations + initial sample atoms.",
      "spec_sections": "Part II Families 2, 5, 6; Part IV",
      "labels": ["agile/epic", "kind/feature", "area/core", "priority/medium", "status/triage"],
      "features": [
        {
          "title": "api-spec family class implementations",
          "goal": "openapi-spec, asyncapi-spec, graphql-schema, grpc-spec, json-rpc-spec classes parse and validate.",
          "spec_section": "Part II Family 2",
          "labels": ["agile/feature", "kind/feature", "area/core", "priority/medium", "status/triage"],
          "stories": [
            {"title": "api-spec class: openapi-spec", "spec_section": "Part II Family 2", "kind": "feature"},
            {"title": "api-spec class: asyncapi-spec", "spec_section": "Part II Family 2", "kind": "feature"},
            {"title": "api-spec class: graphql-schema", "spec_section": "Part II Family 2", "kind": "feature"},
            {"title": "api-spec class: grpc-spec", "spec_section": "Part II Family 2", "kind": "feature"},
            {"title": "api-spec class: json-rpc-spec", "spec_section": "Part II Family 2", "kind": "feature"}
          ]
        },
        {
          "title": "language-spec family class implementations",
          "goal": "ebnf-grammar (+bnf-grammar), language-reference, query-language-spec, regex-spec classes parse and validate.",
          "spec_section": "Part II Family 5",
          "labels": ["agile/feature", "kind/feature", "area/core", "priority/medium", "status/triage"],
          "stories": [
            {"title": "language-spec class: ebnf-grammar (+ bnf-grammar)", "spec_section": "Part II Family 5", "kind": "feature"},
            {"title": "language-spec class: language-reference", "spec_section": "Part II Family 5", "kind": "feature"},
            {"title": "language-spec class: query-language-spec", "spec_section": "Part II Family 5", "kind": "feature"},
            {"title": "language-spec class: regex-spec", "spec_section": "Part II Family 5", "kind": "feature"}
          ]
        },
        {
          "title": "taxonomy-spec family class implementations",
          "goal": "controlled-vocabulary, code-list, ontology classes parse and validate (inline + asset modes).",
          "spec_section": "Part II Family 6",
          "labels": ["agile/feature", "kind/feature", "area/core", "priority/medium", "status/triage"],
          "stories": [
            {"title": "taxonomy-spec class: controlled-vocabulary (inline + asset modes)", "spec_section": "Part II Family 6", "kind": "feature"},
            {"title": "taxonomy-spec class: code-list", "spec_section": "Part II Family 6", "kind": "feature"},
            {"title": "taxonomy-spec class: ontology", "spec_section": "Part II Family 6", "kind": "feature"}
          ]
        },
        {
          "title": "Publish initial atoms in new classes",
          "goal": "Spec-example atoms exist as proofs.",
          "spec_section": "Part II Families 5, 6",
          "labels": ["agile/feature", "kind/docs", "area/core", "priority/low", "status/triage"],
          "stories": [
            {"title": "Publish controlled-vocabulary/atom-lifecycle-states@1.0.0", "spec_section": "Part II Family 6", "kind": "docs"},
            {"title": "Publish controlled-vocabulary/signer-roles@1.0.0", "spec_section": "Part II Family 6", "kind": "docs"},
            {"title": "Publish controlled-vocabulary/persona-domains@1.0.0", "spec_section": "Part II Family 6", "kind": "docs"},
            {"title": "Publish ebnf-grammar/toml-1-0@1.0.0", "spec_section": "Part II Family 5", "kind": "docs"}
          ]
        }
      ]
    },
    {
      "slug": "E6",
      "title": "Epic: Execute spec → design-spec supersession (Part IX)",
      "goal": "atom-spec@1.1.0 lives at the new design-spec/ path; the old spec class is historic.",
      "spec_sections": "Part IX",
      "labels": ["agile/epic", "kind/refactor", "area/core", "priority/medium", "status/triage"],
      "features": [
        {
          "title": "Supersession execution",
          "goal": "Publish new path, mark old path historic, update ATOMS.yml + consumers.",
          "spec_section": "Part IX",
          "labels": ["agile/feature", "kind/refactor", "area/core", "priority/medium", "status/triage"],
          "stories": [
            {"title": "Publish schema-atoms/design-spec/atom-spec@1.1.0 (supersedes + migration_notes)", "spec_section": "Part IX Step 1", "kind": "docs"},
            {"title": "Republish schema-atoms/spec/atom-spec@1.1.0 (superseded_by + lifecycle=historic)", "spec_section": "Part IX Step 2", "kind": "docs"},
            {"title": "ATOMS.yml: remove `spec` from atom_types, add `design-spec` (depends on Epic 1)", "spec_section": "Part IX Step 3", "kind": "refactor"},
            {"title": "Update downstream consumers (ai-constitution, olympus, atoms-tools) to use new path", "spec_section": "Part IX Step 3", "kind": "refactor"}
          ]
        }
      ]
    }
  ],
  "spikes": [
    {"title": "Spike: Q1 — conformance-spec class location (schema-atoms vs test-atoms catalog)", "spec_section": "Part XI Q1", "labels": ["agile/story", "kind/rfc", "area/core", "priority/low", "status/needs-info"]},
    {"title": "Spike: Q2 — math-spec class (theorem statements, crypto primitives)", "spec_section": "Part XI Q2", "labels": ["agile/story", "kind/rfc", "area/core", "priority/low", "status/needs-info"]},
    {"title": "Spike: Q3 — legal-spec class (contracts, license texts, regulations)", "spec_section": "Part XI Q3", "labels": ["agile/story", "kind/rfc", "area/core", "priority/low", "status/needs-info"]},
    {"title": "Spike: Q4 — versioning policy for imported RFCs with errata", "spec_section": "Part XI Q4", "labels": ["agile/story", "kind/rfc", "area/core", "priority/low", "status/needs-info"]},
    {"title": "Spike: Q5 — inline-vs-asset size threshold for controlled-vocabulary", "spec_section": "Part XI Q5", "labels": ["agile/story", "kind/rfc", "area/core", "priority/low", "status/needs-info"]}
  ]
}
```

- [ ] **Step 2: Validate JSON syntax**

Run:
```bash
python -c "import json; json.load(open('scripts/issue-creation/issues.json'))" && echo "OK"
```
Expected: `OK`.

- [ ] **Step 3: Count totals match the design**

Run:
```bash
python -c "
import json
d = json.load(open('scripts/issue-creation/issues.json'))
e = len(d['epics'])
f = sum(len(ep['features']) for ep in d['epics'])
s = sum(len(ft['stories']) for ep in d['epics'] for ft in ep['features'])
sp = len(d['spikes'])
print(f'epics={e} features={f} stories={s} spikes={sp} total={e+f+s+sp}')
"
```
Expected output: `epics=6 features=15 stories=61 spikes=5 total=87`.

Per-epic breakdown for cross-checking:
- E1: features=3 stories=14
- E2: features=3 stories=14
- E3: features=2 stories=7
- E4: features=2 stories=6
- E5: features=4 stories=16
- E6: features=1 stories=4

(Epic 3's `stories=7` reflects the inventory spike + 3 example schemas only; the inventory spike will discover ~50 more schemas, expanding the final count well beyond 87 over time.)

- [ ] **Step 4: Commit**

```bash
git add scripts/issue-creation/issues.json
git commit -m "feat(issue-creation): add issues.json with full hierarchy"
```

---

### Task 6: Write `templates.py`

**Files:**
- Create: `scripts/issue-creation/templates.py`

- [ ] **Step 1: Write the file**

```python
"""Issue body templates for create-issues.py.

Each template returns a Markdown string given the relevant dict from issues.json.
Keep templates pure — no I/O, no GitHub calls.
"""


def epic_body(epic: dict, spec_url: str, design_url: str) -> str:
    return f"""## Goal
{epic['goal']}

## Spec reference
- [Atom Schema Spec v1.0.0-draft]({spec_url}) — {epic['spec_sections']}
- [Design doc]({design_url})

## Sub-issues
_Populated automatically as features are created._

## Acceptance criteria
- [ ] All child features complete
- [ ] `atoms validate` passes on every atom produced by this epic
- [ ] CI green on schema-atoms `main`
"""


def feature_body(feature: dict, epic_number: int) -> str:
    return f"""## Goal
{feature['goal']}

## Parent
Epic #{epic_number}

## Spec reference
- {feature['spec_section']}

## Sub-issues
_Populated automatically as stories are created._

## Acceptance criteria
- [ ] All child stories complete
- [ ] Behavior matches spec section {feature['spec_section']}
- [ ] Tests added/updated
"""


def story_body(story: dict, feature_number: int) -> str:
    return f"""## Goal
{story['title']}

## Parent
Feature #{feature_number}

## Spec reference
- {story['spec_section']}

## Acceptance criteria
- [ ] Implementation complete
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] PR merged
"""


def spike_body(spike: dict, spec_url: str) -> str:
    return f"""## Question
{spike['title']}

## Spec reference
- [Atom Schema Spec v1.0.0-draft]({spec_url}) — {spike['spec_section']}

## Outcome
Decision recorded in:
- An ADR under `docs/adrs/` in schema-atoms
- A `[[spec.amendments]]` entry on `atom-schema-spec` for the next version

## Status
`status/needs-info` — awaiting research and discussion.
"""
```

- [ ] **Step 2: Syntax check**

The directory name has a dash, so the module must be loaded by file path rather than `import`. Run:

```bash
python -c "import importlib.util; s=importlib.util.spec_from_file_location('t','scripts/issue-creation/templates.py'); m=importlib.util.module_from_spec(s); s.loader.exec_module(m); print(m.epic_body({'goal':'x','spec_sections':'y'}, 'u', 'v'))"
```
Expected: prints the epic body markdown starting with `## Goal\nx\n...`.

- [ ] **Step 3: Commit**

```bash
git add scripts/issue-creation/templates.py
git commit -m "feat(issue-creation): add body templates"
```

---

### Task 7: Write `create-issues.py`

**Files:**
- Create: `scripts/issue-creation/create-issues.py`

- [ ] **Step 1: Write the file**

```python
#!/usr/bin/env python3
"""Idempotently create the schema-atoms issue hierarchy.

Reads issues.json, creates labels + issues + sub-issue links via gh CLI and
the GitHub GraphQL API. Re-run safe: existing labels and existing issues
(matched by title) are skipped.

Usage:
    python create-issues.py --dry-run    # print plan, no mutations
    python create-issues.py --apply      # do it
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).parent
ISSUES_JSON = HERE / "issues.json"
STATE_JSON = HERE / "state.json"

# Load templates by absolute path because the directory has a dash in its name.
_spec = importlib.util.spec_from_file_location("templates", HERE / "templates.py")
templates = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(templates)


def sh(cmd: list[str], check: bool = True, input_text: str | None = None) -> str:
    """Run a command, return stdout. Raises on non-zero exit unless check=False."""
    r = subprocess.run(cmd, capture_output=True, text=True, input=input_text)
    if check and r.returncode != 0:
        sys.stderr.write(f"FAIL: {' '.join(cmd)}\n{r.stderr}\n")
        sys.exit(1)
    return r.stdout.strip()


def load_state() -> dict:
    if STATE_JSON.exists():
        return json.loads(STATE_JSON.read_text())
    return {"issues": {}, "labels_created": []}


def save_state(state: dict) -> None:
    STATE_JSON.write_text(json.dumps(state, indent=2))


def find_existing_issue(repo: str, title: str) -> int | None:
    """Return issue number if an issue with this exact title exists, else None."""
    out = sh([
        "gh", "issue", "list", "--repo", repo, "--state", "all",
        "--search", f'"{title}" in:title',
        "--json", "number,title", "--limit", "100",
    ])
    if not out:
        return None
    items = json.loads(out)
    for it in items:
        if it["title"] == title:
            return it["number"]
    return None


def create_label(repo: str, name: str, color: str, description: str, dry_run: bool) -> None:
    if dry_run:
        print(f"  [dry-run] create label {name} (color {color})")
        return
    r = subprocess.run(
        ["gh", "label", "create", name, "--color", color, "--description", description, "--repo", repo],
        capture_output=True, text=True,
    )
    if r.returncode == 0:
        print(f"  created label {name}")
    elif "already exists" in r.stderr.lower():
        print(f"  label {name} already exists (skipped)")
    else:
        sys.stderr.write(f"FAIL creating label {name}: {r.stderr}\n")
        sys.exit(1)


def create_issue(repo: str, title: str, body: str, labels: list[str], dry_run: bool) -> int:
    """Create issue or return existing number. Returns issue number."""
    existing = find_existing_issue(repo, title)
    if existing is not None:
        print(f"  exists #{existing}: {title}")
        return existing
    if dry_run:
        print(f"  [dry-run] create issue: {title}")
        print(f"    labels: {labels}")
        return -1
    out = sh([
        "gh", "issue", "create", "--repo", repo,
        "--title", title,
        "--body", body,
        "--label", ",".join(labels),
    ])
    # gh prints the URL on success; extract issue number from the trailing path component
    num = int(out.rstrip("/").rsplit("/", 1)[-1])
    print(f"  created #{num}: {title}")
    time.sleep(0.4)  # gentle to avoid burst rate limit
    return num


def issue_node_id(repo: str, number: int) -> str:
    """Get the GraphQL node ID for an issue."""
    owner, name = repo.split("/", 1)
    q = (
        'query($owner:String!,$name:String!,$n:Int!){'
        ' repository(owner:$owner,name:$name){'
        '  issue(number:$n){id}'
        ' }'
        '}'
    )
    out = sh([
        "gh", "api", "graphql",
        "-f", f"query={q}",
        "-F", f"owner={owner}",
        "-F", f"name={name}",
        "-F", f"n={number}",
    ])
    return json.loads(out)["data"]["repository"]["issue"]["id"]


def add_sub_issue(repo: str, parent_number: int, child_number: int, dry_run: bool) -> None:
    """Link child as a sub-issue of parent via GraphQL addSubIssue mutation."""
    if parent_number < 0 or child_number < 0:
        return  # dry-run placeholders
    if dry_run:
        print(f"    [dry-run] link #{child_number} as sub-issue of #{parent_number}")
        return
    parent_id = issue_node_id(repo, parent_number)
    child_id = issue_node_id(repo, child_number)
    mutation = (
        'mutation($parent:ID!,$child:ID!){'
        ' addSubIssue(input:{issueId:$parent,subIssueId:$child}){'
        '  issue{id}'
        ' }'
        '}'
    )
    r = subprocess.run([
        "gh", "api", "graphql",
        "-H", "GraphQL-Features: sub_issues",
        "-f", f"query={mutation}",
        "-F", f"parent={parent_id}",
        "-F", f"child={child_id}",
    ], capture_output=True, text=True)
    if r.returncode != 0:
        msg = r.stderr.lower()
        if "already" in msg or "duplicate" in msg:
            print(f"    sub-issue link #{parent_number}→#{child_number} already exists")
            return
        sys.stderr.write(f"FAIL linking sub-issue: {r.stderr}\n")
        sys.exit(1)
    print(f"    linked #{child_number} → parent #{parent_number}")
    time.sleep(0.3)


def main() -> int:
    ap = argparse.ArgumentParser()
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true")
    mode.add_argument("--apply", action="store_true")
    args = ap.parse_args()
    dry_run = args.dry_run

    data = json.loads(ISSUES_JSON.read_text())
    repo = data["repo"]
    spec_url = data["spec_url"]
    design_url = data["design_url"]
    state = load_state()

    print(f"Repo: {repo}")
    print(f"Mode: {'DRY-RUN' if dry_run else 'APPLY'}")
    print()

    # Phase 1: labels
    print("[1/4] Creating labels...")
    for lab in data["labels"]:
        create_label(repo, lab["name"], lab["color"], lab["description"], dry_run)
    print()

    # Phase 2: epics
    print("[2/4] Creating epics, features, stories...")
    for epic in data["epics"]:
        print(f"Epic {epic['slug']}: {epic['title']}")
        epic_num = create_issue(
            repo, epic["title"],
            templates.epic_body(epic, spec_url, design_url),
            epic["labels"], dry_run,
        )
        state["issues"][epic["title"]] = epic_num
        save_state(state)
        for feature in epic["features"]:
            print(f"  Feature: {feature['title']}")
            feat_num = create_issue(
                repo, feature["title"],
                templates.feature_body(feature, epic_num),
                feature["labels"], dry_run,
            )
            state["issues"][feature["title"]] = feat_num
            save_state(state)
            add_sub_issue(repo, epic_num, feat_num, dry_run)
            # Inherit area/* and priority/* from the parent feature so stories
            # match their feature's surface; default to area/core + priority/medium
            # if the feature didn't specify one.
            feat_area = next((l for l in feature["labels"] if l.startswith("area/")), "area/core")
            feat_priority = next((l for l in feature["labels"] if l.startswith("priority/")), "priority/medium")
            for story in feature["stories"]:
                extra = story.get("extra_labels", [])
                # If the story brought its own status/*, drop the default status/triage.
                status_label = "status/triage"
                if any(l.startswith("status/") for l in extra):
                    status_label = None
                labels = ["agile/story", f"kind/{story['kind']}", feat_area, feat_priority]
                if status_label:
                    labels.append(status_label)
                labels.extend(extra)
                story_num = create_issue(
                    repo, story["title"],
                    templates.story_body(story, feat_num),
                    labels, dry_run,
                )
                state["issues"][story["title"]] = story_num
                save_state(state)
                add_sub_issue(repo, feat_num, story_num, dry_run)
    print()

    # Phase 3: spikes (standalone)
    print("[3/4] Creating spikes...")
    for spike in data["spikes"]:
        n = create_issue(
            repo, spike["title"],
            templates.spike_body(spike, spec_url),
            spike["labels"], dry_run,
        )
        state["issues"][spike["title"]] = n
        save_state(state)
    print()

    # Phase 4: summary
    print("[4/4] Done.")
    print(f"  Tracked {len(state['issues'])} issues in state.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Make executable**

```bash
chmod +x scripts/issue-creation/create-issues.py
```

- [ ] **Step 3: Syntax check**

Run:
```bash
python -m py_compile scripts/issue-creation/create-issues.py && echo "OK"
```
Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
git add scripts/issue-creation/create-issues.py
git commit -m "feat(issue-creation): add idempotent creator script"
```

---

### Task 8: Dry-run the script and review the plan output

**Files:** none (read-only verification)

- [ ] **Step 1: Dry-run**

Run:
```bash
python scripts/issue-creation/create-issues.py --dry-run | tee /tmp/schema-atoms-dryrun.txt
```

Expected: prints a plan showing 4 label creates, 6 epics, 15 features, 61 stories, 5 spikes. No GitHub mutations.

- [ ] **Step 2: Verify issue counts in dry-run output**

Run:
```bash
echo "epics:    $(grep -c '^Epic ' /tmp/schema-atoms-dryrun.txt)"
echo "features: $(grep -c '^  Feature: ' /tmp/schema-atoms-dryrun.txt)"
echo "stories+spikes (dry-run creates): $(grep -c '\[dry-run\] create issue' /tmp/schema-atoms-dryrun.txt)"
```

Expected:
- epics: 6
- features: 15
- stories+spikes printed via `[dry-run] create issue`: 66 (= 61 stories + 5 spikes)

If counts are wrong, fix `issues.json` and re-run dry-run before applying.

- [ ] **Step 3: Spot-check a few output lines**

Read the dry-run output. Confirm:
- Labels: `agile/epic`, `agile/feature`, `agile/story`, `agile/task` appear.
- Epic 1 lists Feature "Rewrite ATOMS.yml..." with stories including the federation spike.
- Spikes section lists Q1–Q5.

- [ ] **Step 4: Commit nothing — this is verification only.**

---

## Phase C — Execute creation

### Task 9: Apply — create labels and issues

**Files:** `scripts/issue-creation/state.json` (gitignored, written by the script)

- [ ] **Step 1: Final confirmation**

Read the dry-run output from Task 8 one more time. Confirm titles, labels, and structure look correct. **This step cannot be undone cleanly** — once issues exist, removing them requires a manual sweep.

- [ ] **Step 2: Apply**

Run:
```bash
python scripts/issue-creation/create-issues.py --apply 2>&1 | tee /tmp/schema-atoms-apply.txt
```

Expected: ~87 issues created (6 epics + 15 features + 61 stories + 5 spikes), sub-issue links established, `state.json` populated. Total runtime ~5–8 minutes (includes deliberate per-call sleeps to avoid burst rate limiting).

- [ ] **Step 3: Verify totals**

Run:
```bash
gh issue list --repo convergent-systems-co/schema-atoms --state open --label "agile/epic" --json number --jq 'length'
gh issue list --repo convergent-systems-co/schema-atoms --state open --label "agile/feature" --json number --jq 'length'
gh issue list --repo convergent-systems-co/schema-atoms --state open --label "agile/story" --json number --jq 'length'
```

Expected: `6`, `15`, `66` (stories + spikes both carry `agile/story`).

- [ ] **Step 4: Spot-check sub-issue linking on Epic 1**

Find Epic 1's issue number from `state.json`, then query its sub-issues:

```bash
E1_TITLE="Epic: Conform schema-atoms catalog to atom-schema-spec v1.0.0"
E1=$(jq -r --arg t "$E1_TITLE" '.issues[$t]' scripts/issue-creation/state.json)
echo "Epic 1 = #$E1"
gh api -H "GraphQL-Features: sub_issues" graphql -f query="
{ repository(owner:\"convergent-systems-co\",name:\"schema-atoms\"){
    issue(number:$E1){
      subIssues(first:50){ nodes{ number title } }
    }
  }
}" --jq '.data.repository.issue.subIssues.nodes[] | "#\(.number) \(.title)"'
```

Expected: 3 sub-issues — "Rewrite ATOMS.yml to spec v1.1.0 shape", "URL routing & catalog endpoints", "Repo scaffold conformance".

- [ ] **Step 5: Commit `state.json`? No — it's gitignored.**

---

### Task 10: Add blocker references (federation spike + inventory spike)

**Files:** none (GitHub mutations)

- [ ] **Step 1: Find the federation spike issue number**

Run:
```bash
FED_TITLE="Spike: ATOMS.yml federation discrepancy (xdao.co vs convergent-systems.co)"
FED=$(jq -r --arg t "$FED_TITLE" '.issues[$t]' scripts/issue-creation/state.json)
echo "federation spike = #$FED"
```

- [ ] **Step 2: Find every story under Epic 1 to mark as `Blocked by: #$FED`**

Run:
```bash
gh api -H "GraphQL-Features: sub_issues" graphql -f query="
{ repository(owner:\"convergent-systems-co\",name:\"schema-atoms\"){
    issue(number:$E1){
      subIssues(first:50){ nodes{
        number
        subIssues(first:50){ nodes{ number title } }
      } }
    }
  }
}" --jq '.data.repository.issue.subIssues.nodes[].subIssues.nodes[] | "\(.number) \(.title)"'
```

(`$E1` comes from Task 9 Step 4.) This lists all Epic 1 stories. Skip the federation spike itself.

- [ ] **Step 3: For each Epic 1 story (except the federation spike), append a "Blocked by" line to its body**

For each story number `$N` ≠ `$FED`:

```bash
gh issue view "$N" --repo convergent-systems-co/schema-atoms --json body --jq .body > /tmp/body.md
printf "\n\n---\n\n**Blocked by:** #%s\n" "$FED" >> /tmp/body.md
gh issue edit "$N" --repo convergent-systems-co/schema-atoms --body-file /tmp/body.md
```

Wrap this in a small loop. Example:

```bash
for N in <list of Epic 1 story numbers, excluding $FED>; do
  gh issue view "$N" --repo convergent-systems-co/schema-atoms --json body --jq .body > /tmp/body.md
  printf "\n\n---\n\n**Blocked by:** #%s\n" "$FED" >> /tmp/body.md
  gh issue edit "$N" --repo convergent-systems-co/schema-atoms --body-file /tmp/body.md
  sleep 0.4
done
```

- [ ] **Step 4: Same pattern for the Epic 3 inventory spike**

Find the inventory spike number:
```bash
INV_TITLE="Spike: inventory all JSON schemas across src/*-atoms/schemas/ and produce migration list"
INV=$(jq -r --arg t "$INV_TITLE" '.issues[$t]' scripts/issue-creation/state.json)
echo "inventory spike = #$INV"
```

Then for the three migration stories under Epic 3 (panels-config, project-config, agent-envelope), append `**Blocked by:** #$INV` the same way.

- [ ] **Step 5: Verify**

Run:
```bash
gh issue view "$N" --repo convergent-systems-co/schema-atoms --json body --jq .body | tail -5
```
Expected: each affected story's body ends with `**Blocked by:** #<spike>`.

- [ ] **Step 6: Commit nothing — this task only touches GitHub state.**

---

## Phase D — Final verification

### Task 11: End-to-end smoke check

**Files:** none

- [ ] **Step 1: Run the script in `--dry-run` again**

```bash
python scripts/issue-creation/create-issues.py --dry-run
```

Expected: every issue reported as `exists #<N>` (no `[dry-run] create issue` lines). This proves idempotency.

- [ ] **Step 2: Count by label**

```bash
for L in agile/epic agile/feature agile/story; do
  c=$(gh issue list --repo convergent-systems-co/schema-atoms --state open --label "$L" --json number --jq 'length')
  echo "$L: $c"
done
```

Expected: `agile/epic: 6`, `agile/feature: 15`, `agile/story: 66`.

- [ ] **Step 3: Confirm sub-issue depth**

```bash
gh api -H "GraphQL-Features: sub_issues" graphql -f query='
{ repository(owner:"convergent-systems-co",name:"schema-atoms"){
    issues(first:100, labels:["agile/epic"], states:OPEN){
      nodes{ number title subIssues(first:50){ totalCount } }
    }
  }
}' --jq '.data.repository.issues.nodes[] | "#\(.number) \(.title) — \(.subIssues.totalCount) features"'
```

Expected: each epic shows the right number of features (E1: 3, E2: 3, E3: 2, E4: 2, E5: 4, E6: 1).

- [ ] **Step 4: Confirm spikes are NOT sub-issues**

```bash
for sp in Q1 Q2 Q3 Q4 Q5; do
  N=$(jq -r --arg q "Spike: $sp" '. as $s | .issues | to_entries[] | select(.key | startswith($q)) | .value' scripts/issue-creation/state.json | head -1)
  echo "$sp = #$N"
done
```

Then check none of them have a parent issue via the `parentIssue` field on the sub-issues schema. Expected: each spike issue stands alone (no parent epic).

- [ ] **Step 5: Push the branch (optional, gated)**

If the branch should be visible on the remote and PR'd, push it:
```bash
git push -u origin docs/schema-atoms-issue-decomposition
```

Then open a PR against `main` summarizing what was done:
```bash
gh pr create --repo convergent-systems-co/atoms --base main --head docs/schema-atoms-issue-decomposition \
  --title "docs(schema-atoms): issue decomposition design + creation tooling" \
  --body "$(cat <<'EOF'
## Summary
- Design doc + spec at `docs/superpowers/specs/2026-05-23-schema-atoms-issue-decomposition-design.md`
- Source spec at `specs/atom-schema-spec-v1.0.0-draft.md`
- Idempotent issue-creation tooling at `scripts/issue-creation/`
- ~71 issues created in `convergent-systems-co/schema-atoms` per the design

## Test plan
- [x] Dry-run output reviewed
- [x] Apply completed
- [x] Sub-issue counts verified per epic
- [x] Blocker references added to Epic 1 stories
- [x] Re-running script reports all issues as `exists` (idempotency confirmed)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

This step is **gated** — confirm with the user before pushing or opening the PR (per Common.md §2.2).

---

## Self-review notes

- Each epic / feature / story in `issues.json` traces back to a specific spec Part listed in `spec_section`. Spec Parts X (self-reference) and XII (changelog) have no implementation work and so don't appear.
- Per-schema migration story count (currently 3) is a known stub. The Epic 3 inventory spike (`Task 9` creates it; resolution happens later, not in this plan) determines the final per-schema story list. Plan deliberately does NOT pre-create those — they'd be premature.
- Labels enumerated in `issues.json` rely on `area/*`, `kind/*`, `priority/*`, `status/*` families that already exist in `schema-atoms`. The script does NOT create those; only `agile/*` is created. Verify this matches reality with Task 1 Step 3 (label-list inspection — not explicitly done but implied; add a check if needed).
- Idempotency: re-running the script is safe. Title-based matching means if a story title is later edited on GitHub, the script will see it as "missing" and create a duplicate. Document this in the README (already noted) and recommend not editing titles after creation.
- The plan does NOT modify any existing schema-atoms infrastructure code — only adds tracking issues. Implementation of each story happens in subsequent PRs, one per story, per the standard development flow.
