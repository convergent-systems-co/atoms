---
name: atom-status
description: >
  Full fleet snapshot of all *-atoms.com catalog sites — deploy health, DNS, HTTPS
  reachability, atom_types per catalog, schema compliance, /ai/index.json, Terraform
  vs Wrangler, DeployAfterMerge gate, open PRs, and license audit. Use when the user
  asks about the state of the atoms fleet, wants to verify deployments, asks for a
  "fleet snapshot" / "fleet status" / "atom status" / "atom-state" / schema compliance
  / license audit report, or before starting any cross-fleet work.
---

# /atom-status — Atoms Fleet Snapshot

Produces a single consolidated report for every `*-atoms.com` catalog site.
Run from the `atoms` repo root; reads `ATOMS_LIST.md` and `catalogs/*.toml`.

## Data sources (run in parallel)

| Source | Provides |
|--------|----------|
| `scripts/atom-status.sh` | Deploy · DNS · Apex · Pages · PRs · Code · Data |
| `catalogs/<name>.toml → [body] atom_types` | Atom types per catalog |
| GitHub API repo tree | `infra/terraform/`, `wrangler.toml`, deploy workflow triggers |
| `ATOMS.yml → spec_version` | Schema compliance (v1.1.0 vs v1) |
| Live HTTP probe | `/ai/index.json` reachability |

**GH token:** prefix all `gh` commands with `GH_TOKEN=$(gh auth token --user itsfwcp_JMF)`.

---

## Step 1 — Run the fleet script

```bash
scripts/atom-status.sh          # Deploy · DNS · Apex · Pages · PRs · Code · Data
scripts/atom-status.sh --verbose  # also prints repo description + page titles
scripts/atom-status.sh --atom brand  # single catalog
```

---

## Step 2 — atom_types per catalog

Read directly from `catalogs/<name>.toml` in this repo — the canonical source:

```bash
for toml in catalogs/*-atoms.toml; do
  name=$(basename "$toml" .toml)
  types=$(grep "^atom_types" "$toml" \
    | sed 's/atom_types = \[//;s/\]//;s/"//g;s/, */,/g' | tr -d ' ')
  echo "$name|${types:-—}"
done
```

Empty `[]` → report as `—` with a note: composition-only, spec, or TBD.

---

## Step 3 — Schema compliance (ATOMS.yml spec_version)

```bash
GH_TOKEN=$(gh auth token --user itsfwcp_JMF) \
  gh api "repos/convergent-systems-co/<name>/contents/ATOMS.yml" \
  --jq '.content' | base64 -d | grep -E "^spec_version|^spec:" | head -1
```

- `spec_version: atoms-spec/v1.1.0` → ✅
- `spec: atoms-spec/v1` → ⚠️ old
- absent → ❌

---

## Step 4 — /ai/index.json reachability

```bash
curl -s -o /dev/null -w "%{http_code}" --max-time 6 \
  "https://<name>-atoms.com/ai/index.json"
```

200 → ✅ · anything else → ❌

---

## Step 5 — Terraform vs Wrangler

```bash
GH_TOKEN=$(gh auth token --user itsfwcp_JMF) \
  gh api "repos/convergent-systems-co/<name>/git/trees/HEAD?recursive=1" \
  --jq '{
    terraform: ([.tree[].path | select(startswith("infra/terraform/") or endswith(".tf"))] | length),
    wrangler:  ([.tree[].path | select(. == "wrangler.toml")] | length)
  }' 2>/dev/null
```

- `terraform > 0` AND `wrangler == 0` → ✅ Terraform
- `wrangler > 0` → ⚠️ Wrangler
- both 0 → ➖ Neither

---

## Step 6 — DeployAfterMerge

Fetch deploy workflow and inspect `on:` trigger:

```bash
GH_TOKEN=$(gh auth token --user itsfwcp_JMF) \
  gh api "repos/convergent-systems-co/<name>/contents/.github/workflows/deploy.yml" \
  --jq '.content' | base64 -d | grep -A 10 "^on:" 2>/dev/null
```

- `push: branches: [main]` only (or `workflow_dispatch`) → ✅
- `pull_request` or unfiltered `push` → ⚠️ Premature
- no deploy workflow → ➖

---

## Output format

Two blocks: fleet table then atom_types detail.

```
# Atoms Fleet Snapshot — {date}
Reference: brand-atoms.com | Org: convergent-systems-co

## Summary
- Catalogs tracked:    25
- Apex LIVE (2xx):     N
- Apex offline (000):  N
- /ai/index.json ✅:   N / N live
- Schema v1.1.0 ✅:    N / 25
- Terraformed ✅:      N / 25
- DeployAfterMerge ✅: N / 25

## Fleet Status

| Catalog              | Deploy     | DNS  | Apex | /ai/ | Schema  | Terraform | AfterMerge | PRs | Code       | Data      |
|----------------------|------------|------|------|------|---------|:---------:|:----------:|-----|------------|-----------|
| brand-atoms.com      | ✅ a1b2c3d | LIVE | 200  | ✅   | ✅ v1.1 | ✅        | ✅         | 0   | Apache-2.0 | CC-BY-4.0 |
| schema-atoms.com     | ✅ a1b2c3d | LIVE | 200  | ✅   | ✅ v1.1 | ✅        | ✅         | 0   | Apache-2.0 | CC-BY-4.0 |
| pipeline-atoms.com   | ✅ a1b2c3d | NONE | 000  | ❌   | ✅ v1.1 | ➖        | ✅         | 0   | Apache-2.0 | CC-BY-4.0 |
| ...                  | ...        | ...  | ...  | ...  | ...     | ...       | ...        | ... | ...        | ...       |

Column keys:
  Deploy:     ✅ green · ❌ failed · ⏳ running · — no run found
  /ai/:       ✅ 200 · ❌ non-200 or offline
  Schema:     ✅ v1.1.0 · ⚠️ v1 (old) · ❌ missing
  Terraform:  ✅ infra/terraform/ present, no wrangler.toml · ⚠️ wrangler.toml · ➖ none
  AfterMerge: ✅ deploy triggers on push:main only · ⚠️ fires on PRs/branches · ➖ no pipeline

## Atom Types per Catalog

Source: catalogs/<name>.toml → [body] atom_types (read live, not from memory)

| Catalog          | atom_types                                                                               |
|------------------|------------------------------------------------------------------------------------------|
| brand-atoms      | palette, font, glyph                                                                     |
| service-atoms    | identity, protocol, schema, policy, endpoint-pattern                                     |
| prompt-atoms     | persona, constraint, format-instruction, tool-use-template, refusal-pattern, output-schema |
| policy-atoms     | subject, resource, action, effect, condition                                             |
| identity-atoms   | auth-method, claim-type, trust-framework, key-cert-type                                  |
| compliance-atoms | control-family, control, evidence-type, audit-requirement                                |
| workflow-atoms   | step-type, trigger-type, state-type, gate-type, github                                   |
| agent-atoms      | persona, tool-definition, capability-declaration, role-boundary, isolation-constraint    |
| knowledge-atoms  | entity-type, relationship-type, provenance-atom, fact-type, confidence-primitive         |
| event-atoms      | event-type, schema, channel, subscription-pattern, delivery-semantics                    |
| plugin-atoms     | interface-contract, capability-declaration, permission-scope, lifecycle-hook, trust-primitive |
| theme-atoms      | prompt-segment, separator-style, glyph-set, role-binding, syntax-scheme                  |
| persona-atoms    | voice-profile, role-definition, behavioural-constraint, knowledge-boundary, tone-parameter |
| channel-atoms    | protocol, endpoint, delivery-semantic, transport, auth-method                            |
| model-atoms      | model-card, capability, pricing-tier, deprecation-policy, tool-use-shape, modality       |
| action-atoms     | github                                                                                   |
| profile-atoms    | — (composition-only; primitives live in other catalogs)                                  |
| skill-atoms      | — (TBD — schema authoring deferred)                                                      |
| schema-atoms     | — (spec compositions; no typed atom instances)                                           |
| pipeline-atoms   | — (TBD — schema authoring deferred)                                                      |

## Needs Attention

Flag any catalog where:
- Apex 000 but Deploy green → DNS not routed yet
- /ai/ ❌ on a live apex → missing AI endpoint
- Schema ⚠️/❌ → ATOMS.yml not on v1.1.0
- Terraform ⚠️ → Wrangler present; ➖ → infra not provisioned
- AfterMerge ⚠️ → deploy pipeline fires prematurely on PRs

## License conventions

Catalog default: **Apache-2.0** (code) · **CC-BY-4.0** (data).
AGPL or GPL is a compliance red flag (Code.md §6) — surface explicitly.
Missing `LICENSE-data` → warn as `MISSING`.

## What this does NOT check

- Cloudflare Pages project state directly (HTTP probe stands in)
- Terraform state drift (only checks for path presence)
- Submodule pointer freshness in the umbrella repo
- DNS-token allowlist or zone-level config

## Output discipline

ASCII to stdout — no Mermaid in TUI. Per `Common.md §U16.1`, keep ASCII table
form when relaying results in a terminal session; Mermaid only in `.md` artifacts.

## Dependencies

`gh`, `jq`, `dig`, `curl` — standard on the operator workstation.
`scripts/atom-status.sh` handles the deploy/DNS/HTTPS/PR/license columns.
