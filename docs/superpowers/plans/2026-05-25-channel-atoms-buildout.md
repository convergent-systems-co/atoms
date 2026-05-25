# channel-atoms Buildout — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate `channel-atoms` with protocol/auth-method/transport/delivery-semantic primitive atoms and 8 channel compositions, closing issues #5, #6, #7.

**Architecture:** All atoms are TOML files following the schema-atoms `atom.toml` manifest standard (`id`, `version`, `content_hash`, `lifecycle`, `created_at`, `[body]` or `[channel]`, `[meta]`). Primitives live under `atoms/<type>/`, compositions under `channels/<name>/`.

**Tech Stack:** TOML, Git, GitHub CLI (`gh`), Python 3 (toml validation via `tomllib`)

**Repo:** `convergent-systems-co/channel-atoms` — clone fresh for this work.

---

## Setup

- [ ] **Clone the repo**

```bash
cd /tmp
GH_TOKEN=$(gh auth token --user polliard) \
  git clone https://github.com/convergent-systems-co/channel-atoms.git
cd channel-atoms
git config --local credential.helper \
  '!f() { test "$1" = get && printf "username=polliard\npassword=%s\n" "$(gh auth token --user polliard)"; }; f'
```

- [ ] **Create feature branch**

```bash
git checkout -b feat/populate-channel-atoms
```

---

## Task 1: Protocol primitive atoms

**Files:** Create `atoms/protocol/https.toml`, `http.toml`, `postgres.toml`, `ssh.toml`, `k8s-api.toml`

- [ ] **Write `atoms/protocol/https.toml`**

```toml
id           = "channel-atoms/protocol/https"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[body]
name          = "HTTPS"
description   = "Hypertext Transfer Protocol Secure — encrypted HTTP over TLS 1.2+"
wire_protocol = "tcp"
default_port  = 443
encryption    = true
stateful      = false

[meta]
provenance = "https://www.rfc-editor.org/rfc/rfc9110"
license    = "Apache-2.0"
```

- [ ] **Write `atoms/protocol/http.toml`**

```toml
id           = "channel-atoms/protocol/http"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[body]
name          = "HTTP"
description   = "Hypertext Transfer Protocol — unencrypted, local-only use"
wire_protocol = "tcp"
default_port  = 80
encryption    = false
stateful      = false

[meta]
provenance = "https://www.rfc-editor.org/rfc/rfc9110"
license    = "Apache-2.0"
```

- [ ] **Write `atoms/protocol/postgres.toml`**

```toml
id           = "channel-atoms/protocol/postgres"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[body]
name          = "PostgreSQL"
description   = "PostgreSQL wire protocol — connection via DSN with SSL"
wire_protocol = "tcp"
default_port  = 5432
encryption    = true
stateful      = true

[meta]
provenance = "https://www.postgresql.org/docs/current/protocol.html"
license    = "Apache-2.0"
```

- [ ] **Write `atoms/protocol/ssh.toml`**

```toml
id           = "channel-atoms/protocol/ssh"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[body]
name          = "SSH"
description   = "Secure Shell — encrypted remote execution and file transfer"
wire_protocol = "tcp"
default_port  = 22
encryption    = true
stateful      = true

[meta]
provenance = "https://www.rfc-editor.org/rfc/rfc4253"
license    = "Apache-2.0"
```

- [ ] **Write `atoms/protocol/k8s-api.toml`**

```toml
id           = "channel-atoms/protocol/k8s-api"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[body]
name          = "Kubernetes API"
description   = "Kubernetes REST API over HTTPS — credentials from kubeconfig"
wire_protocol = "tcp"
default_port  = 6443
encryption    = true
stateful      = false

[meta]
provenance = "https://kubernetes.io/docs/concepts/overview/kubernetes-api/"
license    = "Apache-2.0"
```

- [ ] **Validate all protocol atoms parse as valid TOML**

```bash
python3 -c "
import tomllib, sys, pathlib
for f in pathlib.Path('atoms/protocol').glob('*.toml'):
    try:
        tomllib.loads(f.read_text())
        print(f'OK  {f}')
    except Exception as e:
        print(f'ERR {f}: {e}')
        sys.exit(1)
"
```
Expected: 5 lines starting with `OK`.

- [ ] **Commit**

```bash
git add atoms/protocol/
git commit -m "feat(atoms): add protocol primitive atoms (https, http, postgres, ssh, k8s-api)"
```

---

## Task 2: Auth-method primitive atoms

**Files:** Create `atoms/auth-method/api-key.toml`, `bearer-token.toml`, `none.toml`, `kubeconfig.toml`

- [ ] **Write `atoms/auth-method/api-key.toml`**

```toml
id           = "channel-atoms/auth-method/api-key"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[body]
name        = "API Key"
description = "Static secret key injected via HTTP header (x-api-key or Authorization)"
mechanism   = "static-secret"
header_name = "x-api-key"
slot_type   = "secret-string"

[meta]
provenance = "https://swagger.io/docs/specification/authentication/api-keys/"
license    = "Apache-2.0"
```

- [ ] **Write `atoms/auth-method/bearer-token.toml`**

```toml
id           = "channel-atoms/auth-method/bearer-token"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[body]
name        = "Bearer Token"
description = "OAuth2-style bearer token in Authorization header"
mechanism   = "bearer"
header_name = "Authorization"
header_format = "Bearer {token}"
slot_type   = "secret-string"

[meta]
provenance = "https://www.rfc-editor.org/rfc/rfc6750"
license    = "Apache-2.0"
```

- [ ] **Write `atoms/auth-method/none.toml`**

```toml
id           = "channel-atoms/auth-method/none"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[body]
name        = "None"
description = "No authentication — local or trusted-network endpoints only"
mechanism   = "none"
slot_type   = "none"

[meta]
provenance = "convergent-systems-co/channel-atoms"
license    = "Apache-2.0"
```

- [ ] **Write `atoms/auth-method/kubeconfig.toml`**

```toml
id           = "channel-atoms/auth-method/kubeconfig"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[body]
name        = "Kubeconfig"
description = "Kubernetes kubeconfig file — supports client-cert, token, and exec credential plugins"
mechanism   = "kubeconfig"
slot_type   = "file-path"

[meta]
provenance = "https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/"
license    = "Apache-2.0"
```

- [ ] **Write `atoms/auth-method/ssh-key.toml`**

```toml
id           = "channel-atoms/auth-method/ssh-key"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[body]
name        = "SSH Key"
description = "SSH public-key authentication — private key from slot, known_hosts required"
mechanism   = "public-key"
key_format  = "openssh"
slot_type   = "file-path"

[meta]
provenance = "https://www.rfc-editor.org/rfc/rfc4252"
license    = "Apache-2.0"
```

- [ ] **Write `atoms/auth-method/password.toml`**

```toml
id           = "channel-atoms/auth-method/password"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[body]
name        = "Password"
description = "Username + password credential — used for database DSNs and basic auth"
mechanism   = "password"
slot_type   = "secret-string"

[meta]
provenance = "https://www.rfc-editor.org/rfc/rfc7617"
license    = "Apache-2.0"
```

- [ ] **Validate auth-method atoms**

```bash
python3 -c "
import tomllib, sys, pathlib
for f in pathlib.Path('atoms/auth-method').glob('*.toml'):
    try:
        tomllib.loads(f.read_text())
        print(f'OK  {f}')
    except Exception as e:
        print(f'ERR {f}: {e}')
        sys.exit(1)
"
```
Expected: 6 lines starting with `OK`.

- [ ] **Commit**

```bash
git add atoms/auth-method/
git commit -m "feat(atoms): add auth-method primitive atoms (api-key, bearer-token, none, kubeconfig, ssh-key, password)"
```

---

## Task 3: Transport and delivery-semantic primitive atoms

**Files:** `atoms/transport/push-sync.toml`, `pull-async.toml`; `atoms/delivery-semantic/at-most-once.toml`, `at-least-once.toml`

- [ ] **Write `atoms/transport/push-sync.toml`**

```toml
id           = "channel-atoms/transport/push-sync"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[body]
name        = "Push Synchronous"
description = "Caller pushes a message and blocks until the response arrives"
direction   = "push"
sync_mode   = "synchronous"
retry_model = "caller-driven"

[meta]
provenance = "convergent-systems-co/channel-atoms"
license    = "Apache-2.0"
```

- [ ] **Write `atoms/transport/pull-async.toml`**

```toml
id           = "channel-atoms/transport/pull-async"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[body]
name        = "Pull Asynchronous"
description = "Consumer polls or subscribes; message delivery is decoupled from the producer"
direction   = "pull"
sync_mode   = "asynchronous"
retry_model = "broker-driven"

[meta]
provenance = "convergent-systems-co/channel-atoms"
license    = "Apache-2.0"
```

- [ ] **Write `atoms/delivery-semantic/at-most-once.toml`**

```toml
id           = "channel-atoms/delivery-semantic/at-most-once"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[body]
name        = "At-Most-Once"
description = "Message delivered zero or one time — no redelivery on failure (fire-and-forget)"
guarantee   = "at-most-once"
duplicates  = false
loss_risk   = true

[meta]
provenance = "convergent-systems-co/channel-atoms"
license    = "Apache-2.0"
```

- [ ] **Write `atoms/delivery-semantic/at-least-once.toml`**

```toml
id           = "channel-atoms/delivery-semantic/at-least-once"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[body]
name        = "At-Least-Once"
description = "Message delivered one or more times — redelivered on failure, consumer must be idempotent"
guarantee   = "at-least-once"
duplicates  = true
loss_risk   = false

[meta]
provenance = "convergent-systems-co/channel-atoms"
license    = "Apache-2.0"
```

- [ ] **Validate transport and delivery-semantic atoms**

```bash
python3 -c "
import tomllib, sys, pathlib
for d in ['atoms/transport', 'atoms/delivery-semantic']:
    for f in pathlib.Path(d).glob('*.toml'):
        try:
            tomllib.loads(f.read_text())
            print(f'OK  {f}')
        except Exception as e:
            print(f'ERR {f}: {e}')
            sys.exit(1)
"
```
Expected: 4 lines starting with `OK`.

- [ ] **Commit**

```bash
git add atoms/transport/ atoms/delivery-semantic/
git commit -m "feat(atoms): add transport and delivery-semantic primitive atoms"
```

---

## Task 4: Channel compositions — AI API channels

**Files:** `channels/anthropic-api/atom.toml`, `channels/openai-api/atom.toml`, `channels/ollama/atom.toml`

- [ ] **Write `channels/anthropic-api/atom.toml`**

```toml
id           = "channel-atoms/channels/anthropic-api"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[channel]
name                = "Anthropic API"
description         = "HTTPS channel for the Anthropic Claude API"
protocol_ref        = "channel-atoms/protocol/https"
auth_method_ref     = "channel-atoms/auth-method/api-key"
transport_ref       = "channel-atoms/transport/push-sync"
delivery_ref        = "channel-atoms/delivery-semantic/at-most-once"
endpoint_template   = "https://api.anthropic.com/v1"
encryption_required = true
timeout_seconds     = 60
tags                = ["ai", "llm", "anthropic", "claude"]

[meta]
provenance = "https://docs.anthropic.com/en/api/getting-started"
license    = "Apache-2.0"
```

- [ ] **Write `channels/openai-api/atom.toml`**

```toml
id           = "channel-atoms/channels/openai-api"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[channel]
name                = "OpenAI API"
description         = "HTTPS channel for the OpenAI REST API"
protocol_ref        = "channel-atoms/protocol/https"
auth_method_ref     = "channel-atoms/auth-method/bearer-token"
transport_ref       = "channel-atoms/transport/push-sync"
delivery_ref        = "channel-atoms/delivery-semantic/at-most-once"
endpoint_template   = "https://api.openai.com/v1"
encryption_required = true
timeout_seconds     = 60
tags                = ["ai", "llm", "openai", "gpt"]

[meta]
provenance = "https://platform.openai.com/docs/api-reference"
license    = "Apache-2.0"
```

- [ ] **Write `channels/ollama/atom.toml`**

```toml
id           = "channel-atoms/channels/ollama"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[channel]
name                = "Ollama"
description         = "HTTP channel for a local Ollama inference server (unauthenticated)"
protocol_ref        = "channel-atoms/protocol/http"
auth_method_ref     = "channel-atoms/auth-method/none"
transport_ref       = "channel-atoms/transport/push-sync"
delivery_ref        = "channel-atoms/delivery-semantic/at-most-once"
endpoint_template   = "http://localhost:11434"
encryption_required = false
timeout_seconds     = 120
tags                = ["ai", "llm", "ollama", "local"]

[meta]
provenance = "https://ollama.com/blog/openai-compatibility"
license    = "Apache-2.0"
```

- [ ] **Validate AI channel compositions**

```bash
python3 -c "
import tomllib, sys, pathlib
for d in ['channels/anthropic-api', 'channels/openai-api', 'channels/ollama']:
    f = pathlib.Path(d) / 'atom.toml'
    try:
        tomllib.loads(f.read_text())
        print(f'OK  {f}')
    except Exception as e:
        print(f'ERR {f}: {e}')
        sys.exit(1)
"
```
Expected: 3 lines starting with `OK`.

- [ ] **Commit**

```bash
git add channels/
git commit -m "feat(channels): add anthropic-api, openai-api, ollama channel compositions"
```

---

## Task 5: Channel compositions — ops channels

**Files:** `channels/prometheus/atom.toml`, `channels/kubernetes-api/atom.toml`

- [ ] **Write `channels/prometheus/atom.toml`**

```toml
id           = "channel-atoms/channels/prometheus"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[channel]
name                = "Prometheus"
description         = "HTTPS channel for a Prometheus query API endpoint"
protocol_ref        = "channel-atoms/protocol/https"
auth_method_ref     = "channel-atoms/auth-method/bearer-token"
transport_ref       = "channel-atoms/transport/push-sync"
delivery_ref        = "channel-atoms/delivery-semantic/at-most-once"
endpoint_template   = "https://{prometheus_host}/api/v1"
encryption_required = true
timeout_seconds     = 30
auth_optional       = true
tags                = ["observability", "metrics", "prometheus"]

[meta]
provenance = "https://prometheus.io/docs/prometheus/latest/querying/api/"
license    = "Apache-2.0"
```

- [ ] **Write `channels/kubernetes-api/atom.toml`**

```toml
id           = "channel-atoms/channels/kubernetes-api"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[channel]
name                = "Kubernetes API"
description         = "Kubernetes REST API channel — credentials sourced from kubeconfig"
protocol_ref        = "channel-atoms/protocol/k8s-api"
auth_method_ref     = "channel-atoms/auth-method/kubeconfig"
transport_ref       = "channel-atoms/transport/push-sync"
delivery_ref        = "channel-atoms/delivery-semantic/at-most-once"
endpoint_template   = "https://{cluster_host}:{cluster_port}"
encryption_required = true
timeout_seconds     = 30
tags                = ["kubernetes", "k8s", "orchestration"]

[meta]
provenance = "https://kubernetes.io/docs/concepts/overview/kubernetes-api/"
license    = "Apache-2.0"
```

- [ ] **Validate**

```bash
python3 -c "
import tomllib, sys, pathlib
for d in ['channels/prometheus', 'channels/kubernetes-api']:
    f = pathlib.Path(d) / 'atom.toml'
    try: tomllib.loads(f.read_text()); print(f'OK  {f}')
    except Exception as e: print(f'ERR {f}: {e}'); sys.exit(1)
"
```
Expected: 2 lines `OK`.

- [ ] **Commit**

```bash
git add channels/prometheus/ channels/kubernetes-api/
git commit -m "feat(channels): add prometheus and kubernetes-api channel compositions"
```

---

## Task 6: Channel compositions — data channels

**Files:** `channels/postgres/atom.toml`, `channels/generic-https/atom.toml`, `channels/generic-ssh/atom.toml`

- [ ] **Write `channels/postgres/atom.toml`**

```toml
id           = "channel-atoms/channels/postgres"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[channel]
name                = "PostgreSQL"
description         = "PostgreSQL database channel — DSN injected via slot, ssl_mode=require"
protocol_ref        = "channel-atoms/protocol/postgres"
auth_method_ref     = "channel-atoms/auth-method/password"
transport_ref       = "channel-atoms/transport/push-sync"
delivery_ref        = "channel-atoms/delivery-semantic/at-most-once"
endpoint_template   = "postgres://{user}:{password}@{host}:{port}/{database}?sslmode=require"
encryption_required = true
timeout_seconds     = 10
tags                = ["database", "postgres", "sql"]

[meta]
provenance = "https://www.postgresql.org/docs/current/libpq-connect.html"
license    = "Apache-2.0"
```

- [ ] **Write `channels/generic-https/atom.toml`**

```toml
id           = "channel-atoms/channels/generic-https"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[channel]
name                = "Generic HTTPS"
description         = "Generic HTTPS channel for arbitrary REST endpoints — optional bearer auth"
protocol_ref        = "channel-atoms/protocol/https"
auth_method_ref     = "channel-atoms/auth-method/bearer-token"
transport_ref       = "channel-atoms/transport/push-sync"
delivery_ref        = "channel-atoms/delivery-semantic/at-most-once"
endpoint_template   = "https://{host}/{path}"
encryption_required = true
timeout_seconds     = 30
auth_optional       = true
tags                = ["generic", "https", "rest", "webhook"]

[meta]
provenance = "convergent-systems-co/channel-atoms"
license    = "Apache-2.0"
```

- [ ] **Write `channels/generic-ssh/atom.toml`**

```toml
id           = "channel-atoms/channels/generic-ssh"
version      = "1.0.0"
content_hash = ""
lifecycle    = "draft"
created_at   = "2026-05-25T00:00:00Z"

[channel]
name                = "Generic SSH"
description         = "Generic SSH channel for remote execution — key-based auth, known_hosts required"
protocol_ref        = "channel-atoms/protocol/ssh"
auth_method_ref     = "channel-atoms/auth-method/ssh-key"
transport_ref       = "channel-atoms/transport/push-sync"
delivery_ref        = "channel-atoms/delivery-semantic/at-most-once"
endpoint_template   = "ssh://{user}@{host}:{port}"
encryption_required = true
timeout_seconds     = 30
known_hosts_required = true
tags                = ["generic", "ssh", "remote-exec"]

[meta]
provenance = "https://www.rfc-editor.org/rfc/rfc4253"
license    = "Apache-2.0"
```

- [ ] **Validate all 8 channel compositions**

```bash
python3 -c "
import tomllib, sys, pathlib
errors = []
for d in pathlib.Path('channels').iterdir():
    f = d / 'atom.toml'
    if not f.exists(): continue
    try: tomllib.loads(f.read_text()); print(f'OK  {f}')
    except Exception as e: errors.append(f'ERR {f}: {e}')
for e in errors: print(e)
sys.exit(len(errors))
"
```
Expected: 8 lines `OK`.

- [ ] **Commit**

```bash
git add channels/postgres/ channels/generic-https/ channels/generic-ssh/
git commit -m "feat(channels): add postgres, generic-https, generic-ssh channel compositions"
```

---

## Task 7: Push PR and close issues

- [ ] **Push branch**

```bash
GH_TOKEN=$(gh auth token --user polliard) git push -u origin feat/populate-channel-atoms
```

- [ ] **Create PR**

```bash
GH_TOKEN=$(gh auth token --user polliard) gh pr create \
  --base main \
  --title "feat: populate channel-atoms with primitives and 8 channel compositions" \
  --body "$(cat <<'EOF'
## Summary

- Add 15 primitive atoms across protocol, auth-method, transport, delivery-semantic types
- Add 8 channel compositions: anthropic-api, openai-api, ollama, prometheus, kubernetes-api, postgres, generic-https, generic-ssh
- Follows schema-atoms atom.toml manifest standard

## Test plan

- [x] All TOML files parse cleanly (python3 tomllib)
- [ ] Visual review of atom.toml field consistency

Closes #5
Closes #6
Closes #7

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Merge PR**

```bash
GH_TOKEN=$(gh auth token --user polliard) gh pr merge --merge --repo convergent-systems-co/channel-atoms
```
