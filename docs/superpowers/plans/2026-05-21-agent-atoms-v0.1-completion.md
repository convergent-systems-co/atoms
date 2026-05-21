# agent-atoms v0.1 Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete `agent-atoms` v0.1: 38 new seed atoms + composition/rule schemas + 2 compositions + 2 rules + exports/catalog.json + Astro web app + Terraform-managed Cloudflare Pages project + Cloudflare Pages deploy, shipped as one PR against `convergent-systems-co/agent-atoms`. The umbrella `atoms/` submodule bump (both prompt-atoms and agent-atoms together) ships as a follow-up commit on `atoms/main` after this PR merges.

**Architecture:** Same shape as prompt-atoms v0.1 (see `docs/superpowers/plans/2026-05-21-prompt-atoms-v0.1-completion.md` and the merged PR https://github.com/convergent-systems-co/prompt-atoms/pull/14 for the reference implementation). Differences specific to agent-atoms are called out per task.

**Key differences from Plan A (prompt-atoms):**

| Aspect | prompt-atoms | agent-atoms |
|--------|--------------|-------------|
| Atom schema | `content` string + `vendors` array per atom | type-specific objects (`persona_profile`, `tool_spec`, `capability`, `boundary`, `isolation`); no `vendors` field |
| Composition `type` | `prompt` | `agent` |
| Composition refs | persona, constraints, format_instruction, tool_use_template, refusal_patterns, output_schema | persona, tools, capabilities, role_boundaries, isolation |
| Composition dir | `prompts/` | `agents/` |
| Rule types | model-compatibility, token-length-constraint, format-compatibility | capability-grant, isolation-rule, communication-pattern, supervision-hierarchy |
| Catalog domain | prompt-atoms.com | agent-atoms.com |
| CF Pages project | prompt-atoms | agent-atoms |
| State key | `state-bucket/convergent-systems-co/prompt-atoms/pages-project.tfstate` | `state-bucket/convergent-systems-co/agent-atoms/pages-project.tfstate` |

**Sequencing change vs Plan A:** TF apply happens **before** the PR push so CI is green on the first run, not red→green. The PR includes the `infra/` directory but the CF project already exists when CI fires.

**Tech Stack:** JSON Schema (Draft 2020-12), Python 3.11+ with `jsonschema`, Node 22+, pnpm, Astro 6.1.10, React 19, Wrangler 4, GitHub Actions, Cloudflare Pages, OpenTofu 1.6+, Cloudflare provider ~> 5.0.

**Working directory for all tasks:** `/Users/itsfwcp/workspace/convergent-system-co/atoms/agent-atoms/` unless otherwise noted.

**Branch:** `feat/v0.1-completion` (created in Task 1).

**Approval gates:** Tasks marked **[GATE]** require explicit user `yes` before the boundary-crossing step.

---

## File Structure

### Created in this plan

```
agent-atoms/
├── schemas/
│   ├── composition-v1.json              (Task 2)
│   └── rule-v1.json                     (Task 3)
├── scripts/
│   └── build-exports.py                 (Task 5)
├── atoms/
│   ├── persona/                  (+8)   (Task 6)
│   ├── tool-definition/         (+18)   (Task 7)
│   ├── capability-declaration/   (+6)   (Task 8)
│   ├── role-boundary/            (+3)   (Task 9)
│   └── isolation-constraint/     (+3)   (Task 10)
├── agents/
│   ├── code-reviewer.json               (Task 11)
│   └── runbook-executor.json            (Task 11)
├── rules/
│   ├── capability-grant/exec-requires-isolation.json   (Task 12)
│   └── isolation-rule/network-write-requires-allowlist.json (Task 12)
├── exports/
│   └── catalog.json                     (Task 13)
├── web/                                 (Tasks 14-19)
│   ├── package.json, astro.config.mjs, tsconfig.json
│   ├── scripts/copy-catalog.mjs
│   ├── public/_headers
│   └── src/{layouts,components,pages}/*
├── .github/workflows/deploy.yml         (Task 20)
└── infra/cloudflare/pages-project/      (Task 21)
    ├── versions.tf, providers.tf, variables.tf, main.tf, outputs.tf
    ├── terraform.tfvars.example
    └── README.md
```

### Modified

- `scripts/validate.py` (Task 4 — extended for compositions + rules)

---

## Task 1: Create feature branch

**Files:** none.

- [ ] **Step 1: Verify clean working tree**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms/agent-atoms
git status
```

Expected: `nothing to commit, working tree clean` or untracked files only.

- [ ] **Step 2: Pull latest main**

```bash
git checkout main && git pull origin main
```

- [ ] **Step 3: Create feature branch**

```bash
git checkout -b feat/v0.1-completion
```

---

## Task 2: Author `schemas/composition-v1.json`

**Files:** Create `schemas/composition-v1.json`.

- [ ] **Step 1: Write file**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://agent-atoms.com/schemas/composition-v1.json",
  "title": "agent-atoms v1 composition",
  "description": "An agent composition assembling persona + tools + capabilities + role boundaries + isolation into a complete agent definition.",
  "type": "object",
  "required": ["schema", "type", "id", "version", "name", "references"],
  "additionalProperties": false,
  "properties": {
    "schema": {
      "type": "string",
      "const": "https://agent-atoms.com/schemas/composition-v1.json"
    },
    "type": { "type": "string", "const": "agent" },
    "id": { "type": "string", "pattern": "^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$" },
    "version": { "type": "string", "pattern": "^[0-9]+\\.[0-9]+\\.[0-9]+(?:-[A-Za-z0-9.-]+)?$" },
    "name": { "type": "string", "minLength": 1, "maxLength": 80 },
    "description": { "type": "string", "maxLength": 500 },
    "tags": { "type": "array", "items": { "type": "string", "minLength": 1, "maxLength": 40 }, "uniqueItems": true },
    "references": {
      "type": "object",
      "required": ["persona", "isolation"],
      "additionalProperties": false,
      "properties": {
        "persona":         { "$ref": "#/$defs/ref" },
        "tools":           { "type": "array", "items": { "$ref": "#/$defs/ref" }, "uniqueItems": true },
        "capabilities":    { "type": "array", "items": { "$ref": "#/$defs/ref" }, "uniqueItems": true },
        "role_boundaries": { "type": "array", "items": { "$ref": "#/$defs/ref" }, "uniqueItems": true },
        "isolation":       { "$ref": "#/$defs/ref" }
      }
    }
  },
  "$defs": {
    "ref": {
      "type": "object",
      "required": ["ref", "version"],
      "additionalProperties": false,
      "properties": {
        "ref":     { "type": "string", "pattern": "^agent-atoms://atoms/[a-z-]+/[a-z0-9-]+$" },
        "version": { "type": "string", "pattern": "^[0-9]+\\.[0-9]+\\.[0-9]+(?:-[A-Za-z0-9.-]+)?$" }
      }
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add schemas/composition-v1.json
git commit -m "feat(schema): add composition-v1.json — typed composition contract

Agent compositions assemble persona + tools + capabilities + role
boundaries + isolation. References use agent-atoms:// URIs with
exact-version pinning. persona and isolation are required; tools /
capabilities / role_boundaries are optional arrays."
```

---

## Task 3: Author `schemas/rule-v1.json`

**Files:** Create `schemas/rule-v1.json`.

- [ ] **Step 1: Write file**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://agent-atoms.com/schemas/rule-v1.json",
  "title": "agent-atoms v1 rule",
  "description": "A rule constrains how atoms and compositions can be combined. Examples: capability-grant, isolation-rule, communication-pattern, supervision-hierarchy.",
  "type": "object",
  "required": ["schema", "type", "id", "version", "name", "predicate", "effect"],
  "additionalProperties": false,
  "properties": {
    "schema": { "type": "string", "const": "https://agent-atoms.com/schemas/rule-v1.json" },
    "type": {
      "type": "string",
      "enum": ["capability-grant", "isolation-rule", "communication-pattern", "supervision-hierarchy"]
    },
    "id": { "type": "string", "pattern": "^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$" },
    "version": { "type": "string", "pattern": "^[0-9]+\\.[0-9]+\\.[0-9]+(?:-[A-Za-z0-9.-]+)?$" },
    "name": { "type": "string", "minLength": 1, "maxLength": 80 },
    "description": { "type": "string", "maxLength": 500 },
    "tags": { "type": "array", "items": { "type": "string", "minLength": 1, "maxLength": 40 }, "uniqueItems": true },
    "predicate": {
      "type": "object",
      "required": ["subject_ref", "condition", "value"],
      "additionalProperties": false,
      "properties": {
        "subject_ref": { "type": "string", "pattern": "^agent-atoms://(atoms|agents|rules)/[a-z-]+(?:/[a-z0-9-]+)?$" },
        "condition": { "type": "string", "enum": ["eq", "neq", "in", "not_in", "gte", "lte", "matches"] },
        "value": {}
      }
    },
    "effect": { "type": "string", "enum": ["require", "forbid", "warn"] },
    "rationale": { "type": "string", "maxLength": 500 }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add schemas/rule-v1.json
git commit -m "feat(schema): add rule-v1.json — typed rule contract

Rules use a predicate {subject_ref, condition, value} + effect tuple.
Four rule types for v0.1: capability-grant, isolation-rule,
communication-pattern, supervision-hierarchy."
```

---

## Task 4: Extend `scripts/validate.py`

**Files:** Modify `scripts/validate.py`.

- [ ] **Step 1: Replace with this content (identical to prompt-atoms shape, only catalog name and URI prefix change)**

```python
#!/usr/bin/env python3
"""Validate every atom, composition, and rule against its schema.

Per-file checks:
  atoms/<type>/<id>.json       → atom-v1.json; id == filename stem; type == parent dir
  agents/<id>.json             → composition-v1.json; id == filename stem
  rules/<type>/<id>.json       → rule-v1.json; id == filename stem; type == parent dir

Composition references are resolved against the local tree; a missing or
version-mismatched ref is an error.

Exit 0 on full pass; exit 1 on any failure.
"""
import json
import sys
from pathlib import Path

try:
    import jsonschema
except ImportError:
    print("error: jsonschema not installed. Run: pip install jsonschema", file=sys.stderr)
    sys.exit(2)

REPO = Path(__file__).resolve().parent.parent
SCHEMAS = {
    "atom":        REPO / "schemas" / "atom-v1.json",
    "composition": REPO / "schemas" / "composition-v1.json",
    "rule":        REPO / "schemas" / "rule-v1.json",
}
ATOMS_DIR        = REPO / "atoms"
COMPOSITIONS_DIR = REPO / "agents"
RULES_DIR        = REPO / "rules"


def load_validator(kind: str) -> jsonschema.Draft202012Validator:
    schema = json.loads(SCHEMAS[kind].read_text(encoding="utf-8"))
    return jsonschema.Draft202012Validator(schema)


def validate_atoms(validator) -> tuple[int, dict]:
    errors = 0
    atom_index: dict[str, dict] = {}
    for path in sorted(ATOMS_DIR.rglob("*.json")):
        rel = path.relative_to(REPO)
        local_errors = _validate_one(path, rel, validator)
        if not local_errors:
            data = json.loads(path.read_text(encoding="utf-8"))
            parent = path.parent.name
            if data.get("type") != parent:
                print(f"✗ {rel}")
                print(f"    type={data.get('type')!r} does not match parent dir {parent!r}")
                local_errors += 1
            else:
                key = f"agent-atoms://atoms/{parent}/{data['id']}"
                atom_index[key] = data
                print(f"✓ {rel}")
        errors += local_errors
    return errors, atom_index


def validate_compositions(validator, atom_index: dict) -> int:
    errors = 0
    for path in sorted(COMPOSITIONS_DIR.glob("*.json")):
        rel = path.relative_to(REPO)
        local_errors = _validate_one(path, rel, validator)
        if not local_errors:
            data = json.loads(path.read_text(encoding="utf-8"))
            local_errors += _resolve_refs(data, atom_index, rel)
        if local_errors == 0:
            print(f"✓ {rel}")
        errors += local_errors
    return errors


def validate_rules(validator) -> int:
    errors = 0
    for path in sorted(RULES_DIR.rglob("*.json")):
        rel = path.relative_to(REPO)
        local_errors = _validate_one(path, rel, validator)
        if not local_errors:
            data = json.loads(path.read_text(encoding="utf-8"))
            parent = path.parent.name
            if data.get("type") != parent:
                print(f"✗ {rel}")
                print(f"    type={data.get('type')!r} does not match parent dir {parent!r}")
                local_errors += 1
            else:
                print(f"✓ {rel}")
        errors += local_errors
    return errors


def _validate_one(path: Path, rel: Path, validator) -> int:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        print(f"✗ {rel}: invalid JSON ({e})")
        return 1
    schema_errors = list(validator.iter_errors(data))
    if schema_errors:
        print(f"✗ {rel}")
        for err in schema_errors:
            loc = "/".join(str(x) for x in err.absolute_path) or "<root>"
            print(f"    schema: {err.message} at {loc}")
        return len(schema_errors)
    if data.get("id") != path.stem:
        print(f"✗ {rel}")
        print(f"    id={data.get('id')!r} does not match filename stem {path.stem!r}")
        return 1
    return 0


def _resolve_refs(composition: dict, atom_index: dict, rel: Path) -> int:
    errors = 0
    refs = composition.get("references", {})
    flat: list[dict] = []
    for key, value in refs.items():
        if isinstance(value, list):
            flat.extend(value)
        elif isinstance(value, dict):
            flat.append(value)
    for ref_obj in flat:
        target = ref_obj.get("ref")
        want_version = ref_obj.get("version")
        atom = atom_index.get(target)
        if atom is None:
            print(f"✗ {rel}")
            print(f"    ref unresolved: {target}")
            errors += 1
            continue
        if atom.get("version") != want_version:
            print(f"✗ {rel}")
            print(f"    ref {target} requires version {want_version}; atom is at {atom.get('version')}")
            errors += 1
    return errors


def main() -> int:
    if not SCHEMAS["atom"].exists():
        print(f"missing schema: {SCHEMAS['atom']}", file=sys.stderr)
        return 1

    atom_v = load_validator("atom")
    atom_errors, atom_index = validate_atoms(atom_v)

    composition_errors = 0
    if SCHEMAS["composition"].exists() and COMPOSITIONS_DIR.exists():
        composition_errors = validate_compositions(load_validator("composition"), atom_index)

    rule_errors = 0
    if SCHEMAS["rule"].exists() and RULES_DIR.exists():
        rule_errors = validate_rules(load_validator("rule"))

    total = atom_errors + composition_errors + rule_errors
    if total:
        print(f"\n{total} error(s)")
        return 1
    print(f"\nall valid")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Verify no regression**

```bash
python3 scripts/validate.py
```

Expected: ✓ for each existing 10 atoms; `all valid`.

- [ ] **Step 3: Commit**

```bash
git add scripts/validate.py
git commit -m "test(validate): extend validator for compositions and rules

Single entry point dispatches by directory:
  atoms/<type>/*.json → atom-v1.json
  agents/*.json       → composition-v1.json + ref resolution
  rules/<type>/*.json → rule-v1.json"
```

---

## Task 5: Author `scripts/build-exports.py`

**Files:** Create `scripts/build-exports.py`.

- [ ] **Step 1: Write file (catalog name and composition dir adapted from Plan A)**

```python
#!/usr/bin/env python3
"""Build exports/catalog.json from validated atoms, compositions, and rules.

Walks atoms/, agents/, rules/; validates each against its schema; assembles
a single machine-readable catalog manifest. Exits 1 on validation failure.
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import jsonschema
except ImportError:
    print("error: jsonschema not installed. Run: pip install jsonschema", file=sys.stderr)
    sys.exit(2)

REPO = Path(__file__).resolve().parent.parent
SCHEMA_DIR = REPO / "schemas"
ATOMS_DIR = REPO / "atoms"
COMPOSITIONS_DIR = REPO / "agents"
RULES_DIR = REPO / "rules"
EXPORT_PATH = REPO / "exports" / "catalog.json"
CATALOG_NAME = "agent-atoms"
CATALOG_VERSION = "0.1.0"


def load_validator(name: str) -> jsonschema.Draft202012Validator:
    schema = json.loads((SCHEMA_DIR / name).read_text(encoding="utf-8"))
    return jsonschema.Draft202012Validator(schema)


def collect(dir_path: Path, validator, label: str) -> list[dict]:
    if not dir_path.exists():
        return []
    out: list[dict] = []
    for path in sorted(dir_path.rglob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        errors = list(validator.iter_errors(data))
        if errors:
            print(f"✗ {path.relative_to(REPO)} ({label}):", file=sys.stderr)
            for err in errors:
                loc = "/".join(str(x) for x in err.absolute_path) or "<root>"
                print(f"    {err.message} at {loc}", file=sys.stderr)
            sys.exit(1)
        out.append(data)
    return out


def main() -> int:
    atoms = collect(ATOMS_DIR, load_validator("atom-v1.json"), "atom")
    compositions = collect(COMPOSITIONS_DIR, load_validator("composition-v1.json"), "composition")
    rules = collect(RULES_DIR, load_validator("rule-v1.json"), "rule")

    catalog = {
        "catalog": CATALOG_NAME,
        "version": CATALOG_VERSION,
        "built_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "atoms": atoms,
        "compositions": compositions,
        "rules": rules,
    }

    EXPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    EXPORT_PATH.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {EXPORT_PATH.relative_to(REPO)} — {len(atoms)} atoms, {len(compositions)} compositions, {len(rules)} rules")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Commit (don't run yet — catalog incomplete)**

```bash
git add scripts/build-exports.py
git commit -m "feat(scripts): add build-exports.py — catalog.json builder

Walks atoms/, agents/, rules/; validates each file; assembles
exports/catalog.json. Exits 1 on validation failure. No external
deps beyond jsonschema."
```

---

## Task 6: Write 8 new persona atoms

**Files:** Create 8 files under `atoms/persona/`.

Each persona has the agent-atoms-specific `persona_profile` object (not a `content` string like prompt-atoms personas).

- [ ] **Step 1: Write `atoms/persona/research-agent.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "persona",
  "id": "research-agent",
  "version": "1.0.0",
  "name": "Research Agent",
  "description": "Multi-step research agent. Decomposes queries, hits sources, synthesizes with provenance discipline.",
  "tags": ["research", "synthesis", "citations"],
  "persona_profile": {
    "role": "Research synthesizer",
    "expertise": ["source-evaluation", "citation-discipline", "multi-hop-search"],
    "voice": "Calm, precise. Names every source. Surfaces unresolved questions.",
    "planner": "plan-and-execute",
    "memory_model": "scratchpad",
    "supervisor": "none"
  }
}
```

- [ ] **Step 2: Write `atoms/persona/planner-agent.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "persona",
  "id": "planner-agent",
  "version": "1.0.0",
  "name": "Planner Agent",
  "description": "Decomposition-first agent. Builds Alternatives Tables, sequences work, surfaces risk before any execution.",
  "tags": ["planning", "decomposition"],
  "persona_profile": {
    "role": "Implementation planner",
    "expertise": ["work-decomposition", "risk-assessment", "alternatives-analysis"],
    "voice": "Structured. Always names the alternatives considered. Refuses to recommend without showing tradeoffs.",
    "planner": "tree-of-thoughts",
    "memory_model": "long-term",
    "supervisor": "none"
  }
}
```

- [ ] **Step 3: Write `atoms/persona/docs-writer-agent.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "persona",
  "id": "docs-writer-agent",
  "version": "1.0.0",
  "name": "Docs Writer Agent",
  "description": "Documentation-drafting agent. Names the audience, defines jargon, keeps examples runnable.",
  "tags": ["documentation", "writing"],
  "persona_profile": {
    "role": "Technical documentation author",
    "expertise": ["audience-targeting", "code-sample-curation", "information-architecture"],
    "voice": "Active voice, short sentences, audience-tagged.",
    "planner": "plan-and-execute",
    "memory_model": "short-term",
    "supervisor": "none"
  }
}
```

- [ ] **Step 4: Write `atoms/persona/debug-agent.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "persona",
  "id": "debug-agent",
  "version": "1.0.0",
  "name": "Debug Agent",
  "description": "Five-phase systematic debugger. Reproduce → isolate → root cause → fix with regression test → verify.",
  "tags": ["debugging", "engineering"],
  "persona_profile": {
    "role": "Systematic debugger",
    "expertise": ["reproduction-recipes", "binary-search-isolation", "root-cause-analysis"],
    "voice": "Methodical. Refuses to propose a fix without a reliable reproduction.",
    "planner": "react",
    "memory_model": "scratchpad",
    "supervisor": "none"
  }
}
```

- [ ] **Step 5: Write `atoms/persona/data-pipeline-agent.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "persona",
  "id": "data-pipeline-agent",
  "version": "1.0.0",
  "name": "Data Pipeline Agent",
  "description": "ETL / batch processing agent. Idempotency-disciplined: every step is restartable, every write is checkpointed.",
  "tags": ["data", "etl", "pipelines"],
  "persona_profile": {
    "role": "Batch / streaming pipeline operator",
    "expertise": ["idempotency", "checkpoint-design", "schema-evolution"],
    "voice": "Pragmatic. States preconditions and effects. Treats every write as a transaction.",
    "planner": "plan-and-execute",
    "memory_model": "long-term",
    "supervisor": "none"
  }
}
```

- [ ] **Step 6: Write `atoms/persona/refactor-agent.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "persona",
  "id": "refactor-agent",
  "version": "1.0.0",
  "name": "Refactor Agent",
  "description": "Behavior-preserving refactor agent. If it finds a bug, it files it separately — never bundles a fix into a refactor.",
  "tags": ["refactor", "engineering"],
  "persona_profile": {
    "role": "Behavior-preserving refactor",
    "expertise": ["test-equivalence", "code-smell-detection", "incremental-restructuring"],
    "voice": "Surgical. Cites tests as the contract. Files bugs separately when discovered.",
    "planner": "plan-and-execute",
    "memory_model": "short-term",
    "supervisor": "none"
  }
}
```

- [ ] **Step 7: Write `atoms/persona/triage-agent.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "persona",
  "id": "triage-agent",
  "version": "1.0.0",
  "name": "Triage Agent",
  "description": "Bug-triage agent. Searches for duplicates before filing; creates well-structured tickets with reproduction + context.",
  "tags": ["triage", "issue-management"],
  "persona_profile": {
    "role": "Issue triager",
    "expertise": ["duplicate-detection", "issue-templates", "reproducer-distillation"],
    "voice": "Concise. Always checks for duplicates first. Links related issues.",
    "planner": "react",
    "memory_model": "vector",
    "supervisor": "none"
  }
}
```

- [ ] **Step 8: Write `atoms/persona/test-writer-agent.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "persona",
  "id": "test-writer-agent",
  "version": "1.0.0",
  "name": "Test Writer Agent",
  "description": "TDD-discipline agent. Writes the failing test first, watches it fail, writes the minimal impl, watches it pass.",
  "tags": ["testing", "tdd"],
  "persona_profile": {
    "role": "Test-driven development practitioner",
    "expertise": ["red-green-refactor", "test-naming", "coverage-gap-analysis"],
    "voice": "Disciplined. Refuses to write impl before the failing test exists.",
    "planner": "react",
    "memory_model": "scratchpad",
    "supervisor": "none"
  }
}
```

- [ ] **Step 9: Validate and commit**

```bash
python3 scripts/validate.py | tail -3
git add atoms/persona/
git commit -m "feat(atoms): 8 new persona atoms — round persona type to v0.1 seed (10)

research-agent, planner-agent, docs-writer-agent, debug-agent,
data-pipeline-agent, refactor-agent, triage-agent, test-writer-agent.
Each names one clear role + planner + memory model with no overlap."
```

---

## Task 7: Write 18 new tool-definition atoms

**Files:** Create 18 files under `atoms/tool-definition/`.

Each tool has the agent-atoms-specific `tool_spec` object.

- [ ] **Step 1: Write `atoms/tool-definition/list-dir.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "tool-definition",
  "id": "list-dir",
  "version": "1.0.0",
  "name": "list-dir",
  "description": "List entries in a directory. Read-only.",
  "tool_spec": {
    "function_name": "list_dir",
    "summary": "Return the names of entries in a directory.",
    "parameters": {
      "path": { "type": "string", "description": "Directory path", "required": true },
      "recursive": { "type": "boolean", "description": "Recurse into subdirs", "required": false }
    },
    "returns": { "type": "array", "description": "Entry names (strings)." },
    "side_effects": ["fs-read"]
  }
}
```

- [ ] **Step 2: Write `atoms/tool-definition/grep.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "tool-definition",
  "id": "grep",
  "version": "1.0.0",
  "name": "grep",
  "description": "Pattern search across files. Returns matching lines with file:line locations.",
  "tool_spec": {
    "function_name": "grep",
    "summary": "Search for a regex pattern across files.",
    "parameters": {
      "pattern": { "type": "string", "description": "Regex to match", "required": true },
      "path": { "type": "string", "description": "Root path or file", "required": true },
      "case_insensitive": { "type": "boolean", "description": "Ignore case", "required": false },
      "max_matches": { "type": "number", "description": "Cap on returned matches", "required": false }
    },
    "returns": { "type": "array", "description": "Match objects {file, line, text}." },
    "side_effects": ["fs-read"]
  }
}
```

- [ ] **Step 3: Write `atoms/tool-definition/glob.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "tool-definition",
  "id": "glob",
  "version": "1.0.0",
  "name": "glob",
  "description": "Enumerate paths matching a glob pattern.",
  "tool_spec": {
    "function_name": "glob",
    "summary": "Return paths matching a glob.",
    "parameters": {
      "pattern": { "type": "string", "description": "Glob pattern", "required": true },
      "root": { "type": "string", "description": "Root path", "required": false }
    },
    "returns": { "type": "array", "description": "Matching paths." },
    "side_effects": ["fs-read"]
  }
}
```

- [ ] **Step 4: Write `atoms/tool-definition/stat.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "tool-definition",
  "id": "stat",
  "version": "1.0.0",
  "name": "stat",
  "description": "File metadata: size, mtime, mode, type.",
  "tool_spec": {
    "function_name": "stat",
    "summary": "Return metadata for a path.",
    "parameters": {
      "path": { "type": "string", "description": "File or directory path", "required": true }
    },
    "returns": { "type": "object", "description": "Metadata fields." },
    "side_effects": ["fs-read"]
  }
}
```

- [ ] **Step 5: Write `atoms/tool-definition/git-log.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "tool-definition",
  "id": "git-log",
  "version": "1.0.0",
  "name": "git-log",
  "description": "Commit history for a ref / path.",
  "tool_spec": {
    "function_name": "git_log",
    "summary": "Return commits for a ref or path.",
    "parameters": {
      "ref": { "type": "string", "description": "Ref to log (default: HEAD)", "required": false },
      "path": { "type": "string", "description": "Restrict to path", "required": false },
      "limit": { "type": "number", "description": "Max commits", "required": false }
    },
    "returns": { "type": "array", "description": "Commit objects {sha, author, date, subject}." },
    "side_effects": ["fs-read", "exec"]
  }
}
```

- [ ] **Step 6: Write `atoms/tool-definition/git-status.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "tool-definition",
  "id": "git-status",
  "version": "1.0.0",
  "name": "git-status",
  "description": "Working tree status — staged, modified, untracked.",
  "tool_spec": {
    "function_name": "git_status",
    "summary": "Return the working tree status.",
    "parameters": {},
    "returns": { "type": "object", "description": "Status grouped by category." },
    "side_effects": ["fs-read", "exec"]
  }
}
```

- [ ] **Step 7: Write `atoms/tool-definition/git-blame.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "tool-definition",
  "id": "git-blame",
  "version": "1.0.0",
  "name": "git-blame",
  "description": "Per-line authorship for a file.",
  "tool_spec": {
    "function_name": "git_blame",
    "summary": "Annotate each line with its last commit.",
    "parameters": {
      "path": { "type": "string", "description": "File path", "required": true },
      "rev": { "type": "string", "description": "Revision to blame (default: HEAD)", "required": false }
    },
    "returns": { "type": "array", "description": "Annotated lines." },
    "side_effects": ["fs-read", "exec"]
  }
}
```

- [ ] **Step 8: Write `atoms/tool-definition/git-show.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "tool-definition",
  "id": "git-show",
  "version": "1.0.0",
  "name": "git-show",
  "description": "Detail for a single commit — message, files, diff.",
  "tool_spec": {
    "function_name": "git_show",
    "summary": "Return the detail of a commit.",
    "parameters": {
      "sha": { "type": "string", "description": "Commit SHA or ref", "required": true }
    },
    "returns": { "type": "object", "description": "Commit detail with diff." },
    "side_effects": ["fs-read", "exec"]
  }
}
```

- [ ] **Step 9: Write `atoms/tool-definition/http-fetch.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "tool-definition",
  "id": "http-fetch",
  "version": "1.0.0",
  "name": "http-fetch",
  "description": "HTTP GET. Returns body and status.",
  "tool_spec": {
    "function_name": "http_fetch",
    "summary": "Perform an HTTP GET.",
    "parameters": {
      "url": { "type": "string", "description": "URL to fetch", "required": true },
      "headers": { "type": "object", "description": "Optional request headers", "required": false }
    },
    "returns": { "type": "object", "description": "{status, headers, body}." },
    "side_effects": ["network"]
  }
}
```

- [ ] **Step 10: Write `atoms/tool-definition/http-post.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "tool-definition",
  "id": "http-post",
  "version": "1.0.0",
  "name": "http-post",
  "description": "HTTP POST / PUT / PATCH / DELETE. Side-effecting.",
  "tool_spec": {
    "function_name": "http_post",
    "summary": "Perform a side-effecting HTTP request.",
    "parameters": {
      "url": { "type": "string", "description": "URL", "required": true },
      "method": { "type": "string", "description": "POST / PUT / PATCH / DELETE", "required": true },
      "body": { "type": "string", "description": "Request body", "required": false },
      "headers": { "type": "object", "description": "Request headers", "required": false }
    },
    "returns": { "type": "object", "description": "{status, headers, body}." },
    "side_effects": ["network"]
  }
}
```

- [ ] **Step 11: Write `atoms/tool-definition/bash-exec.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "tool-definition",
  "id": "bash-exec",
  "version": "1.0.0",
  "name": "bash-exec",
  "description": "Execute a shell command. Gated by capability/exec-with-approval and isolation/container-with-allowlist or stricter.",
  "tool_spec": {
    "function_name": "bash_exec",
    "summary": "Execute a bash command.",
    "parameters": {
      "command": { "type": "string", "description": "Command line to run", "required": true },
      "timeout_ms": { "type": "number", "description": "Max runtime in ms", "required": false }
    },
    "returns": { "type": "object", "description": "{stdout, stderr, exit_code}." },
    "side_effects": ["exec"]
  }
}
```

- [ ] **Step 12: Write `atoms/tool-definition/file-write.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "tool-definition",
  "id": "file-write",
  "version": "1.0.0",
  "name": "file-write",
  "description": "Create or overwrite a file. Side-effecting.",
  "tool_spec": {
    "function_name": "file_write",
    "summary": "Write content to a file path.",
    "parameters": {
      "path": { "type": "string", "description": "Destination path", "required": true },
      "content": { "type": "string", "description": "Bytes / UTF-8 content", "required": true }
    },
    "returns": { "type": "object", "description": "{path, bytes_written}." },
    "side_effects": ["fs-write"]
  }
}
```

- [ ] **Step 13: Write `atoms/tool-definition/file-edit.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "tool-definition",
  "id": "file-edit",
  "version": "1.0.0",
  "name": "file-edit",
  "description": "Targeted string replacement in a file. Requires a prior read of the same file.",
  "tool_spec": {
    "function_name": "file_edit",
    "summary": "Replace exact string with new string in a file.",
    "parameters": {
      "path": { "type": "string", "description": "File path", "required": true },
      "old_string": { "type": "string", "description": "Exact existing string", "required": true },
      "new_string": { "type": "string", "description": "Replacement", "required": true },
      "replace_all": { "type": "boolean", "description": "Replace every occurrence", "required": false }
    },
    "returns": { "type": "object", "description": "{path, replacements}." },
    "side_effects": ["fs-write"]
  }
}
```

- [ ] **Step 14: Write `atoms/tool-definition/file-delete.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "tool-definition",
  "id": "file-delete",
  "version": "1.0.0",
  "name": "file-delete",
  "description": "Remove a file. Destructive. Requires explicit user approval.",
  "tool_spec": {
    "function_name": "file_delete",
    "summary": "Delete a file at a path.",
    "parameters": {
      "path": { "type": "string", "description": "File path", "required": true }
    },
    "returns": { "type": "object", "description": "{path, removed}." },
    "side_effects": ["fs-write", "user-prompt"]
  }
}
```

- [ ] **Step 15: Write `atoms/tool-definition/sql-query.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "tool-definition",
  "id": "sql-query",
  "version": "1.0.0",
  "name": "sql-query",
  "description": "Read-only SELECT against a named DSN.",
  "tool_spec": {
    "function_name": "sql_query",
    "summary": "Run a SELECT and return rows.",
    "parameters": {
      "dsn": { "type": "string", "description": "Named DSN identifier", "required": true },
      "sql": { "type": "string", "description": "SELECT statement", "required": true },
      "params": { "type": "array", "description": "Parameterized values", "required": false }
    },
    "returns": { "type": "array", "description": "Result rows as objects." },
    "side_effects": ["network"]
  }
}
```

- [ ] **Step 16: Write `atoms/tool-definition/sql-mutate.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "tool-definition",
  "id": "sql-mutate",
  "version": "1.0.0",
  "name": "sql-mutate",
  "description": "INSERT / UPDATE / DELETE against a named DSN. Side-effecting.",
  "tool_spec": {
    "function_name": "sql_mutate",
    "summary": "Run a DML statement.",
    "parameters": {
      "dsn": { "type": "string", "description": "Named DSN", "required": true },
      "sql": { "type": "string", "description": "INSERT / UPDATE / DELETE", "required": true },
      "params": { "type": "array", "description": "Parameterized values", "required": false }
    },
    "returns": { "type": "object", "description": "{rows_affected}." },
    "side_effects": ["network", "user-prompt"]
  }
}
```

- [ ] **Step 17: Write `atoms/tool-definition/send-message.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "tool-definition",
  "id": "send-message",
  "version": "1.0.0",
  "name": "send-message",
  "description": "Send a message to an external channel (Slack, email, etc.). External, side-effecting.",
  "tool_spec": {
    "function_name": "send_message",
    "summary": "Send a message to a channel.",
    "parameters": {
      "channel": { "type": "string", "description": "Channel identifier (slack://...; mailto:...)", "required": true },
      "subject": { "type": "string", "description": "Subject / title", "required": false },
      "body": { "type": "string", "description": "Message body", "required": true }
    },
    "returns": { "type": "object", "description": "{sent, message_id}." },
    "side_effects": ["network", "user-prompt"]
  }
}
```

- [ ] **Step 18: Write `atoms/tool-definition/schedule-task.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "tool-definition",
  "id": "schedule-task",
  "version": "1.0.0",
  "name": "schedule-task",
  "description": "Register a cron / timer task. Side-effecting (creates persistent schedule).",
  "tool_spec": {
    "function_name": "schedule_task",
    "summary": "Register a recurring task.",
    "parameters": {
      "cron": { "type": "string", "description": "Cron expression", "required": true },
      "name": { "type": "string", "description": "Task name", "required": true },
      "payload": { "type": "object", "description": "Task definition", "required": true }
    },
    "returns": { "type": "object", "description": "{task_id, next_run}." },
    "side_effects": ["network"]
  }
}
```

- [ ] **Step 19: Validate and commit**

```bash
python3 scripts/validate.py | tail -3
git add atoms/tool-definition/
git commit -m "feat(atoms): 18 new tool-definition atoms — round to v0.1 seed (20)

Read tools (list-dir, grep, glob, stat, git-log/status/blame/show),
network tools (http-fetch, http-post), exec (bash-exec), write tools
(file-write/edit/delete), DB (sql-query, sql-mutate), external
(send-message, schedule-task). Each declares its side_effects array."
```

---

## Task 8: Write 6 new capability-declaration atoms

**Files:** Create 6 files under `atoms/capability-declaration/`.

- [ ] **Step 1: Write `atoms/capability-declaration/exec-with-approval.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "capability-declaration",
  "id": "exec-with-approval",
  "version": "1.0.0",
  "name": "Exec with approval",
  "description": "Execute shell commands with per-command user approval. Read + write filesystem; no unscoped network.",
  "capability": {
    "grants": ["read-files", "write-files", "exec-commands", "user-prompt"],
    "elevation": "user-approved",
    "audit": true
  }
}
```

- [ ] **Step 2: Write `atoms/capability-declaration/network-read-only.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "capability-declaration",
  "id": "network-read-only",
  "version": "1.0.0",
  "name": "Network read-only",
  "description": "Outbound HTTP GET only. No POST/PUT/PATCH/DELETE.",
  "capability": {
    "grants": ["network"],
    "elevation": "declared",
    "audit": true
  }
}
```

- [ ] **Step 3: Write `atoms/capability-declaration/network-full.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "capability-declaration",
  "id": "network-full",
  "version": "1.0.0",
  "name": "Network full",
  "description": "Any HTTP method against any host on the configured allowlist. Pair with isolation/container-with-allowlist.",
  "capability": {
    "grants": ["network"],
    "elevation": "user-approved",
    "audit": true
  }
}
```

- [ ] **Step 4: Write `atoms/capability-declaration/file-write-scoped.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "capability-declaration",
  "id": "file-write-scoped",
  "version": "1.0.0",
  "name": "File write (scoped)",
  "description": "Read + write within a configured path prefix only. No exec, no delete, no network.",
  "capability": {
    "grants": ["read-files", "write-files"],
    "elevation": "declared",
    "audit": true
  }
}
```

- [ ] **Step 5: Write `atoms/capability-declaration/db-read-only.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "capability-declaration",
  "id": "db-read-only",
  "version": "1.0.0",
  "name": "DB read-only",
  "description": "SELECT only against a named DSN. No mutations.",
  "capability": {
    "grants": ["network"],
    "elevation": "declared",
    "audit": false
  }
}
```

- [ ] **Step 6: Write `atoms/capability-declaration/db-read-write.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "capability-declaration",
  "id": "db-read-write",
  "version": "1.0.0",
  "name": "DB read-write",
  "description": "All DML against a named DSN. INSERT / UPDATE / DELETE.",
  "capability": {
    "grants": ["network", "user-prompt"],
    "elevation": "user-approved",
    "audit": true
  }
}
```

- [ ] **Step 7: Validate and commit**

```bash
python3 scripts/validate.py | tail -3
git add atoms/capability-declaration/
git commit -m "feat(atoms): 6 new capability-declaration atoms — round to v0.1 seed (8)

exec-with-approval, network-read-only, network-full, file-write-scoped,
db-read-only, db-read-write. Each capability names which grants it
includes, its elevation policy, and whether it's audited."
```

---

## Task 9: Write 3 new role-boundary atoms

**Files:** Create 3 files under `atoms/role-boundary/`.

- [ ] **Step 1: Write `atoms/role-boundary/no-data-exfiltration.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "role-boundary",
  "id": "no-data-exfiltration",
  "version": "1.0.0",
  "name": "No data exfiltration",
  "description": "Refuses to send workspace contents (files, env vars, secrets) to external hosts. For agents with network access on sensitive data.",
  "boundary": {
    "refusals": [
      "Do not POST / PUT / PATCH workspace file contents to external hosts.",
      "Do not include environment variable values in network requests.",
      "Do not summarize internal data into a payload bound for a third-party service.",
      "If a task requires external sharing, escalate with the exact data to be shared and the destination."
    ],
    "escalate_to": "agent-atoms://atoms/persona/devops-engineer"
  }
}
```

- [ ] **Step 2: Write `atoms/role-boundary/no-destructive-without-ack.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "role-boundary",
  "id": "no-destructive-without-ack",
  "version": "1.0.0",
  "name": "No destructive without acknowledgment",
  "description": "Refuses destructive or hard-to-reverse operations without an explicit user confirmation. Mirrors Common.md §2.2.",
  "boundary": {
    "refusals": [
      "Do not delete files, directories, branches, tags without explicit acknowledgment.",
      "Do not force-push or rewrite history without explicit acknowledgment.",
      "Do not drop tables or run destructive migrations without explicit acknowledgment.",
      "State the scope of the destruction and the reversibility; request confirmation; snapshot if reversible."
    ],
    "escalate_to": "none"
  }
}
```

- [ ] **Step 3: Write `atoms/role-boundary/no-cross-project-access.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "role-boundary",
  "id": "no-cross-project-access",
  "version": "1.0.0",
  "name": "No cross-project access",
  "description": "Refuses read or write outside the declared project root. Prevents cross-tenant or cross-workspace leakage.",
  "boundary": {
    "refusals": [
      "Do not read files outside the declared project root.",
      "Do not write files outside the declared project root.",
      "Do not exec commands that would traverse outside the project root.",
      "If a task requires cross-project context, escalate with the specific paths and rationale."
    ],
    "escalate_to": "agent-atoms://atoms/persona/devops-engineer"
  }
}
```

- [ ] **Step 4: Validate and commit**

```bash
python3 scripts/validate.py | tail -3
git add atoms/role-boundary/
git commit -m "feat(atoms): 3 new role-boundary atoms — round to v0.1 seed (5)

no-data-exfiltration (sensitive-data network boundary), no-destructive-
without-ack (Common.md §2.2 echo), no-cross-project-access (workspace
scope boundary). Each lists concrete refusal patterns + an escalate_to."
```

---

## Task 10: Write 3 new isolation-constraint atoms

**Files:** Create 3 files under `atoms/isolation-constraint/`.

- [ ] **Step 1: Write `atoms/isolation-constraint/ephemeral-vm.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "isolation-constraint",
  "id": "ephemeral-vm",
  "version": "1.0.0",
  "name": "Ephemeral VM",
  "description": "Single-use VM destroyed on task completion. Strongest practical isolation for untrusted execution.",
  "isolation": {
    "process": "vm",
    "network": "allowlist",
    "filesystem": "tmpfs",
    "scoped_paths": ["/workspace"]
  }
}
```

- [ ] **Step 2: Write `atoms/isolation-constraint/network-namespaced.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "isolation-constraint",
  "id": "network-namespaced",
  "version": "1.0.0",
  "name": "Network namespaced",
  "description": "Own network namespace with explicit allowlist. Filesystem and process boundaries delegated to the host.",
  "isolation": {
    "process": "subprocess",
    "network": "allowlist",
    "filesystem": "scoped",
    "scoped_paths": ["${WORKSPACE_ROOT}"]
  }
}
```

- [ ] **Step 3: Write `atoms/isolation-constraint/seccomp-restricted.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/atom-v1.json",
  "type": "isolation-constraint",
  "id": "seccomp-restricted",
  "version": "1.0.0",
  "name": "Seccomp restricted",
  "description": "Subprocess with seccomp filter — only whitelisted syscalls allowed. No network; scoped filesystem.",
  "isolation": {
    "process": "subprocess",
    "network": "none",
    "filesystem": "scoped",
    "scoped_paths": ["${WORKSPACE_ROOT}"]
  }
}
```

- [ ] **Step 4: Validate and commit**

```bash
python3 scripts/validate.py | tail -3
git add atoms/isolation-constraint/
git commit -m "feat(atoms): 3 new isolation-constraint atoms — round to v0.1 seed (5)

ephemeral-vm (strongest, single-use), network-namespaced (network-only
isolation), seccomp-restricted (syscall allowlist). Together with the
existing 2 (read-only-sandbox, container-with-allowlist), the catalog
covers the common isolation tiers."
```

---

## Task 11: Write 2 agent compositions

**Files:**
- Create: `agents/code-reviewer.json`
- Create: `agents/runbook-executor.json`

- [ ] **Step 1: Write `agents/code-reviewer.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/composition-v1.json",
  "type": "agent",
  "id": "code-reviewer",
  "version": "1.0.0",
  "name": "Code Reviewer",
  "description": "Read-only adversarial code-review agent. Reads diffs, grep'd context, files findings. Cannot exec, cannot reach network.",
  "tags": ["code-review", "engineering"],
  "references": {
    "persona": { "ref": "agent-atoms://atoms/persona/code-reviewer", "version": "1.0.0" },
    "tools": [
      { "ref": "agent-atoms://atoms/tool-definition/git-diff", "version": "1.0.0" },
      { "ref": "agent-atoms://atoms/tool-definition/read-file", "version": "1.0.0" },
      { "ref": "agent-atoms://atoms/tool-definition/list-dir", "version": "1.0.0" },
      { "ref": "agent-atoms://atoms/tool-definition/grep", "version": "1.0.0" }
    ],
    "capabilities": [
      { "ref": "agent-atoms://atoms/capability-declaration/read-only-workspace", "version": "1.0.0" }
    ],
    "role_boundaries": [
      { "ref": "agent-atoms://atoms/role-boundary/no-code-execution", "version": "1.0.0" },
      { "ref": "agent-atoms://atoms/role-boundary/no-network-egress", "version": "1.0.0" }
    ],
    "isolation": { "ref": "agent-atoms://atoms/isolation-constraint/read-only-sandbox", "version": "1.0.0" }
  }
}
```

- [ ] **Step 2: Write `agents/runbook-executor.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/composition-v1.json",
  "type": "agent",
  "id": "runbook-executor",
  "version": "1.0.0",
  "name": "Runbook Executor",
  "description": "DevOps runbook execution agent. bash exec + scoped writes + outbound HTTP, gated by per-command user approval and container isolation.",
  "tags": ["devops", "operations"],
  "references": {
    "persona": { "ref": "agent-atoms://atoms/persona/devops-engineer", "version": "1.0.0" },
    "tools": [
      { "ref": "agent-atoms://atoms/tool-definition/bash-exec", "version": "1.0.0" },
      { "ref": "agent-atoms://atoms/tool-definition/http-fetch", "version": "1.0.0" },
      { "ref": "agent-atoms://atoms/tool-definition/file-write", "version": "1.0.0" }
    ],
    "capabilities": [
      { "ref": "agent-atoms://atoms/capability-declaration/exec-with-approval", "version": "1.0.0" }
    ],
    "role_boundaries": [
      { "ref": "agent-atoms://atoms/role-boundary/no-data-exfiltration", "version": "1.0.0" }
    ],
    "isolation": { "ref": "agent-atoms://atoms/isolation-constraint/container-with-allowlist", "version": "1.0.0" }
  }
}
```

- [ ] **Step 3: Validate (exercises ref resolution)**

```bash
python3 scripts/validate.py
```

Expected: ✓ for every atom AND ✓ for both compositions. `all valid`.

- [ ] **Step 4: Commit**

```bash
git add agents/
git commit -m "feat(agents): 2 seed compositions — code-reviewer, runbook-executor

code-reviewer matches the GOALS.md example: read-only sandbox, no exec,
no network egress. runbook-executor pairs bash-exec + http-fetch +
file-write with per-command approval and container isolation."
```

---

## Task 12: Write 2 seed rules

**Files:**
- Create: `rules/capability-grant/exec-requires-isolation.json`
- Create: `rules/isolation-rule/network-write-requires-allowlist.json`

- [ ] **Step 1: Create rule type directories**

```bash
mkdir -p rules/capability-grant rules/isolation-rule
```

- [ ] **Step 2: Write `rules/capability-grant/exec-requires-isolation.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/rule-v1.json",
  "type": "capability-grant",
  "id": "exec-requires-isolation",
  "version": "1.0.0",
  "name": "Exec requires container-grade isolation",
  "description": "capability/exec-with-approval requires isolation in {container-with-allowlist, ephemeral-vm, seccomp-restricted}. read-only-sandbox is too weak; no-isolation is forbidden.",
  "predicate": {
    "subject_ref": "agent-atoms://atoms/capability-declaration/exec-with-approval",
    "condition": "in",
    "value": [
      "agent-atoms://atoms/isolation-constraint/container-with-allowlist",
      "agent-atoms://atoms/isolation-constraint/ephemeral-vm",
      "agent-atoms://atoms/isolation-constraint/seccomp-restricted"
    ]
  },
  "effect": "require",
  "rationale": "An agent granted exec-commands without container-grade isolation has a path to escape the workspace via any subprocess it spawns. Pair exec capability with an isolation atom that constrains process, filesystem, and network at the host level."
}
```

- [ ] **Step 3: Write `rules/isolation-rule/network-write-requires-allowlist.json`**

```json
{
  "schema": "https://agent-atoms.com/schemas/rule-v1.json",
  "type": "isolation-rule",
  "id": "network-write-requires-allowlist",
  "version": "1.0.0",
  "name": "Network-write tools require an allowlisted network",
  "description": "tool/http-post requires isolation in {container-with-allowlist, network-namespaced}. A side-effecting HTTP method without an allowlist can post to arbitrary external hosts.",
  "predicate": {
    "subject_ref": "agent-atoms://atoms/tool-definition/http-post",
    "condition": "in",
    "value": [
      "agent-atoms://atoms/isolation-constraint/container-with-allowlist",
      "agent-atoms://atoms/isolation-constraint/network-namespaced"
    ]
  },
  "effect": "require",
  "rationale": "Side-effecting HTTP (POST/PUT/PATCH/DELETE) is the standard data-exfiltration vector. Pair it with network-allowlist isolation so the destination set is known and small."
}
```

- [ ] **Step 4: Validate**

```bash
python3 scripts/validate.py | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add rules/
git commit -m "feat(rules): 2 seed rules — capability-grant + isolation-rule

exec-requires-isolation: capability/exec-with-approval requires
container-grade isolation. network-write-requires-allowlist: tool/http-post
requires an allowlisted network. Both use effect=require; downstream
linting rejects compositions that violate."
```

---

## Task 13: Build `exports/catalog.json`

**Files:** Create `exports/catalog.json` (build output).

- [ ] **Step 1: Run the build**

```bash
python3 scripts/build-exports.py
```

Expected: `wrote exports/catalog.json — 48 atoms, 2 compositions, 2 rules`.

- [ ] **Step 2: Spot-check**

```bash
python3 -c "import json; d=json.load(open('exports/catalog.json')); print('atoms:',len(d['atoms']),'compositions:',len(d['compositions']),'rules:',len(d['rules']),'version:',d['version'])"
```

Expected: `atoms: 48 compositions: 2 rules: 2 version: 0.1.0`.

- [ ] **Step 3: Commit**

```bash
git add exports/catalog.json
git commit -m "chore(exports): initial catalog.json — v0.1.0

48 atoms (10 persona, 20 tool-definition, 8 capability-declaration,
5 role-boundary, 5 isolation-constraint), 2 compositions, 2 rules.
Built from scripts/build-exports.py."
```

---

## Task 14: Astro scaffold for `web/`

**Files:**
- Create: `web/package.json`, `web/astro.config.mjs`, `web/tsconfig.json`, `web/.gitignore`, `web/pnpm-lock.yaml`.

- [ ] **Step 1: Verify pnpm**

```bash
pnpm --version
```

- [ ] **Step 2: Create directory**

```bash
mkdir -p web
```

- [ ] **Step 3: Write `web/package.json`**

```json
{
  "name": "@agent-atoms/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "prebuild": "node scripts/copy-catalog.mjs",
    "build": "astro build",
    "preview": "astro preview",
    "deploy": "wrangler pages deploy dist --project-name agent-atoms"
  },
  "dependencies": {
    "@astrojs/react": "^4.1.6",
    "astro": "^6.1.10",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.2",
    "@types/react-dom": "^19.0.2",
    "wrangler": "^4.0.0"
  }
}
```

- [ ] **Step 4: Write `web/astro.config.mjs`**

```javascript
import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  site: "https://agent-atoms.com",
  integrations: [react()],
  output: "static",
});
```

- [ ] **Step 5: Write `web/tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react"
  }
}
```

- [ ] **Step 6: Write `web/.gitignore`**

```
.astro/
.wrangler/
dist/
node_modules/
public/atoms/
public/agents/
public/rules/
public/schemas/
public/exports/
```

- [ ] **Step 7: Install deps**

```bash
cd web && pnpm install && cd ..
```

- [ ] **Step 8: Commit**

```bash
git add web/package.json web/astro.config.mjs web/tsconfig.json web/.gitignore web/pnpm-lock.yaml
git commit -m "feat(web): Astro scaffold — package.json, config, tsconfig, lockfile

Astro 6.1.10 + React 19 + Wrangler 4. Matches theme-atoms/web and
prompt-atoms/web toolchain. Static output; site at https://agent-atoms.com."
```

---

## Task 15: Prebuild copy script and `_headers`

**Files:**
- Create: `web/scripts/copy-catalog.mjs`
- Create: `web/public/_headers`

- [ ] **Step 1: Write `web/scripts/copy-catalog.mjs`**

```javascript
import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const WEB_DIR = dirname(fileURLToPath(import.meta.url)) + "/..";
const REPO_DIR = resolve(WEB_DIR, "..");
const PUBLIC = join(WEB_DIR, "public");

const SOURCES = ["atoms", "agents", "rules", "schemas", "exports"];

for (const src of SOURCES) {
  const from = join(REPO_DIR, src);
  const to = join(PUBLIC, src);
  if (!existsSync(from)) {
    console.warn(`skipping ${src}: ${from} does not exist`);
    continue;
  }
  await rm(to, { recursive: true, force: true });
  await mkdir(to, { recursive: true });
  await cp(from, to, { recursive: true });
  console.log(`copied ${src}/ → public/${src}/`);
}
```

- [ ] **Step 2: Write `web/public/_headers`**

```
/atoms/*.json
  Content-Type: application/json; charset=utf-8
  Cache-Control: public, max-age=300, must-revalidate

/atoms/*/*.json
  Content-Type: application/json; charset=utf-8
  Cache-Control: public, max-age=300, must-revalidate

/agents/*.json
  Content-Type: application/json; charset=utf-8
  Cache-Control: public, max-age=300, must-revalidate

/rules/*/*.json
  Content-Type: application/json; charset=utf-8
  Cache-Control: public, max-age=300, must-revalidate

/exports/catalog.json
  Content-Type: application/json; charset=utf-8
  Cache-Control: public, max-age=60, must-revalidate

/schemas/*.json
  Content-Type: application/schema+json; charset=utf-8
  Cache-Control: public, max-age=3600, must-revalidate
```

- [ ] **Step 3: Verify the script copies cleanly**

```bash
cd web && node scripts/copy-catalog.mjs && ls public/atoms public/agents public/rules public/schemas public/exports && cd ..
```

- [ ] **Step 4: Commit**

```bash
git add web/scripts/copy-catalog.mjs web/public/_headers
git commit -m "feat(web): _headers for raw artifact serving + prebuild copy script

copy-catalog.mjs runs as pnpm prebuild — copies atoms/, agents/, rules/,
schemas/, exports/ from repo root into web/public/. Files served at
predictable URLs with correct content-types via _headers."
```

---

## Task 16: Shared layout and components

**Files:**
- Create: `web/src/layouts/Base.astro`
- Create: `web/src/components/AtomCard.astro`
- Create: `web/src/components/CompositionCard.astro`
- Create: `web/src/components/RefBadge.astro`

- [ ] **Step 1: Write `web/src/layouts/Base.astro`**

```astro
---
const { title, description } = Astro.props;
const siteTitle = title ? `${title} · agent-atoms` : "agent-atoms";
const siteDesc = description ?? "Agent primitives canonicalized — personas, tools, capabilities, role boundaries, isolation.";
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{siteTitle}</title>
    <meta name="description" content={siteDesc} />
    <link rel="canonical" href={new URL(Astro.url.pathname, Astro.site)} />
    <style is:global>
      :root { --fg: #1a1a1a; --bg: #fafafa; --accent: #6b3d1f; --muted: #666; --card: #fff; --border: #e0e0e0; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; color: var(--fg); background: var(--bg); line-height: 1.5; }
      a { color: var(--accent); }
      header { border-bottom: 1px solid var(--border); background: var(--card); }
      header nav { max-width: 64rem; margin: 0 auto; padding: 1rem; display: flex; gap: 1.5rem; align-items: center; }
      header nav strong { font-size: 1.125rem; }
      header nav a { text-decoration: none; color: var(--muted); }
      header nav a[aria-current="page"] { color: var(--fg); font-weight: 600; }
      main { max-width: 64rem; margin: 0 auto; padding: 2rem 1rem; }
      footer { border-top: 1px solid var(--border); padding: 2rem 1rem; text-align: center; color: var(--muted); font-size: 0.875rem; }
      code { background: #f0f0f0; padding: 0.125rem 0.25rem; border-radius: 0.25rem; font-size: 0.9em; }
      pre { background: #f0f0f0; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }
      h1, h2, h3 { line-height: 1.2; }
    </style>
  </head>
  <body>
    <header>
      <nav>
        <strong><a href="/">agent-atoms</a></strong>
        <a href="/atoms/">Atoms</a>
        <a href="/agents/">Agents</a>
        <a href="/how-to-use/">How to use</a>
        <a href="/install/">Install</a>
        <a href="https://github.com/convergent-systems-co/agent-atoms">GitHub</a>
      </nav>
    </header>
    <main>
      <slot />
    </main>
    <footer>
      Apache-2.0 · <a href="https://xdao.co">xdao.co</a>
    </footer>
  </body>
</html>
```

- [ ] **Step 2: Write `web/src/components/AtomCard.astro`**

```astro
---
const { atom } = Astro.props;
const href = `/atoms/${atom.type}/${atom.id}/`;
---
<article style="border: 1px solid var(--border); border-radius: 0.5rem; padding: 1rem; background: var(--card);">
  <header style="display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; margin-bottom: 0.5rem;">
    <h3 style="margin: 0;"><a href={href}>{atom.name}</a></h3>
    <code style="color: var(--muted); font-size: 0.75rem;">{atom.type} · v{atom.version}</code>
  </header>
  {atom.description && <p style="margin: 0.5rem 0; color: var(--muted);">{atom.description}</p>}
  {atom.tags && (
    <div style="display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.5rem;">
      {atom.tags.map((tag: string) => <span style="font-size: 0.75rem; background: #f4ece4; padding: 0.125rem 0.5rem; border-radius: 0.25rem;">{tag}</span>)}
    </div>
  )}
</article>
```

- [ ] **Step 3: Write `web/src/components/CompositionCard.astro`**

```astro
---
const { composition } = Astro.props;
const href = `/agents/${composition.id}/`;
const refCount = Object.values(composition.references).flat().length;
---
<article style="border: 1px solid var(--border); border-radius: 0.5rem; padding: 1rem; background: var(--card);">
  <header style="display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; margin-bottom: 0.5rem;">
    <h3 style="margin: 0;"><a href={href}>{composition.name}</a></h3>
    <code style="color: var(--muted); font-size: 0.75rem;">v{composition.version} · {refCount} refs</code>
  </header>
  {composition.description && <p style="margin: 0.5rem 0; color: var(--muted);">{composition.description}</p>}
</article>
```

- [ ] **Step 4: Write `web/src/components/RefBadge.astro`**

```astro
---
const { ref, version } = Astro.props;
const match = ref.match(/^agent-atoms:\/\/atoms\/([a-z-]+)\/([a-z0-9-]+)$/);
const href = match ? `/atoms/${match[1]}/${match[2]}/` : "#";
const label = match ? `${match[1]}/${match[2]}` : ref;
---
<a href={href} style="display: inline-block; font-family: ui-monospace, monospace; font-size: 0.85rem; padding: 0.25rem 0.5rem; background: #f0f0f0; border-radius: 0.25rem; text-decoration: none; color: var(--fg);">
  {label} <span style="color: var(--muted);">@ {version}</span>
</a>
```

- [ ] **Step 5: Commit**

```bash
git add web/src/layouts/ web/src/components/
git commit -m "feat(web): Base layout + AtomCard / CompositionCard / RefBadge components

Shared shell for every page — nav, footer, base styles. Three reusable
components used by listing and detail pages. Accent color shifted from
prompt-atoms blue to a warmer brown for visual distinction. Plain CSS,
no Tailwind."
```

---

## Task 17: Landing, how-to-use, install pages

**Files:**
- Create: `web/src/pages/index.astro`
- Create: `web/src/pages/how-to-use.astro`
- Create: `web/src/pages/install.astro`

- [ ] **Step 1: Write `web/src/pages/index.astro`**

```astro
---
import Base from "../layouts/Base.astro";
import catalog from "../../public/exports/catalog.json";
const counts = {
  atoms: catalog.atoms.length,
  compositions: catalog.compositions.length,
  rules: catalog.rules.length,
};
const byType: Record<string, number> = {};
for (const a of catalog.atoms) byType[a.type] = (byType[a.type] ?? 0) + 1;
---
<Base title="Home" description="Agent primitives canonicalized — personas, tools, capabilities, role boundaries, isolation.">
  <h1>agent-atoms</h1>
  <p style="font-size: 1.125rem; color: var(--muted); max-width: 40rem;">
    A typed, versioned, composable library of AI-agent primitives —
    personas, tool definitions, capability declarations, role boundaries,
    isolation constraints — portable across LangChain, AutoGen, CrewAI,
    Olympus, and any future agent framework.
  </p>

  <h2>Catalog at v{catalog.version}</h2>
  <ul>
    <li><strong>{counts.atoms}</strong> atoms across {Object.keys(byType).length} types</li>
    <li><strong>{counts.compositions}</strong> agent compositions</li>
    <li><strong>{counts.rules}</strong> compatibility rules</li>
  </ul>

  <h2>Atom types</h2>
  <ul>
    {Object.entries(byType).map(([type, n]) => (
      <li><a href={`/atoms/?type=${type}`}>{type}</a> — {n} atoms</li>
    ))}
  </ul>

  <h2>Civilization-grade properties</h2>
  <ul>
    <li><strong>Typed</strong> — every atom, composition, and rule validates against a JSON Schema.</li>
    <li><strong>Versioned</strong> — every atom has a semver <code>version</code> field; compositions pin by version.</li>
    <li><strong>Machine-readable</strong> — <a href="/exports/catalog.json">/exports/catalog.json</a> is the canonical manifest.</li>
    <li><strong>Composable</strong> — compositions reference atoms by ID; references resolve in CI.</li>
    <li><strong>Open</strong> — Apache-2.0 licensed.</li>
    <li><strong>Durable</strong> — no external dependencies in the hot path.</li>
  </ul>
</Base>
```

- [ ] **Step 2: Write `web/src/pages/how-to-use.astro`**

```astro
---
import Base from "../layouts/Base.astro";
---
<Base title="How to use" description="How to consume agent-atoms in your application.">
  <h1>How to use agent-atoms</h1>

  <h2>Read the catalog over HTTPS</h2>
  <p>Every artifact is served under stable URLs with correct content-types:</p>
  <pre><code>curl https://agent-atoms.com/exports/catalog.json
curl https://agent-atoms.com/atoms/persona/code-reviewer.json
curl https://agent-atoms.com/agents/code-reviewer.json
curl https://agent-atoms.com/schemas/composition-v1.json</code></pre>

  <h2>Resolve an agent composition</h2>
  <p>An agent composition lists references to atoms by URI and version. To instantiate the agent,
  fetch each referenced atom and assemble: persona → tools → capabilities → role boundaries → isolation.</p>

  <pre><code>{`// pseudo-code
const composition = await fetch("/agents/code-reviewer.json").then(r => r.json());
const refs = composition.references;
const persona = await fetch(uriToUrl(refs.persona.ref)).then(r => r.json());
const tools = await Promise.all(refs.tools.map(r => fetch(uriToUrl(r.ref)).then(r => r.json())));
const capabilities = await Promise.all(refs.capabilities.map(r => fetch(uriToUrl(r.ref)).then(r => r.json())));
const isolation = await fetch(uriToUrl(refs.isolation.ref)).then(r => r.json());
const agent = compileAgent({ persona, tools, capabilities, isolation });`}</code></pre>

  <h2>Compatibility rules</h2>
  <p>Rules in <a href="/exports/catalog.json"><code>/exports/catalog.json</code></a> (under the <code>rules</code>
  key) declare predicates over atoms. Example: <code>capability/exec-with-approval</code> requires
  isolation in <code>{`{container-with-allowlist, ephemeral-vm, seccomp-restricted}`}</code>. A composition
  that violates a <code>require</code>-effect rule is malformed.</p>

  <h2>Cross-framework portability</h2>
  <p>v0.1 ships the catalog and its JSON Schema; compilers to specific agent frameworks (LangChain,
  AutoGen, CrewAI) are v0.2 work — they translate <code>tool-definition</code> atoms into the framework's
  native tool signature, and bind <code>capability-declaration</code> atoms to the framework's permission model.</p>
</Base>
```

- [ ] **Step 3: Write `web/src/pages/install.astro`**

```astro
---
import Base from "../layouts/Base.astro";
---
<Base title="Install" description="How to obtain a local copy of agent-atoms.">
  <h1>Install</h1>

  <h2>As an HTTPS consumer (recommended)</h2>
  <pre><code>curl https://agent-atoms.com/exports/catalog.json -o catalog.json</code></pre>

  <h2>As a git submodule of the umbrella</h2>
  <pre><code>git clone --recurse-submodules https://github.com/convergent-systems-co/atoms.git</code></pre>

  <h2>As a standalone clone</h2>
  <pre><code>git clone https://github.com/convergent-systems-co/agent-atoms.git
cd agent-atoms
python3 scripts/validate.py
python3 scripts/build-exports.py</code></pre>

  <h2>Dependencies</h2>
  <ul>
    <li>Python 3.11+ with <code>jsonschema</code></li>
    <li>Node 22+ and pnpm (only for local <code>web/</code> builds)</li>
  </ul>
</Base>
```

- [ ] **Step 4: Build to verify**

```bash
cd web && pnpm build && cd ..
```

Expected: clean build, `dist/index.html`, `dist/how-to-use/`, `dist/install/` populated.

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/index.astro web/src/pages/how-to-use.astro web/src/pages/install.astro
git commit -m "feat(web): landing + how-to-use + install pages

Landing imports public/exports/catalog.json at build time. how-to-use
documents agent composition resolution; install covers HTTPS, submodule,
and standalone clone paths."
```

---

## Task 18: Atom browser + dynamic detail

**Files:**
- Create: `web/src/pages/atoms/index.astro`
- Create: `web/src/pages/atoms/[type]/[id].astro`

- [ ] **Step 1: Write `web/src/pages/atoms/index.astro`**

```astro
---
import Base from "../../layouts/Base.astro";
import AtomCard from "../../components/AtomCard.astro";
import catalog from "../../../public/exports/catalog.json";

const byType: Record<string, any[]> = {};
for (const a of catalog.atoms) {
  byType[a.type] = byType[a.type] ?? [];
  byType[a.type].push(a);
}
for (const list of Object.values(byType)) list.sort((a, b) => a.id.localeCompare(b.id));
const types = Object.keys(byType).sort();
---
<Base title="Atoms" description="Every atom in the catalog, grouped by type.">
  <h1>Atoms</h1>
  <p>{catalog.atoms.length} atoms across {types.length} types.</p>

  <nav style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin: 1rem 0 2rem;">
    {types.map(t => <a href={`#${t}`} style="padding: 0.25rem 0.75rem; background: #f4ece4; border-radius: 0.25rem; text-decoration: none;">{t} ({byType[t].length})</a>)}
  </nav>

  {types.map(type => (
    <section id={type} style="margin-bottom: 2.5rem;">
      <h2 style="border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">{type}</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr)); gap: 1rem; margin-top: 1rem;">
        {byType[type].map(atom => <AtomCard atom={atom} />)}
      </div>
    </section>
  ))}
</Base>
```

- [ ] **Step 2: Write `web/src/pages/atoms/[type]/[id].astro`**

This page renders the type-specific object (persona_profile, tool_spec, capability, boundary, isolation) instead of a single `content` string like prompt-atoms had.

```astro
---
import Base from "../../../layouts/Base.astro";
import catalog from "../../../../public/exports/catalog.json";

export function getStaticPaths() {
  return catalog.atoms.map((atom: any) => ({
    params: { type: atom.type, id: atom.id },
    props: { atom },
  }));
}

const { atom } = Astro.props;

// Pick the type-specific payload to render
const profile = atom.persona_profile;
const toolSpec = atom.tool_spec;
const capability = atom.capability;
const boundary = atom.boundary;
const isolation = atom.isolation;
---
<Base title={atom.name} description={atom.description ?? `${atom.type} atom`}>
  <p><a href="/atoms/">← All atoms</a></p>
  <h1>{atom.name}</h1>
  <p style="color: var(--muted);">
    <code>{atom.type}</code> · <code>v{atom.version}</code>
  </p>

  {atom.description && <p>{atom.description}</p>}

  {atom.tags && atom.tags.length > 0 && (
    <p>
      Tags: {atom.tags.map((tag: string) => (
        <span style="display: inline-block; font-size: 0.875rem; background: #f4ece4; padding: 0.125rem 0.5rem; border-radius: 0.25rem; margin-right: 0.25rem;">{tag}</span>
      ))}
    </p>
  )}

  {profile && (
    <section>
      <h2>Persona profile</h2>
      <dl style="display: grid; grid-template-columns: max-content 1fr; gap: 0.5rem 1rem;">
        {profile.role && (<><dt>Role</dt><dd>{profile.role}</dd></>)}
        {profile.voice && (<><dt>Voice</dt><dd>{profile.voice}</dd></>)}
        {profile.planner && (<><dt>Planner</dt><dd><code>{profile.planner}</code></dd></>)}
        {profile.memory_model && (<><dt>Memory</dt><dd><code>{profile.memory_model}</code></dd></>)}
        {profile.supervisor && (<><dt>Supervisor</dt><dd><code>{profile.supervisor}</code></dd></>)}
        {profile.expertise && profile.expertise.length > 0 && (<><dt>Expertise</dt><dd>{profile.expertise.join(", ")}</dd></>)}
      </dl>
    </section>
  )}

  {toolSpec && (
    <section>
      <h2>Tool signature</h2>
      <pre><code>{`function ${toolSpec.function_name}(${Object.entries(toolSpec.parameters ?? {}).map(([n, p]: [string, any]) => `${n}: ${p.type}${p.required ? "" : "?"}`).join(", ")}) → ${toolSpec.returns.type}`}</code></pre>
      {toolSpec.summary && <p style="color: var(--muted);">{toolSpec.summary}</p>}
      <h3>Parameters</h3>
      <ul>
        {Object.entries(toolSpec.parameters ?? {}).map(([name, p]: [string, any]) => (
          <li><code>{name}</code> <em>({p.type}{p.required ? ", required" : ""})</em> — {p.description}</li>
        ))}
      </ul>
      <h3>Side effects</h3>
      <p>{(toolSpec.side_effects ?? []).map((s: string) => <code style="margin-right: 0.5rem;">{s}</code>)}</p>
    </section>
  )}

  {capability && (
    <section>
      <h2>Capability</h2>
      <dl style="display: grid; grid-template-columns: max-content 1fr; gap: 0.5rem 1rem;">
        <dt>Grants</dt><dd>{capability.grants.map((g: string) => <code style="margin-right: 0.25rem;">{g}</code>)}</dd>
        <dt>Elevation</dt><dd><code>{capability.elevation}</code></dd>
        <dt>Audit</dt><dd>{capability.audit ? "yes" : "no"}</dd>
      </dl>
    </section>
  )}

  {boundary && (
    <section>
      <h2>Refusals</h2>
      <ul>{boundary.refusals.map((r: string) => <li>{r}</li>)}</ul>
      {boundary.escalate_to && <p>Escalate to: <code>{boundary.escalate_to}</code></p>}
    </section>
  )}

  {isolation && (
    <section>
      <h2>Isolation</h2>
      <dl style="display: grid; grid-template-columns: max-content 1fr; gap: 0.5rem 1rem;">
        {isolation.process && (<><dt>Process</dt><dd><code>{isolation.process}</code></dd></>)}
        {isolation.network && (<><dt>Network</dt><dd><code>{isolation.network}</code></dd></>)}
        {isolation.filesystem && (<><dt>Filesystem</dt><dd><code>{isolation.filesystem}</code></dd></>)}
        {isolation.scoped_paths && (<><dt>Scoped paths</dt><dd>{isolation.scoped_paths.map((p: string) => <code style="margin-right: 0.5rem;">{p}</code>)}</dd></>)}
      </dl>
    </section>
  )}

  <h2>Raw atom</h2>
  <p><a href={`/atoms/${atom.type}/${atom.id}.json`}>/atoms/{atom.type}/{atom.id}.json</a> · <a href="/schemas/atom-v1.json">schema</a></p>
</Base>
```

- [ ] **Step 3: Build to verify dynamic routes**

```bash
cd web && pnpm build && ls dist/atoms/ | head && cd ..
```

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/atoms/
git commit -m "feat(web): atom browser + dynamic per-atom detail pages

/atoms/ — grouped-by-type listing.
/atoms/[type]/[id]/ — dynamic page; renders the type-specific payload
(persona_profile / tool_spec / capability / boundary / isolation) rather
than a single content string. 48 dynamic pages built statically."
```

---

## Task 19: Composition browser + detail

**Files:**
- Create: `web/src/pages/agents/index.astro`
- Create: `web/src/pages/agents/[id].astro`

- [ ] **Step 1: Write `web/src/pages/agents/index.astro`**

```astro
---
import Base from "../../layouts/Base.astro";
import CompositionCard from "../../components/CompositionCard.astro";
import catalog from "../../../public/exports/catalog.json";

const compositions = catalog.compositions.slice().sort((a: any, b: any) => a.id.localeCompare(b.id));
---
<Base title="Agents" description="Agent compositions — assembled personas, tools, capabilities, role boundaries, isolation.">
  <h1>Agents</h1>
  <p>{compositions.length} agent composition{compositions.length === 1 ? "" : "s"} — each assembles atoms into a complete agent definition.</p>

  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr)); gap: 1rem; margin-top: 2rem;">
    {compositions.map((c: any) => <CompositionCard composition={c} />)}
  </div>
</Base>
```

- [ ] **Step 2: Write `web/src/pages/agents/[id].astro`**

```astro
---
import Base from "../../layouts/Base.astro";
import RefBadge from "../../components/RefBadge.astro";
import catalog from "../../../public/exports/catalog.json";

export function getStaticPaths() {
  return catalog.compositions.map((composition: any) => ({
    params: { id: composition.id },
    props: { composition },
  }));
}

const { composition } = Astro.props;
const refs = composition.references;

type Ref = { ref: string; version: string };
const sections: Array<{ label: string; values: Ref[] }> = [
  { label: "Persona", values: [refs.persona] },
  { label: "Tools", values: refs.tools ?? [] },
  { label: "Capabilities", values: refs.capabilities ?? [] },
  { label: "Role boundaries", values: refs.role_boundaries ?? [] },
  { label: "Isolation", values: [refs.isolation] },
];
---
<Base title={composition.name} description={composition.description}>
  <p><a href="/agents/">← All agents</a></p>
  <h1>{composition.name}</h1>
  <p style="color: var(--muted);">
    <code>agent</code> · <code>v{composition.version}</code>
  </p>

  {composition.description && <p>{composition.description}</p>}

  <h2>References</h2>
  {sections.map(section => section.values.length > 0 && (
    <div style="margin-bottom: 1.5rem;">
      <h3 style="margin-bottom: 0.5rem;">{section.label}</h3>
      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
        {section.values.map((r: Ref) => <RefBadge ref={r.ref} version={r.version} />)}
      </div>
    </div>
  ))}

  <h2>Raw composition</h2>
  <p><a href={`/agents/${composition.id}.json`}>/agents/{composition.id}.json</a> · <a href="/schemas/composition-v1.json">schema</a></p>
</Base>
```

- [ ] **Step 3: Build to verify**

```bash
cd web && pnpm build && ls dist/agents && cd ..
```

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/agents/
git commit -m "feat(web): agent browser + dynamic per-agent detail pages

/agents/ — composition listing.
/agents/[id]/ — detail; renders persona, tools, capabilities, role
boundaries, isolation as RefBadge groups. Raw JSON link at
/agents/<id>.json for machine consumers."
```

---

## Task 20: GitHub Actions deploy workflow

**Files:** Create `.github/workflows/deploy.yml`.

Note: **Node 22 from the start** (Plan A originally pinned Node 20, which broke on Astro 6.3+).

- [ ] **Step 1: Write `.github/workflows/deploy.yml`**

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "22"

      - name: Set up pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install Python deps
        run: pip install jsonschema

      - name: Validate catalog
        run: python3 scripts/validate.py

      - name: Build exports/catalog.json
        run: python3 scripts/build-exports.py

      - name: Install web/ deps
        working-directory: web
        run: pnpm install --frozen-lockfile

      - name: Build web/
        working-directory: web
        run: pnpm build

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy web/dist --project-name=agent-atoms
```

- [ ] **Step 2: Full local dry-run**

```bash
python3 scripts/validate.py && python3 scripts/build-exports.py && (cd web && pnpm install --frozen-lockfile && pnpm build)
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci(deploy): Cloudflare Pages workflow — validate, build, deploy

Node 22 (Astro 6.3+ requires it). On push to main and on PR: validate,
build exports, build web, deploy via wrangler. Uses org-level secrets
CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID (with repo-level override
on agent-atoms until org-secret promotion is unblocked — see atoms#2)."
```

---

## Task 21: Terraform module for CF Pages project

**Files:** Create 7 files under `infra/cloudflare/pages-project/`.

State key per `~/.ai/memory/reference_terraform_state_keys.md`:
`state-bucket/convergent-systems-co/agent-atoms/pages-project.tfstate`

- [ ] **Step 1: `infra/cloudflare/pages-project/versions.tf`**

```hcl
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "cs-tfstate"
    key    = "state-bucket/convergent-systems-co/agent-atoms/pages-project.tfstate"
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
    use_lockfile                = true
  }
}
```

- [ ] **Step 2: `infra/cloudflare/pages-project/providers.tf`**

```hcl
# CLOUDFLARE_API_TOKEN from env, never in code. See ~/.ai/Common.md §4.
# Required token scopes: Account → Cloudflare Pages (Edit).
provider "cloudflare" {}
```

- [ ] **Step 3: `infra/cloudflare/pages-project/variables.tf`**

```hcl
variable "cloudflare_account_id" {
  description = "Cloudflare account ID that owns the Pages project."
  type        = string
}

variable "project_name" {
  description = "Cloudflare Pages project name. Default URL: https://<project_name>.pages.dev."
  type        = string
  default     = "agent-atoms"
}

variable "production_branch" {
  description = "Branch that triggers production deployments."
  type        = string
  default     = "main"
}
```

- [ ] **Step 4: `infra/cloudflare/pages-project/main.tf`**

```hcl
# Direct-upload Pages project. Deployments arrive via `wrangler pages
# deploy` in .github/workflows/deploy.yml — no Git-source binding.
resource "cloudflare_pages_project" "this" {
  account_id        = var.cloudflare_account_id
  name              = var.project_name
  production_branch = var.production_branch
}
```

- [ ] **Step 5: `infra/cloudflare/pages-project/outputs.tf`**

```hcl
output "project_name" {
  description = "Cloudflare Pages project name."
  value       = cloudflare_pages_project.this.name
}

output "subdomain" {
  description = "Default Pages subdomain (e.g., agent-atoms.pages.dev)."
  value       = cloudflare_pages_project.this.subdomain
}

output "created_on" {
  description = "Project creation timestamp."
  value       = cloudflare_pages_project.this.created_on
}
```

- [ ] **Step 6: `infra/cloudflare/pages-project/terraform.tfvars.example`**

```hcl
# Copy to terraform.tfvars (gitignored) or set TF_VAR_cloudflare_account_id.
cloudflare_account_id = "<convergent-systems-co account id>"
# project_name      = "agent-atoms"        # defaults match
# production_branch = "main"
```

- [ ] **Step 7: `infra/cloudflare/pages-project/README.md`**

```markdown
# infra/cloudflare/pages-project

Terraform module that creates the Cloudflare Pages project `agent-atoms` deploys to.

## Audience

Contributor bootstrapping agent-atoms in a fresh Cloudflare account, or recovering the project after deletion.

## What this creates

A single `cloudflare_pages_project` named `agent-atoms` with production branch `main`. Deployments arrive via `wrangler pages deploy` from `.github/workflows/deploy.yml` — no Git-source binding here.

## Prerequisites

- OpenTofu or Terraform `>= 1.6.0`.
- AWS-compatible credentials for the `cs-tfstate` R2 backend. Use `~/.env/convergent-systems.co/.env` via `eval "$(cat …)"` (the `. file` source pattern doesn't work on a FIFO — see prompt-atoms PR #14 for the diagnostic).
- `CLOUDFLARE_API_TOKEN` exported with `Cloudflare Pages — Edit` scope.
- The convergent-systems-co Cloudflare account ID (in the FIFO as `CLOUDFLARE_ACCOUNT_ID`).

## Apply

```bash
cd infra/cloudflare/pages-project

# Load CS env from 1Password FIFO
set -a
eval "$(cat ~/.env/convergent-systems.co/.env)"
set +a
export CLOUDFLARE_API_TOKEN="$CLOUDFLARE_ACCOUNT_TOKEN"
export TF_VAR_cloudflare_account_id="$CLOUDFLARE_ACCOUNT_ID"

tofu init
tofu plan
tofu apply -auto-approve
```

After apply, the project is live at `https://agent-atoms.pages.dev`. Custom domain `agent-atoms.com` is attached out-of-band in the Cloudflare dashboard.

## State

```
s3://cs-tfstate/state-bucket/convergent-systems-co/agent-atoms/pages-project.tfstate
```

## Destroy

```bash
tofu destroy
```
```

- [ ] **Step 8: Commit (do not init/plan/apply yet — that's Tasks 22-24)**

```bash
git add infra/
git commit -m "feat(infra): Terraform module for CF Pages project

agent-atoms/infra/cloudflare/pages-project/ mirrors prompt-atoms.
State key per ~/.ai/memory/reference_terraform_state_keys.md:
  s3://cs-tfstate/state-bucket/convergent-systems-co/agent-atoms/pages-project.tfstate"
```

---

## Task 22: tofu init + plan

**Files:** none (downloads provider, configures backend).

- [ ] **Step 1: Source FIFO and run init**

```bash
bash -c '
set -a
eval "$(cat ~/.env/convergent-systems.co/.env)" 2>/dev/null
set +a
export CLOUDFLARE_API_TOKEN="$CLOUDFLARE_ACCOUNT_TOKEN"
export TF_VAR_cloudflare_account_id="$CLOUDFLARE_ACCOUNT_ID"
cd /Users/itsfwcp/workspace/convergent-system-co/atoms/agent-atoms/infra/cloudflare/pages-project
tofu init 2>&1 | tail -10
'
```

Expected: `OpenTofu has been successfully initialized!`.

- [ ] **Step 2: Run plan**

```bash
bash -c '
set -a
eval "$(cat ~/.env/convergent-systems.co/.env)" 2>/dev/null
set +a
export CLOUDFLARE_API_TOKEN="$CLOUDFLARE_ACCOUNT_TOKEN"
export TF_VAR_cloudflare_account_id="$CLOUDFLARE_ACCOUNT_ID"
cd /Users/itsfwcp/workspace/convergent-system-co/atoms/agent-atoms/infra/cloudflare/pages-project
tofu plan 2>&1 | tail -20
'
```

Expected: `Plan: 1 to add, 0 to change, 0 to destroy.` with `cloudflare_pages_project.this` to be created (name=`agent-atoms`, production_branch=`main`).

---

## Task 23: **[GATE]** tofu apply

**Files:** updates remote state.

- [ ] **Step 1: Confirm gate with user**

State: "About to `tofu apply -auto-approve` for the agent-atoms CF Pages project. Reversible via `tofu destroy`. No cost. Proceed?" Wait for unambiguous "yes."

- [ ] **Step 2: Apply**

```bash
bash -c '
set -a
eval "$(cat ~/.env/convergent-systems.co/.env)" 2>/dev/null
set +a
export CLOUDFLARE_API_TOKEN="$CLOUDFLARE_ACCOUNT_TOKEN"
export TF_VAR_cloudflare_account_id="$CLOUDFLARE_ACCOUNT_ID"
cd /Users/itsfwcp/workspace/convergent-system-co/atoms/agent-atoms/infra/cloudflare/pages-project
tofu apply -auto-approve 2>&1 | tail -15
'
```

Expected: `Apply complete! Resources: 1 added, 0 changed, 0 destroyed.` Outputs: `project_name = "agent-atoms"`, `subdomain = "agent-atoms.pages.dev"`.

- [ ] **Step 3: Verify project exists via API**

```bash
bash -c '
set -a
eval "$(cat ~/.env/convergent-systems.co/.env)" 2>/dev/null
set +a
curl -s -H "Authorization: Bearer $CLOUDFLARE_ACCOUNT_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/agent-atoms" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(\"success:\",d[\"success\"]); print(\"name:\",d[\"result\"][\"name\"]); print(\"subdomain:\",d[\"result\"][\"subdomain\"])"
'
```

Expected: `success: True`, `name: agent-atoms`, `subdomain: agent-atoms.pages.dev`.

---

## Task 24: Set repo-level `CLOUDFLARE_API_TOKEN` on agent-atoms

**Files:** updates GitHub repo secret (stopgap until atoms#2 promotes org secret).

- [ ] **Step 1: Pipe FIFO value into gh secret**

```bash
bash -c '
set -a
eval "$(cat ~/.env/convergent-systems.co/.env)" 2>/dev/null
set +a
printf "%s" "$CLOUDFLARE_ACCOUNT_TOKEN" | gh secret set CLOUDFLARE_API_TOKEN --repo convergent-systems-co/agent-atoms
'
```

- [ ] **Step 2: Verify**

```bash
gh secret list --repo convergent-systems-co/agent-atoms
```

Expected: `CLOUDFLARE_API_TOKEN` listed with recent timestamp.

---

## Task 25: **[GATE]** Push branch and open PR

**Files:** none.

- [ ] **Step 1: Final pre-push verification**

```bash
git status
git log main..HEAD --oneline
python3 scripts/validate.py | tail -3
```

Expected: clean tree; ~20 commits on the branch; `all valid`.

- [ ] **Step 2: **[GATE]** Confirm push with user**

State: "About to `git push -u origin feat/v0.1-completion` on convergent-systems-co/agent-atoms. Branch becomes visible on GitHub; CI deploy workflow will fire (CF project already exists from Task 23, so the deploy step should succeed first try). Proceed?" Wait for "yes."

- [ ] **Step 3: Push**

```bash
git push -u origin feat/v0.1-completion
```

- [ ] **Step 4: **[GATE]** Confirm PR open with user**

State: "About to `gh pr create` against convergent-systems-co/agent-atoms:main. Proceed?" Wait for "yes."

- [ ] **Step 5: Open PR**

```bash
gh pr create --title "feat(v0.1): complete bootstrap — compositions, rules, exports, web/, TF-managed CF Pages" --body "$(cat <<'EOF'
## Summary

Brings agent-atoms to a fully-shipped v0.1 per [the design spec](https://github.com/convergent-systems-co/atoms/blob/main/docs/superpowers/specs/2026-05-21-prompt-agent-v0.1-completion-design.md):

- **48 atoms** total (was 10): 10 persona, 20 tool-definition, 8 capability-declaration, 5 role-boundary, 5 isolation-constraint.
- **2 compositions** under `agents/`: `code-reviewer` and `runbook-executor`.
- **2 schemas**: `composition-v1.json`, `rule-v1.json`.
- **2 rules**: capability-grant (exec-requires-isolation), isolation-rule (network-write-requires-allowlist).
- **`exports/catalog.json`** — built and validated.
- **`scripts/build-exports.py`** — catalog builder.
- **`scripts/validate.py`** — extended for compositions (with ref resolution) and rules.
- **`web/`** — Astro 6 + React 19 site with landing, how-to-use, install, atom browser, atom detail, composition browser, composition detail.
- **`infra/cloudflare/pages-project/`** — Terraform module managing the CF Pages project (applied; project exists at `agent-atoms.pages.dev`).
- **CF Pages deploy** — `.github/workflows/deploy.yml` runs validate + build + `wrangler pages deploy` on every push to main.

## Deferred

- Olympus integration (external dependency).
- LangChain / AutoGen / CrewAI compilers (v0.2).
- Cross-catalog `see_also` (schema regex restricts to this catalog — v0.2).
- Custom-domain attachment (`agent-atoms.com`) — out-of-band dashboard action.
- xdao.co listing — separate PR against `convergent-systems-co/xdao`.

## Test plan

- [ ] CI: `python3 scripts/validate.py` exits 0.
- [ ] CI: `python3 scripts/build-exports.py` rebuilds `exports/catalog.json`.
- [ ] CI: `pnpm install --frozen-lockfile && pnpm build` in `web/` produces `dist/`.
- [ ] CF Pages: preview deploy returns 200 for `/`, `/atoms/`, `/atoms/persona/code-reviewer/`, `/agents/`, `/agents/code-reviewer/`, `/exports/catalog.json`.
- [ ] Headers: `curl -I https://<preview-url>/exports/catalog.json` shows `Content-Type: application/json; charset=utf-8`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Task 26: Watch CI + verify preview

**Files:** none.

- [ ] **Step 1: Watch the CI run**

```bash
RUN_ID=$(gh run list --repo convergent-systems-co/agent-atoms --branch feat/v0.1-completion --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch $RUN_ID --repo convergent-systems-co/agent-atoms --exit-status 2>&1 | tail -10
```

Expected: all steps `✓` (including "Deploy to Cloudflare Pages").

- [ ] **Step 2: Extract preview URL**

```bash
gh run view $RUN_ID --repo convergent-systems-co/agent-atoms --log 2>&1 | grep -E "Deployment complete|pages\.dev" | head -3
```

- [ ] **Step 3: Verify pages and headers**

```bash
PREVIEW_URL=https://head.agent-atoms.pages.dev   # branch alias; specific preview also available
curl -sI $PREVIEW_URL/ | head -3
curl -sI $PREVIEW_URL/exports/catalog.json | head -6
curl -sI $PREVIEW_URL/atoms/persona/code-reviewer/ | head -3
curl -sI $PREVIEW_URL/agents/code-reviewer/ | head -3
```

Expected: all `200 OK`; `/exports/catalog.json` returns `Content-Type: application/json; charset=utf-8`.

---

## Task 27: Umbrella submodule bump (tail step — done in `atoms/` repo)

**Files:** modifies submodule pointers in `/Users/itsfwcp/workspace/convergent-system-co/atoms/`.

Run **after both** `prompt-atoms#14` and the new agent-atoms PR have merged to their respective `main` branches.

- [ ] **Step 1: Switch to umbrella**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms
git checkout main && git pull origin main
```

- [ ] **Step 2: Update both submodules to merged commits**

```bash
git submodule update --remote --merge prompt-atoms agent-atoms
```

- [ ] **Step 3: Verify what changed**

```bash
git status
git diff --submodule prompt-atoms agent-atoms
```

Expected: both submodule pointers advanced to the merged-on-main SHAs.

- [ ] **Step 4: Commit**

```bash
git add prompt-atoms agent-atoms
git commit -m "chore: bump prompt-atoms + agent-atoms — v0.1 complete

Both catalogs fully shipped:
  - 50 / 48 atoms respectively
  - composition + rule schemas
  - exports/catalog.json built and served
  - Astro web/ site on prompt-atoms.com / agent-atoms.com
  - Terraform-managed CF Pages projects
  - GH Actions deploy on every push to main

See:
  - prompt-atoms#14
  - agent-atoms#<PR number>
  - atoms#2 (catalog-wide TF migration tracking)"
```

- [ ] **Step 5: **[GATE]** Push umbrella bump**

State: "About to `git push origin main` on convergent-systems-co/atoms. Submodule pointers go to GitHub. Proceed?" Wait for "yes."

```bash
git push origin main
```

---

## Definition of Done

- [ ] All 27 tasks complete.
- [ ] agent-atoms PR open and merged on convergent-systems-co/agent-atoms.
- [ ] CF Pages deploy green; preview URL serves 200s with correct content-types.
- [ ] CF Pages project `agent-atoms` exists in Terraform state at the documented R2 key.
- [ ] Umbrella `atoms/` repo's submodule pointers bumped to merged child commits.
- [ ] Both catalogs (`prompt-atoms`, `agent-atoms`) at v0.1 in the umbrella.

Follow-ups (not blocking):
- Promote repo-level `CLOUDFLARE_API_TOKEN` to org-level (per atoms#2 + Code.md §5).
- Attach `agent-atoms.com` custom domain in the CF dashboard.
- File xdao listing PR.
