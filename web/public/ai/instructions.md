# Atoms Ecosystem — AI Instructions

**Site:** atoms.convergent-systems.co  
**Federation:** convergent-systems.co  
**Purpose:** Central directory for 25+ typed, versioned, composable atom catalogs used by AI agents, CI/CD pipelines, and runtime systems.

---

## What atoms are

An **atom** is the smallest named, versioned, machine-readable unit of knowledge or behavior in a domain. Every atom has:

- A **type** (e.g., `palette`, `persona`, `policy`, `github`)
- A **version** (semver)
- A **canonical URL** at its catalog's domain
- A **JSON or TOML payload** describing its content
- **Tags** and optional **lifecycle** metadata

Atoms are not code — they are data. They describe things (a color palette, a CI pipeline step, a behavioral policy) in a format that both AIs and humans can read, version, and compose.

## How the ecosystem is organized

The ecosystem has 25+ **catalogs**. Each catalog:

1. Lives at its own domain (e.g., `brand-atoms.com`, `persona-atoms.com`)
2. Has its own `ATOMS.yml` declaring its atom types, version, and federation
3. Exposes `/ai/index.json` for AI discovery of that catalog's contents
4. Exposes `/exports/catalog.json` with the full atom list

The **umbrella** (`atoms.convergent-systems.co`) is the master directory. It does not serve atoms — it tells you where to find them.

## How to navigate this ecosystem (AI agent recipe)

```
1. Read /ai/index.json at atoms.convergent-systems.co
   → You are here now (this file is the instructions)
   → catalogs[] lists all 25+ catalogs with name, domain, ai_endpoint, atom_types

2. Pick the catalogs relevant to your task:
   - Need brand/visual identity?   → brand-atoms.com
   - Need AI personas?             → persona-atoms.com
   - Need policies?                → policy-atoms.com
   - Need CI/CD pipelines?         → pipeline-atoms.com
   - Need workflow compositions?   → workflow-atoms.com
   - Need event schemas?           → event-atoms.com
   - Need identity/auth?           → identity-atoms.com
   - Need context definitions?     → context-atoms.com
   - Need channel specs?           → channel-atoms.com
   - Need agent definitions?       → agent-atoms.com

3. For each selected catalog, fetch:
   GET https://<catalog-domain>/ai/index.json
   → lists all atoms in that catalog

4. Fetch a specific atom:
   GET https://<catalog-domain>/atoms/<type>/<id>.json
   → returns the full atom payload

5. Fetch the catalog's schema (what atom fields mean):
   GET https://schema-atoms.com/atoms/<catalog-class>/<slug>.toml
```

## Atom structure

Every atom's JSON payload contains at minimum:

```json
{
  "schema": "https://<catalog-domain>/schemas/atom-v1.json",
  "type": "<atom-type>",
  "id": "<catalog>/<type>/<slug>",
  "version": "<semver>",
  "name": "<human-readable name>",
  "description": "<what this atom is for>",
  "tags": ["<tag>", "..."],
  "lifecycle": "stable | draft | deprecated"
}
```

Additional fields are type-specific — see `schema-atoms.com` for the grammar atoms that define each class.

## Composition

Many catalogs expose **compositions** — named groups of atoms assembled to accomplish a task. For example:

- `workflow-atoms.com` has `atoms-catalog-cicd` (secret-scan → ci → deploy → release)
- `workflow-atoms.com` has `terraform-lifecycle` (tf-plan → gate → tf-apply → verify)

Compositions are in the catalog's `composition_dir` (e.g., `/workflows/`, `/brands/`, `/prompts/`).

## Signing and trust

Every catalog ships a signed `.toml` manifest at:
```
https://atoms.convergent-systems.co/catalogs/<catalog-name>.toml
```

Atoms are signed using the convergent-systems key. Verify via:
```
GET https://atoms.convergent-systems.co/keys/
```

## Machine-readable directory

```
GET https://atoms.convergent-systems.co/directory.json
```

Returns the full catalog directory in JSON — same data as `/ai/index.json` but with additional build metadata and submodule details.

## This ecosystem builds itself with atoms

The atoms.convergent-systems.co site is deployed using the same pipeline atoms it catalogs:

- CI: `pipeline-atoms/github/ci`  
- Deploy: `pipeline-atoms/github/deploy`  
- Secret scan: `pipeline-atoms/github/secret-scan`  
- Terraform: `pipeline-atoms/github/tf-plan` + `pipeline-atoms/github/terraform-apply`

See `/pipelines/` for the full list.

---

*Federation: convergent-systems.co · Spec: atoms-spec/v1.1.0 · License: Apache-2.0*
