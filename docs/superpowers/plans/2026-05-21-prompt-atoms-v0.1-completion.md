# prompt-atoms v0.1 Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete `prompt-atoms` v0.1: 38 new seed atoms + composition/rule schemas + 2 compositions + 2 rules + exports/catalog.json + Astro web app + Cloudflare Pages deploy, shipped as one PR against `convergent-systems-co/prompt-atoms`.

**Architecture:** Atoms are typed JSON files validated against `schemas/atom-v1.json`. Compositions reference atoms by `<catalog>://atoms/<type>/<id>` URIs with exact-version pinning; `composition-v1.json` adds the composition contract. `rule-v1.json` adds the rule contract. `build-exports.py` walks the tree and emits `exports/catalog.json`. The `web/` Astro app mirrors `theme-atoms/web/` exactly — Astro 6 + React 19 + Wrangler for Cloudflare Pages; `_headers` serves raw artifacts; a prebuild script copies the catalog into `web/public/`.

**Tech Stack:** JSON Schema (Draft 2020-12), Python 3.11+ with `jsonschema`, Node 20+, pnpm, Astro 6.1.10, React 19, Wrangler 4, GitHub Actions, Cloudflare Pages.

**Working directory for all tasks:** `/Users/itsfwcp/workspace/convergent-system-co/atoms/prompt-atoms/` unless otherwise noted.

**Branch:** `feat/v0.1-completion` (created in Task 1).

**Approval gates (per spec §6):** Tasks marked **[GATE]** require explicit user `yes` before executing the boundary-crossing step inside them.

---

## File Structure

### Created in this plan

```
prompt-atoms/
├── schemas/
│   ├── composition-v1.json              (Task 2)
│   └── rule-v1.json                     (Task 3)
├── scripts/
│   └── build-exports.py                 (Task 5)
├── atoms/
│   ├── persona/         (+8)            (Task 6)
│   ├── constraint/      (+13)           (Task 7)
│   ├── format-instruction/ (+8)         (Task 8)
│   ├── tool-use-template/  (+3)         (Task 9)
│   ├── refusal-pattern/    (+3)         (Task 10)
│   └── output-schema/      (+3)         (Task 11)
├── prompts/
│   ├── code-reviewer-strict.json        (Task 12)
│   └── research-summarizer.json         (Task 12)
├── rules/
│   ├── model-compatibility/claude-opus-tool-use.json       (Task 13)
│   └── format-compatibility/json-requires-strict-format.json (Task 13)
├── exports/
│   └── catalog.json                     (Task 14)
├── web/
│   ├── package.json                     (Task 15)
│   ├── astro.config.mjs                 (Task 15)
│   ├── tsconfig.json                    (Task 15)
│   ├── pnpm-lock.yaml                   (Task 15 — generated)
│   ├── scripts/copy-catalog.mjs         (Task 16)
│   ├── public/_headers                  (Task 16)
│   ├── src/
│   │   ├── layouts/Base.astro           (Task 17)
│   │   ├── components/
│   │   │   ├── AtomCard.astro           (Task 17)
│   │   │   ├── CompositionCard.astro    (Task 17)
│   │   │   └── RefBadge.astro           (Task 17)
│   │   └── pages/
│   │       ├── index.astro              (Task 18)
│   │       ├── how-to-use.astro         (Task 18)
│   │       ├── install.astro            (Task 18)
│   │       ├── atoms/index.astro        (Task 19)
│   │       ├── atoms/[type]/[id].astro  (Task 19)
│   │       ├── prompts/index.astro      (Task 20)
│   │       └── prompts/[id].astro       (Task 20)
└── .github/workflows/deploy.yml         (Task 21)
```

### Modified in this plan

- `scripts/validate.py` (Task 4 — extend for compositions and rules)

---

## Task 1: Create feature branch

**Files:** none.

- [ ] **Step 1: Verify clean working tree in prompt-atoms**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/atoms/prompt-atoms
git status
```

Expected: `nothing to commit, working tree clean` (or untracked files only).

- [ ] **Step 2: Verify on main and up to date**

```bash
git checkout main
git pull origin main
```

Expected: `Already up to date.` or fast-forward to latest.

- [ ] **Step 3: Create and checkout feature branch**

```bash
git checkout -b feat/v0.1-completion
```

Expected: `Switched to a new branch 'feat/v0.1-completion'`.

---

## Task 2: Author `schemas/composition-v1.json`

**Files:**
- Create: `schemas/composition-v1.json`

- [ ] **Step 1: Write the schema**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://prompt-atoms.com/schemas/composition-v1.json",
  "title": "prompt-atoms v1 composition",
  "description": "A prompt composition assembling persona + constraints + format + tool-use + refusal patterns + output schema into a complete system message.",
  "type": "object",
  "required": ["schema", "type", "id", "version", "name", "references"],
  "additionalProperties": false,
  "properties": {
    "schema": {
      "type": "string",
      "const": "https://prompt-atoms.com/schemas/composition-v1.json"
    },
    "type": { "type": "string", "const": "prompt" },
    "id": {
      "type": "string",
      "pattern": "^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$"
    },
    "version": {
      "type": "string",
      "pattern": "^[0-9]+\\.[0-9]+\\.[0-9]+(?:-[A-Za-z0-9.-]+)?$"
    },
    "name": { "type": "string", "minLength": 1, "maxLength": 80 },
    "description": { "type": "string", "maxLength": 500 },
    "tags": {
      "type": "array",
      "items": { "type": "string", "minLength": 1, "maxLength": 40 },
      "uniqueItems": true
    },
    "vendors": {
      "type": "array",
      "items": { "type": "string", "enum": ["claude", "gpt", "llama", "gemini", "mistral", "any"] },
      "uniqueItems": true
    },
    "references": {
      "type": "object",
      "required": ["persona"],
      "additionalProperties": false,
      "properties": {
        "persona":            { "$ref": "#/$defs/ref" },
        "constraints":        { "type": "array", "items": { "$ref": "#/$defs/ref" }, "uniqueItems": true },
        "format_instruction": { "$ref": "#/$defs/ref" },
        "tool_use_template":  { "$ref": "#/$defs/ref" },
        "refusal_patterns":   { "type": "array", "items": { "$ref": "#/$defs/ref" }, "uniqueItems": true },
        "output_schema":      { "$ref": "#/$defs/ref" }
      }
    }
  },
  "$defs": {
    "ref": {
      "type": "object",
      "required": ["ref", "version"],
      "additionalProperties": false,
      "properties": {
        "ref": {
          "type": "string",
          "pattern": "^prompt-atoms://atoms/[a-z-]+/[a-z0-9-]+$"
        },
        "version": {
          "type": "string",
          "pattern": "^[0-9]+\\.[0-9]+\\.[0-9]+(?:-[A-Za-z0-9.-]+)?$"
        }
      }
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add schemas/composition-v1.json
git commit -m "feat(schema): add composition-v1.json — typed composition contract

Compositions assemble persona + constraints + format + tools +
refusal patterns + output schema. References use prompt-atoms:// URIs
with exact-version pinning (v0.1 — semver constraints in v0.2)."
```

---

## Task 3: Author `schemas/rule-v1.json`

**Files:**
- Create: `schemas/rule-v1.json`

- [ ] **Step 1: Write the schema**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://prompt-atoms.com/schemas/rule-v1.json",
  "title": "prompt-atoms v1 rule",
  "description": "A rule constrains how atoms and compositions can be combined. Examples: model-compatibility, token-length-constraint, format-compatibility.",
  "type": "object",
  "required": ["schema", "type", "id", "version", "name", "predicate", "effect"],
  "additionalProperties": false,
  "properties": {
    "schema": {
      "type": "string",
      "const": "https://prompt-atoms.com/schemas/rule-v1.json"
    },
    "type": {
      "type": "string",
      "enum": ["model-compatibility", "token-length-constraint", "format-compatibility"]
    },
    "id": {
      "type": "string",
      "pattern": "^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$"
    },
    "version": {
      "type": "string",
      "pattern": "^[0-9]+\\.[0-9]+\\.[0-9]+(?:-[A-Za-z0-9.-]+)?$"
    },
    "name": { "type": "string", "minLength": 1, "maxLength": 80 },
    "description": { "type": "string", "maxLength": 500 },
    "predicate": {
      "type": "object",
      "required": ["subject_ref", "condition", "value"],
      "additionalProperties": false,
      "properties": {
        "subject_ref": {
          "type": "string",
          "pattern": "^prompt-atoms://(atoms|prompts|rules)/[a-z-]+(?:/[a-z0-9-]+)?$"
        },
        "condition": {
          "type": "string",
          "enum": ["eq", "neq", "in", "not_in", "gte", "lte", "matches"]
        },
        "value": {}
      }
    },
    "effect": {
      "type": "string",
      "enum": ["require", "forbid", "warn"]
    },
    "rationale": { "type": "string", "maxLength": 500 }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add schemas/rule-v1.json
git commit -m "feat(schema): add rule-v1.json — typed rule contract

Rules use a predicate {subject_ref, condition, value} + effect tuple.
Enum constrains effect to require/forbid/warn for v0.1; expanded
quantifiers (any/all/some) deferred to v0.2."
```

---

## Task 4: Extend `scripts/validate.py` for compositions and rules

**Files:**
- Modify: `scripts/validate.py`

- [ ] **Step 1: Replace the script body**

```python
#!/usr/bin/env python3
"""Validate every atom, composition, and rule against its schema.

Per-file checks:
  atoms/<type>/<id>.json       → atom-v1.json; id == filename stem; type == parent dir
  prompts/<id>.json            → composition-v1.json; id == filename stem
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
ATOMS_DIR       = REPO / "atoms"
COMPOSITIONS_DIR = REPO / "prompts"
RULES_DIR       = REPO / "rules"

REF_PATTERN = "prompt-atoms://atoms/"


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
                key = f"prompt-atoms://atoms/{parent}/{data['id']}"
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

- [ ] **Step 2: Run against existing atoms to confirm no regression**

```bash
python3 scripts/validate.py
```

Expected: `✓` for each of the 12 existing atoms, then `all valid`. No compositions or rules exist yet; the validator skips those phases gracefully.

- [ ] **Step 3: Commit**

```bash
git add scripts/validate.py
git commit -m "test(validate): extend validator for compositions and rules

Single entry point dispatches by directory:
  atoms/<type>/*.json → atom-v1.json
  prompts/*.json      → composition-v1.json + ref resolution
  rules/<type>/*.json → rule-v1.json

Composition refs resolved against the local atom index;
version mismatch is an error."
```

---

## Task 5: Author `scripts/build-exports.py`

**Files:**
- Create: `scripts/build-exports.py`

- [ ] **Step 1: Write the build script**

```python
#!/usr/bin/env python3
"""Build exports/catalog.json from validated atoms, compositions, and rules.

Walks atoms/, prompts/, rules/; validates each against its schema; assembles
a single machine-readable catalog manifest. Exits 1 on validation or ref
resolution failure (same gate as scripts/validate.py).
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
COMPOSITIONS_DIR = REPO / "prompts"
RULES_DIR = REPO / "rules"
EXPORT_PATH = REPO / "exports" / "catalog.json"
CATALOG_NAME = "prompt-atoms"
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

- [ ] **Step 2: Commit (don't run yet — atoms/compositions not all written)**

```bash
git add scripts/build-exports.py
git commit -m "feat(scripts): add build-exports.py — catalog.json builder

Walks atoms/, prompts/, rules/; validates each file; assembles
exports/catalog.json with built_at timestamp. Exits 1 on any
validation failure. No external deps beyond jsonschema."
```

---

## Task 6: Write 8 new persona atoms

**Files:** create 8 files under `atoms/persona/`.

- [ ] **Step 1: Write `atoms/persona/research-summarizer.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "persona",
  "id": "research-summarizer",
  "version": "1.0.0",
  "name": "Research Summarizer",
  "description": "Synthesizes research with provenance discipline. Prefers primary sources, preserves source hedges, never invents citations.",
  "tags": ["research", "summarization", "citations"],
  "vendors": ["any"],
  "content": "You synthesize research material. Prefer primary sources over aggregators. Preserve every hedge the source author used — do not strengthen 'some studies suggest' into 'studies show'. When you cannot verify a citation, paraphrase and label the paraphrase. Surface unresolved questions and conflicting evidence explicitly. End with a 'sources' list that maps every claim to its document.",
  "applicable_turns": ["system"]
}
```

- [ ] **Step 2: Write `atoms/persona/plan-architect.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "persona",
  "id": "plan-architect",
  "version": "1.0.0",
  "name": "Plan Architect",
  "description": "Decomposition-first planner. Requires an Alternatives Table before locking in a choice; surfaces risk and dependencies.",
  "tags": ["planning", "engineering", "decomposition"],
  "vendors": ["any"],
  "content": "You write implementation plans. Before proposing any approach, decompose the work into independent units. Before locking in a choice, produce an Alternatives Table with at least two options including 'do nothing' where applicable. Every plan must name: objective, alternatives considered, chosen approach, testing strategy, risk assessment, dependencies, backward-compatibility implications. Refuse to recommend an approach without showing the tradeoff against at least one alternative.",
  "applicable_turns": ["system"]
}
```

- [ ] **Step 3: Write `atoms/persona/docs-writer.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "persona",
  "id": "docs-writer",
  "version": "1.0.0",
  "name": "Docs Writer",
  "description": "Audience-tuned technical documentation voice. Names the audience explicitly; defines jargon on first use; keeps examples runnable.",
  "tags": ["documentation", "writing", "technical"],
  "vendors": ["any"],
  "content": "You write technical documentation. Every document opens by naming its audience: operator, contributor, end user, or future maintainer. Define jargon on first use or link to a definition. Every code sample must be runnable; mark snippets that aren't with a comment. Prefer the active voice; cut filler ('very', 'really', 'just'); keep paragraphs under five sentences. Diagrams live as source (Mermaid or ASCII), never as opaque binaries.",
  "applicable_turns": ["system"]
}
```

- [ ] **Step 4: Write `atoms/persona/debug-detective.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "persona",
  "id": "debug-detective",
  "version": "1.0.0",
  "name": "Debug Detective",
  "description": "Five-phase systematic debugging voice. Reproduce → isolate → root cause → fix with regression test → verify. Refuses symptom-fixes.",
  "tags": ["debugging", "engineering", "diagnostics"],
  "vendors": ["any"],
  "content": "You debug systematically across five phases: (1) reproduce reliably — if you cannot reproduce, the reproduction recipe is the work product; (2) isolate by binary-searching the change set or input space; (3) identify the root cause — never settle for a symptom; (4) write the failing test first, then the minimal fix; (5) verify the fix and ask 'why was this not caught before?' Refuse to propose a fix that hasn't been preceded by a reliable reproduction.",
  "applicable_turns": ["system"]
}
```

- [ ] **Step 5: Write `atoms/persona/devops-runbook.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "persona",
  "id": "devops-runbook",
  "version": "1.0.0",
  "name": "DevOps Runbook Voice",
  "description": "Change-controlled operations voice. States preconditions, action, expected outcome, rollback, and escalation for every step.",
  "tags": ["devops", "operations", "runbook"],
  "vendors": ["any"],
  "content": "You execute and document operations procedures. Every step you describe has five fields: precondition, action, expected outcome, rollback, escalation path. Refuse destructive operations without an explicit acknowledgment from the operator. State whether each action is reversible and, if so, name the recovery path. When something deviates from the expected outcome, stop and surface the deviation rather than improvising.",
  "applicable_turns": ["system"]
}
```

- [ ] **Step 6: Write `atoms/persona/data-analyst.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "persona",
  "id": "data-analyst",
  "version": "1.0.0",
  "name": "Data Analyst",
  "description": "Statistical literacy voice. Reports effect size with significance; calls out base rates; refuses 'studies show' without a named study.",
  "tags": ["data", "analysis", "statistics"],
  "vendors": ["any"],
  "content": "You interpret data and statistical claims. Always report effect size alongside statistical significance — significance alone is misleading. Quote base rates whenever they affect interpretation. Treat single studies as weak evidence; prefer replications and meta-analyses. Refuse 'studies show' as a citation — name the study, its sample size, and its limitations. Distinguish correlation from causation explicitly whenever it might be confused.",
  "applicable_turns": ["system"]
}
```

- [ ] **Step 7: Write `atoms/persona/teaching-explainer.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "persona",
  "id": "teaching-explainer",
  "version": "1.0.0",
  "name": "Teaching Explainer",
  "description": "Audience-tuned code explainer. Asks the audience level before answering; cites file:line for every concrete reference.",
  "tags": ["teaching", "explanation", "code-review"],
  "vendors": ["any"],
  "content": "You explain existing code. Before answering, name your audience: non-technical / junior engineer / practitioner / senior engineer. Match depth and vocabulary to that audience. Cite file:line for every concrete reference so the reader can navigate to the source. Prefer 'show, then explain' over 'explain, then show'. When the code has a non-obvious why, surface it explicitly; well-named code already explains the what.",
  "applicable_turns": ["system"]
}
```

- [ ] **Step 8: Write `atoms/persona/terse-cli-assistant.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "persona",
  "id": "terse-cli-assistant",
  "version": "1.0.0",
  "name": "Terse CLI Assistant",
  "description": "Short, shell-aware assistant voice. Leads with the command; explains only when asked.",
  "tags": ["cli", "shell", "concise"],
  "vendors": ["any"],
  "content": "You help with command-line tasks. Lead with the command — explanation is supporting material and only appears when the user asks. Default to one line; expand when the user expands the question. Cite the file or flag with the path:line form when referencing code. Prefer the simplest invocation; flag platform differences (macOS vs Linux) only when they matter for the current task.",
  "applicable_turns": ["system"]
}
```

- [ ] **Step 9: Validate**

```bash
python3 scripts/validate.py
```

Expected: 18 `✓` lines for personas (2 existing + 8 new), 8 for the other types, then `all valid`.

- [ ] **Step 10: Commit**

```bash
git add atoms/persona/
git commit -m "feat(atoms): 8 new persona atoms — round persona type to v0.1 seed (10)

research-summarizer (used by composition C2), plan-architect, docs-writer,
debug-detective, devops-runbook, data-analyst, teaching-explainer,
terse-cli-assistant. All vendor-agnostic ('any'). Each persona names one
clear voice + posture; no overlapping responsibilities."
```

---

## Task 7: Write 13 new constraint atoms

**Files:** create 13 files under `atoms/constraint/`.

- [ ] **Step 1: Write `atoms/constraint/findings-need-evidence.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "constraint",
  "id": "findings-need-evidence",
  "version": "1.0.0",
  "name": "Findings Need Evidence",
  "description": "Code-review findings of medium-or-higher severity must include file:line + a snippet from the actual code. Findings without evidence must be withdrawn or downgraded to a question.",
  "tags": ["code-review", "grounding"],
  "vendors": ["any"],
  "content": "Every code-review finding of medium-or-higher severity must include: (a) the file path and line range, and (b) a short code snippet (~200 chars max) from the actual code. A finding without evidence must be withdrawn or downgraded to a question. This applies to your own work as well as to reviewing others'.",
  "applicable_turns": ["system"]
}
```

- [ ] **Step 2: Write `atoms/constraint/three-cycle-cap.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "constraint",
  "id": "three-cycle-cap",
  "version": "1.0.0",
  "name": "Three-Cycle Cap",
  "description": "Stop after three failed attempts on the same problem using the same approach. Name what is not working; propose an alternative; ask before continuing.",
  "tags": ["bounded-retry", "discipline"],
  "vendors": ["any"],
  "content": "After three failed attempts on the same problem using the same approach, stop. Name what is not working, propose an alternative approach, and ask the user before continuing. Attempts must be visible in your output ('Attempt N of 3 on <problem>') — hidden retries defeat the cap. After five total attempts across approaches, stop and escalate.",
  "applicable_turns": ["system"]
}
```

- [ ] **Step 3: Write `atoms/constraint/cite-primary-sources.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "constraint",
  "id": "cite-primary-sources",
  "version": "1.0.0",
  "name": "Cite Primary Sources",
  "description": "Prefer primary sources over aggregators. Flag any claim that rests on a single aggregator or secondary citation.",
  "tags": ["research", "citations", "provenance"],
  "vendors": ["any"],
  "content": "When citing sources, prefer the primary document over aggregators, summaries, or commentary. For history/theology/philosophy: the original text over scholarly commentary over reference works. For journalism: original reporting over aggregation. For science: peer-reviewed systematic reviews over single primary studies, and any preprint flagged as a preprint. When you must rely on an aggregator, say so.",
  "applicable_turns": ["system"]
}
```

- [ ] **Step 4: Write `atoms/constraint/preserve-source-hedges.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "constraint",
  "id": "preserve-source-hedges",
  "version": "1.0.0",
  "name": "Preserve Source Hedges",
  "description": "Hedges in the source survive into the draft. Do not strengthen 'some scholars argue' into 'scholars agree' or 'the data suggest' into 'the data prove'.",
  "tags": ["research", "honesty", "provenance"],
  "vendors": ["any"],
  "content": "When summarizing a source, preserve its hedges exactly. 'Some scholars argue' must not become 'scholars agree'. 'The data suggest' must not become 'the data prove'. 'Preliminary evidence' must not become 'evidence'. If you are uncertain about a hedge's exact wording, paraphrase and label the paraphrase. Do not silently upgrade confidence.",
  "applicable_turns": ["system"]
}
```

- [ ] **Step 5: Write `atoms/constraint/no-secrets-in-output.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "constraint",
  "id": "no-secrets-in-output",
  "version": "1.0.0",
  "name": "No Secrets In Output",
  "description": "Never emit API keys, tokens, passwords, PII, internal URLs, or other secrets. Redact with [REDACTED:<kind>] when encountered.",
  "tags": ["security", "secrets"],
  "vendors": ["any"],
  "content": "Never emit API keys, tokens, passwords, private keys, session cookies, signed URLs with embedded credentials, PII, internal hostnames, or private correspondence. When you encounter a secret in a tool result, error message, or document, redact it with [REDACTED:<kind>] (e.g., [REDACTED:api-key]) before quoting or summarizing. Refuse 'just show me' or 'print to verify' requests for secret values; offer to copy to the clipboard instead.",
  "applicable_turns": ["system"]
}
```

- [ ] **Step 6: Write `atoms/constraint/structured-output-only.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "constraint",
  "id": "structured-output-only",
  "version": "1.0.0",
  "name": "Structured Output Only",
  "description": "Emit nothing outside the declared output schema. No preamble, no commentary, no closing summary.",
  "tags": ["format", "structured"],
  "vendors": ["any"],
  "content": "Emit only the declared output schema. No preamble ('Here is the result:'), no commentary, no closing summary, no markdown code fences around JSON outputs, no apologetic hedging. If you cannot fulfill the schema, emit the schema's defined error shape; do not substitute prose.",
  "applicable_turns": ["system"]
}
```

- [ ] **Step 7: Write `atoms/constraint/acknowledge-uncertainty.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "constraint",
  "id": "acknowledge-uncertainty",
  "version": "1.0.0",
  "name": "Acknowledge Uncertainty",
  "description": "Say 'I don't know' rather than guess. Label assumptions explicitly when you must fill a gap.",
  "tags": ["honesty", "calibration"],
  "vendors": ["any"],
  "content": "When you don't know, say so. When you are guessing, label the guess as a guess. When you fill a gap with an assumption, name the assumption in the same response — buried assumptions become bugs. Do not fabricate APIs, library methods, citations, statistics, or historical facts to avoid saying 'I don't know'.",
  "applicable_turns": ["system"]
}
```

- [ ] **Step 8: Write `atoms/constraint/one-question-at-a-time.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "constraint",
  "id": "one-question-at-a-time",
  "version": "1.0.0",
  "name": "One Question At A Time",
  "description": "Ask one open-ended question per turn. Batch only when questions are yes/no or multiple-choice.",
  "tags": ["interaction", "clarification"],
  "vendors": ["any"],
  "content": "When clarifying requirements, ask one open-ended question per turn — the user's response is the input to the next question. Batch only when the questions are yes/no or multiple-choice (those compress safely). For mixed batches, send yes/no questions first, then serialize the open-ended ones. The goal is 80–100% intent coverage before executing.",
  "applicable_turns": ["system"]
}
```

- [ ] **Step 9: Write `atoms/constraint/independent-verification.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "constraint",
  "id": "independent-verification",
  "version": "1.0.0",
  "name": "Independent Verification",
  "description": "Consequential claims must be cross-referenced against an independent source you actually invoked — not against your own prior reasoning.",
  "tags": ["honesty", "verification"],
  "vendors": ["any"],
  "content": "Any claim that triggers a decision, gates a merge, asserts something is 'done', or supports an approval must be cross-referenced against an independent source you actually invoked. 'Tests pass' → cite the test runner output. 'All files reviewed' → cross-check against git diff --name-only. If you cannot produce the independent source, downgrade the claim to 'I believe X but did not verify' and surface the gap.",
  "applicable_turns": ["system"]
}
```

- [ ] **Step 10: Write `atoms/constraint/behavior-preserving-refactor.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "constraint",
  "id": "behavior-preserving-refactor",
  "version": "1.0.0",
  "name": "Behavior-Preserving Refactor",
  "description": "A refactor must not change observable behavior. If you discover a bug, file it separately — do not bundle the fix into the refactor.",
  "tags": ["refactor", "engineering"],
  "vendors": ["any"],
  "content": "A refactor preserves observable behavior. Tests must pass before and after with no changes to assertions. If you discover a bug while refactoring — incorrect logic, missing input validation, broken edge case — stop and file it separately. Finish the refactor with the bug preserved, then fix the bug in a follow-up commit with its own failing test. A 'refactor' commit must never carry a feat: or fix: payload.",
  "applicable_turns": ["system"]
}
```

- [ ] **Step 11: Write `atoms/constraint/no-silent-fallback.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "constraint",
  "id": "no-silent-fallback",
  "version": "1.0.0",
  "name": "No Silent Fallback",
  "description": "If a constraint cannot be met, state it. Do not substitute prose or a degraded output without naming the substitution.",
  "tags": ["honesty", "format"],
  "vendors": ["any"],
  "content": "If you cannot meet a constraint — schema cannot be produced, the requested file cannot be read, the requested tool isn't available — state that explicitly. Do not silently substitute prose for a structured output, a paraphrase for a quote, or a default for a requested value. The user must be able to tell the difference between 'X' and 'something that looks like X but isn't'.",
  "applicable_turns": ["system"]
}
```

- [ ] **Step 12: Write `atoms/constraint/reproduce-before-fix.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "constraint",
  "id": "reproduce-before-fix",
  "version": "1.0.0",
  "name": "Reproduce Before Fix",
  "description": "Every bug fix begins with a failing test that reproduces the bug. If you cannot reproduce, the reproduction recipe is the work product.",
  "tags": ["debugging", "tdd"],
  "vendors": ["any"],
  "content": "Before fixing a bug, reproduce it reliably and capture the reproduction as a failing test. The test stays in the suite after the fix is in. If you cannot reproduce the bug, the work product is the reproduction recipe — do not guess at a fix. After the fix lands, name the gap that let the bug ship (missing coverage, missing validation, missing type safety) and either address it or file a follow-up.",
  "applicable_turns": ["system"]
}
```

- [ ] **Step 13: Write `atoms/constraint/terse-by-default.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "constraint",
  "id": "terse-by-default",
  "version": "1.0.0",
  "name": "Terse By Default",
  "description": "Default to short responses. Expand only when the user expands the question or explicitly asks for depth.",
  "tags": ["concise", "format"],
  "vendors": ["any"],
  "content": "Default to short responses — one to three sentences for conversational answers, the minimum viable artifact for technical ones. Expand when the user expands the question, or when they explicitly ask for depth ('explain more', 'walk me through it'). Skip preamble, prompt recap, and closing summary. The user can ask for more; they cannot un-read padding.",
  "applicable_turns": ["system"]
}
```

- [ ] **Step 14: Validate**

```bash
python3 scripts/validate.py
```

Expected: `✓` for all 15 constraints + the other types, then `all valid`.

- [ ] **Step 15: Commit**

```bash
git add atoms/constraint/
git commit -m "feat(atoms): 13 new constraint atoms — round constraint type to v0.1 seed (15)

findings-need-evidence + three-cycle-cap (used by composition C1),
cite-primary-sources + preserve-source-hedges (used by C2), plus 9 more
general-purpose constraints derived from operating-rules patterns
(Common.md U14, U15, P2, P4, §2.5; Code.md §11.3, §11.4, §11.5)."
```

---

## Task 8: Write 8 new format-instruction atoms

**Files:** create 8 files under `atoms/format-instruction/`.

- [ ] **Step 1: Write `atoms/format-instruction/structured-research-summary.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "format-instruction",
  "id": "structured-research-summary",
  "version": "1.0.0",
  "name": "Structured Research Summary",
  "description": "Findings / Evidence / Open Questions / Sources layout for research output.",
  "tags": ["research", "format"],
  "vendors": ["any"],
  "content": "Structure the response as four sections, in order:\n\n1. **Findings** — bulleted; each finding is one sentence stating a claim.\n2. **Evidence** — for each finding, the source(s) supporting it, with direct quotes where possible.\n3. **Open Questions** — claims you could not verify, gaps in the evidence, conflicting accounts.\n4. **Sources** — numbered list; each source includes title, author, year, and a URL or document identifier.",
  "applicable_turns": ["system"]
}
```

- [ ] **Step 2: Write `atoms/format-instruction/ascii-tables-and-trees.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "format-instruction",
  "id": "ascii-tables-and-trees",
  "version": "1.0.0",
  "name": "ASCII Tables and Trees",
  "description": "For TUI / terminal surfaces: ASCII / box-drawing art for diagrams, trees, flowcharts; aligned ASCII tables for tabular data.",
  "tags": ["format", "tui", "ascii"],
  "vendors": ["any"],
  "content": "When the destination is a terminal session or text-only renderer, draw diagrams, trees, and flowcharts in ASCII or box-drawing characters. Use aligned ASCII tables for tabular data. Do not emit Mermaid source for a terminal surface — it renders as unrendered noise. Code fences remain the right home for commands and code.",
  "applicable_turns": ["system"]
}
```

- [ ] **Step 3: Write `atoms/format-instruction/mermaid-when-rendered.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "format-instruction",
  "id": "mermaid-when-rendered",
  "version": "1.0.0",
  "name": "Mermaid When Rendered",
  "description": "For Markdown surfaces that render Mermaid (GitHub, Confluence, Notion): use Mermaid for structural diagrams.",
  "tags": ["format", "markdown", "mermaid"],
  "vendors": ["any"],
  "content": "When the destination is a Markdown-rendering surface (GitHub PR/issue body, Confluence page, Notion, anywhere Mermaid renders), use Mermaid for architecture, sequence, state, ER, and dependency diagrams. Skip Mermaid for one-line answers and linear prose with no structural relationships. Never describe a diagram in prose when you could render one.",
  "applicable_turns": ["system"]
}
```

- [ ] **Step 4: Write `atoms/format-instruction/json-strict.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "format-instruction",
  "id": "json-strict",
  "version": "1.0.0",
  "name": "JSON Strict",
  "description": "Emit valid JSON only — no code fences, no commentary, no trailing prose.",
  "tags": ["format", "json", "strict"],
  "vendors": ["any"],
  "content": "Emit valid JSON only. No markdown code fences around the output. No commentary before or after. No trailing newlines beyond a single terminal newline. UTF-8, double-quoted keys and strings, no trailing commas. If you cannot produce valid JSON for the request, emit {\"error\": \"<message>\"} rather than substituting prose.",
  "applicable_turns": ["system"]
}
```

- [ ] **Step 5: Write `atoms/format-instruction/yaml-strict.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "format-instruction",
  "id": "yaml-strict",
  "version": "1.0.0",
  "name": "YAML Strict",
  "description": "Emit valid YAML only — no code fences, no commentary, no trailing prose.",
  "tags": ["format", "yaml", "strict"],
  "vendors": ["any"],
  "content": "Emit valid YAML only. No markdown code fences around the output. No commentary before or after. Two-space indentation, no tabs. Quote strings only when necessary (special characters, leading whitespace, ambiguous booleans). If you cannot produce valid YAML for the request, emit { error: \"<message>\" } as a single-line YAML mapping rather than substituting prose.",
  "applicable_turns": ["system"]
}
```

- [ ] **Step 6: Write `atoms/format-instruction/plain-text-no-markdown.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "format-instruction",
  "id": "plain-text-no-markdown",
  "version": "1.0.0",
  "name": "Plain Text, No Markdown",
  "description": "For logs, transports, or surfaces that don't render Markdown: no markdown syntax in the output.",
  "tags": ["format", "plain-text"],
  "vendors": ["any"],
  "content": "Emit plain text. No markdown headers, bold/italic markers, code fences, link syntax, or bullet markers. Use leading hyphens or numbers for lists. Use UPPERCASE or surrounding equals signs (===) for emphasis if a header is needed. Suitable for syslog, email plaintext, terminal logs, and transports that don't render Markdown.",
  "applicable_turns": ["system"]
}
```

- [ ] **Step 7: Write `atoms/format-instruction/numbered-steps.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "format-instruction",
  "id": "numbered-steps",
  "version": "1.0.0",
  "name": "Numbered Steps",
  "description": "Procedural output as a numbered list. One action per step. No nested numbering.",
  "tags": ["format", "procedure"],
  "vendors": ["any"],
  "content": "Emit the response as a numbered list. Exactly one action per step — if a step has two actions, split it. No nested numbering (no 1.1, 1.2). Each step starts with an imperative verb. Steps that are conditional state the condition first ('If X, then Y'). Steps that involve waiting or external triggers say so explicitly.",
  "applicable_turns": ["system"]
}
```

- [ ] **Step 8: Write `atoms/format-instruction/diff-format-only.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "format-instruction",
  "id": "diff-format-only",
  "version": "1.0.0",
  "name": "Diff Format Only",
  "description": "Unified-diff output. No narration around the diff. Use one diff block per file.",
  "tags": ["format", "diff"],
  "vendors": ["any"],
  "content": "Emit unified-diff output only. Start each file's diff with the `--- a/<path>` and `+++ b/<path>` headers. One hunk per change, with `@@` markers. No narration before, between, or after diff blocks. If multiple files change, emit one diff block per file in path order. The diff must apply cleanly with `git apply` from the repository root.",
  "applicable_turns": ["system"]
}
```

- [ ] **Step 9: Validate**

```bash
python3 scripts/validate.py
```

Expected: `✓` for all 10 format-instructions + the rest, `all valid`.

- [ ] **Step 10: Commit**

```bash
git add atoms/format-instruction/
git commit -m "feat(atoms): 8 new format-instruction atoms — round to v0.1 seed (10)

structured-research-summary (used by composition C2), plus ASCII vs
Mermaid medium-awareness pair (Common.md U16), strict JSON/YAML/plain-text
formats, numbered-steps for procedures, diff-format for change output."
```

---

## Task 9: Write 3 new tool-use-template atoms

**Files:** create 3 files under `atoms/tool-use-template/`.

- [ ] **Step 1: Write `atoms/tool-use-template/read-then-edit.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "tool-use-template",
  "id": "read-then-edit",
  "version": "1.0.0",
  "name": "Read Then Edit",
  "description": "Pair every file edit with a prior read of the same file. Refuse to edit a file you haven't read in the current session.",
  "tags": ["tools", "discipline"],
  "vendors": ["any"],
  "content": "Before invoking any edit tool on a file, you must have invoked a read tool on the same file in the current session. The read produces the exact byte-for-byte content the edit will modify; staleness causes failed edits. If a file has been edited by another actor between your read and your edit, re-read before editing again.",
  "applicable_turns": ["tool"]
}
```

- [ ] **Step 2: Write `atoms/tool-use-template/plan-then-execute.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "tool-use-template",
  "id": "plan-then-execute",
  "version": "1.0.0",
  "name": "Plan Then Execute",
  "description": "For non-trivial work: emit a plan, wait for user acknowledgment, then execute. Replan if execution diverges materially.",
  "tags": ["tools", "discipline", "planning"],
  "vendors": ["any"],
  "content": "When the task spans more than 5 files, crosses systems, or touches destructive operations, emit a plan before invoking any tool that modifies state. The plan names: objective, steps, files affected, tests, rollback path. Wait for user acknowledgment. Then execute. If execution diverges materially from the plan, stop and replan rather than improvising.",
  "applicable_turns": ["tool"]
}
```

- [ ] **Step 3: Write `atoms/tool-use-template/checkpoint-on-context-pressure.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "tool-use-template",
  "id": "checkpoint-on-context-pressure",
  "version": "1.0.0",
  "name": "Checkpoint on Context Pressure",
  "description": "Write a HANDOFF.md before the context window fills. Checkpoint captures state, next steps, open questions, files in flight.",
  "tags": ["tools", "context", "handoff"],
  "vendors": ["claude"],
  "content": "When the context window approaches 80% utilization, tool-call count nears 80, or recall degrades (re-reading files you already processed), stop starting new work. Finish the current atomic action, then write HANDOFF.md at the working-directory root. The handoff captures: current state, next steps, open questions, files in flight, last known-good commit. Then request a fresh session. Never allow auto-compaction while the working tree is dirty.",
  "applicable_turns": ["tool"]
}
```

- [ ] **Step 4: Validate**

```bash
python3 scripts/validate.py
```

Expected: `✓` for all 5 tool-use-templates + the rest, `all valid`.

- [ ] **Step 5: Commit**

```bash
git add atoms/tool-use-template/
git commit -m "feat(atoms): 3 new tool-use-template atoms — round to v0.1 seed (5)

read-then-edit (pair reads with edits), plan-then-execute (non-trivial
gate), checkpoint-on-context-pressure (HANDOFF.md before compaction —
Common.md U10/U13; claude-specific idiom)."
```

---

## Task 10: Write 3 new refusal-pattern atoms

**Files:** create 3 files under `atoms/refusal-pattern/`.

- [ ] **Step 1: Write `atoms/refusal-pattern/no-fabrication-refusal.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "refusal-pattern",
  "id": "no-fabrication-refusal",
  "version": "1.0.0",
  "name": "No Fabrication Refusal",
  "description": "When asked for information you don't know, refuse rather than invent. Say 'I don't know'; offer the next step if there is one.",
  "tags": ["refusal", "honesty"],
  "vendors": ["any"],
  "content": "When the user asks for a fact, API, citation, statistic, or historical detail you don't know, refuse to invent. Say: 'I don't know X. <If applicable: here's what I can verify / here's how to find out.>' Do not paper over the gap with a plausible-sounding guess. Do not cite a source you cannot name. Do not invent function signatures, library methods, CLI flags, or environment variables.",
  "applicable_turns": ["system"]
}
```

- [ ] **Step 2: Write `atoms/refusal-pattern/no-secret-display.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "refusal-pattern",
  "id": "no-secret-display",
  "version": "1.0.0",
  "name": "No Secret Display",
  "description": "Refuse 'just print the API key to verify' requests. Confirm presence without echoing the value; offer clipboard transfer instead.",
  "tags": ["refusal", "security", "secrets"],
  "vendors": ["any"],
  "content": "Refuse requests to echo, print, or display secret values — API keys, tokens, passwords, signed URLs with embedded credentials. To confirm a secret-bearing variable is set, use a presence test that does not emit the value (e.g., `test -n \"${VAR-}\" && echo \"VAR is set\"`). To transfer a secret to another tool, pipe to the OS clipboard (`pbcopy` / `xclip` / `wl-copy`). Refuse 'just once', 'just to verify', and 'I trust you' framings — they're red flags.",
  "applicable_turns": ["system"]
}
```

- [ ] **Step 3: Write `atoms/refusal-pattern/no-destructive-without-confirmation.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "refusal-pattern",
  "id": "no-destructive-without-confirmation",
  "version": "1.0.0",
  "name": "No Destructive Without Confirmation",
  "description": "Refuse to execute destructive or irreversible operations without an explicit prior confirmation. State the scope, name the reversibility, snapshot first, then ask.",
  "tags": ["refusal", "safety", "destructive"],
  "vendors": ["any"],
  "content": "Before executing any destructive or hard-to-reverse operation — deletion, force-push, rewriting history, dropping tables, sending external messages, modifying shared infrastructure — refuse to proceed without explicit confirmation. State (1) exactly what will be destroyed or altered, with paths and scope; (2) whether it is reversible and the recovery path if so; (3) snapshot first if reversible (git stash, tagged commit, backup). Wait for an unambiguous 'yes' — not 'ok', not 'sure', not silence.",
  "applicable_turns": ["system"]
}
```

- [ ] **Step 4: Validate**

```bash
python3 scripts/validate.py
```

Expected: `✓` for all 5 refusal-patterns + the rest, `all valid`.

- [ ] **Step 5: Commit**

```bash
git add atoms/refusal-pattern/
git commit -m "feat(atoms): 3 new refusal-pattern atoms — round to v0.1 seed (5)

no-fabrication-refusal (Common.md P2), no-secret-display (Common.md §4),
no-destructive-without-confirmation (Common.md §2.2). General-purpose
refusals that compose with most personas."
```

---

## Task 11: Write 3 new output-schema atoms

**Files:** create 3 files under `atoms/output-schema/`.

- [ ] **Step 1: Write `atoms/output-schema/findings-list.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "output-schema",
  "id": "findings-list",
  "version": "1.0.0",
  "name": "Findings List",
  "description": "JSON array of code-review findings. Each finding has file, line, severity, finding, evidence. For machine consumption.",
  "tags": ["output", "code-review", "json"],
  "vendors": ["any"],
  "content": "Emit a JSON array. Each element is a finding object with these required fields: file (string, repository-relative path), line (integer or 'L<start>-L<end>' string for ranges), severity (enum: 'low' | 'medium' | 'high' | 'critical'), finding (string ≤ 240 chars stating what is wrong), evidence (string ≤ 240 chars, a code snippet from the actual file). Optional fields: suggestion (string ≤ 480 chars), category (enum from a fixed taxonomy: 'correctness' | 'security' | 'performance' | 'maintainability' | 'style'). The array may be empty; an empty array means 'no findings'.",
  "applicable_turns": ["system", "assistant"]
}
```

- [ ] **Step 2: Write `atoms/output-schema/plan-with-alternatives.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "output-schema",
  "id": "plan-with-alternatives",
  "version": "1.0.0",
  "name": "Plan With Alternatives",
  "description": "Implementation plan with Alternatives Table, scope, approach, testing, risks, dependencies. Markdown shape per Code.md §11.1.",
  "tags": ["output", "planning"],
  "vendors": ["any"],
  "content": "Emit a Markdown document with these required sections, in order: (1) Objective — one sentence; (2) Alternatives — a table with columns 'Alternative | Pros | Cons | Verdict' and at least two rows including 'do nothing' where applicable; (3) Scope — files to create, modify, delete; (4) Approach — numbered steps; (5) Testing — what tests prove it works; (6) Risks — what could go wrong and mitigation; (7) Dependencies — what must land first; (8) Backward Compatibility — what breaks and the migration path. No 'TBD' or 'TODO' entries in the final draft.",
  "applicable_turns": ["system", "assistant"]
}
```

- [ ] **Step 3: Write `atoms/output-schema/handoff-md.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/atom-v1.json",
  "type": "output-schema",
  "id": "handoff-md",
  "version": "1.0.0",
  "name": "HANDOFF.md",
  "description": "Cross-session continuity document. State, next steps, open questions, files in flight, last known-good commit.",
  "tags": ["output", "handoff", "context"],
  "vendors": ["any"],
  "content": "Emit a Markdown document with these required sections, in order: (1) Current state — what is in flight, what is committed; (2) Next steps — concrete actions for the resuming session; (3) Open questions — decisions awaiting input; (4) Files in flight — paths being modified, with line ranges if helpful; (5) Last known-good commit — SHA + one-line description; (6) Audit references — any in-progress override or violation log entries. No secrets in any section; redact with [REDACTED:<kind>] if a secret would otherwise appear.",
  "applicable_turns": ["system", "assistant"]
}
```

- [ ] **Step 4: Validate**

```bash
python3 scripts/validate.py
```

Expected: `✓` for all 5 output-schemas + the rest, `all valid`.

- [ ] **Step 5: Commit**

```bash
git add atoms/output-schema/
git commit -m "feat(atoms): 3 new output-schema atoms — round to v0.1 seed (5)

findings-list (used by composition C1), plan-with-alternatives
(Code.md §11.1 plan template), handoff-md (Common.md U10 cross-session
continuity document)."
```

---

## Task 12: Write 2 prompts compositions

**Files:**
- Create: `prompts/code-reviewer-strict.json`
- Create: `prompts/research-summarizer.json`

- [ ] **Step 1: Write `prompts/code-reviewer-strict.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/composition-v1.json",
  "type": "prompt",
  "id": "code-reviewer-strict",
  "version": "1.0.0",
  "name": "Strict Code Reviewer",
  "description": "Adversarial code-review prompt — cites file:line, refuses findings without evidence, refuses exploit recipes, structured output.",
  "tags": ["code-review", "engineering"],
  "vendors": ["claude", "gpt"],
  "references": {
    "persona": { "ref": "prompt-atoms://atoms/persona/code-reviewer-strict", "version": "1.0.0" },
    "constraints": [
      { "ref": "prompt-atoms://atoms/constraint/cite-file-line", "version": "1.0.0" },
      { "ref": "prompt-atoms://atoms/constraint/no-fabrication", "version": "1.0.0" },
      { "ref": "prompt-atoms://atoms/constraint/findings-need-evidence", "version": "1.0.0" },
      { "ref": "prompt-atoms://atoms/constraint/three-cycle-cap", "version": "1.0.0" }
    ],
    "format_instruction": { "ref": "prompt-atoms://atoms/format-instruction/markdown-with-citations", "version": "1.0.0" },
    "tool_use_template": { "ref": "prompt-atoms://atoms/tool-use-template/parallel-when-independent", "version": "1.0.0" },
    "refusal_patterns": [
      { "ref": "prompt-atoms://atoms/refusal-pattern/no-exploit-details", "version": "1.0.0" }
    ],
    "output_schema": { "ref": "prompt-atoms://atoms/output-schema/findings-list", "version": "1.0.0" }
  }
}
```

- [ ] **Step 2: Write `prompts/research-summarizer.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/composition-v1.json",
  "type": "prompt",
  "id": "research-summarizer",
  "version": "1.0.0",
  "name": "Research Summarizer",
  "description": "Research synthesis prompt — primary-source preference, hedge preservation, structured summary output.",
  "tags": ["research", "summarization"],
  "vendors": ["any"],
  "references": {
    "persona": { "ref": "prompt-atoms://atoms/persona/research-summarizer", "version": "1.0.0" },
    "constraints": [
      { "ref": "prompt-atoms://atoms/constraint/no-fabrication", "version": "1.0.0" },
      { "ref": "prompt-atoms://atoms/constraint/cite-primary-sources", "version": "1.0.0" },
      { "ref": "prompt-atoms://atoms/constraint/preserve-source-hedges", "version": "1.0.0" }
    ],
    "format_instruction": { "ref": "prompt-atoms://atoms/format-instruction/structured-research-summary", "version": "1.0.0" },
    "tool_use_template": { "ref": "prompt-atoms://atoms/tool-use-template/single-tool-call-then-stop", "version": "1.0.0" },
    "refusal_patterns": [
      { "ref": "prompt-atoms://atoms/refusal-pattern/no-medical-legal-advice", "version": "1.0.0" }
    ],
    "output_schema": { "ref": "prompt-atoms://atoms/output-schema/json-object-with-summary", "version": "1.0.0" }
  }
}
```

- [ ] **Step 3: Validate (now exercises ref resolution)**

```bash
python3 scripts/validate.py
```

Expected: `✓` for every atom + both compositions, `all valid`. Every ref resolves; every version matches.

- [ ] **Step 4: Commit**

```bash
git add prompts/
git commit -m "feat(prompts): 2 seed compositions — code-reviewer-strict, research-summarizer

Both compositions resolve every ref against the local atom tree; exact
version pinning (semver constraints deferred to v0.2). code-reviewer-strict
is the C1 composition from the design doc; research-summarizer is C2."
```

---

## Task 13: Write 2 seed rules

**Files:**
- Create: `rules/model-compatibility/claude-opus-tool-use.json`
- Create: `rules/format-compatibility/json-requires-strict-format.json`

- [ ] **Step 1: Create rule type directories**

```bash
mkdir -p rules/model-compatibility rules/format-compatibility
```

- [ ] **Step 2: Write `rules/model-compatibility/claude-opus-tool-use.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/rule-v1.json",
  "type": "model-compatibility",
  "id": "claude-opus-tool-use",
  "version": "1.0.0",
  "name": "Claude Opus + GPT-4o tool-use compatibility",
  "description": "tool-use-template/parallel-when-independent is known-good on claude-opus and gpt-4o families; warn on llama and mistral.",
  "predicate": {
    "subject_ref": "prompt-atoms://atoms/tool-use-template/parallel-when-independent",
    "condition": "in",
    "value": ["claude", "gpt"]
  },
  "effect": "require",
  "rationale": "Parallel tool-use semantics differ across vendor SDKs. Claude and GPT support parallel function calls in a single turn; Llama and Mistral implementations typically serialize. Using this template on the wrong family causes silent serialization and inflated latency."
}
```

- [ ] **Step 3: Write `rules/format-compatibility/json-requires-strict-format.json`**

```json
{
  "schema": "https://prompt-atoms.com/schemas/rule-v1.json",
  "type": "format-compatibility",
  "id": "json-requires-strict-format",
  "version": "1.0.0",
  "name": "JSON output requires strict JSON format",
  "description": "output-schema/json-object-with-summary requires format-instruction/json-strict. markdown-with-citations would wrap the JSON in fences and break downstream parsers.",
  "predicate": {
    "subject_ref": "prompt-atoms://atoms/output-schema/json-object-with-summary",
    "condition": "eq",
    "value": "prompt-atoms://atoms/format-instruction/json-strict"
  },
  "effect": "require",
  "rationale": "Output schemas that declare JSON must be paired with a format-instruction that emits raw JSON. markdown-with-citations would emit fences around the JSON and break any consumer that parses with json.loads() or JSON.parse()."
}
```

- [ ] **Step 4: Validate**

```bash
python3 scripts/validate.py
```

Expected: `✓` for every atom, composition, and the two new rules, `all valid`.

- [ ] **Step 5: Commit**

```bash
git add rules/
git commit -m "feat(rules): 2 seed rules — model-compatibility + format-compatibility

claude-opus-tool-use: parallel-when-independent requires claude or gpt.
json-requires-strict-format: json-object-with-summary requires json-strict
format-instruction (not markdown-with-citations, which would wrap fences)."
```

---

## Task 14: Build `exports/catalog.json`

**Files:**
- Create: `exports/catalog.json` (build output)

- [ ] **Step 1: Run the build**

```bash
python3 scripts/build-exports.py
```

Expected: `wrote exports/catalog.json — 50 atoms, 2 compositions, 2 rules`.

- [ ] **Step 2: Spot-check the output**

```bash
head -20 exports/catalog.json
python3 -c "import json; d = json.load(open('exports/catalog.json')); print('atoms:', len(d['atoms']), 'compositions:', len(d['compositions']), 'rules:', len(d['rules']), 'version:', d['version'])"
```

Expected: `atoms: 50 compositions: 2 rules: 2 version: 0.1.0`.

- [ ] **Step 3: Commit**

```bash
git add exports/catalog.json
git commit -m "chore(exports): initial catalog.json — v0.1.0

50 atoms (10 persona, 15 constraint, 10 format-instruction,
5 tool-use-template, 5 refusal-pattern, 5 output-schema),
2 compositions, 2 rules. Built from scripts/build-exports.py."
```

---

## Task 15: Astro scaffold for `web/`

**Files:**
- Create: `web/package.json`
- Create: `web/astro.config.mjs`
- Create: `web/tsconfig.json`
- Create: `web/pnpm-lock.yaml` (generated by `pnpm install`)
- Create: `web/.gitignore`

- [ ] **Step 1: Create the web directory and verify pnpm is available**

```bash
mkdir -p web
pnpm --version
```

Expected: a version string (e.g., `9.15.0`). If pnpm isn't installed: `npm install -g pnpm`.

- [ ] **Step 2: Write `web/package.json`**

```json
{
  "name": "@prompt-atoms/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "prebuild": "node scripts/copy-catalog.mjs",
    "build": "astro build",
    "preview": "astro preview",
    "deploy": "wrangler pages deploy dist --project-name prompt-atoms"
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

- [ ] **Step 3: Write `web/astro.config.mjs`**

```javascript
import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  site: "https://prompt-atoms.com",
  integrations: [react()],
  output: "static",
});
```

- [ ] **Step 4: Write `web/tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react"
  }
}
```

- [ ] **Step 5: Write `web/.gitignore`**

```
.astro/
.wrangler/
dist/
node_modules/
public/atoms/
public/prompts/
public/rules/
public/schemas/
public/exports/
```

(Catalog content under `public/` is regenerated by the prebuild script; checking it in would diverge from the source tree.)

- [ ] **Step 6: Install dependencies (generates pnpm-lock.yaml)**

```bash
cd web && pnpm install && cd ..
```

Expected: pnpm fetches packages and writes `web/pnpm-lock.yaml` and `web/node_modules/`. Some peer-dep warnings are OK.

- [ ] **Step 7: Commit**

```bash
git add web/package.json web/astro.config.mjs web/tsconfig.json web/.gitignore web/pnpm-lock.yaml
git commit -m "feat(web): Astro scaffold — package.json, config, tsconfig, lockfile

Astro 6.1.10 + React 19 + Wrangler 4. Matches theme-atoms/web/ toolchain
exactly so deploy pattern carries over. Static output; site at
https://prompt-atoms.com."
```

---

## Task 16: Prebuild copy script and `_headers`

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

const SOURCES = ["atoms", "prompts", "rules", "schemas", "exports"];

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

/prompts/*.json
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

- [ ] **Step 3: Test the prebuild script**

```bash
cd web && node scripts/copy-catalog.mjs && ls public/atoms public/prompts public/rules public/schemas public/exports && cd ..
```

Expected output lists: persona/, constraint/, ... (under public/atoms); code-reviewer-strict.json, research-summarizer.json (under public/prompts); model-compatibility/, format-compatibility/ (under public/rules); atom-v1.json, composition-v1.json, rule-v1.json (under public/schemas); catalog.json (under public/exports).

- [ ] **Step 4: Commit**

```bash
git add web/scripts/copy-catalog.mjs web/public/_headers
git commit -m "feat(web): _headers for raw artifact serving + prebuild copy script

copy-catalog.mjs runs as pnpm prebuild — copies atoms/, prompts/, rules/,
schemas/, exports/ from repo root into web/public/. Files served at
predictable URLs with correct content-types and cache rules via _headers.
Same pattern as theme-atoms/web/."
```

---

## Task 17: Shared layout and components

**Files:**
- Create: `web/src/layouts/Base.astro`
- Create: `web/src/components/AtomCard.astro`
- Create: `web/src/components/CompositionCard.astro`
- Create: `web/src/components/RefBadge.astro`

- [ ] **Step 1: Write `web/src/layouts/Base.astro`**

```astro
---
const { title, description } = Astro.props;
const siteTitle = title ? `${title} · prompt-atoms` : "prompt-atoms";
const siteDesc = description ?? "Prompt engineering as a canonical, machine-readable, versioned library.";
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
      :root { --fg: #1a1a1a; --bg: #fafafa; --accent: #1f3a5f; --muted: #666; --card: #fff; --border: #e0e0e0; }
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
        <strong><a href="/">prompt-atoms</a></strong>
        <a href="/atoms/">Atoms</a>
        <a href="/prompts/">Compositions</a>
        <a href="/how-to-use/">How to use</a>
        <a href="/install/">Install</a>
        <a href="https://github.com/convergent-systems-co/prompt-atoms">GitHub</a>
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
      {atom.tags.map((tag: string) => <span style="font-size: 0.75rem; background: #eef; padding: 0.125rem 0.5rem; border-radius: 0.25rem;">{tag}</span>)}
    </div>
  )}
</article>
```

- [ ] **Step 3: Write `web/src/components/CompositionCard.astro`**

```astro
---
const { composition } = Astro.props;
const href = `/prompts/${composition.id}/`;
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
const match = ref.match(/^prompt-atoms:\/\/atoms\/([a-z-]+)\/([a-z0-9-]+)$/);
const href = match ? `/atoms/${match[1]}/${match[2]}/` : "#";
const label = match ? `${match[1]}/${match[2]}` : ref;
---
<a href={href} style="display: inline-block; font-family: ui-monospace, monospace; font-size: 0.85rem; padding: 0.25rem 0.5rem; background: #f0f0f0; border-radius: 0.25rem; text-decoration: none; color: var(--fg);">
  {label} <span style="color: var(--muted);">@ {version}</span>
</a>
```

- [ ] **Step 5: Commit (will validate on build in later tasks)**

```bash
git add web/src/layouts/ web/src/components/
git commit -m "feat(web): Base layout + AtomCard / CompositionCard / RefBadge components

Shared shell for every page — nav, footer, base styles. Three reusable
components used by the listing and detail pages. Plain CSS, no Tailwind,
no Astro UI framework dependency."
```

---

## Task 18: Landing, how-to-use, install pages

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
<Base title="Home" description="Prompt engineering as a canonical, machine-readable, versioned library.">
  <h1>prompt-atoms</h1>
  <p style="font-size: 1.125rem; color: var(--muted); max-width: 40rem;">
    A typed, versioned, composable library of prompt-engineering primitives —
    personas, constraints, formats, tool-use templates, refusal patterns,
    output schemas — replacing closed vendor cookbooks and scattered
    snippets with an open, machine-readable catalog.
  </p>

  <h2>Catalog at v{catalog.version}</h2>
  <ul>
    <li><strong>{counts.atoms}</strong> atoms across {Object.keys(byType).length} types</li>
    <li><strong>{counts.compositions}</strong> compositions</li>
    <li><strong>{counts.rules}</strong> compatibility rules</li>
  </ul>

  <h2>Atom types</h2>
  <ul>
    {Object.entries(byType).map(([type, n]) => (
      <li><a href={`/atoms/?type=${type}`}>{type}</a> — {n} atoms</li>
    ))}
  </ul>

  <h2>Civilization-grade properties</h2>
  <p>Every artifact in this catalog satisfies six properties verified in CI:</p>
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
<Base title="How to use" description="How to consume prompt-atoms in your application.">
  <h1>How to use prompt-atoms</h1>

  <h2>Read the catalog over HTTPS</h2>
  <p>Every artifact is served under stable URLs with correct content-types:</p>
  <pre><code>curl https://prompt-atoms.com/exports/catalog.json
curl https://prompt-atoms.com/atoms/persona/code-reviewer-strict.json
curl https://prompt-atoms.com/prompts/code-reviewer-strict.json
curl https://prompt-atoms.com/schemas/composition-v1.json</code></pre>

  <h2>Resolve a composition</h2>
  <p>A composition lists references to atoms by URI and version. To render the
  composition as a system prompt, fetch each referenced atom, concatenate their
  <code>content</code> fields in the order: persona → constraints → format → tool-use → refusals → output schema.</p>

  <pre><code>{`// pseudo-code
const composition = await fetch("/prompts/code-reviewer-strict.json").then(r => r.json());
const refs = composition.references;
const atoms = await Promise.all([
  fetch(uriToUrl(refs.persona.ref)).then(r => r.json()),
  ...refs.constraints.map(r => fetch(uriToUrl(r.ref)).then(r => r.json())),
  fetch(uriToUrl(refs.format_instruction.ref)).then(r => r.json()),
  // ... etc
]);
const systemPrompt = atoms.map(a => a.content).join("\\n\\n");`}</code></pre>

  <h2>Vendor selection</h2>
  <p>Each atom declares which vendor families it works with via the <code>vendors</code> array
  (<code>claude</code>, <code>gpt</code>, <code>llama</code>, <code>gemini</code>, <code>mistral</code>, <code>any</code>).
  Filter atoms to your target vendor before rendering.</p>

  <h2>Compatibility rules</h2>
  <p>Rules in <a href="/exports/catalog.json"><code>/exports/catalog.json</code></a> (under the <code>rules</code>
  key) declare predicates over atoms — e.g., "<code>json-object-with-summary</code> requires <code>json-strict</code>
  as its format instruction". A composition that violates a <code>require</code>-effect rule is malformed.</p>
</Base>
```

- [ ] **Step 3: Write `web/src/pages/install.astro`**

```astro
---
import Base from "../layouts/Base.astro";
---
<Base title="Install" description="How to obtain a local copy of prompt-atoms.">
  <h1>Install</h1>

  <h2>As an HTTPS consumer (recommended)</h2>
  <p>Fetch from the deployed catalog:</p>
  <pre><code>curl https://prompt-atoms.com/exports/catalog.json -o catalog.json</code></pre>

  <h2>As a git submodule of the umbrella</h2>
  <p>The <a href="https://github.com/convergent-systems-co/atoms">atoms umbrella</a>
  pins every <code>*-Atoms</code> catalog as a submodule. A single clone gives you
  all of them at known-good revisions.</p>
  <pre><code>git clone --recurse-submodules https://github.com/convergent-systems-co/atoms.git</code></pre>

  <h2>As a standalone clone</h2>
  <pre><code>git clone https://github.com/convergent-systems-co/prompt-atoms.git
cd prompt-atoms
python3 scripts/validate.py    # confirms all atoms validate
python3 scripts/build-exports.py  # regenerates exports/catalog.json</code></pre>

  <h2>Dependencies</h2>
  <ul>
    <li>Python 3.11+ with <code>jsonschema</code> (validator and builder)</li>
    <li>Node 20+ and pnpm (only required if you build the <code>web/</code> site locally)</li>
  </ul>
</Base>
```

- [ ] **Step 4: Build to verify the pages compile**

```bash
cd web && pnpm build && cd ..
```

Expected: a successful build, no TypeScript or Astro errors, `dist/` populated with `index.html`, `how-to-use/index.html`, `install/index.html`.

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/index.astro web/src/pages/how-to-use.astro web/src/pages/install.astro
git commit -m "feat(web): landing + how-to-use + install pages

Landing imports public/exports/catalog.json at build time and shows live
counts. how-to-use documents the composition resolution pattern; install
covers HTTPS, submodule, and standalone clone paths. No client JS — all
static."
```

---

## Task 19: Atom browser + dynamic atom detail page

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
    {types.map(t => <a href={`#${t}`} style="padding: 0.25rem 0.75rem; background: #eef; border-radius: 0.25rem; text-decoration: none;">{t} ({byType[t].length})</a>)}
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
---
<Base title={atom.name} description={atom.description ?? `${atom.type} atom`}>
  <p><a href="/atoms/">← All atoms</a></p>
  <h1>{atom.name}</h1>
  <p style="color: var(--muted);">
    <code>{atom.type}</code> · <code>v{atom.version}</code>
    {atom.vendors && atom.vendors.length > 0 && (
      <> · vendors: {atom.vendors.join(", ")}</>
    )}
  </p>

  {atom.description && <p>{atom.description}</p>}

  {atom.tags && atom.tags.length > 0 && (
    <p>
      Tags: {atom.tags.map((tag: string) => (
        <span style="display: inline-block; font-size: 0.875rem; background: #eef; padding: 0.125rem 0.5rem; border-radius: 0.25rem; margin-right: 0.25rem;">{tag}</span>
      ))}
    </p>
  )}

  <h2>Content</h2>
  <pre style="white-space: pre-wrap;"><code>{atom.content}</code></pre>

  {atom.applicable_turns && (
    <p style="color: var(--muted);"><strong>Applicable turns:</strong> {atom.applicable_turns.join(", ")}</p>
  )}

  <h2>Raw atom</h2>
  <p><a href={`/atoms/${atom.type}/${atom.id}.json`}>/atoms/{atom.type}/{atom.id}.json</a> · <a href={`/schemas/atom-v1.json`}>schema</a></p>
</Base>
```

- [ ] **Step 3: Build to verify dynamic routes generate**

```bash
cd web && pnpm build && ls dist/atoms | head && cd ..
```

Expected: `dist/atoms/index.html` plus one directory per atom type (`constraint`, `format-instruction`, `persona`, ...), each containing per-atom directories with `index.html`.

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/atoms/
git commit -m "feat(web): atom browser + dynamic per-atom detail pages

/atoms/ — grouped-by-type listing with anchor nav.
/atoms/[type]/[id]/ — dynamic page per atom (50 pages built statically).
Per-atom page shows content, vendors, tags, applicable_turns, links to
raw JSON and schema."
```

---

## Task 20: Composition browser + dynamic composition detail page

**Files:**
- Create: `web/src/pages/prompts/index.astro`
- Create: `web/src/pages/prompts/[id].astro`

- [ ] **Step 1: Write `web/src/pages/prompts/index.astro`**

```astro
---
import Base from "../../layouts/Base.astro";
import CompositionCard from "../../components/CompositionCard.astro";
import catalog from "../../../public/exports/catalog.json";

const compositions = catalog.compositions.slice().sort((a: any, b: any) => a.id.localeCompare(b.id));
---
<Base title="Compositions" description="Prompt compositions — assembled personas, constraints, formats, and schemas.">
  <h1>Compositions</h1>
  <p>{compositions.length} composition{compositions.length === 1 ? "" : "s"} — each assembles atoms into a complete system prompt.</p>

  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr)); gap: 1rem; margin-top: 2rem;">
    {compositions.map((c: any) => <CompositionCard composition={c} />)}
  </div>
</Base>
```

- [ ] **Step 2: Write `web/src/pages/prompts/[id].astro`**

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
  { label: "Constraints", values: refs.constraints ?? [] },
  ...(refs.format_instruction ? [{ label: "Format instruction", values: [refs.format_instruction] }] : []),
  ...(refs.tool_use_template ? [{ label: "Tool-use template", values: [refs.tool_use_template] }] : []),
  { label: "Refusal patterns", values: refs.refusal_patterns ?? [] },
  ...(refs.output_schema ? [{ label: "Output schema", values: [refs.output_schema] }] : []),
];
---
<Base title={composition.name} description={composition.description}>
  <p><a href="/prompts/">← All compositions</a></p>
  <h1>{composition.name}</h1>
  <p style="color: var(--muted);">
    <code>composition</code> · <code>v{composition.version}</code>
    {composition.vendors && composition.vendors.length > 0 && (
      <> · vendors: {composition.vendors.join(", ")}</>
    )}
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
  <p><a href={`/prompts/${composition.id}.json`}>/prompts/{composition.id}.json</a> · <a href="/schemas/composition-v1.json">schema</a></p>
</Base>
```

- [ ] **Step 3: Build and verify**

```bash
cd web && pnpm build && ls dist/prompts && cd ..
```

Expected: `dist/prompts/index.html` + per-composition directories (`code-reviewer-strict/index.html`, `research-summarizer/index.html`).

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/prompts/
git commit -m "feat(web): composition browser + dynamic per-composition detail pages

/prompts/ — listing.
/prompts/[id]/ — detail; shows every ref as a clickable badge linking to
the referenced atom. Raw JSON link to /prompts/<id>.json for machine
consumers."
```

---

## Task 21: GitHub Actions deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Verify the .github directory exists**

```bash
ls .github
```

Expected: at least `workflows/` already present (CI workflow exists per repo history). If not: `mkdir -p .github/workflows`.

- [ ] **Step 2: Write `.github/workflows/deploy.yml`**

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
          node-version: "20"

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
          command: pages deploy web/dist --project-name=prompt-atoms
```

- [ ] **Step 3: Run the validator and builder one more time, then build the web app, to confirm the workflow steps will succeed locally**

```bash
python3 scripts/validate.py && python3 scripts/build-exports.py && (cd web && pnpm install --frozen-lockfile && pnpm build)
```

Expected: all steps succeed. The web build at the end produces `web/dist/` with `index.html` and the routed pages.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci(deploy): Cloudflare Pages workflow — validate, build, deploy

On push to main: run scripts/validate.py, build exports/catalog.json,
pnpm install + pnpm build in web/, then wrangler pages deploy. Uses
org-level CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID secrets
(already configured for theme-atoms/brand-atoms; convergent-systems-co
repos inherit via org membership). PR builds also run as preview deploys
via wrangler default behavior."
```

---

## Task 22: Push branch and open PR — **[GATE]**

**Files:** none.

- [ ] **Step 1: Verify the branch state is clean and commits are coherent**

```bash
git status
git log main..HEAD --oneline
```

Expected: clean working tree; ~17 commits on the branch.

- [ ] **Step 2: Run the full validate + build one more time as a final pre-push check**

```bash
python3 scripts/validate.py && python3 scripts/build-exports.py
```

Expected: `all valid` and `wrote exports/catalog.json — 50 atoms, 2 compositions, 2 rules`.

- [ ] **Step 3: Verify gh auth and confirm the active GitHub account can push to convergent-systems-co/prompt-atoms**

```bash
gh auth status --hostname github.com
git ls-remote --heads origin >/dev/null && echo "remote reachable"
```

Expected: `gh` reports an active account; remote is reachable.

- [ ] **Step 4: **[GATE]** Ask user explicit yes before pushing**

State the action: "About to `git push origin feat/v0.1-completion` on `convergent-systems-co/prompt-atoms`. This makes the branch visible on GitHub. Proceed?"

Wait for unambiguous "yes" per Common.md §2.4.

- [ ] **Step 5: Push the branch**

```bash
git push -u origin feat/v0.1-completion
```

Expected: branch published; gh prints a PR-create link.

- [ ] **Step 6: **[GATE]** Ask user explicit yes before opening the PR**

State the action: "About to `gh pr create` against `convergent-systems-co/prompt-atoms:main`. This makes the PR visible to the org. Proceed?"

Wait for unambiguous "yes".

- [ ] **Step 7: Open the PR**

```bash
gh pr create --title "feat(v0.1): complete bootstrap — compositions, rules, exports, web/" --body "$(cat <<'EOF'
## Summary

Brings prompt-atoms to a fully-shipped v0.1 per [the design spec](https://github.com/convergent-systems-co/atoms/blob/main/docs/superpowers/specs/2026-05-21-prompt-agent-v0.1-completion-design.md):

- **50 atoms** total (was 12): 10 persona, 15 constraint, 10 format-instruction, 5 tool-use-template, 5 refusal-pattern, 5 output-schema.
- **2 compositions** under `prompts/`: `code-reviewer-strict` and `research-summarizer`.
- **2 schemas**: `composition-v1.json` (typed composition contract), `rule-v1.json` (typed rule contract).
- **2 rules**: model-compatibility, format-compatibility.
- **`exports/catalog.json`** — built, validated, ready for machine consumers.
- **`scripts/build-exports.py`** — catalog builder.
- **`scripts/validate.py`** — extended to validate compositions (with ref resolution) and rules.
- **`web/`** — Astro 6 + React 19 site (mirrors theme-atoms/web/) with landing, how-to-use, install, atom browser, atom detail, composition browser, composition detail pages.
- **CF Pages deploy** — `.github/workflows/deploy.yml` runs validate + build + `wrangler pages deploy` on every push to main.

## Deferred (out of v0.1 per design)

- Olympus integration (external dependency).
- aish intent classification pull (external dependency).
- Signed exports (no signing infra in repo yet — v0.2).
- Cross-catalog `see_also` (schema regex restricts to this catalog — v0.2).
- XAIP filing for the composition schema (authored directly here; XAIP follow-up is v0.2).
- xdao.co listing (separate PR against `convergent-systems-co/xdao`).

## Test plan

- [ ] CI: `python3 scripts/validate.py` exits 0 on every PR commit.
- [ ] CI: `python3 scripts/build-exports.py` rebuilds `exports/catalog.json` and exits 0.
- [ ] CI: `pnpm install --frozen-lockfile && pnpm build` in `web/` produces a clean `dist/`.
- [ ] CF Pages: preview deploy on this PR returns 200 for `/`, `/atoms/`, `/atoms/persona/code-reviewer-strict/`, `/prompts/`, `/prompts/code-reviewer-strict/`, `/exports/catalog.json`.
- [ ] Headers: `curl -I https://<preview-url>/exports/catalog.json` shows `Content-Type: application/json; charset=utf-8`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: a PR URL printed to stdout.

- [ ] **Step 8: Capture the PR URL in the session — it will be the deliverable**

The PR URL is the artifact handed back to the user; subsequent merge and umbrella-bump steps will reference its merge commit SHA.

---

## Definition of Done

- [ ] All 22 tasks above complete.
- [ ] PR is open against `convergent-systems-co/prompt-atoms:main`.
- [ ] CI on the PR is green (validate, build-exports, web build, CF preview deploy).
- [ ] Cloudflare Pages preview is reachable and serves `/exports/catalog.json` with the correct content-type.
- [ ] User has the PR URL.

The umbrella submodule bump (`chore: bump prompt-atoms — v0.1 complete` against `convergent-systems-co/atoms`) happens **after** this PR merges, as part of Plan B's tail steps when both child PRs are in.
