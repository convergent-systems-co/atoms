# context-atoms Buildout — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate `context-atoms` with situational-frame, environment-descriptor, conversation-scope, working-memory-shape, and attention-budget primitive atoms, plus 4 context compositions (default, prod-read-only, dev, incident), closing issue #8.

**Architecture:** All atoms are TOML files following the schema-atoms `atom.toml` manifest standard. Primitives under `atoms/<type>/`, compositions under `contexts/<name>/`.

**Tech Stack:** TOML, Git, GitHub CLI (`gh`), Python 3 (`tomllib` for validation)

**Repo:** `convergent-systems-co/context-atoms` — clone fresh for this work.

---

## Setup

- [ ] **Clone the repo**

```bash
cd /tmp
GH_TOKEN=$(gh auth token --user polliard) \
  git clone https://github.com/convergent-systems-co/context-atoms.git
cd context-atoms
git config --local credential.helper \
  '!f() { test "$1" = get && printf "username=polliard\npassword=%s\n" "$(gh auth token --user polliard)"; }; f'
```

- [ ] **Create feature branch**

```bash
git checkout -b feat/populate-context-atoms
```

---

## Task 1: Situational-frame primitive atoms

**Files:** `atoms/situational-frame/standard.toml`, `production.toml`, `development.toml`, `incident.toml`

- [ ] **Write `atoms/situational-frame/standard.toml`**

```toml
id           = "context-atoms/situational-frame/standard"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[body]
name            = "Standard"
description     = "General-purpose operating frame — interactive, moderate risk, routine tasks"
task_domain     = "general"
deployment_mode = "interactive"
risk_posture    = "low"
audit_level     = "standard"

[meta]
provenance = "convergent-systems-co/context-atoms"
license    = "Apache-2.0"
```

- [ ] **Write `atoms/situational-frame/production.toml`**

```toml
id           = "context-atoms/situational-frame/production"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[body]
name            = "Production"
description     = "Live production environment — elevated audit, restricted write access, conservative defaults"
task_domain     = "operational"
deployment_mode = "autonomous"
risk_posture    = "high"
audit_level     = "full"

[meta]
provenance = "convergent-systems-co/context-atoms"
license    = "Apache-2.0"
```

- [ ] **Write `atoms/situational-frame/development.toml`**

```toml
id           = "context-atoms/situational-frame/development"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[body]
name            = "Development"
description     = "Local development environment — full tool access, verbose output, permissive defaults"
task_domain     = "engineering"
deployment_mode = "interactive"
risk_posture    = "low"
audit_level     = "minimal"

[meta]
provenance = "convergent-systems-co/context-atoms"
license    = "Apache-2.0"
```

- [ ] **Write `atoms/situational-frame/incident.toml`**

```toml
id           = "context-atoms/situational-frame/incident"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[body]
name            = "Incident"
description     = "Active incident response — elevated permissions, all actions audited, urgency mode"
task_domain     = "incident-response"
deployment_mode = "interactive"
risk_posture    = "high"
audit_level     = "full"

[meta]
provenance = "convergent-systems-co/context-atoms"
license    = "Apache-2.0"
```

- [ ] **Validate situational-frame atoms**

```bash
python3 -c "
import tomllib, sys, pathlib
for f in pathlib.Path('atoms/situational-frame').glob('*.toml'):
    try: tomllib.loads(f.read_text()); print(f'OK  {f}')
    except Exception as e: print(f'ERR {f}: {e}'); sys.exit(1)
"
```
Expected: 4 lines `OK`.

- [ ] **Commit**

```bash
git add atoms/situational-frame/
git commit -m "feat(atoms): add situational-frame primitive atoms (standard, production, development, incident)"
```

---

## Task 2: Remaining primitive atom types

**Files:** `atoms/environment-descriptor/default.toml`, `atoms/conversation-scope/default.toml`, `atoms/working-memory-shape/standard.toml`, `atoms/attention-budget/standard.toml`, `atoms/attention-budget/conservative.toml`

- [ ] **Write `atoms/environment-descriptor/default.toml`**

```toml
id           = "context-atoms/environment-descriptor/default"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[body]
name              = "Default"
description       = "Standard operator workstation — macOS/Linux, shell tools available, outbound internet"
os_family         = "unix"
tools_available   = ["git", "gh", "curl", "jq", "python3"]
network_policy    = "outbound-permitted"
locale            = "en-US"

[meta]
provenance = "convergent-systems-co/context-atoms"
license    = "Apache-2.0"
```

- [ ] **Write `atoms/conversation-scope/default.toml`**

```toml
id           = "context-atoms/conversation-scope/default"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[body]
name                 = "Default"
description          = "Unbounded topic scope — full multi-turn continuity, no digression limits"
topic_bound          = false
multi_turn_continuity = true
max_prior_turn_refs  = 20
digression_policy    = "permitted"

[meta]
provenance = "convergent-systems-co/context-atoms"
license    = "Apache-2.0"
```

- [ ] **Write `atoms/working-memory-shape/standard.toml`**

```toml
id           = "context-atoms/working-memory-shape/standard"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[body]
name             = "Standard"
description      = "Standard working-memory shape — key/value scratchpad, 32 slots, session-scoped"
slot_count       = 32
value_types      = ["string", "number", "boolean", "object"]
eviction_policy  = "lru"
persistence      = "session"

[meta]
provenance = "convergent-systems-co/context-atoms"
license    = "Apache-2.0"
```

- [ ] **Write `atoms/attention-budget/standard.toml`**

```toml
id           = "context-atoms/attention-budget/standard"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[body]
name               = "Standard"
description        = "Standard attention budget — 100k tokens, balanced priority ordering"
max_tokens         = 100000
truncation_priority = ["working-memory", "conversation-history", "system-prompt"]
retention_bias     = "recent"

[meta]
provenance = "convergent-systems-co/context-atoms"
license    = "Apache-2.0"
```

- [ ] **Write `atoms/attention-budget/conservative.toml`**

```toml
id           = "context-atoms/attention-budget/conservative"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[body]
name               = "Conservative"
description        = "Conservative budget for production contexts — 32k tokens, drop conversation history first"
max_tokens         = 32000
truncation_priority = ["conversation-history", "working-memory", "system-prompt"]
retention_bias     = "system-prompt"

[meta]
provenance = "convergent-systems-co/context-atoms"
license    = "Apache-2.0"
```

- [ ] **Validate all remaining primitives**

```bash
python3 -c "
import tomllib, sys, pathlib
for d in ['atoms/environment-descriptor', 'atoms/conversation-scope',
          'atoms/working-memory-shape', 'atoms/attention-budget']:
    for f in pathlib.Path(d).glob('*.toml'):
        try: tomllib.loads(f.read_text()); print(f'OK  {f}')
        except Exception as e: print(f'ERR {f}: {e}'); sys.exit(1)
"
```
Expected: 5 lines `OK`.

- [ ] **Commit**

```bash
git add atoms/environment-descriptor/ atoms/conversation-scope/ \
        atoms/working-memory-shape/ atoms/attention-budget/
git commit -m "feat(atoms): add environment-descriptor, conversation-scope, working-memory-shape, attention-budget primitives"
```

---

## Task 3: Context compositions

**Files:** `contexts/default/atom.toml`, `contexts/prod-read-only/atom.toml`, `contexts/dev/atom.toml`, `contexts/incident/atom.toml`

- [ ] **Write `contexts/default/atom.toml`**

```toml
id           = "context-atoms/contexts/default"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[context]
name                   = "Default"
description            = "General-purpose context — standard frame, full scope, balanced budget"
situational_frame_ref  = "context-atoms/situational-frame/standard"
environment_ref        = "context-atoms/environment-descriptor/default"
conversation_scope_ref = "context-atoms/conversation-scope/default"
working_memory_ref     = "context-atoms/working-memory-shape/standard"
attention_budget_ref   = "context-atoms/attention-budget/standard"
tags                   = ["default", "general"]

[meta]
provenance = "convergent-systems-co/context-atoms"
license    = "Apache-2.0"
```

- [ ] **Write `contexts/prod-read-only/atom.toml`**

```toml
id           = "context-atoms/contexts/prod-read-only"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[context]
name                   = "Production Read-Only"
description            = "Production context with read-only access — conservative budget, full audit"
situational_frame_ref  = "context-atoms/situational-frame/production"
environment_ref        = "context-atoms/environment-descriptor/default"
conversation_scope_ref = "context-atoms/conversation-scope/default"
working_memory_ref     = "context-atoms/working-memory-shape/standard"
attention_budget_ref   = "context-atoms/attention-budget/conservative"
access_mode            = "read-only"
tags                   = ["production", "read-only", "safe"]

[meta]
provenance = "convergent-systems-co/context-atoms"
license    = "Apache-2.0"
```

- [ ] **Write `contexts/dev/atom.toml`**

```toml
id           = "context-atoms/contexts/dev"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[context]
name                   = "Development"
description            = "Development context — full tool access, permissive defaults, standard budget"
situational_frame_ref  = "context-atoms/situational-frame/development"
environment_ref        = "context-atoms/environment-descriptor/default"
conversation_scope_ref = "context-atoms/conversation-scope/default"
working_memory_ref     = "context-atoms/working-memory-shape/standard"
attention_budget_ref   = "context-atoms/attention-budget/standard"
tags                   = ["development", "local", "permissive"]

[meta]
provenance = "convergent-systems-co/context-atoms"
license    = "Apache-2.0"
```

- [ ] **Write `contexts/incident/atom.toml`**

```toml
id           = "context-atoms/contexts/incident"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[context]
name                   = "Incident Response"
description            = "Active incident context — elevated permissions, all actions audited, standard budget"
situational_frame_ref  = "context-atoms/situational-frame/incident"
environment_ref        = "context-atoms/environment-descriptor/default"
conversation_scope_ref = "context-atoms/conversation-scope/default"
working_memory_ref     = "context-atoms/working-memory-shape/standard"
attention_budget_ref   = "context-atoms/attention-budget/standard"
tags                   = ["incident", "response", "elevated"]

[meta]
provenance = "convergent-systems-co/context-atoms"
license    = "Apache-2.0"
```

- [ ] **Validate all context compositions**

```bash
python3 -c "
import tomllib, sys, pathlib
for d in pathlib.Path('contexts').iterdir():
    f = d / 'atom.toml'
    if not f.exists(): continue
    try: tomllib.loads(f.read_text()); print(f'OK  {f}')
    except Exception as e: print(f'ERR {f}: {e}'); sys.exit(1)
"
```
Expected: 4 lines `OK`.

- [ ] **Commit**

```bash
git add contexts/
git commit -m "feat(contexts): add default, prod-read-only, dev, incident context compositions"
```

---

## Task 4: Push PR and close issue

- [ ] **Push branch**

```bash
GH_TOKEN=$(gh auth token --user polliard) git push -u origin feat/populate-context-atoms
```

- [ ] **Create PR**

```bash
GH_TOKEN=$(gh auth token --user polliard) gh pr create \
  --base main \
  --title "feat: populate context-atoms with primitives and 4 context compositions" \
  --body "$(cat <<'EOF'
## Summary

- Add 10 primitive atoms across situational-frame, environment-descriptor, conversation-scope, working-memory-shape, and attention-budget types
- Add 4 context compositions: default, prod-read-only, dev, incident
- Follows schema-atoms atom.toml manifest standard

## Test plan

- [x] All TOML files parse cleanly (python3 tomllib)
- [ ] Visual review of ref consistency across compositions and primitives

Closes #8

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Merge PR**

```bash
GH_TOKEN=$(gh auth token --user polliard) gh pr merge --merge --repo convergent-systems-co/context-atoms
```
