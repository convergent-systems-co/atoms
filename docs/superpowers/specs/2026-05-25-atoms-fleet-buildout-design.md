# Atoms Fleet Buildout — Design

**Date:** 2026-05-25
**Scope:** channel-atoms, context-atoms (populate primitives + compositions), Terraform migration (theme-atoms, brand-atoms)
**Issues:** #2, #5, #6, #7, #8

---

## A — channel-atoms: primitives + 8 channel compositions

### Atom format

Follows the schema-atoms `atom.toml` manifest standard:

```toml
id           = "<catalog>/atoms/<type>/<name>"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[body]
# type-specific fields

[meta]
provenance = "<source URL>"
license    = "Apache-2.0"
```

Compositions use the same shell with a `[channel]` body section instead.

### Primitive atoms to create

| Type | Files |
|------|-------|
| `atoms/protocol/` | `https.toml`, `http.toml`, `postgres.toml`, `ssh.toml`, `k8s-api.toml` |
| `atoms/auth-method/` | `api-key.toml`, `bearer-token.toml`, `none.toml`, `kubeconfig.toml` |
| `atoms/transport/` | `push-sync.toml`, `pull-async.toml` |
| `atoms/delivery-semantic/` | `at-most-once.toml`, `at-least-once.toml` |

### Channel compositions to create

Each at `channels/<name>/atom.toml`:

| Name | Protocol | Auth |
|------|----------|------|
| `anthropic-api` | https | api-key |
| `openai-api` | https | bearer-token |
| `ollama` | http | none |
| `prometheus` | https | bearer-token (optional) |
| `kubernetes-api` | k8s-api | kubeconfig |
| `postgres` | postgres | api-key (DSN slot) |
| `generic-https` | https | bearer-token (optional) |
| `generic-ssh` | ssh | kubeconfig (key slot) |

### Composition fields

```toml
[channel]
name              = "<Human-readable name>"
description       = "<one sentence>"
protocol_ref      = "channel-atoms/protocol/<name>"
auth_method_ref   = "channel-atoms/auth-method/<name>"
endpoint_template = "<URL or template with {slot} placeholders>"
encryption_required = true|false
timeout_seconds   = 30
```

---

## B — context-atoms: primitives + 4 context compositions

### Atom format

Same `atom.toml` shell. Primitives use `[body]` with type-specific fields; compositions use `[context]`.

### Primitive atoms to create

| Type | Files |
|------|-------|
| `atoms/situational-frame/` | `standard.toml`, `production.toml`, `development.toml`, `incident.toml` |
| `atoms/environment-descriptor/` | `default.toml` |
| `atoms/conversation-scope/` | `default.toml` |
| `atoms/working-memory-shape/` | `standard.toml` |
| `atoms/attention-budget/` | `standard.toml`, `conservative.toml` |

### Context compositions to create

Each at `contexts/<name>/atom.toml`:

| Name | Frame | Budget | Notes |
|------|-------|--------|-------|
| `default` | standard | standard | General-purpose |
| `prod-read-only` | production | conservative | No write tools |
| `dev` | development | standard | Full tool access |
| `incident` | incident | standard | Elevated permissions, audit-all |

### Composition fields

```toml
[context]
name                   = "<name>"
description            = "<one sentence>"
situational_frame_ref  = "context-atoms/situational-frame/<name>"
environment_ref        = "context-atoms/environment-descriptor/default"
conversation_scope_ref = "context-atoms/conversation-scope/default"
working_memory_ref     = "context-atoms/working-memory-shape/standard"
attention_budget_ref   = "context-atoms/attention-budget/<name>"
```

---

## C — Terraform migration: theme-atoms + brand-atoms

### Pattern (mirrors prompt-atoms exactly)

New directory: `infra/cloudflare/pages-project/` with these files:

| File | Purpose |
|------|---------|
| `versions.tf` | Provider version + R2 S3 backend, state key = `state-bucket/convergent-systems-co/<catalog>/pages-project.tfstate` |
| `providers.tf` | Cloudflare provider (token from env, no secrets in code) |
| `variables.tf` | `cloudflare_account_id`, `project_name`, `production_branch` |
| `main.tf` | `cloudflare_pages_project.this` resource |
| `outputs.tf` | `project_name`, `subdomain`, `created_on` |
| `terraform.tfvars.example` | Example vars (no real values) |
| `README.md` | Brief module description |

### Catalogs in scope

- **theme-atoms** — has `web/` + existing deploy workflow; CF Pages project created by hand → import into state
- **brand-atoms** — verify web/ presence; same treatment if confirmed

### Out of scope

Custom domain attachment, DNS, non-web infra (issue #2 explicit).

---

## Execution order

A and B can be parallelized (different repos). C is independent infra work. No cross-dependencies.
