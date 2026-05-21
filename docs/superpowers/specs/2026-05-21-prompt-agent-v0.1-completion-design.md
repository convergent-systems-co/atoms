# Design — prompt-atoms + agent-atoms v0.1 completion

**Date:** 2026-05-21
**Author:** Thomas Polliard (with Claude as drafting assistant)
**Status:** Draft — pending implementation plan
**Scope:** Both `prompt-atoms` and `agent-atoms` brought to fully-shipped v0.1 per each catalog's `GOALS.md`. External integrations (Olympus, aish) deferred.

---

## 1. Objective

Bring `prompt-atoms` and `agent-atoms` to a fully-shipped v0.1 — every artifact named in each catalog's `GOALS.md` `v0.1 — Bootstrap & spec acceptance` milestone exists in-repo, validates, and is exported. External integrations (Olympus, aish) are explicitly deferred to v0.2.

### Success criteria — done means all of:

**prompt-atoms**

- [ ] `atoms/` ≥ 50 files (10 persona, 15 constraint, 10 format-instruction, 5 tool-use-template, 5 refusal-pattern, 5 output-schema)
- [ ] `prompts/` ≥ 2 compositions, each resolving every ref against the local tree
- [ ] `schemas/composition-v1.json` present and validates each composition
- [ ] `schemas/rule-v1.json` present
- [ ] `rules/` ≥ 2 sample rules (one model-compatibility, one format-compatibility)
- [ ] `scripts/build-exports.py` present and runnable
- [ ] `exports/catalog.json` present and current with the tree
- [ ] `scripts/validate.py` exits 0 for atoms + compositions + rules
- [ ] `web/` Astro app builds; landing + browser + atom-detail + composition-detail pages live
- [ ] `web/public/_headers` serves `/atoms/**/*.json`, `/prompts/*.json`, `/rules/**/*.json`, `/exports/catalog.json`, `/schemas/*.json` with correct content-types and cache rules
- [ ] Cloudflare Pages deploy of `web/dist/` on `prompt-atoms.com`
- [ ] One PR opened against `convergent-systems-co/prompt-atoms`

**agent-atoms** (analogous)

- [ ] `atoms/` ≥ 48 files (10 persona, 20 tool-definition, 8 capability-declaration, 5 role-boundary, 5 isolation-constraint — 5 added for parity beyond what GOALS.md numerates)
- [ ] `agents/` ≥ 2 compositions
- [ ] `schemas/composition-v1.json` + `rules/` + `exports/catalog.json`
- [ ] `web/` Astro app builds; landing + browser + atom-detail + agent-detail pages live
- [ ] `web/public/_headers` serves `/atoms/**/*.json`, `/agents/*.json`, `/rules/**/*.json`, `/exports/catalog.json`, `/schemas/*.json`
- [ ] Cloudflare Pages deploy of `web/dist/` on `agent-atoms.com`
- [ ] One PR opened against `convergent-systems-co/agent-atoms`

**atoms (umbrella)**

- [ ] Submodule pointers bumped to the merged child commits
- [ ] Commit message: `chore: bump prompt-atoms + agent-atoms — v0.1 complete`

### Explicit non-goals

- No Olympus or aish code changes. Their v0.1 line items (Hermes routing integration, intent classification pull) are marked *deferred — external dependency*.
- No cross-catalog `see_also` references — each catalog stays standalone for this pass.
- No `xaips` proposals filed. The v0.1 `XAIP: prompt composition schema` checkbox stays unchecked; we author the schema directly. After-the-fact XAIP filing is v0.2 work.
- No signed exports. `exports/catalog.json` ships unsigned; signing is v0.2.
- No `xdao.co` updates this pass. `xdao` is a separate repo; listing the catalogs there is a follow-up task against `convergent-systems-co/xdao`.

### Open questions flagged, not resolved

- DNS / Cloudflare Pages project naming. Assumed: project names `prompt-atoms` and `agent-atoms`, custom domains `prompt-atoms.com` and `agent-atoms.com`. Requires user to attach domains in the Cloudflare dashboard or `wrangler` CLI — out of band for the PR itself.

---

## 2. Catalog shape after v0.1

End-state directory layout for each catalog. New artifacts marked `+`, existing marked `=`, modified marked `~`.

```
prompt-atoms/
├── ATOMS.yml                                       =
├── README.md                                       =
├── GOALS.md                                        = (no edits this pass)
├── LICENSE                                         =
├── schemas/
│   ├── atom-v1.json                                =
│   ├── composition-v1.json                         +
│   └── rule-v1.json                                +
├── atoms/
│   ├── persona/             (2 → 10 files)         + 8
│   ├── constraint/          (2 → 15 files)         + 13
│   ├── format-instruction/  (2 → 10 files)         + 8
│   ├── tool-use-template/   (2 →  5 files)         + 3
│   ├── refusal-pattern/     (2 →  5 files)         + 3
│   └── output-schema/       (2 →  5 files)         + 3
├── prompts/                                        + 2 files
│   ├── code-reviewer-strict.json                   +
│   └── research-summarizer.json                    +
├── rules/                                          + 2 files
│   ├── model-compatibility/claude-opus-tool-use.json   +
│   └── format-compatibility/json-requires-strict-format.json  +
├── scripts/
│   ├── validate.py                                 ~ (extended for new schemas)
│   └── build-exports.py                            +
├── exports/
│   └── catalog.json                                + (build output)
└── web/                                            + (Astro + Wrangler, mirrors theme-atoms)
    ├── astro.config.mjs                            +
    ├── package.json                                +
    ├── pnpm-lock.yaml                              +
    ├── tsconfig.json                               +
    ├── public/
    │   ├── _headers                                + (content-types + cache for raw artifacts)
    │   ├── atoms/         (copied from ../atoms/)  + (prebuild step)
    │   ├── prompts/       (copied from ../prompts/) + (prebuild step)
    │   ├── rules/         (copied from ../rules/)  + (prebuild step)
    │   ├── schemas/       (copied from ../schemas/) + (prebuild step)
    │   └── exports/       (copied from ../exports/) + (prebuild step)
    ├── scripts/
    │   └── copy-catalog.mjs                        + (prebuild copy)
    └── src/
        ├── layouts/Base.astro                      +
        ├── components/                             + (AtomCard, CompositionCard, RefBadge, …)
        └── pages/
            ├── index.astro                         + (landing — what / why / how)
            ├── how-to-use.astro                    +
            ├── install.astro                       +
            ├── atoms/index.astro                   + (browser, filter by type)
            ├── atoms/[type]/[id].astro             + (dynamic atom detail)
            ├── prompts/index.astro                 + (composition list)  [agent-atoms: agents/index.astro]
            └── prompts/[id].astro                  + (composition detail, ref-resolved)  [agent-atoms: agents/[id].astro]
```

`agent-atoms/` mirrors the shape; type names and counts change per Section 4; `prompts/` paths in `web/src/pages/` become `agents/`.

### Two-PR flow

```
prompt-atoms          agent-atoms           umbrella atoms/
─────────────         ─────────────         ──────────────
branch feat/v0.1  →   branch feat/v0.1  →   git add prompt-atoms agent-atoms
commits sequenced     commits sequenced     commit: chore: bump prompt+agent v0.1
PR → review → merge   PR → review → merge   (single bump commit, direct main push)
```

### Commit isolation inside each child-repo PR (Code.md §11.2)

```
1.  feat(schema): composition-v1.json            (typed composition contract)
2.  feat(schema): rule-v1.json                   (typed rule contract)
3.  feat(scripts): build-exports.py              (catalog.json builder)
4.  feat(atoms): persona — N new                 (one commit per atom type)
5.  feat(atoms): constraint — N new
6.  feat(atoms): format-instruction — N new       (prompt-atoms only)
   ... or feat(atoms): tool-definition — N new   (agent-atoms only)
7.  feat(atoms): ... (remaining types in order)
8.  feat(rules): seed rules
9.  feat(prompts|agents): seed compositions
10. chore(exports): initial catalog.json
11. test(validate): extend validator for compositions + rules
12. feat(web): Astro scaffold (config, package.json, layouts, components)
13. feat(web): landing + how-to-use + install pages
14. feat(web): atom browser + dynamic atom detail page
15. feat(web): composition browser + dynamic composition detail page
16. feat(web): _headers for raw artifact serving
17. ci(deploy): Cloudflare Pages deploy workflow (GH Actions, on main)
```

Each commit body explains the *why*: for atoms, "needed by composition X" or "fills v0.1 type-count target"; for schemas, the design decisions on which fields are required.

### Validator extension vs split

Validator gets *extended*, not split. Single entry point (`scripts/validate.py`) dispatches by directory:

- `atoms/<type>/*.json` → `atom-v1.json`
- `prompts/*.json` / `agents/*.json` → `composition-v1.json` + cross-reference resolution
- `rules/<type>/*.json` → `rule-v1.json`

Alternative considered: three separate scripts. Rejected — one entry point is simpler for CI and humans.

---

## 3. prompt-atoms inventory

### Compositions

**`prompts/code-reviewer-strict.json`** — strict adversarial code reviewer for diff review.

```
persona            : code-reviewer-strict          [existing]
constraints        : cite-file-line                [existing]
                   : no-fabrication                [existing]
                   : findings-need-evidence        [new]
                   : three-cycle-cap               [new]
format-instruction : markdown-with-citations       [existing]
tool-use-template  : parallel-when-independent     [existing]
refusal-pattern    : no-exploit-details            [existing]
output-schema      : findings-list                 [new]
```

**`prompts/research-summarizer.json`** — research synthesis with provenance discipline.

```
persona            : research-summarizer           [new]
constraints        : no-fabrication                [existing]
                   : cite-primary-sources          [new]
                   : preserve-source-hedges        [new]
format-instruction : structured-research-summary   [new]
tool-use-template  : single-tool-call-then-stop    [existing]
refusal-pattern    : no-medical-legal-advice       [existing]
output-schema      : json-object-with-summary      [existing]
```

Between them, the compositions reference 7 new atoms. The remaining 31 new atoms round each type to the v0.1 seed count.

### Full inventory of new atoms (38 total)

**persona — 8 new** (existing: `code-reviewer-strict`, `refactor-scout`)

| id                      | purpose                                                      | comp |
|-------------------------|--------------------------------------------------------------|------|
| research-summarizer     | Research synthesis voice, provenance-disciplined             | C2   |
| plan-architect          | Decomposition + alternatives-table planner (Code.md §11.1)   |      |
| docs-writer             | Audience-tuned technical docs (Code.md §9.2)                 |      |
| debug-detective         | Five-phase systematic debugging voice                        |      |
| devops-runbook          | Runbook-execution voice, change-controlled                   |      |
| data-analyst            | Statistical literacy, effect-size discipline (Writing.md §4) |      |
| teaching-explainer      | Audience-depth-tuned code explainer (/explain mirror)        |      |
| terse-cli-assistant     | Short, shell-aware assistant voice                           |      |

**constraint — 13 new** (existing: `cite-file-line`, `no-fabrication`)

| id                             | purpose                                                                  | comp |
|--------------------------------|--------------------------------------------------------------------------|------|
| findings-need-evidence         | Code-review findings need file:line + snippet (Code.md §11.5)            | C1   |
| three-cycle-cap                | Stop after 3 same-approach attempts (Common.md U15)                      | C1   |
| cite-primary-sources           | Prefer primary sources; flag aggregators (Writing.md §3.3)               | C2   |
| preserve-source-hedges         | Don't strengthen source uncertainty (Writing.md §3.4)                    | C2   |
| no-secrets-in-output           | Prompt-level echo of Common.md P4                                        |      |
| structured-output-only         | No prose outside declared output schema                                  |      |
| acknowledge-uncertainty        | Say "I don't know" rather than guess (Common.md P2)                      |      |
| one-question-at-a-time         | For interactive flows; serialized open-ended questions (JM-SET §2)       |      |
| independent-verification       | Consequential claims need independent sources (Common.md U14)            |      |
| behavior-preserving-refactor   | Refactor must not change behavior; bug-report-separately (Code.md §11.3) |      |
| no-silent-fallback             | Refuse to substitute prose for unmet constraints (JM-SET §4)             |      |
| reproduce-before-fix           | Bug fix begins with failing repro (Code.md §11.4)                        |      |
| terse-by-default               | Short responses unless asked to expand                                   |      |

**format-instruction — 8 new** (existing: `markdown-with-citations`, `terse-bullets`)

| id                          | purpose                                                       | comp |
|-----------------------------|---------------------------------------------------------------|------|
| structured-research-summary | Findings / Evidence / Open-questions layout                   | C2   |
| ascii-tables-and-trees      | TUI-rendered diagrams in ASCII (Common.md U16)                |      |
| mermaid-when-rendered       | Markdown-destined diagrams use Mermaid (Common.md U16)        |      |
| json-strict                 | Valid JSON only, no fences, no commentary                     |      |
| yaml-strict                 | Valid YAML only                                               |      |
| plain-text-no-markdown      | No markdown at all (logs, transports without renderers)       |      |
| numbered-steps              | Numbered procedure format                                     |      |
| diff-format-only            | Unified-diff output, no narration                             |      |

**tool-use-template — 3 new** (existing: `parallel-when-independent`, `single-tool-call-then-stop`)

| id                                | purpose                                                       | comp |
|-----------------------------------|---------------------------------------------------------------|------|
| read-then-edit                    | Read affected files before edits (paired with Edit tool)      |      |
| plan-then-execute                 | Plan, ack, execute pattern (Common.md §2.5 Non-trivial)       |      |
| checkpoint-on-context-pressure    | HANDOFF.md before context limits (Common.md U10 / U13)        |      |

**refusal-pattern — 3 new** (existing: `no-exploit-details`, `no-medical-legal-advice`)

| id                                  | purpose                                                      | comp |
|-------------------------------------|--------------------------------------------------------------|------|
| no-fabrication-refusal              | Refuse-and-say-IDK rather than invent (Common.md P2)         |      |
| no-secret-display                   | Refuse to echo env-var values (Common.md §4)                 |      |
| no-destructive-without-confirmation | Refuse unconfirmed destructive ops (Common.md §2.2)          |      |

**output-schema — 3 new** (existing: `json-object-with-summary`, `markdown-with-frontmatter`)

| id                       | purpose                                                          | comp |
|--------------------------|------------------------------------------------------------------|------|
| findings-list            | `[{file, line, severity, finding, evidence}]` for code review    | C1   |
| plan-with-alternatives   | Code.md §11.1 plan template shape (objective, alternatives, etc.)|      |
| handoff-md               | `HANDOFF.md` schema (Common.md U10)                              |      |

### Rules (2 seed rules)

```
rules/model-compatibility/claude-opus-tool-use.json
  — declares tool-use-template/parallel-when-independent works on
    claude-opus-4-7 and gpt-4o; warns on llama and mistral

rules/format-compatibility/json-requires-strict-format.json
  — declares output-schema/json-object-with-summary requires
    format-instruction/json-strict (not markdown-with-citations)
```

### Vendor distribution

| Vendor scope | Approximate count | Examples                                                                 |
|--------------|-------------------|--------------------------------------------------------------------------|
| `any`        | ~34               | Most personas, all generic constraints, structural formats               |
| Narrowed     | ~4                | `tool-use-template/parallel-when-independent` (claude, gpt) — tool-use convention varies; `tool-use-template/checkpoint-on-context-pressure` (claude — `HANDOFF.md` is a Claude Code idiom) |

### Explicitly excluded

- `persona/peer-programmer` — overlaps `refactor-scout` + new `debug-detective`. Adding it would be filler.
- A Claude-specific XML tool-tag template — deprecated by the modern tool-use API.
- A standalone `constraint/no-hallucinated-citations` — already covered by `no-fabrication` + `cite-primary-sources`.

---

## 4. agent-atoms inventory

### Compositions

**`agents/code-reviewer.json`** — matches the GOALS.md example exactly.

```
persona            : code-reviewer                 [existing]
tools              : git-diff                      [existing]
                   : read-file                     [existing]
                   : list-dir                      [new]
                   : grep                          [new]
capabilities       : read-only-workspace           [existing]
role-boundaries    : no-code-execution             [existing]
                   : no-network-egress             [existing]
isolation          : read-only-sandbox             [existing]
```

**`agents/runbook-executor.json`** — devops voice for change-controlled execution.

```
persona            : devops-engineer               [existing]
tools              : bash-exec                     [new]
                   : http-fetch                    [new]
                   : file-write                    [new]
capabilities       : exec-with-approval            [new]
role-boundaries    : no-data-exfiltration          [new]
isolation          : container-with-allowlist      [existing]
```

### Full inventory of new atoms (33 total)

**persona — 8 new** (existing: `code-reviewer`, `devops-engineer`)

| id                       | purpose                                                       |
|--------------------------|---------------------------------------------------------------|
| research-agent           | Multi-step research with citation discipline                  |
| planner-agent            | Decomposition + Alternatives Table (Code.md §11.1)            |
| docs-writer-agent        | Documentation-drafting agent with style consistency           |
| debug-agent              | Five-phase debugging loop (Code.md §11.4)                     |
| data-pipeline-agent      | ETL / batch processing voice with idempotency discipline      |
| refactor-agent           | Behavior-preserving refactor, bug-report-separately           |
| triage-agent             | Bug-triage agent (mirrors atlassian:triage-issue)             |
| test-writer-agent        | TDD-discipline agent (failing test → impl → green)            |

**tool-definition — 18 new** (existing: `git-diff`, `read-file`)

| id              | side-effect class | one-liner                                   |
|-----------------|-------------------|---------------------------------------------|
| list-dir        | read              | Directory listing                           |
| grep            | read              | Pattern search across files                 |
| glob            | read              | Path-pattern enumeration                    |
| stat            | read              | File metadata                               |
| git-log         | read              | Commit history                              |
| git-status      | read              | Working-tree state                          |
| git-blame       | read              | Per-line authorship                         |
| git-show        | read              | Single-commit detail                        |
| http-fetch      | network-read      | GET-only HTTP                               |
| http-post       | network-write     | POST/PUT/PATCH/DELETE                       |
| bash-exec       | exec              | Arbitrary shell (gated by capability)       |
| file-write      | write             | Create/overwrite a file                     |
| file-edit       | write             | Targeted string replacement                 |
| file-delete     | destructive       | Remove a file (gated)                       |
| sql-query       | read              | SELECT-only DB access                       |
| sql-mutate      | write             | INSERT/UPDATE/DELETE (gated)                |
| send-message    | external-write    | Slack/email/etc. (gated)                    |
| schedule-task   | external-write    | Cron/timer registration                     |

**capability-declaration — 6 new** (existing: `coder-with-approval`, `read-only-workspace`)

| id                       | grants                                                        |
|--------------------------|---------------------------------------------------------------|
| exec-with-approval       | Shell exec, per-command approval                              |
| network-read-only        | Outbound HTTP GET only                                        |
| network-full             | Any HTTP method, any host on allowlist                        |
| file-write-scoped        | Writes confined to a path prefix                              |
| db-read-only             | SELECT only against named DSN                                 |
| db-read-write            | All DML against named DSN                                     |

**role-boundary — 3 new** (existing: `no-code-execution`, `no-network-egress`)

| id                          | forbids                                                      |
|-----------------------------|--------------------------------------------------------------|
| no-data-exfiltration        | Sending workspace contents to external hosts                 |
| no-destructive-without-ack  | Destructive ops without explicit approval (Common.md §2.2)   |
| no-cross-project-access     | Access outside the declared project root                     |

**isolation-constraint — 3 new** (existing: `container-with-allowlist`, `read-only-sandbox`)

| id                          | shape                                                        |
|-----------------------------|--------------------------------------------------------------|
| ephemeral-vm                | Single-use VM, destroyed on task end                         |
| network-namespaced          | Own netns with explicit allowlist                            |
| seccomp-restricted          | Whitelisted syscalls only                                    |

### Rules (2 seed rules)

```
rules/capability-grant/exec-requires-isolation.json
  — capability/exec-with-approval requires
    isolation in {container-with-allowlist, ephemeral-vm, seccomp-restricted}

rules/isolation-rule/network-write-requires-allowlist.json
  — tool/http-post requires isolation in
    {container-with-allowlist, network-namespaced}
```

---

## 4b. Web app & deploy (per catalog)

Both catalogs ship an Astro + Wrangler `web/` app that mirrors `theme-atoms/web/` in shape and toolchain. No design pass for layout — copy the theme-atoms structure and adapt content. v0.1 prioritizes correctness and machine-readability over visual polish; styling can be refined in v0.2.

### Toolchain (matches theme-atoms exactly)

| Tool         | Version      | Purpose                                |
|--------------|--------------|----------------------------------------|
| Astro        | `^6.1.10`    | Static site generator                  |
| React        | `^19.0.0`    | Interactive components (browser/filter)|
| Wrangler     | `^4.0.0`     | Cloudflare Pages deploy                |
| pnpm         | latest stable| Package manager (lockfile committed)   |

### Page set (per catalog)

- `index.astro` — landing: catalog purpose, civilization-grade properties, link to atoms-tools, link to GitHub.
- `how-to-use.astro` — installation, composition resolution walkthrough, vendor selection.
- `install.astro` — `git clone --recurse-submodules` (umbrella), `git submodule update --init prompt-atoms` (single), `curl https://<catalog>.com/exports/catalog.json` (machine consumer).
- `atoms/index.astro` — list every atom, filterable by type and vendor.
- `atoms/[type]/[id].astro` — individual atom detail (rendered content, schema, see_also resolution).
- `prompts/index.astro` (prompt-atoms) **or** `agents/index.astro` (agent-atoms) — composition list.
- `prompts/[id].astro` **or** `agents/[id].astro` — composition detail with resolved refs as clickable links.

### Prebuild copy (`scripts/copy-catalog.mjs`)

Before `astro build`, copy `../atoms/`, `../prompts/` or `../agents/`, `../rules/`, `../schemas/`, `../exports/` into `web/public/`. Same pattern as `theme-atoms/web/scripts/copy-catalog.mjs`. This is how the static site serves the raw JSON files at predictable URLs.

### `public/_headers`

```
/atoms/*.json
  Content-Type: application/json; charset=utf-8
  Cache-Control: public, max-age=300, must-revalidate

/prompts/*.json                      # agent-atoms: /agents/*.json
  Content-Type: application/json; charset=utf-8
  Cache-Control: public, max-age=300, must-revalidate

/rules/*.json
  Content-Type: application/json; charset=utf-8
  Cache-Control: public, max-age=300, must-revalidate

/exports/catalog.json
  Content-Type: application/json; charset=utf-8
  Cache-Control: public, max-age=60, must-revalidate

/schemas/*.json
  Content-Type: application/schema+json; charset=utf-8
  Cache-Control: public, max-age=3600, must-revalidate
```

### Cloudflare Pages deploy

- **Project names**: `prompt-atoms` and `agent-atoms` (one Pages project per catalog).
- **Custom domains**: `prompt-atoms.com`, `agent-atoms.com`. Attached via `wrangler pages deployment` or the Cloudflare dashboard (out-of-band one-time setup).
- **Deploy trigger**: GitHub Actions workflow on push to `main`; runs `pnpm install && pnpm build && wrangler pages deploy dist`.
- **Secret**: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as repo or org-level GH Actions secrets. Per `Code.md §5` (release-publishing secret consolidation), prefer **org-level** secret if Cloudflare credentials are reused across `convergent-systems-co` repos; per-repo only if scoping requires it. *Open question for the user: are these already configured at the org level for theme-atoms / brand-atoms?*
- **Preview deploys**: on PRs (default Wrangler behavior).

### Accessibility & performance (Code.md §10.1 / §10.2)

Inherited from theme-atoms's setup. v0.1 target: WCAG 2.1 AA on the landing and detail pages, Core Web Vitals within Code.md §10.2 thresholds on a static page with no large images. Atom-browser interactivity (React filter) is the one place performance budget needs explicit attention; defer interactivity to client islands and keep initial render server-static.

---

## 5. Schemas & tooling

### `schemas/composition-v1.json` (per catalog)

Same skeleton in both. Discriminated by parent dir (`prompts/` vs `agents/`).

```
required: schema, type, id, version, name, references

  schema      const  → "https://<catalog>.com/schemas/composition-v1.json"
  type        enum   → ["prompt", "agent"]   (per catalog: locked to one value)
  id          slug   → same regex as atoms
  version     semver
  name        string ≤ 80
  description string ≤ 500 (optional)
  references  object:
    persona              ref → atoms/persona/<id>          (1, required)
    constraints          array<ref>                         (0..N) — prompt only
    format_instruction   ref                                (0..1) — prompt only
    tool_use_template    ref                                (0..1) — prompt only
    refusal_patterns     array<ref>                         (0..N) — prompt only
    output_schema        ref                                (0..1) — prompt only
    tools                array<ref>                         (0..N) — agent only
    capabilities         array<ref>                         (0..N) — agent only
    role_boundaries      array<ref>                         (0..N) — agent only
    isolation            ref                                (1, required) — agent only
  tags        array<string>
  vendors     same enum as atom-v1

ref shape: {"ref": "<catalog>://atoms/<type>/<id>", "version": "<semver|^semver|~semver>"}
```

The validator resolves each ref against the local tree and verifies the version constraint matches the target atom's `version`.

### `schemas/rule-v1.json` (per catalog)

```
required: schema, type, id, version, name, predicate, effect

  type       enum   → catalog-specific:
                      prompt-atoms: ["model-compatibility", "token-length-constraint",
                                     "format-compatibility"]
                      agent-atoms : ["capability-grant", "isolation-rule",
                                     "communication-pattern", "supervision-hierarchy"]
  predicate  object → {subject_ref, condition, value}
  effect     enum   → ["require", "forbid", "warn"]
  rationale  string ≤ 500
```

### `scripts/build-exports.py` (per catalog)

Behavior:

1. Walk `atoms/`, `prompts/` or `agents/`, `rules/`.
2. For each file, validate against the appropriate schema.
3. Resolve every composition `ref` against the local tree.
4. Assemble `exports/catalog.json`:

   ```json
   {
     "catalog": "prompt-atoms",
     "version": "0.1.0",
     "built_at": "<UTC ISO-8601>",
     "atoms": [...],
     "compositions": [...],
     "rules": [...]
   }
   ```

5. Exit 0 on full pass, 1 on any validation/ref error.

No external deps beyond `jsonschema` (already required by `validate.py`).

### `scripts/validate.py` extension

Same entry point. Dispatches by directory:

- `atoms/<type>/*.json` → `atom-v1.json`
- `prompts/*.json` / `agents/*.json` → `composition-v1.json` + ref resolution
- `rules/<type>/*.json` → `rule-v1.json`

CI hook: runs in existing GH Actions on every PR. No new workflow needed.

---

## 6. PR / commit / merge flow

- **Branch name** (both catalogs): `feat/v0.1-completion`
- **PR title** (both): `feat(v0.1): complete bootstrap — compositions, rules, exports`
- **PR body**: links this spec, lists atom-count deltas, lists the two compositions, calls out Olympus and signing as deferred.
- **Merge style**: squash-merge (matches existing PR history — `#13`, `#14`, `#15` all squash-merged).
- **Umbrella bump**: after both PRs merge, single commit on `atoms/` main: `chore: bump prompt-atoms + agent-atoms — v0.1 complete`. Pushed directly to main, matching the umbrella's existing pattern.

### Approval gates I will hit and ask explicit yes for

Each gate is independent per `Common.md §2.3` (no blanket prior approvals).

1. Before `git push` of the `feat/v0.1-completion` branch on `prompt-atoms` (the push itself is the first external action — the branch becomes visible on `github.com`).
2. Before `gh pr create` on `prompt-atoms`.
3. Before adding the CF Pages GitHub Actions secrets if they aren't already at org level (involves writing credentials into GitHub repo settings).
4. Before `git push` of the `feat/v0.1-completion` branch on `agent-atoms`.
5. Before `gh pr create` on `agent-atoms`.
6. Before `git push` of the umbrella bump commit on `atoms/`.
7. Before each Cloudflare Pages production deploy if triggered manually (vs auto-on-merge).

All local commits inside the feature branches are autonomous (`Common.md §2.1`); only the boundary-crossing operations (push, PR open, CF deploy, secret writes) require approval.

---

## 7. Out of scope & deferred

- **Olympus integration** — Hermes routing pull, Pantheon-Module-as-composition. *Deferred — external dependency.*
- **aish intent classification pull** — same.
- **`xaips` proposals** — schemas authored directly; after-the-fact XAIP filing is v0.2 work.
- **Signed exports** — no signing infra in either repo. Unsigned `exports/catalog.json` ships; signing in v0.2.
- **Cross-catalog `see_also`** — schema regex restricts to the same catalog. Widening to a `prompt-atoms://`/`agent-atoms://` cross-prefix scheme is v0.2.
- **`xdao.co` updates** — listing the catalogs on the federation portal is a separate PR against `convergent-systems-co/xdao`.
- **Visual polish on the web/ apps** — v0.1 ships functional pages with theme-atoms's existing styling. Design refinement, branding, and any catalog-specific visual identity are v0.2.
- **`persona/peer-programmer`**, Claude-specific XML tool-tag template, redundant citation constraints — see §3 exclusions.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Atom counts hit numerically but quality is filler | Composition-driven authoring: every atom either serves one of the seed compositions or fills a clearly-justified type-count gap. No atoms are added "to round out the number." |
| Schema authored here drifts from `atoms-spec` v1 (external repo) | Use the same shape and `$id` pattern as `atom-v1.json`; flag any divergence in the PR body for `atoms-spec` follow-up. |
| Composition ref resolution is more complex than expected (semver matching) | v0.1 ships with exact-match only (`"version": "1.0.0"`). SemVer constraint matching (`"^1.0.0"`) is v0.2. |
| Cross-repo coordination (one PR per child + umbrella bump) is error-prone | Strict ordering in §6: prompt-atoms PR merges first, then agent-atoms, then umbrella bump. Each step is an explicit approval gate. |
| Tool ecosystem changes (e.g., `gh` CLI auth) break PR creation | Existing `~/.ai/Common.md §4.7` per-repo credential helper convention applies; verify with `gh auth status --hostname github.com` before each push. |
| Astro 6 / React 19 toolchain churn during this work | Pin to exact versions of theme-atoms's working setup; commit `pnpm-lock.yaml`; verify `pnpm build` succeeds locally before each web/ commit. |
| CF Pages deploy fails on first push (missing secrets, missing domain attachment) | First deploy targets a `*.pages.dev` URL (always works); custom domain attachment is a separate manual step in the CF dashboard, out of the PR's critical path. PR can merge with the catalog reachable on `prompt-atoms.pages.dev` even if `prompt-atoms.com` isn't attached yet. |
| Web/ app and catalog data drift (atom added but copy script doesn't run) | `web/scripts/copy-catalog.mjs` runs as `prebuild` (matches theme-atoms). Build fails if files are missing. CI builds the web app on PR; mismatch is caught before merge. |

---

## Dependencies

- `jsonschema` Python package (already used by `validate.py` in both catalogs).
- `gh` CLI for PR creation (already used per existing PR history).
- `git` submodule discipline in the umbrella repo (already in use).
- `pnpm` + Node.js 20+ for the `web/` Astro app (matches theme-atoms requirements).
- Cloudflare account with Pages enabled and `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` available (org or per-repo GH Actions secrets).
- Custom domains `prompt-atoms.com` and `agent-atoms.com` either already registered or in-flight registration; DNS pointing at Cloudflare is a separate manual step.

No new code-level external dependencies introduced; web/ deps mirror theme-atoms exactly.
